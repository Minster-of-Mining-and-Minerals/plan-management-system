"use strict";

const { getPlanExecutionDashboard } = require("../../services/planExecutionDashboardService");

function logDashboardTelemetry({ req, query, durationMs, success, error = null }) {
  if (process.env.NODE_ENV === "test") return;
  if (process.env.ENABLE_DASHBOARD_METRICS === "false") return;

  const logPayload = {
    event: "dashboard_execution_metrics",
    timestamp: new Date().toISOString(),
    section: query.section || "full",
    duration_ms: durationMs,
    success,
    user_id: req.user?.user_id || "anonymous",
    role: req.user?.roles?.[0] || "unknown",
    government_structure_id: req.user?.government_structure_id || null,
  };

  if (error) {
    logPayload.error = error.message;
  }

  console.log(`[DASHBOARD_METRICS] ${JSON.stringify(logPayload)}`);
}

async function handleDashboardRequest(req, res, queryOverride = null) {
  const start = process.hrtime.bigint();
  const query = queryOverride || req.validatedQuery || req.query;

  try {
    const data = await getPlanExecutionDashboard(req, query);
    const durationMs = Number((Number(process.hrtime.bigint() - start) / 1e6).toFixed(2));

    // Standard W3C Server-Timing header for APM & browser devtools
    res.set("Server-Timing", `total;dur=${durationMs};desc="Dashboard Execution"`);

    logDashboardTelemetry({ req, query, durationMs, success: true });
    return res.json({ success: true, data });
  } catch (error) {
    const durationMs = Number((Number(process.hrtime.bigint() - start) / 1e6).toFixed(2));
    logDashboardTelemetry({ req, query, durationMs, success: false, error });
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getExecutionDashboard(req, res) {
  return handleDashboardRequest(req, res);
}

async function getExecutionDashboardSummary(req, res) {
  const query = { ...(req.validatedQuery ?? req.query), section: "overview" };
  return handleDashboardRequest(req, res, query);
}

async function getExecutionDashboardProgressTree(req, res) {
  const query = { ...(req.validatedQuery ?? req.query), section: "progress_tree" };
  return handleDashboardRequest(req, res, query);
}

async function getExecutionDashboardDepartmentUser(req, res) {
  const query = { ...(req.validatedQuery ?? req.query), section: "department_user" };
  return handleDashboardRequest(req, res, query);
}

module.exports = {
  getExecutionDashboard,
  getExecutionDashboardSummary,
  getExecutionDashboardProgressTree,
  getExecutionDashboardDepartmentUser,
};
