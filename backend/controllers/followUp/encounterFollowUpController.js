"use strict";

const encounterFollowUpService = require("../../services/encounterFollowUpService");

const createFollowUp = async (req, res) => {
  try {
    const data = req.body;
    const followUp = await encounterFollowUpService.createFollowUp(data, { req });
    return res.status(201).json({ success: true, data: followUp });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const getFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const followUp = await encounterFollowUpService.getFollowUp(id);
    return res.json({ success: true, data: followUp });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const listPatientFollowUps = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, limit, offset } = req.query;
    const result = await encounterFollowUpService.listPatientFollowUps(patientId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return res.json({ success: true, data: result.rows, count: result.count });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const updateFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const followUp = await encounterFollowUpService.updateFollowUp(id, req.body, {
      req,
      updatedBy: req.user.user_id,
    });
    return res.json({ success: true, data: followUp });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

// ============ Attempt-based scheduling (one-to-many) ============

const createAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { schedule_id, scheduled_date, notes } = req.body;
    const result = await encounterFollowUpService.createAttempt(
      id,
      schedule_id,
      {
        req,
        scheduledBy: req.user.user_id,
        scheduledDate: scheduled_date,
        notes,
      }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const markAttemptMissed = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { missed_reason } = req.body;
    const result = await encounterFollowUpService.markAttemptMissed(
      attemptId,
      {
        req,
        missedReason: missed_reason,
        updatedBy: req.user.user_id,
      }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const markAttemptAttended = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { completed_encounter_id, completion_notes } = req.body;
    const result = await encounterFollowUpService.markAttemptAttended(
      attemptId,
      completed_encounter_id,
      completion_notes,
      { req, updatedBy: req.user.user_id }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const markAttemptCancelled = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { cancel_reason } = req.body;
    const result = await encounterFollowUpService.markAttemptCancelled(
      attemptId,
      cancel_reason,
      { req, updatedBy: req.user.user_id }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const listAttempts = async (req, res) => {
  try {
    const { id } = req.params;
    const attempts = await encounterFollowUpService.listAttempts(id);
    return res.json({ success: true, data: attempts });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

// ============ Phase 2.4.2 - Scheduling Workflow ============

/**
 * Schedule a follow-up appointment (creates PatientSchedule + EncounterFollowUpAttempt).
 * POST /api/follow-ups/:id/schedule-appointment
 */
const scheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const scheduleData = req.body;
    const result = await encounterFollowUpService.scheduleAppointment(
      id,
      scheduleData,
      { req, scheduledBy: req.user.user_id }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

/**
 * Reschedule a missed/cancelled attempt.
 * POST /api/follow-ups/:id/reschedule/:previousAttemptId
 */
const rescheduleAttempt = async (req, res) => {
  try {
    const { id, previousAttemptId } = req.params;
    const scheduleData = req.body;
    const result = await encounterFollowUpService.rescheduleAttempt(
      id,
      previousAttemptId,
      scheduleData,
      { req, scheduledBy: req.user.user_id }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

/**
 * List follow-ups by status (reception queue).
 * GET /api/follow-ups/queue?status=PENDING_SCHEDULING
 */
const listFollowUpsByStatus = async (req, res) => {
  try {
    const { status, statuses, assigned_department_id, assigned_user_id, patient_id, limit, offset } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (statuses) filters.statuses = Array.isArray(statuses) ? statuses : statuses.split(",");
    if (assigned_department_id) filters.assigned_department_id = assigned_department_id;
    if (assigned_user_id) filters.assigned_user_id = assigned_user_id;
    if (patient_id) filters.patient_id = patient_id;
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    const result = await encounterFollowUpService.listFollowUpsByStatus(filters);
    return res.json({ success: true, data: result.rows, count: result.count });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

/**
 * Find a follow-up by schedule_id.
 * GET /api/follow-ups/by-schedule/:scheduleId
 */
const findFollowUpBySchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const followUp = await encounterFollowUpService.findFollowUpBySchedule(scheduleId);
    return res.json({ success: true, data: followUp });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

/**
 * Auto-complete a follow-up (called on patient admission).
 * POST /api/follow-ups/auto-complete
 */
const autoCompleteFollowUp = async (req, res) => {
  try {
    const { schedule_id, new_encounter_id } = req.body;
    const result = await encounterFollowUpService.autoCompleteFollowUp(
      schedule_id,
      new_encounter_id,
      { req, admittedBy: req.user.user_id }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

/**
 * Get follow-up counts by status.
 * GET /api/follow-ups/counts
 */
const getFollowUpCounts = async (req, res) => {
  try {
    const counts = await encounterFollowUpService.getFollowUpCounts();
    return res.json({ success: true, data: counts });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

// ============ Legacy convenience endpoints ============

const scheduleFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { schedule_id, scheduled_date, notes } = req.body;
    const result = await encounterFollowUpService.createAttempt(
      id,
      schedule_id,
      {
        req,
        scheduledBy: req.user.user_id,
        scheduledDate: scheduled_date,
        notes,
      }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const completeFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { completed_encounter_id, completion_notes } = req.body;

    // Find the most recent SCHEDULED attempt and mark it as attended
    const attempts = await encounterFollowUpService.listAttempts(id);
    const activeAttempt = attempts.find((a) => a.status === "SCHEDULED");
    if (!activeAttempt) {
      return res.status(400).json({
        success: false,
        message: "No active scheduled attempt found for this follow-up",
      });
    }

    const result = await encounterFollowUpService.markAttemptAttended(
      activeAttempt.attempt_id,
      completed_encounter_id,
      completion_notes,
      { req, updatedBy: req.user.user_id }
    );
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const cancelFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancel_reason } = req.body;
    const followUp = await encounterFollowUpService.cancelFollowUp(
      id,
      cancel_reason,
      { req, cancelledBy: req.user.user_id }
    );
    return res.json({ success: true, data: followUp });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

const getFollowUpHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await encounterFollowUpService.getFollowUpHistory(id);
    return res.json({ success: true, data: history });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
    });
  }
};

module.exports = {
  createFollowUp,
  getFollowUp,
  listPatientFollowUps,
  updateFollowUp,
  scheduleFollowUp,
  completeFollowUp,
  cancelFollowUp,
  getFollowUpHistory,
  // Attempt-based endpoints
  createAttempt,
  markAttemptMissed,
  markAttemptAttended,
  markAttemptCancelled,
  listAttempts,
  // Phase 2.4.2 - Scheduling Workflow
  scheduleAppointment,
  rescheduleAttempt,
  listFollowUpsByStatus,
  findFollowUpBySchedule,
  autoCompleteFollowUp,
  getFollowUpCounts,
};