"use strict";

const { validate: isUuid } = require("uuid");
const { getClientIp } = require("../../services/auditLogService");
const {
  setPeriodTargetForExecutor,
  submitAchievement,
  approveAchievement,
  rejectAchievement,
} = require("../../services/planAchievementWorkflowService");
const { setPeriodActual } = require("../../services/planExecutionActualService");
const {
  resolveAchievementWorkflowScopeForVersion,
} = require("../../services/planAchievementWorkflowScopeService");

function auditContext(req) {
  return {
    user: req.user,
    ipAddress: getClientIp(req),
  };
}

async function updatePeriodTarget(req, res) {
  try {
    const { id: nodeId } = req.params;
    const { period_target } = req.body;

    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await setPeriodTargetForExecutor(nodeId, period_target, auditContext(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Period target updated",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function submitAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;
    const { period_actual } = req.body;

    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await submitAchievement(nodeId, period_actual, auditContext(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Achievement submitted for approval",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function approveAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;

    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await approveAchievement(nodeId, auditContext(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Achievement approved",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function rejectAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;
    const { comment } = req.body;

    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await rejectAchievement(nodeId, comment, auditContext(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Achievement rejected",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updatePeriodActual(req, res) {
  try {
    const { id: nodeId } = req.params;
    const { period_actual, use_parent_override, clear_parent_override } = req.body;

    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    if (use_parent_override || clear_parent_override) {
      const result = await setPeriodActual(nodeId, period_actual, {
        user: req.user,
        use_parent_override: Boolean(use_parent_override),
        clear_parent_override: Boolean(clear_parent_override),
      });
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }

      return res.json({
        success: true,
        message: "Period achievement override updated",
        data: result.data,
      });
    }

    const result = await submitAchievement(nodeId, period_actual, auditContext(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message:
        period_actual === null || period_actual === undefined
          ? "Achievement cleared"
          : "Achievement submitted for approval",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getAchievementWorkflowScope(req, res) {
  try {
    const { id: versionId } = req.params;

    if (!isUuid(versionId)) {
      return res.status(400).json({ success: false, message: "Invalid version ID" });
    }

    const result = await resolveAchievementWorkflowScopeForVersion(versionId, req.user);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  updatePeriodTarget,
  submitAchievementHandler,
  approveAchievementHandler,
  rejectAchievementHandler,
  updatePeriodActual,
  getAchievementWorkflowScope,
};
