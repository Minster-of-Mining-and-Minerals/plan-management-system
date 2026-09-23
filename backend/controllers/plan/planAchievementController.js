"use strict";

const { validate: isUuid } = require("uuid");
const { getClientIp } = require("../../services/auditLogService");
const {
  setPeriodTargetForExecutor,
  submitAchievement,
  approveAchievement,
  validateAchievement,
  rejectValidationAchievement,
  rejectAchievement,
} = require("../../services/planAchievementWorkflowService");
const {
  submitAnnualAchievement,
  approveAnnualAchievement,
  validateAnnualAchievement,
  rejectAnnualAchievement,
  rejectValidationAnnualAchievement,
} = require("../../services/planAnnualAchievementWorkflowService");
const { setPeriodActual } = require("../../services/planExecutionActualService");
const {
  resolveAchievementWorkflowScopeForVersion,
} = require("../../services/planAchievementWorkflowScopeService");
const {
  publishSectorAggregation,
  rejectSectorAggregationPublish,
  listSectorAggregationPublishState,
} = require("../../services/planSectorAggregationPublishService");

function auditContext(req) {
  return {
    user: req.user,
    ipAddress: getClientIp(req),
  };
}

function workflowOptions(req) {
  return {
    ...auditContext(req),
    io: req.app.get("io") ?? req.app.get("socketio") ?? null,
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
    const { period_actual, narration } = req.body;

    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await submitAchievement(nodeId, period_actual, {
      ...workflowOptions(req),
      narration,
    });
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

    const result = await approveAchievement(nodeId, workflowOptions(req));
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

    const result = await rejectAchievement(nodeId, comment, workflowOptions(req));
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

async function validateAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;

    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await validateAchievement(nodeId, workflowOptions(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Achievement validated",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function rejectValidationAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;
    const { comment } = req.body;

    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await rejectValidationAchievement(nodeId, comment, workflowOptions(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Achievement validation rejected",
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

    const result = await submitAchievement(nodeId, period_actual, workflowOptions(req));
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

async function listSectorAggregationPublishStateHandler(req, res) {
  try {
    const { id: versionId } = req.params;
    if (!isUuid(versionId)) {
      return res.status(400).json({ success: false, message: "Invalid version ID" });
    }

    const result = await listSectorAggregationPublishState(versionId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function publishSectorAggregationHandler(req, res) {
  try {
    const { id: versionId } = req.params;
    const { external_assignment_id } = req.body || {};

    if (!isUuid(versionId) || !isUuid(external_assignment_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid version ID and external_assignment_id are required",
      });
    }

    const result = await publishSectorAggregation(
      versionId,
      external_assignment_id,
      workflowOptions(req)
    );
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: result.alreadyPublished
        ? "Sector aggregation already published"
        : "Sector aggregation published for parent structures",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function rejectSectorAggregationPublishHandler(req, res) {
  try {
    const { id: versionId } = req.params;
    const { external_assignment_id, comment } = req.body || {};

    if (!isUuid(versionId) || !isUuid(external_assignment_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid version ID and external_assignment_id are required",
      });
    }

    const result = await rejectSectorAggregationPublish(
      versionId,
      external_assignment_id,
      comment,
      workflowOptions(req)
    );
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Sector aggregation publish cleared",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function submitAnnualAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;
    const { annual_actual, narration } = req.body;

    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await submitAnnualAchievement(nodeId, annual_actual, {
      ...workflowOptions(req),
      narration,
    });
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Annual achievement submitted",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function approveAnnualAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;
    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await approveAnnualAchievement(nodeId, workflowOptions(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Annual achievement approved",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function validateAnnualAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;
    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await validateAnnualAchievement(nodeId, workflowOptions(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Annual achievement validated",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function rejectAnnualAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;
    const { comment } = req.body || {};
    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await rejectAnnualAchievement(nodeId, comment, workflowOptions(req));
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Annual achievement rejected",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function rejectValidationAnnualAchievementHandler(req, res) {
  try {
    const { id: nodeId } = req.params;
    const { comment } = req.body || {};
    if (!isUuid(nodeId)) {
      return res.status(400).json({ success: false, message: "Invalid node ID" });
    }

    const result = await rejectValidationAnnualAchievement(
      nodeId,
      comment,
      workflowOptions(req)
    );
    if (!result.success) {
      return res.status(result.message?.includes("permission") ? 403 : 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: "Annual achievement validation rejected",
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
  validateAchievementHandler,
  rejectValidationAchievementHandler,
  rejectAchievementHandler,
  submitAnnualAchievementHandler,
  approveAnnualAchievementHandler,
  validateAnnualAchievementHandler,
  rejectAnnualAchievementHandler,
  rejectValidationAnnualAchievementHandler,
  updatePeriodActual,
  getAchievementWorkflowScope,
  listSectorAggregationPublishStateHandler,
  publishSectorAggregationHandler,
  rejectSectorAggregationPublishHandler,
};
