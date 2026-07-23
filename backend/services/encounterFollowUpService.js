"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const timelineEventService = require("./timelineEventService");
const { recordAudit } = require("./auditService");
const notificationService = require("./notificationService");
const patientScheduleService = require("./patientScheduleService");
const { EncounterFollowUp, EncounterFollowUpAttempt, User, StaffAppointment, Department, PatientSchedule } = db;

/**
 * Valid state transitions for EncounterFollowUp status lifecycle.
 */
const ALLOWED_TRANSITIONS = {
  RECOMMENDED: ["PENDING_SCHEDULING", "SCHEDULED", "CANCELLED", "EXPIRED"],
  PENDING_SCHEDULING: ["SCHEDULED", "CANCELLED", "EXPIRED"],
  SCHEDULED: ["COMPLETED", "CANCELLED", "MISSED", "EXPIRED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  MISSED: [],
};

/**
 * Timeline event types mapped to status transitions.
 */
const TIMELINE_EVENTS = {
  RECOMMENDED: "FOLLOW_UP_RECOMMENDED",
  PENDING_SCHEDULING: "FOLLOW_UP_UPDATED",
  SCHEDULED: "FOLLOW_UP_SCHEDULED",
  COMPLETED: "FOLLOW_UP_COMPLETED",
  CANCELLED: "FOLLOW_UP_CANCELLED",
  EXPIRED: "FOLLOW_UP_EXPIRED",
  MISSED: "FOLLOW_UP_MISSED",
  RESCHEDULED: "FOLLOW_UP_RESCHEDULED",
  PATIENT_RETURNED: "FOLLOW_UP_PATIENT_RETURNED",
};

/**
 * Audit actions for meaningful follow-up business events.
 */
const AUDIT_ACTIONS = {
  CREATE: "Follow-up Created",
  UPDATE: "Follow-up Updated",
  SCHEDULE: "Follow-up Scheduled",
  RESCHEDULE: "Follow-up Rescheduled",
  CANCEL: "Follow-up Cancelled",
  COMPLETE: "Follow-up Completed",
  EXPIRE: "Follow-up Expired",
  MISS: "Follow-up Missed",
  PATIENT_RETURNED: "Patient Returned for Follow-up",
  AUTO_COMPLETE: "Follow-up Auto-completed",
};

/**
 * Notification event types for follow-up lifecycle.
 */
const NOTIFICATION_EVENTS = {
  SCHEDULED: "follow_up_scheduled",
  RESCHEDULED: "follow_up_rescheduled",
  CANCELLED: "follow_up_cancelled",
  COMPLETED: "follow_up_completed",
  PATIENT_RETURNED: "follow_up_patient_returned",
};

class EncounterFollowUpService {
  /**
   * Validate a status transition.
   * @param {string} currentStatus
   * @param {string} newStatus
   * @throws {Error} if transition is not allowed
   */
  validateTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus) {
      return; // Allow no-op
    }

    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed) {
      throw Object.assign(new Error(`Follow-up is in terminal status '${currentStatus}'. No further transitions allowed.`), { status: 400 });
    }
    if (!allowed.includes(newStatus)) {
      throw Object.assign(
        new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(", ") || "none"}`),
        { status: 400 }
      );
    }
  }

  /**
   * Create a new EncounterFollowUp.
   * @param {object} data - Follow-up creation payload
   * @param {string} data.patient_id
   * @param {string} data.appointment_id
   * @param {string} data.recommended_by
   * @param {string} data.reason
   * @param {string} [data.clinical_instructions]
   * @param {string} [data.priority]
   * @param {string} [data.recommended_date]
   * @param {string} [data.target_date]
   * @param {string} [data.assigned_department_id]
   * @param {string} [data.assigned_user_id]
   * @param {object} [data.metadata]
   * @param {object} [options]
   * @param {object} [options.req] - Express request object for audit context
   * @returns {Promise<object>} Created follow-up record
   */
  async createFollowUp(data, options = {}) {
    const { req } = options;

    const followUp = await EncounterFollowUp.create({
      follow_up_id: uuidv4(),
      patient_id: data.patient_id,
      appointment_id: data.appointment_id,
      recommended_by: data.recommended_by,
      assigned_department_id: data.assigned_department_id || null,
      assigned_user_id: data.assigned_user_id || null,
      reason: data.reason,
      clinical_instructions: data.clinical_instructions || null,
      priority: data.priority || "NORMAL",
      recommended_date: data.recommended_date || new Date().toISOString().split("T")[0],
      target_date: data.target_date || null,
      status: "RECOMMENDED",
      completion_notes: null,
      completed_encounter_id: null,
      cancel_reason: null,
      metadata: data.metadata || {},
      created_by: data.recommended_by,
      updated_by: data.recommended_by,
    });

    const plain = followUp.get({ plain: true });

    // Emit timeline event
    await this._emitTimelineEvent(plain, "RECOMMENDED");

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.CREATE,
        resourceType: "EncounterFollowUp",
        resourceId: plain.follow_up_id,
        module: "follow-up",
        next: { status: "RECOMMENDED" },
        extra: {
          patient_id: plain.patient_id,
          appointment_id: plain.appointment_id,
          reason: plain.reason,
          priority: plain.priority,
        },
      });
    }

    return this._formatResponse(plain);
  }

  /**
   * Update a follow-up (non-status fields).
   * @param {string} followUpId
   * @param {object} updates
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.updatedBy]
   * @returns {Promise<object>}
   */
  async updateFollowUp(followUpId, updates, options = {}) {
    const { req, updatedBy } = options;
    const followUp = await this._getFollowUp(followUpId);

    if (followUp.status !== "RECOMMENDED" && followUp.status !== "PENDING_SCHEDULING") {
      throw Object.assign(
        new Error(`Cannot update follow-up in status '${followUp.status}'. Only RECOMMENDED or PENDING_SCHEDULING can be updated.`),
        { status: 400 }
      );
    }

    const allowedFields = [
      "reason", "clinical_instructions", "priority", "recommended_date",
      "target_date", "assigned_department_id", "assigned_user_id", "metadata",
    ];

    const changed = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        changed[field] = updates[field];
      }
    }

    if (Object.keys(changed).length === 0) {
      return this._formatResponse(followUp.get({ plain: true }));
    }

    changed.updated_by = updatedBy || followUp.recommended_by;

    await followUp.update(changed);

    const plain = followUp.get({ plain: true });

    // Emit timeline event for update
    await this._emitTimelineEvent(plain, "PENDING_SCHEDULING");

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.UPDATE,
        resourceType: "EncounterFollowUp",
        resourceId: followUpId,
        module: "follow-up",
        previous: { ...changed },
        next: { status: plain.status },
        extra: { updated_fields: Object.keys(changed) },
      });
    }

    return this._formatResponse(plain);
  }

  /**
   * Cancel a follow-up.
   * @param {string} followUpId
   * @param {string} cancelReason
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.cancelledBy]
   * @returns {Promise<object>}
   */
  async cancelFollowUp(followUpId, cancelReason, options = {}) {
    const { req, cancelledBy } = options;
    const followUp = await this._getFollowUp(followUpId);

    this.validateTransition(followUp.status, "CANCELLED");

    await followUp.update({
      status: "CANCELLED",
      cancel_reason: cancelReason || null,
      updated_by: cancelledBy || followUp.recommended_by,
    });

    const plain = followUp.get({ plain: true });

    // Emit timeline event
    await this._emitTimelineEvent(plain, "CANCELLED");

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.CANCEL,
        resourceType: "EncounterFollowUp",
        resourceId: followUpId,
        module: "follow-up",
        previous: { status: followUp._previousDataValues?.status || "RECOMMENDED" },
        next: { status: "CANCELLED", cancel_reason: cancelReason },
        extra: { cancel_reason: cancelReason },
      });
    }

    // Notify relevant staff about cancellation
    await this._notifyFollowUpCancelled(plain, cancelledBy);

    return this._formatResponse(plain);
  }

  /**
   * Schedule a follow-up appointment.
   * Creates a PatientSchedule record and an EncounterFollowUpAttempt in one operation.
   * This is the primary method for reception to schedule follow-ups.
   * @param {string} followUpId
   * @param {object} scheduleData - Scheduling details
   * @param {string} scheduleData.assigned_staff_id
   * @param {string} scheduleData.schedule_date
   * @param {string} scheduleData.start_time
   * @param {string} [scheduleData.appointment_type]
   * @param {string} [scheduleData.notes]
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.scheduledBy]
   * @returns {Promise<object>}
   */
  async scheduleAppointment(followUpId, scheduleData, options = {}) {
    const { req, scheduledBy } = options;
    const followUp = await this._getFollowUp(followUpId);

    // Only allow scheduling on active follow-ups
    if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(followUp.status)) {
      throw Object.assign(
        new Error(`Cannot schedule follow-up in terminal status '${followUp.status}'.`),
        { status: 400 }
      );
    }

    // Determine the next attempt number
    const lastAttempt = await EncounterFollowUpAttempt.findOne({
      where: { follow_up_id: followUpId },
      order: [["attempt_number", "DESC"]],
      paranoid: false,
    });
    const nextAttemptNumber = lastAttempt ? lastAttempt.attempt_number + 1 : 1;

    // Create the PatientSchedule using the existing scheduling service
    const schedule = await patientScheduleService.createSchedule(
      {
        patient_id: followUp.patient_id,
        assigned_staff_id: scheduleData.assigned_staff_id,
        schedule_date: scheduleData.schedule_date,
        start_time: scheduleData.start_time,
        appointment_type: scheduleData.appointment_type || "Follow-up visit",
        notes: scheduleData.notes || `Follow-up: ${followUp.reason}`,
        status: "scheduled",
      },
      scheduledBy || followUp.recommended_by
    );

    const scheduleId = schedule.schedule_id;

    // Create the attempt record
    const attempt = await EncounterFollowUpAttempt.create({
      attempt_id: uuidv4(),
      follow_up_id: followUpId,
      schedule_id: scheduleId,
      attempt_number: nextAttemptNumber,
      status: "SCHEDULED",
      scheduled_date: scheduleData.schedule_date,
      scheduled_at: new Date(),
      notes: scheduleData.notes || null,
      scheduled_by: scheduledBy || followUp.recommended_by,
      created_by: scheduledBy || followUp.recommended_by,
      updated_by: scheduledBy || followUp.recommended_by,
      metadata: {
        source: "reception_scheduling",
        appointment_type: scheduleData.appointment_type || "Follow-up visit",
      },
    });

    // Transition follow-up to SCHEDULED if it was in RECOMMENDED or PENDING_SCHEDULING
    // If it was MISSED, transition back to SCHEDULED (rescheduling)
    const wasMissed = followUp.status === "MISSED";
    if (followUp.status !== "SCHEDULED") {
      await followUp.update({
        status: "SCHEDULED",
        updated_by: scheduledBy || followUp.recommended_by,
      });
    }

    const plain = followUp.get({ plain: true });

    // Emit timeline event with attempt context
    const eventType = wasMissed ? "RESCHEDULED" : "SCHEDULED";
    await this._emitTimelineEvent(plain, eventType, {
      attempt_id: attempt.attempt_id,
      schedule_id: scheduleId,
      attempt_number: nextAttemptNumber,
      scheduled_date: scheduleData.schedule_date,
      scheduled_by: scheduledBy,
    });

    // Audit
    if (req) {
      const auditAction = wasMissed ? AUDIT_ACTIONS.RESCHEDULE : AUDIT_ACTIONS.SCHEDULE;
      await recordAudit(req, {
        action: auditAction,
        resourceType: "EncounterFollowUp",
        resourceId: followUpId,
        module: "follow-up",
        previous: { status: wasMissed ? "MISSED" : followUp._previousDataValues?.status || "RECOMMENDED" },
        next: { status: "SCHEDULED", schedule_id: scheduleId, attempt_number: nextAttemptNumber },
        extra: {
          schedule_id: scheduleId,
          attempt_id: attempt.attempt_id,
          attempt_number: nextAttemptNumber,
          scheduled_date: scheduleData.schedule_date,
          assigned_staff_id: scheduleData.assigned_staff_id,
        },
      });
    }

    // Send notification
    await this._notifyFollowUpScheduled(plain, attempt, schedule, scheduledBy);

    return this._formatResponse({
      ...plain,
      attempts: [attempt.get({ plain: true })],
      schedule: schedule.get ? schedule.get({ plain: true }) : schedule,
    });
  }

  /**
   * Reschedule a missed or cancelled attempt.
   * Creates a new attempt with a new schedule.
   * @param {string} followUpId
   * @param {string} previousAttemptId - The missed/cancelled attempt to reschedule from
   * @param {object} scheduleData - New scheduling details
   * @param {string} scheduleData.assigned_staff_id
   * @param {string} scheduleData.schedule_date
   * @param {string} scheduleData.start_time
   * @param {string} [scheduleData.notes]
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.scheduledBy]
   * @returns {Promise<object>}
   */
  async rescheduleAttempt(followUpId, previousAttemptId, scheduleData, options = {}) {
    const { req, scheduledBy } = options;

    // Verify the previous attempt exists and is in a reschedulable state
    const previousAttempt = await EncounterFollowUpAttempt.findOne({
      where: { attempt_id: previousAttemptId, follow_up_id: followUpId },
      paranoid: false,
    });
    if (!previousAttempt) {
      throw Object.assign(new Error("Previous attempt not found"), { status: 404 });
    }
    if (previousAttempt.status !== "MISSED" && previousAttempt.status !== "CANCELLED") {
      throw Object.assign(
        new Error(`Cannot reschedule from attempt in status '${previousAttempt.status}'. Only MISSED or CANCELLED attempts can be rescheduled.`),
        { status: 400 }
      );
    }

    // Delegate to scheduleAppointment which handles attempt creation and status transitions
    return this.scheduleAppointment(followUpId, scheduleData, {
      req,
      scheduledBy: scheduledBy || previousAttempt.scheduled_by,
    });
  }

  /**
   * Create a new scheduling attempt for a follow-up (low-level).
   * Each call creates a new EncounterFollowUpAttempt record.
   * The follow-up status transitions to SCHEDULED.
   * @param {string} followUpId
   * @param {string} scheduleId - The PatientSchedule record
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.scheduledBy]
   * @param {string} [options.scheduledDate]
   * @param {string} [options.notes]
   * @returns {Promise<object>}
   */
  async createAttempt(followUpId, scheduleId, options = {}) {
    const { req, scheduledBy, scheduledDate, notes } = options;
    const followUp = await this._getFollowUp(followUpId);

    // Only allow creating attempts on active follow-ups
    if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(followUp.status)) {
      throw Object.assign(
        new Error(`Cannot schedule attempt for follow-up in terminal status '${followUp.status}'.`),
        { status: 400 }
      );
    }

    // Verify the linked schedule exists
    const schedule = await PatientSchedule.findByPk(scheduleId);
    if (!schedule) {
      throw Object.assign(new Error("Linked schedule not found"), { status: 404 });
    }

    // Determine the next attempt number
    const lastAttempt = await EncounterFollowUpAttempt.findOne({
      where: { follow_up_id: followUpId },
      order: [["attempt_number", "DESC"]],
      paranoid: false,
    });
    const nextAttemptNumber = lastAttempt ? lastAttempt.attempt_number + 1 : 1;

    // Create the attempt record
    const attempt = await EncounterFollowUpAttempt.create({
      attempt_id: uuidv4(),
      follow_up_id: followUpId,
      schedule_id: scheduleId,
      attempt_number: nextAttemptNumber,
      status: "SCHEDULED",
      scheduled_date: scheduledDate || schedule.scheduled_date || null,
      scheduled_at: new Date(),
      notes: notes || null,
      cancel_reason: null,
      scheduled_by: scheduledBy || followUp.recommended_by,
      created_by: scheduledBy || followUp.recommended_by,
      updated_by: scheduledBy || followUp.recommended_by,
      metadata: {
        source: "manual_attempt_creation",
      },
    });

    // If the follow-up was in RECOMMENDED or PENDING_SCHEDULING, transition to SCHEDULED
    // If MISSED, transition back to SCHEDULED
    if (followUp.status !== "SCHEDULED") {
      await followUp.update({
        status: "SCHEDULED",
        updated_by: scheduledBy || followUp.recommended_by,
      });
    }

    const plain = followUp.get({ plain: true });

    // Emit timeline event
    const wasMissed = followUp._previousDataValues?.status === "MISSED";
    const eventType = wasMissed ? "RESCHEDULED" : "SCHEDULED";
    await this._emitTimelineEvent(plain, eventType, {
      attempt_id: attempt.attempt_id,
      schedule_id: scheduleId,
      attempt_number: nextAttemptNumber,
    });

    // Audit
    if (req) {
      const auditAction = wasMissed ? AUDIT_ACTIONS.RESCHEDULE : AUDIT_ACTIONS.SCHEDULE;
      await recordAudit(req, {
        action: auditAction,
        resourceType: "EncounterFollowUp",
        resourceId: followUpId,
        module: "follow-up",
        previous: { status: followUp._previousDataValues?.status || "PENDING_SCHEDULING" },
        next: { status: plain.status },
        extra: { schedule_id: scheduleId, attempt_id: attempt.attempt_id, attempt_number: nextAttemptNumber },
      });
    }

    return this._formatResponse({ ...plain, attempts: [attempt.get({ plain: true })] });
  }

  /**
   * Mark an attempt as MISSED (patient did not attend).
   * The follow-up transitions to MISSED if no active SCHEDULED attempts remain.
   * A missed appointment does NOT close the follow-up - it can be rescheduled.
   * @param {string} attemptId
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.missedReason]
   * @param {string} [options.updatedBy]
   * @returns {Promise<object>}
   */
  async markAttemptMissed(attemptId, options = {}) {
    const { req, missedReason, updatedBy } = options;
    const attempt = await this._getAttempt(attemptId);

    if (attempt.status !== "SCHEDULED") {
      throw Object.assign(
        new Error(`Cannot mark attempt as MISSED in status '${attempt.status}'. Only SCHEDULED attempts can be missed.`),
        { status: 400 }
      );
    }

    await attempt.update({
      status: "MISSED",
      missed_reason: missedReason || null,
      updated_by: updatedBy || attempt.scheduled_by,
    });

    // Check if the parent follow-up still has any active SCHEDULED attempts
    const followUp = await this._getFollowUp(attempt.follow_up_id);
    const activeScheduledAttempts = await EncounterFollowUpAttempt.count({
      where: {
        follow_up_id: attempt.follow_up_id,
        status: "SCHEDULED",
      },
    });

    // If no more active scheduled attempts, transition parent to MISSED
    // But do NOT close the follow-up - it can be rescheduled
    if (activeScheduledAttempts === 0 && followUp.status === "SCHEDULED") {
      await followUp.update({
        status: "MISSED",
        updated_by: updatedBy || followUp.recommended_by,
      });

      const plain = followUp.get({ plain: true });
      await this._emitTimelineEvent(plain, "MISSED", {
        attempt_id: attemptId,
        attempt_number: attempt.attempt_number,
        missed_reason: missedReason,
      });

      if (req) {
        await recordAudit(req, {
          action: AUDIT_ACTIONS.MISS,
          resourceType: "EncounterFollowUp",
          resourceId: followUp.follow_up_id,
          module: "follow-up",
          previous: { status: "SCHEDULED" },
          next: { status: "MISSED" },
          extra: { missed_attempt_id: attemptId, attempt_number: attempt.attempt_number, missed_reason: missedReason },
        });
      }
    }

    return attempt.get({ plain: true });
  }

  /**
   * Mark an attempt as ATTENDED (patient came in).
   * This transitions the parent follow-up to COMPLETED.
   * @param {string} attemptId
   * @param {string} completedEncounterId
   * @param {string} [completionNotes]
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.updatedBy]
   * @returns {Promise<object>}
   */
  async markAttemptAttended(attemptId, completedEncounterId, completionNotes, options = {}) {
    const { req, updatedBy } = options;
    const attempt = await this._getAttempt(attemptId);

    if (attempt.status !== "SCHEDULED") {
      throw Object.assign(
        new Error(`Cannot mark attempt as ATTENDED in status '${attempt.status}'. Only SCHEDULED attempts can be attended.`),
        { status: 400 }
      );
    }

    // Verify the completing encounter exists
    const encounter = await StaffAppointment.findByPk(completedEncounterId);
    if (!encounter) {
      throw Object.assign(new Error("Completing encounter not found"), { status: 404 });
    }

    await attempt.update({
      status: "ATTENDED",
      attended_at: new Date(),
      updated_by: updatedBy || attempt.scheduled_by,
    });

    // Transition the parent follow-up to COMPLETED
    const followUp = await this._getFollowUp(attempt.follow_up_id);
    this.validateTransition(followUp.status, "COMPLETED");

    await followUp.update({
      status: "COMPLETED",
      completed_encounter_id: completedEncounterId,
      completion_notes: completionNotes || null,
      updated_by: updatedBy || followUp.recommended_by,
    });

    const plain = followUp.get({ plain: true });

    // Emit timeline event with attempt context
    await this._emitTimelineEvent(plain, "COMPLETED", {
      attempt_id: attemptId,
      attempt_number: attempt.attempt_number,
      completed_encounter_id: completedEncounterId,
    });

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.COMPLETE,
        resourceType: "EncounterFollowUp",
        resourceId: followUp.follow_up_id,
        module: "follow-up",
        previous: { status: followUp._previousDataValues?.status || "SCHEDULED" },
        next: { status: "COMPLETED", completed_encounter_id: completedEncounterId },
        extra: {
          completed_encounter_id: completedEncounterId,
          attempt_id: attemptId,
          attempt_number: attempt.attempt_number,
          completion_notes: completionNotes,
        },
      });
    }

    // Notify about completion
    await this._notifyFollowUpCompleted(plain, attempt, updatedBy);

    return this._formatResponse(plain);
  }

  /**
   * Mark an attempt as CANCELLED (reception cancelled the appointment).
   * The parent follow-up remains SCHEDULED if other active attempts exist,
   * or reverts to PENDING_SCHEDULING if no active attempts remain.
   * @param {string} attemptId
   * @param {string} [cancelReason]
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.updatedBy]
   * @returns {Promise<object>}
   */
  async markAttemptCancelled(attemptId, cancelReason, options = {}) {
    const { req, updatedBy } = options;
    const attempt = await this._getAttempt(attemptId);

    if (attempt.status !== "SCHEDULED") {
      throw Object.assign(
        new Error(`Cannot cancel attempt in status '${attempt.status}'. Only SCHEDULED attempts can be cancelled.`),
        { status: 400 }
      );
    }

    await attempt.update({
      status: "CANCELLED",
      cancel_reason: cancelReason || null,
      cancelled_at: new Date(),
      updated_by: updatedBy || attempt.scheduled_by,
    });

    // Check remaining active attempts
    const followUp = await this._getFollowUp(attempt.follow_up_id);
    const activeScheduledAttempts = await EncounterFollowUpAttempt.count({
      where: {
        follow_up_id: attempt.follow_up_id,
        status: "SCHEDULED",
      },
    });

    // If no more active scheduled attempts, revert to PENDING_SCHEDULING
    if (activeScheduledAttempts === 0 && followUp.status === "SCHEDULED") {
      await followUp.update({
        status: "PENDING_SCHEDULING",
        updated_by: updatedBy || followUp.recommended_by,
      });
    }

    return attempt.get({ plain: true });
  }

  /**
   * Auto-complete a follow-up when a patient is admitted through a follow-up appointment.
   * This is called by the admission flow - no manual completion required.
   * @param {string} scheduleId - The PatientSchedule that was admitted
   * @param {string} newEncounterId - The StaffAppointment created from admission
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.admittedBy]
   * @returns {Promise<object|null>} The completed follow-up, or null if no matching follow-up found
   */
  async autoCompleteFollowUp(scheduleId, newEncounterId, options = {}) {
    const { req, admittedBy } = options;

    // Find the follow-up attempt linked to this schedule
    const attempt = await EncounterFollowUpAttempt.findOne({
      where: { schedule_id: scheduleId, status: "SCHEDULED" },
      include: [
        { model: EncounterFollowUp, as: "followUp" },
      ],
      paranoid: false,
    });

    if (!attempt) {
      // No follow-up linked to this schedule - this is a normal appointment
      return null;
    }

    const followUp = attempt.followUp;
    if (!followUp) {
      return null;
    }

    // Verify the new encounter exists
    const encounter = await StaffAppointment.findByPk(newEncounterId);
    if (!encounter) {
      throw Object.assign(new Error("New encounter not found"), { status: 404 });
    }

    // Mark the attempt as ATTENDED
    await attempt.update({
      status: "ATTENDED",
      attended_at: new Date(),
      updated_by: admittedBy || followUp.recommended_by,
    });

    // Mark the follow-up as COMPLETED
    await followUp.update({
      status: "COMPLETED",
      completed_encounter_id: newEncounterId,
      completion_notes: "Auto-completed on patient return admission",
      updated_by: admittedBy || followUp.recommended_by,
    });

    const plain = followUp.get({ plain: true });

    // Emit timeline events
    await this._emitTimelineEvent(plain, "PATIENT_RETURNED", {
      attempt_id: attempt.attempt_id,
      attempt_number: attempt.attempt_number,
      new_encounter_id: newEncounterId,
      schedule_id: scheduleId,
    });

    await this._emitTimelineEvent(plain, "COMPLETED", {
      attempt_id: attempt.attempt_id,
      attempt_number: attempt.attempt_number,
      completed_encounter_id: newEncounterId,
      auto_completed: true,
    });

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.PATIENT_RETURNED,
        resourceType: "EncounterFollowUp",
        resourceId: followUp.follow_up_id,
        module: "follow-up",
        previous: { status: "SCHEDULED" },
        next: { status: "ATTENDED", new_encounter_id: newEncounterId },
        extra: {
          schedule_id: scheduleId,
          attempt_id: attempt.attempt_id,
          attempt_number: attempt.attempt_number,
          new_encounter_id: newEncounterId,
        },
      });

      await recordAudit(req, {
        action: AUDIT_ACTIONS.AUTO_COMPLETE,
        resourceType: "EncounterFollowUp",
        resourceId: followUp.follow_up_id,
        module: "follow-up",
        previous: { status: "ATTENDED" },
        next: { status: "COMPLETED", completed_encounter_id: newEncounterId },
        extra: {
          schedule_id: scheduleId,
          attempt_id: attempt.attempt_id,
          attempt_number: attempt.attempt_number,
          completed_encounter_id: newEncounterId,
        },
      });
    }

    // Notify about patient return and completion
    await this._notifyFollowUpPatientReturned(plain, attempt, admittedBy);
    await this._notifyFollowUpCompleted(plain, attempt, admittedBy);

    return this._formatResponse(plain);
  }

  /**
   * Expire a follow-up (e.g., target date passed without scheduling).
   * @param {string} followUpId
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.expiredBy]
   * @returns {Promise<object>}
   */
  async expireFollowUp(followUpId, options = {}) {
    const { req, expiredBy } = options;
    const followUp = await this._getFollowUp(followUpId);

    this.validateTransition(followUp.status, "EXPIRED");

    await followUp.update({
      status: "EXPIRED",
      updated_by: expiredBy || followUp.recommended_by,
    });

    const plain = followUp.get({ plain: true });

    // Emit timeline event
    await this._emitTimelineEvent(plain, "EXPIRED");

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.EXPIRE,
        resourceType: "EncounterFollowUp",
        resourceId: followUpId,
        module: "follow-up",
        previous: { status: followUp._previousDataValues?.status || "RECOMMENDED" },
        next: { status: "EXPIRED" },
      });
    }

    return this._formatResponse(plain);
  }

  /**
   * Get a single follow-up by ID.
   * @param {string} followUpId
   * @returns {Promise<object>}
   */
  async getFollowUp(followUpId) {
    const followUp = await this._getFollowUp(followUpId, true);
    return this._formatResponse(followUp.get({ plain: true }));
  }

  /**
   * List follow-ups for a patient.
   * @param {string} patientId
   * @param {object} [filters]
   * @param {string} [filters.status]
   * @param {number} [filters.limit]
   * @param {number} [filters.offset]
   * @returns {Promise<{rows: object[], count: number}>}
   */
  async listPatientFollowUps(patientId, filters = {}) {
    const where = { patient_id: patientId };
    if (filters.status) {
      where.status = filters.status;
    }

    const { count, rows } = await EncounterFollowUp.findAndCountAll({
      where,
      include: this._defaultIncludes(),
      order: [["created_at", "DESC"]],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      paranoid: false,
    });

    return {
      count,
      rows: rows.map((r) => this._formatResponse(r.get({ plain: true }))),
    };
  }

  /**
   * List follow-ups by status for reception queue views.
   * @param {object} [filters]
   * @param {string} [filters.status] - Filter by specific status
   * @param {string[]} [filters.statuses] - Filter by multiple statuses
   * @param {string} [filters.assigned_department_id]
   * @param {string} [filters.assigned_user_id]
   * @param {string} [filters.patient_id]
   * @param {number} [filters.limit]
   * @param {number} [filters.offset]
   * @returns {Promise<{rows: object[], count: number}>}
   */
  async listFollowUpsByStatus(filters = {}) {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.statuses && Array.isArray(filters.statuses)) {
      where.status = { [db.Sequelize.Op.in]: filters.statuses };
    }
    if (filters.assigned_department_id) {
      where.assigned_department_id = filters.assigned_department_id;
    }
    if (filters.assigned_user_id) {
      where.assigned_user_id = filters.assigned_user_id;
    }
    if (filters.patient_id) {
      where.patient_id = filters.patient_id;
    }

    const { count, rows } = await EncounterFollowUp.findAndCountAll({
      where,
      include: this._defaultIncludes(),
      order: [
        [db.Sequelize.literal(`CASE WHEN priority = 'URGENT' THEN 0 WHEN priority = 'HIGH' THEN 1 WHEN priority = 'NORMAL' THEN 2 ELSE 3 END`), "ASC"],
        ["recommended_date", "ASC"],
      ],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      paranoid: false,
    });

    return {
      count,
      rows: rows.map((r) => this._formatResponse(r.get({ plain: true }))),
    };
  }

  /**
   * Find a follow-up by schedule_id.
   * @param {string} scheduleId
   * @returns {Promise<object|null>}
   */
  async findFollowUpBySchedule(scheduleId) {
    const attempt = await EncounterFollowUpAttempt.findOne({
      where: { schedule_id: scheduleId },
      include: [
        {
          model: EncounterFollowUp,
          as: "followUp",
          include: this._defaultIncludes(),
        },
      ],
      paranoid: false,
    });

    if (!attempt || !attempt.followUp) {
      return null;
    }

    return this._formatResponse(attempt.followUp.get({ plain: true }));
  }

  /**
   * Get follow-up history for a specific follow-up.
   * @param {string} followUpId
   * @returns {Promise<object>}
   */
  async getFollowUpHistory(followUpId) {
    const followUp = await this._getFollowUp(followUpId, true);
    const plain = followUp.get({ plain: true });
    return this._formatResponse(plain);
  }

  /**
   * Check if a follow-up recommendation exists for an appointment.
   * @param {string} appointmentId
   * @returns {Promise<EncounterFollowUp|null>}
   */
  async findFollowUpForAppointment(appointmentId) {
    return EncounterFollowUp.findOne({
      where: {
        appointment_id: appointmentId,
        status: { [db.Sequelize.Op.notIn]: ["CANCELLED", "EXPIRED"] },
      },
      paranoid: false,
    });
  }

  /**
   * List all attempts for a follow-up.
   * @param {string} followUpId
   * @returns {Promise<object[]>}
   */
  async listAttempts(followUpId) {
    const attempts = await EncounterFollowUpAttempt.findAll({
      where: { follow_up_id: followUpId },
      include: [
        { model: PatientSchedule, as: "schedule", attributes: ["schedule_id", "schedule_date", "start_time", "end_time", "status", "appointment_type"] },
        { model: User, as: "scheduler", attributes: ["user_id", "full_name"] },
      ],
      order: [["attempt_number", "ASC"]],
      paranoid: false,
    });

    return attempts.map((a) => a.get({ plain: true }));
  }

  /**
   * Get follow-up counts by status for dashboard/reception overview.
   * @returns {Promise<object>}
   */
  async getFollowUpCounts() {
    const counts = await EncounterFollowUp.findAll({
      attributes: [
        "status",
        [db.sequelize.fn("COUNT", db.sequelize.col("follow_up_id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const result = {
      RECOMMENDED: 0,
      PENDING_SCHEDULING: 0,
      SCHEDULED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
      MISSED: 0,
    };

    for (const row of counts) {
      result[row.status] = Number(row.count) || 0;
    }

    return result;
  }

  // ============ Internal Helpers ============

  /**
   * Internal: Fetch follow-up with includes, throw if not found.
   */
  async _getFollowUp(followUpId, withIncludes = false) {
    const options = { where: { follow_up_id: followUpId }, paranoid: false };
    if (withIncludes) {
      options.include = this._defaultIncludes();
    }

    const followUp = await EncounterFollowUp.findOne(options);
    if (!followUp) {
      throw Object.assign(new Error("Follow-up not found"), { status: 404 });
    }
    return followUp;
  }

  /**
   * Internal: Fetch attempt by ID, throw if not found.
   */
  async _getAttempt(attemptId) {
    const attempt = await EncounterFollowUpAttempt.findOne({
      where: { attempt_id: attemptId },
      paranoid: false,
    });
    if (!attempt) {
      throw Object.assign(new Error("Follow-up attempt not found"), { status: 404 });
    }
    return attempt;
  }

  /**
   * Default includes for follow-up queries.
   */
  _defaultIncludes() {
    return [
      { model: User, as: "patient", attributes: ["user_id", "full_name", "email", "phone_number"] },
      { model: StaffAppointment, as: "appointment", attributes: ["appointment_id", "workflow_status", "workflow_completed_at"] },
      { model: User, as: "recommender", attributes: ["user_id", "full_name"] },
      { model: Department, as: "assignedDepartment", attributes: ["department_id", "name"] },
      { model: User, as: "assignedUser", attributes: ["user_id", "full_name"] },
      {
        model: EncounterFollowUpAttempt,
        as: "attempts",
        include: [
          {
            model: PatientSchedule,
            as: "schedule",
            attributes: ["schedule_id", "schedule_date", "start_time", "end_time", "status", "appointment_type", "assigned_staff_id"],
            include: [
              { model: User, as: "staff", attributes: ["user_id", "full_name"] },
            ],
          },
          { model: User, as: "scheduler", attributes: ["user_id", "full_name"] },
        ],
        required: false,
        order: [["attempt_number", "ASC"]],
      },
      { model: StaffAppointment, as: "completedEncounter", attributes: ["appointment_id", "workflow_status", "workflow_completed_at"] },
      { model: User, as: "createdByUser", attributes: ["user_id", "full_name"] },
      { model: User, as: "updatedByUser", attributes: ["user_id", "full_name"] },
    ];
  }

  /**
   * Emit a timeline event for the follow-up status change.
   * Enhanced with attempt and appointment references.
   */
  async _emitTimelineEvent(followUp, status, extra = {}) {
    const eventType = TIMELINE_EVENTS[status];
    if (!eventType) return;

    const titles = {
      FOLLOW_UP_RECOMMENDED: "Follow-up Recommended",
      FOLLOW_UP_UPDATED: "Follow-up Updated",
      FOLLOW_UP_SCHEDULED: "Follow-up Scheduled",
      FOLLOW_UP_RESCHEDULED: "Follow-up Rescheduled",
      FOLLOW_UP_COMPLETED: "Follow-up Completed",
      FOLLOW_UP_CANCELLED: "Follow-up Cancelled",
      FOLLOW_UP_EXPIRED: "Follow-up Expired",
      FOLLOW_UP_MISSED: "Follow-up Missed",
      FOLLOW_UP_PATIENT_RETURNED: "Patient Returned for Follow-up",
    };

    const descriptions = {
      FOLLOW_UP_RECOMMENDED: `Follow-up recommended: ${followUp.reason || "No reason specified"}`,
      FOLLOW_UP_UPDATED: "Follow-up recommendation details updated",
      FOLLOW_UP_SCHEDULED: extra.attempt_number
        ? `Appointment scheduled (Attempt #${extra.attempt_number})${extra.scheduled_date ? ` for ${extra.scheduled_date}` : ""}`
        : "Follow-up has been scheduled",
      FOLLOW_UP_RESCHEDULED: extra.attempt_number
        ? `Appointment rescheduled (Attempt #${extra.attempt_number})${extra.scheduled_date ? ` for ${extra.scheduled_date}` : ""}`
        : "Follow-up has been rescheduled",
      FOLLOW_UP_COMPLETED: extra.auto_completed
        ? "Follow-up auto-completed on patient return"
        : "Follow-up completed",
      FOLLOW_UP_CANCELLED: `Follow-up cancelled${followUp.cancel_reason ? `: ${followUp.cancel_reason}` : ""}`,
      FOLLOW_UP_EXPIRED: "Follow-up expired",
      FOLLOW_UP_MISSED: extra.attempt_number
        ? `Appointment missed (Attempt #${extra.attempt_number})${extra.missed_reason ? `: ${extra.missed_reason}` : ""}`
        : "Follow-up missed",
      FOLLOW_UP_PATIENT_RETURNED: extra.attempt_number
        ? `Patient returned for follow-up (Attempt #${extra.attempt_number})`
        : "Patient returned for follow-up",
    };

    const metadata = {
      status,
      priority: followUp.priority,
      reason: followUp.reason,
      follow_up_id: followUp.follow_up_id,
      ...extra,
    };

    try {
      await timelineEventService.emit({
        patient_id: followUp.patient_id,
        appointment_id: followUp.appointment_id,
        event_type: eventType,
        title: titles[eventType] || eventType,
        description: descriptions[eventType] || "",
        event_date: new Date(),
        actor_id: followUp.updated_by || followUp.recommended_by,
        resource_type: "EncounterFollowUp",
        resource_id: followUp.follow_up_id,
        metadata,
      });
    } catch (err) {
      console.error("Failed to emit follow-up timeline event:", err.message);
    }
  }

  /**
   * Send notification when a follow-up is scheduled.
   */
  async _notifyFollowUpScheduled(followUp, attempt, schedule, scheduledBy) {
    try {
      // Notify the assigned provider
      if (followUp.assigned_user_id) {
        await notificationService.notifyInternalUser(followUp.assigned_user_id, {
          title: "Follow-up Scheduled",
          message: `A follow-up has been scheduled for patient. Reason: ${followUp.reason}`,
          category: "appointments",
          relatedType: "follow_up",
          relatedId: followUp.follow_up_id,
        });
      }

      // Notify the assigned department if no specific user
      if (!followUp.assigned_user_id && followUp.assigned_department_id) {
        // Could notify department members here
      }
    } catch (err) {
      console.error("Failed to send follow-up scheduled notification:", err.message);
    }
  }

  /**
   * Send notification when a follow-up is cancelled.
   */
  async _notifyFollowUpCancelled(followUp, cancelledBy) {
    try {
      if (followUp.assigned_user_id) {
        await notificationService.notifyInternalUser(followUp.assigned_user_id, {
          title: "Follow-up Cancelled",
          message: `A follow-up has been cancelled. Reason: ${followUp.cancel_reason || "No reason provided"}`,
          category: "appointments",
          relatedType: "follow_up",
          relatedId: followUp.follow_up_id,
        });
      }
    } catch (err) {
      console.error("Failed to send follow-up cancelled notification:", err.message);
    }
  }

  /**
   * Send notification when a follow-up is completed.
   */
  async _notifyFollowUpCompleted(followUp, attempt, completedBy) {
    try {
      if (followUp.recommended_by) {
        await notificationService.notifyInternalUser(followUp.recommended_by, {
          title: "Follow-up Completed",
          message: `A follow-up you recommended has been completed. Reason: ${followUp.reason}`,
          category: "appointments",
          relatedType: "follow_up",
          relatedId: followUp.follow_up_id,
        });
      }
    } catch (err) {
      console.error("Failed to send follow-up completed notification:", err.message);
    }
  }

  /**
   * Send notification when a patient returns for a follow-up.
   */
  async _notifyFollowUpPatientReturned(followUp, attempt, admittedBy) {
    try {
      if (followUp.recommended_by) {
        await notificationService.notifyInternalUser(followUp.recommended_by, {
          title: "Patient Returned for Follow-up",
          message: `A patient has returned for their scheduled follow-up. Reason: ${followUp.reason}`,
          category: "appointments",
          relatedType: "follow_up",
          relatedId: followUp.follow_up_id,
        });
      }
    } catch (err) {
      console.error("Failed to send patient returned notification:", err.message);
    }
  }

  /**
   * Format response to remove internal fields.
   */
  _formatResponse(plain) {
    return {
      ...plain,
    };
  }
}

module.exports = new EncounterFollowUpService();