"use strict";

const { sendPermissionDenied, toPermissionKey } = require("../utils/permissionDeniedUtils");
const {
  hasFullPlanRead,
  userCanAccessPlanVersion,
  userCanAccessPlanNode,
} = require("../services/planReviewVisibilityService");

const PLAN_READ_PERMISSIONS = [
  { resource: "PLANS", action: "READ" },
  { resource: "PLAN", action: "VIEW_ASSIGNED_REVIEW" },
].map(({ resource, action }) => toPermissionKey(resource, action));

function requirePlanVersionReadAccess(param = "id") {
  return async (req, res, next) => {
    if (hasFullPlanRead(req.user)) {
      return next();
    }

    const versionId = req.params[param];
    if (!versionId) {
      return res.status(400).json({ success: false, message: "Invalid plan version" });
    }

    const allowed = await userCanAccessPlanVersion(versionId, req.user);
    if (!allowed) {
      return sendPermissionDenied(res, {
        message: "Access denied",
        permissions: PLAN_READ_PERMISSIONS,
        mode: "any",
      });
    }

    return next();
  };
}

function requirePlanNodeReadAccess(param = "id") {
  return async (req, res, next) => {
    if (hasFullPlanRead(req.user)) {
      return next();
    }

    const nodeId = req.params[param];
    if (!nodeId) {
      return res.status(400).json({ success: false, message: "Invalid plan node" });
    }

    const allowed = await userCanAccessPlanNode(nodeId, req.user);
    if (!allowed) {
      return sendPermissionDenied(res, {
        message: "Access denied",
        permissions: PLAN_READ_PERMISSIONS,
        mode: "any",
      });
    }

    return next();
  };
}

function requirePlanVersionReadAccessFromQuery(queryKey = "plan_version_id") {
  return async (req, res, next) => {
    if (hasFullPlanRead(req.user)) {
      return next();
    }

    const versionId = req.query[queryKey];
    if (!versionId) {
      return sendPermissionDenied(res, {
        message: "Access denied",
        permissions: PLAN_READ_PERMISSIONS,
        mode: "any",
      });
    }

    const allowed = await userCanAccessPlanVersion(versionId, req.user);
    if (!allowed) {
      return sendPermissionDenied(res, {
        message: "Access denied",
        permissions: PLAN_READ_PERMISSIONS,
        mode: "any",
      });
    }

    return next();
  };
}

module.exports = {
  requirePlanVersionReadAccess,
  requirePlanNodeReadAccess,
  requirePlanVersionReadAccessFromQuery,
};
