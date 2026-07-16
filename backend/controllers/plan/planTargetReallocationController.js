"use strict";

const { getClientIp } = require("../../services/auditLogService");
const { validate: isUuid } = require("uuid");
const {
  createTargetReallocationRequest,
  approveTargetReallocationRequest,
  rejectTargetReallocationRequest,
  cancelTargetReallocationRequest,
  listTargetReallocationRequests,
  getPeriodTargetReallocationReporting,
} = require("../../services/planTargetReallocationService");

function auditContext(req) {
  return {
    user: req.user,
    ipAddress: getClientIp(req),
    io: req.app.get("io") ?? req.app.get("socketio") ?? null,
  };
}

function permissionFailureStatus(message) {
  const normalized = String(message ?? "").toLowerCase();
  return normalized.includes("permission") || normalized.includes("assigned")
    ? 403
    : 400;
}

async function createTargetReallocationHandler(req, res) {
  try {
    const result = await createTargetReallocationRequest(req.body, auditContext(req));

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

async function approveTargetReallocationHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID" });
    }

    const result = await approveTargetReallocationRequest(id, req.body, auditContext(req));
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

async function rejectTargetReallocationHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID" });
    }

    const result = await rejectTargetReallocationRequest(id, req.body, auditContext(req));
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

async function cancelTargetReallocationHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID" });
    }

    const result = await cancelTargetReallocationRequest(id, auditContext(req));
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

async function listTargetReallocationsHandler(req, res) {
  try {
    const result = await listTargetReallocationRequests(req.validatedQuery ?? req.query);
    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getPeriodTargetReallocationReportingHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid plan version ID" });
    }

    const result = await getPeriodTargetReallocationReporting(
      id,
      req.validatedQuery ?? req.query
    );

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
  createTargetReallocationHandler,
  approveTargetReallocationHandler,
  rejectTargetReallocationHandler,
  cancelTargetReallocationHandler,
  listTargetReallocationsHandler,
  getPeriodTargetReallocationReportingHandler,
};