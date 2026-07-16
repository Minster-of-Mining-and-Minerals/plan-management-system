"use strict";

const { getClientIp } = require("../../services/auditLogService");
const { validate: isUuid } = require("uuid");
const {
  createPlanAmendment,
  submitPlanAmendment,
  previewPlanAmendment,
  getPlanAmendmentImpact,
  approvePlanAmendment,
  rejectPlanAmendment,
  cancelPlanAmendment,
  getPlanAmendmentById,
  listPlanAmendments,
  createCompensatingAmendment,
  getPlanAmendmentReporting,
  getAmendmentHistory,
  getAmendmentActions,
} = require("../../services/planAmendment/planAmendmentEngine");
const {
  getAmendmentHandlerCatalog,
  listAvailableAmendmentTypes,
} = require("../../services/planAmendment/planAmendmentRegistry");
const {
  getAnnualTargetRevisionReporting,
} = require("../../services/planAmendment/annualTargetRevisionReportingService");
const {
  ANNUAL_TARGET_REVISION_REASONS,
} = require("../../services/planAmendment/annualTargetRevisionDomain");

function auditContext(req) {
  return {
    user: req.user,
    ipAddress: getClientIp(req),
    io: req.app.get("io") ?? req.app.get("socketio") ?? null,
  };
}

function permissionFailureStatus(message) {
  const normalized = String(message ?? "").toLowerCase();
  return normalized.includes("permission") ||
    normalized.includes("assigned") ||
    normalized.includes("scope")
    ? 403
    : 400;
}

async function createPlanAmendmentHandler(req, res) {
  try {
    const result = await createPlanAmendment(req.body, auditContext(req));
    if (!result.success) {
      return res.status(permissionFailureStatus(result.message)).json({
        success: false,
        message: result.message,
        details: result.details,
      });
    }

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function submitPlanAmendmentHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const result = await submitPlanAmendment(id, auditContext(req));
    if (!result.success) {
      return res.status(permissionFailureStatus(result.message)).json({
        success: false,
        message: result.message,
        details: result.details,
      });
    }

    return res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function previewPlanAmendmentHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const result = await previewPlanAmendment(id, auditContext(req));
    if (!result.success) {
      return res.status(permissionFailureStatus(result.message)).json({
        success: false,
        message: result.message,
        details: result.details,
      });
    }

    return res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function impactPlanAmendmentHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const result = await getPlanAmendmentImpact(id, auditContext(req));
    if (!result.success) {
      return res.status(permissionFailureStatus(result.message)).json({
        success: false,
        message: result.message,
        details: result.details,
      });
    }

    return res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function listPlanAmendmentActionsHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const amendment = await getPlanAmendmentById(id);
    if (!amendment.success) {
      return res.status(404).json({ success: false, message: amendment.message });
    }

    const result = await getAmendmentActions(id);
    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function listPlanAmendmentHistoryHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const amendment = await getPlanAmendmentById(id);
    if (!amendment.success) {
      return res.status(404).json({ success: false, message: amendment.message });
    }

    const actionId = req.query.actionId ?? req.query.action_id ?? null;
    if (actionId && !isUuid(actionId)) {
      return res.status(400).json({ success: false, message: "Invalid action ID" });
    }

    const result = await getAmendmentHistory(id, { actionId });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function reportPlanAmendmentsHandler(req, res) {
  try {
    const draftId =
      req.validatedQuery?.draftId ??
      req.query.draftId ??
      req.query.draft_id ??
      req.query.master_plan_version_id ??
      req.query.masterPlanVersionId;

    if (!draftId || !isUuid(draftId)) {
      return res.status(400).json({
        success: false,
        message: "draftId (master plan version) is required",
      });
    }

    const result = await getPlanAmendmentReporting(draftId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createCompensatingAmendmentHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const result = await createCompensatingAmendment(id, req.body, auditContext(req));
    if (!result.success) {
      return res.status(permissionFailureStatus(result.message)).json({
        success: false,
        message: result.message,
        details: result.details,
      });
    }

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function approvePlanAmendmentHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const result = await approvePlanAmendment(id, req.body, auditContext(req));
    if (!result.success) {
      return res.status(permissionFailureStatus(result.message)).json({
        success: false,
        message: result.message,
        details: result.details,
      });
    }

    return res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function rejectPlanAmendmentHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const result = await rejectPlanAmendment(id, req.body, auditContext(req));
    if (!result.success) {
      return res.status(permissionFailureStatus(result.message)).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function cancelPlanAmendmentHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const result = await cancelPlanAmendment(id, auditContext(req));
    if (!result.success) {
      return res.status(permissionFailureStatus(result.message)).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getPlanAmendmentHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid amendment ID" });
    }

    const result = await getPlanAmendmentById(id);
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.message });
    }

    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function listPlanAmendmentsHandler(req, res) {
  try {
    const result = await listPlanAmendments(req.validatedQuery ?? req.query);
    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function listPlanAmendmentTypesHandler(_req, res) {
  try {
    return res.json({
      success: true,
      data: {
        available: listAvailableAmendmentTypes(),
        catalog: getAmendmentHandlerCatalog(),
        annual_target_revision_reasons: ANNUAL_TARGET_REVISION_REASONS,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getAnnualTargetRevisionReportingHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid plan version ID" });
    }

    const result = await getAnnualTargetRevisionReporting(id, req.query);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createPlanAmendmentHandler,
  submitPlanAmendmentHandler,
  previewPlanAmendmentHandler,
  impactPlanAmendmentHandler,
  listPlanAmendmentActionsHandler,
  listPlanAmendmentHistoryHandler,
  reportPlanAmendmentsHandler,
  createCompensatingAmendmentHandler,
  approvePlanAmendmentHandler,
  rejectPlanAmendmentHandler,
  cancelPlanAmendmentHandler,
  getPlanAmendmentHandler,
  listPlanAmendmentsHandler,
  listPlanAmendmentTypesHandler,
  getAnnualTargetRevisionReportingHandler,
};
