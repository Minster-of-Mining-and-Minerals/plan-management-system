"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const timelineEventService = require("./timelineEventService");
const { recordAudit } = require("./auditService");
const { EncounterFollowUp, EncounterFollowUpAttempt, User, StaffAppointment, Department, PatientSchedule } = db;

/**
 * Valid state transitions for EncounterFollowUp status lifecycle.
 */
const ALLOWED_TRANSITIONS = {
  RECOMMENDED: ["PENDING_SCHEDULING", "CANCELLED", "EXPIRED"],
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
};

/**
 * Audit actions for meaningful follow-up events.
 */
const AUDIT_ACTIONS = {
  CREATE: "Follow-up Created",
  UPDATE: "Follow-up Updated",
  SCHEDULE: "Follow-up Scheduled",
  CANCEL: "Follow-up Cancelled",
  COMPLETE: "Follow-up Completed",
  EXPIRE: "Follow-up Expired",
  MISS: "Follow-up Missed",
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

    return this._formatResponse(plain);
  }

  /**
   * Create a new scheduling attempt for a follow-up.
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
    if (["COMPLETED", "CANCELLED", "EXPIRED", "MISSED"].includes(followUp.status)) {
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

    // Create the attempt record
    const attempt = await EncounterFollowUpAttempt.create({
      attempt_id: uuidv4(),
      follow_up_id: followUpId,
      schedule_id: scheduleId,
      status: "SCHEDULED",
      scheduled_date: scheduledDate || schedule.scheduled_date || null,
      notes: notes || null,
      cancel_reason: null,
      scheduled_by: scheduledBy || followUp.recommended_by,
    });

    // If the follow-up was in RECOMMENDED or PENDING_SCHEDULING, transition to SCHEDULED
    if (followUp.status === "RECOMMENDED" || followUp.status === "PENDING_SCHEDULING") {
      await followUp.update({
        status: "SCHEDULED",
        updated_by: scheduledBy || followUp.recommended_by,
      });
    }

    const plain = followUp.get({ plain: true });

    // Emit timeline event
    await this._emitTimelineEvent(plain, "SCHEDULED");

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.SCHEDULE,
        resourceType: "EncounterFollowUp",
        resourceId: followUpId,
        module: "follow-up",
        previous: { status: followUp._previousDataValues?.status || "PENDING_SCHEDULING" },
        next: { status: plain.status },
        extra: { schedule_id: scheduleId, attempt_id: attempt.attempt_id },
      });
    }

    return this._formatResponse({ ...plain, attempts: [attempt.get({ plain: true })] });
  }

  /**
   * Mark an attempt as MISSED (patient did not attend).
   * If the follow-up still has no active SCHEDULED attempts, it transitions to MISSED.
   * @param {string} attemptId
   * @param {object} [options]
   * @param {object} [options.req]
   * @param {string} [options.cancelReason]
   * @param {string} [options.updatedBy]
   * @returns {Promise<object>}
   */
  async markAttemptMissed(attemptId, options = {}) {
    const { req, cancelReason, updatedBy } = options;
    const attempt = await this._getAttempt(attemptId);

    if (attempt.status !== "SCHEDULED") {
      throw Object.assign(
        new Error(`Cannot mark attempt as MISSED in status '${attempt.status}'. Only SCHEDULED attempts can be missed.`),
        { status: 400 }
      );
    }

    await attempt.update({
      status: "MISSED",
      cancel_reason: cancelReason || null,
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
    if (activeScheduledAttempts === 0 && followUp.status === "SCHEDULED") {
      await followUp.update({
        status: "MISSED",
        updated_by: updatedBy || followUp.recommended_by,
      });

      await this._emitTimelineEvent(followUp.get({ plain: true }), "MISSED");

      if (req) {
        await recordAudit(req, {
          action: AUDIT_ACTIONS.MISS,
          resourceType: "EncounterFollowUp",
          resourceId: followUp.follow_up_id,
          module: "follow-up",
          previous: { status: "SCHEDULED" },
          next: { status: "MISSED" },
          extra: { missed_attempt_id: attemptId },
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

    await attempt.update({ status: "ATTENDED" });

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

    // Emit timeline event
    await this._emitTimelineEvent(plain, "COMPLETED");

    // Audit
    if (req) {
      await recordAudit(req, {
        action: AUDIT_ACTIONS.COMPLETE,
        resourceType: "EncounterFollowUp",
        resourceId: followUp.follow_up_id,
        module: "follow-up",
        previous: { status: followUp._previousDataValues?.status || "SCHEDULED" },
        next: { status: "COMPLETED", completed_encounter_id: completedEncounterId },
        extra: { completed_encounter_id: completedEncounterId, attempt_id: attemptId, completion_notes: completionNotes },
      });
    }

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
        { model: PatientSchedule, as: "schedule", attributes: ["schedule_id", "status"] },
        { model: User, as: "scheduler", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
      paranoid: false,
    });

    return attempts.map((a) => a.get({ plain: true }));
  }

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
      { model: User, as: "patient", attributes: ["user_id", "full_name", "email"] },
      { model: StaffAppointment, as: "appointment", attributes: ["appointment_id", "workflow_status"] },
      { model: User, as: "recommender", attributes: ["user_id", "full_name"] },
      { model: Department, as: "assignedDepartment", attributes: ["department_id", "name"] },
      { model: User, as: "assignedUser", attributes: ["user_id", "full_name"] },
      {
        model: EncounterFollowUpAttempt,
        as: "attempts",
        include: [
          { model: PatientSchedule, as: "schedule", attributes: ["schedule_id", "status"] },
          { model: User, as: "scheduler", attributes: ["user_id", "full_name"] },
        ],
        required: false,
      },
      { model: StaffAppointment, as: "completedEncounter", attributes: ["appointment_id", "workflow_status"] },
      { model: User, as: "createdByUser", attributes: ["user_id", "full_name"] },
      { model: User, as: "updatedByUser", attributes: ["user_id", "full_name"] },
    ];
  }

  /**
   * Emit a timeline event for the follow-up status change.
   */
  async _emitTimelineEvent(followUp, status) {
    const eventType = TIMELINE_EVENTS[status];
    if (!eventType) return;

    const titles = {
      FOLLOW_UP_RECOMMENDED: "Follow-up Recommended",
      FOLLOW_UP_UPDATED: "Follow-up Updated",
      FOLLOW_UP_SCHEDULED: "Follow-up Scheduled",
      FOLLOW_UP_COMPLETED: "Follow-up Completed",
      FOLLOW_UP_CANCELLED: "Follow-up Cancelled",
      FOLLOW_UP_EXPIRED: "Follow-up Expired",
      FOLLOW_UP_MISSED: "Follow-up Missed",
    };

    const descriptions = {
      FOLLOW_UP_RECOMMENDED: `Follow-up recommended: ${followUp.reason || "No reason specified"}`,
      FOLLOW_UP_UPDATED: "Follow-up recommendation details updated",
      FOLLOW_UP_SCHEDULED: "Follow-up has been scheduled",
      FOLLOW_UP_COMPLETED: "Follow-up completed",
      FOLLOW_UP_CANCELLED: `Follow-up cancelled${followUp.cancel_reason ? `: ${followUp.cancel_reason}` : ""}`,
      FOLLOW_UP_EXPIRED: "Follow-up expired",
      FOLLOW_UP_MISSED: "Follow-up missed",
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
        metadata: {
          status,
          priority: followUp.priority,
          reason: followUp.reason,
          follow_up_id: followUp.follow_up_id,
        },
      });
    } catch (err) {
      console.error("Failed to emit follow-up timeline event:", err.message);
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