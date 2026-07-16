"use strict";

const { getClientIp } = require("../../services/auditLogService");
const { validate: isUuid } = require("uuid");
const {
  createPlanAmendment,
  submitPlanAmendment,
  previewPlanAmendment,
  approvePlanAmendment,
  rejectPlanAmendment,
  cancelPlanAmendment,
  getPlanAmendmentById,
  listPlanAmendments,
} = require("../../services/planAmendment/planAmendmentEngine");
const {
  getAmendmentHandlerCatalog,
  listAvailableAmendmentTypes,
} = require("../../services/planAmendment/planAmendmentRegistry");

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
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createPlanAmendmentHandler,
  submitPlanAmendmentHandler,
  previewPlanAmendmentHandler,
  approvePlanAmendmentHandler,
  rejectPlanAmendmentHandler,
  cancelPlanAmendmentHandler,
  getPlanAmendmentHandler,
  listPlanAmendmentsHandler,
  listPlanAmendmentTypesHandler,
};
