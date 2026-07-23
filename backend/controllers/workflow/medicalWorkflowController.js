"use strict";

const medicalWorkflowService = require("../../services/medicalWorkflowService");
const appointmentService = require("../../services/appointmentService");
const { logAudit, auditContextFromReq } = require("../../services/auditService");
const encounterCompletionService = require("../../services/encounterCompletionService");
const followUpContinuityService = require("../../services/followUpContinuityService");
const timelineEventService = require("../../services/timelineEventService");

const ensureReceivePatient = async (req, res, next) => {
  try {
    const ok = await appointmentService.userCanReceivePatients(req.user.user_id);
    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to receive workflow patients",
      });
    }
    return next();
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getContext = async (req, res) => {
  try {
    const data = await medicalWorkflowService.getWorkflowContext(
      req.params.appointmentId,
      req.user.user_id
    );
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const submitEntry = async (req, res) => {
  try {
    const log = await medicalWorkflowService.submitWorkflowEntry(
      req.user.user_id,
      req.body
    );
    const ctx = auditContextFromReq(req, {
      appointment_id: req.body?.appointment_id,
      action_type: req.body?.action_type,
      header_title: req.body?.header_title,
    });
    await logAudit({
      actorUserId: req.user.user_id,
      action: req.body?.action_type || "submit",
      resourceType: "workflow",
      resourceId: req.body?.appointment_id || null,
      details: ctx.details,
      ipAddress: ctx.ipAddress,
    });
    return res.json({ success: true, data: log });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
      errors: e.details,
    });
  }
};

const listTimeline = async (req, res) => {
  try {
    const { appointment_id, patient_id, schedule_id } = req.query;
    const rows = await medicalWorkflowService.listTimeline({
      appointmentId: appointment_id,
      patientId: patient_id,
      scheduleId: schedule_id,
      staffId: req.user.user_id,
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const listInbox = async (req, res) => {
  try {
    const ok = await appointmentService.userCanReceivePatients(req.user.user_id);
    if (!ok) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to receive workflow patients",
      });
    }

    const { status, page, limit } = req.query;
    const rows = await medicalWorkflowService.listInbox(req.user.user_id, {
      status,
      page,
      limit,
    });
    if (rows?.paginated) {
      return res.json({
        success: true,
        data: rows.results,
        pagination: {
          total: rows.total,
          totalPages: rows.totalPages,
          currentPage: rows.currentPage,
          limit: rows.limit,
        },
      });
    }
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const listReceivers = async (req, res) => {
  try {
    const users = await medicalWorkflowService.listEligibleReceivers(
      req.user.user_id
    );
    return res.json({ success: true, data: users });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const validateCompletion = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const followUpRequired = req.query.followUpRequired === "true";
    const result = await encounterCompletionService.validateCompletion(
      appointmentId,
      req.user.user_id,
      { followUpRequired }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const executeCompletion = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { overrideReason, overriddenWarnings } = req.body;

    const log = await encounterCompletionService.executeCompletion(
      appointmentId,
      req.user.user_id,
      { overrideReason, overriddenWarnings }
    );

    const ctx = auditContextFromReq(req, {
      appointment_id: appointmentId,
      action_type: "complete",
      override_reason: overrideReason || null,
      overridden_warnings: overriddenWarnings || [],
    });
    await logAudit({
      actorUserId: req.user.user_id,
      action: "complete",
      resourceType: "workflow",
      resourceId: appointmentId,
      details: ctx.details,
      ipAddress: ctx.ipAddress,
    });

    return res.json({ success: true, data: log });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
      errors: e.details,
    });
  }
};

// ============ Phase 2.4.3 - Follow-up Continuity Context ============

/**
 * Get follow-up clinical context for a follow-up encounter.
 * GET /api/workflow/:appointmentId/follow-up-context
 * Permission: workflow:read (via canAccessAppointment)
 */
const getFollowUpContext = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Verify access to this appointment using existing auth
    // This also returns the appointment data we need
    const appointment = await medicalWorkflowService.canAccessAppointment(appointmentId, req.user.user_id);

    const context = await followUpContinuityService.getFollowUpContext(appointmentId);

    // Emit timeline event for follow-up encounters
    if (context.is_follow_up) {
      try {
        // Use the already loaded appointment data
        await timelineEventService.emit({
          patient_id: appointment.patient_id,
          appointment_id: appointmentId,
          event_type: "FOLLOW_UP_CONTEXT_OPENED",
          title: "Follow-up Context Viewed",
          description: `Clinician viewed follow-up context for encounter originating from ${context.origin_encounter_id}`,
          event_date: new Date(),
          actor_id: req.user.user_id,
          resource_type: "EncounterFollowUp",
          resource_id: context.follow_up_id,
          metadata: {
            follow_up_id: context.follow_up_id,
            origin_encounter_id: context.origin_encounter_id,
            reason: context.reason,
            attempt_number: context.attempt_number,
          },
        });
      } catch (eventErr) {
        // Non-fatal: timeline event emission failure should not block response
        console.error("Failed to emit FOLLOW_UP_CONTEXT_OPENED:", eventErr.message);
      }
    }

    // Audit
    const ctx = auditContextFromReq(req, {
      appointment_id: appointmentId,
      follow_up_id: context.follow_up_id,
      is_follow_up: context.is_follow_up,
    });
    await logAudit({
      actorUserId: req.user.user_id,
      action: "follow_up_context_viewed",
      resourceType: "workflow",
      resourceId: appointmentId,
      details: ctx.details,
      ipAddress: ctx.ipAddress,
    }).catch(() => {});

    return res.json({ success: true, data: context });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

module.exports = {
  ensureReceivePatient,
  getContext,
  submitEntry,
  listTimeline,
  listInbox,
  listReceivers,
  validateCompletion,
  executeCompletion,
  getFollowUpContext,
};
