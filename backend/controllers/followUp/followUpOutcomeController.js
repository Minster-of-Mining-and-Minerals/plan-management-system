"use strict";

const followUpOutcomeService = require("../../services/followUpOutcomeService");
const followUpContinuityService = require("../../services/followUpContinuityService");

const getOutcome = async (req, res) => {
  try {
    const { id } = req.params;
    const outcome = await followUpOutcomeService.getOutcome(id);
    if (!outcome) {
      return res.json({ success: true, data: null });
    }
    return res.json({ success: true, data: outcome });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const createOutcome = async (req, res) => {
  try {
    const { id } = req.params;
    const data = {
      follow_up_id: id,
      encounter_id: req.body.encounter_id,
      outcome_status: req.body.outcome_status,
      treatment_response: req.body.treatment_response,
      resolution_notes: req.body.resolution_notes,
      requires_additional_follow_up: req.body.requires_additional_follow_up || false,
      recorded_by: req.user.user_id,
    };
    const outcome = await followUpOutcomeService.createOutcome(data, {
      req,
      recordedBy: req.user.user_id,
    });
    return res.status(201).json({ success: true, data: outcome });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const updateOutcome = async (req, res) => {
  try {
    const { id, outcomeId } = req.params;
    const outcome = await followUpOutcomeService.updateOutcome(
      outcomeId,
      req.body,
      { req, updatedBy: req.user.user_id }
    );
    return res.json({ success: true, data: outcome });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const createNextFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const followUpData = {
      patient_id: req.body.patient_id,
      appointment_id: req.body.appointment_id,
      recommended_by: req.user.user_id,
      assigned_department_id: req.body.assigned_department_id,
      assigned_user_id: req.body.assigned_user_id,
      reason: req.body.reason,
      clinical_instructions: req.body.clinical_instructions,
      priority: req.body.priority || "NORMAL",
      recommended_date: req.body.recommended_date || new Date().toISOString().split("T")[0],
      target_date: req.body.target_date,
      metadata: req.body.metadata || {},
    };
    const newFollowUp = await followUpOutcomeService.createNextFollowUp(id, followUpData, { req });
    return res.status(201).json({ success: true, data: newFollowUp });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const getFollowUpChain = async (req, res) => {
  try {
    const { id } = req.params;
    const chain = await followUpOutcomeService.buildFollowUpChain(id);
    return res.json({ success: true, data: chain });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

// Analytics endpoints
const getAnalytics = async (req, res) => {
  try {
    const distribution = await followUpOutcomeService.getOutcomeDistribution();
    const resolutionRate = await followUpOutcomeService.getResolutionRate();
    const worsenedRate = await followUpOutcomeService.getWorsenedRate();
    const referralRate = await followUpOutcomeService.getReferralRate();
    const lostFollowUpRate = await followUpOutcomeService.getLostFollowUpRate();
    const avgResolutionTime = await followUpOutcomeService.getAverageResolutionTime();
    const avgChainLength = await followUpOutcomeService.getAverageChainLength();
    const perProvider = await followUpOutcomeService.getFollowUpsPerProvider();
    const perSpecialty = await followUpOutcomeService.getFollowUpsPerSpecialty();

    return res.json({
      success: true,
      data: {
        distribution,
        resolution_rate: resolutionRate,
        worsened_rate: worsenedRate,
        referral_rate: referralRate,
        lost_follow_up_rate: lostFollowUpRate,
        average_resolution_time_days: avgResolutionTime,
        average_chain_length: avgChainLength,
        per_provider: perProvider,
        per_specialty: perSpecialty,
      },
    });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

module.exports = {
  getOutcome,
  createOutcome,
  updateOutcome,
  createNextFollowUp,
  getFollowUpChain,
  getAnalytics,
};