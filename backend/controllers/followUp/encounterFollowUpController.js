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
    const { cancel_reason } = req.body;
    const result = await encounterFollowUpService.markAttemptMissed(
      attemptId,
      {
        req,
        cancelReason: cancel_reason,
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
};