"use strict";

const { getPlanExecutionDashboard } = require("../../services/planExecutionDashboardService");

async function getExecutionDashboard(req, res) {
  try {
    const data = await getPlanExecutionDashboard(req, req.validatedQuery ?? req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getExecutionDashboard,
};
