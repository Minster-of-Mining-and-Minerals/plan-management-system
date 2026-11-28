"use strict";

const shortTermPlanService = require("../../services/shortTermPlanService");

async function listPlans(req, res) {
  try {
    const data = await shortTermPlanService.listPlans(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

async function createPlan(req, res) {
  try {
    const data = await shortTermPlanService.createPlan(req.body, req.user?.user_id);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

async function getPlanDetail(req, res) {
  try {
    const data = await shortTermPlanService.getPlanDetail(req.params.planId, req.query, req.user);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

async function addKpi(req, res) {
  try {
    const data = await shortTermPlanService.addKpi(req.params.planId, req.body);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

async function assignKpi(req, res) {
  try {
    const data = await shortTermPlanService.assignKpi(req.params.kpiId, req.body, req.user?.user_id);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

async function submitPeriodReport(req, res) {
  try {
    const data = await shortTermPlanService.submitPeriodReport(req.params.assignmentId, req.body, req.user);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

async function updateKpi(req, res) {
  try {
    const data = await shortTermPlanService.updateKpi(req.params.kpiId, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

async function deleteKpi(req, res) {
  try {
    const data = await shortTermPlanService.deleteKpi(req.params.kpiId);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

async function updateAssignment(req, res) {
  try {
    const data = await shortTermPlanService.updateAssignment(req.params.assignmentId, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

async function getDashboardAnalytics(req, res) {
  try {
    const data = await shortTermPlanService.getDashboardAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

module.exports = {
  listPlans,
  createPlan,
  getPlanDetail,
  addKpi,
  updateKpi,
  deleteKpi,
  assignKpi,
  updateAssignment,
  submitPeriodReport,
  getDashboardAnalytics,
};
