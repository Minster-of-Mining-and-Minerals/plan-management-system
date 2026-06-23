"use strict";

const { sendPermissionDenied, toPermissionKey } = require("../utils/permissionDeniedUtils");
const {
  hasFullPlanRead,
  userCanAccessPlanVersion,
  userCanAccessPlanNode,
} = require("../services/planReviewVisibilityService");
const {
  userCanReadPlanVersion,
} = require("../services/planVisibilityService");

const PLAN_READ_PERMISSIONS = [
  { resource: "PLANS", action: "READ" },
  { resource: "PLAN", action: "VIEW_ASSIGNED_REVIEW" },
].map(({ resource, action }) => toPermissionKey(resource, action));

function requirePlanVersionReadAccess(param = "id") {
  return async (req, res, next) => {
    const versionId = req.params[param];
    if (!versionId) {
      return res.status(400).json({ success: false, message: "Invalid plan version" });
    }

    if (await userCanReadPlanVersion(req, versionId)) {
      return next();
    }

    return sendPermissionDenied(res, {
      message: "Access denied",
      permissions: PLAN_READ_PERMISSIONS,
      mode: "any",
    });
  };
}

function requirePlanNodeReadAccess(param = "id") {
  return async (req, res, next) => {
    const nodeId = req.params[param];
    if (!nodeId) {
      return res.status(400).json({ success: false, message: "Invalid plan node" });
    }

    const allowed = await userCanAccessPlanNode(nodeId, req.user);
    if (allowed) {
      return next();
    }

    if (hasFullPlanRead(req.user)) {
      const { PlanNode } = require("../models");
      const { getVisibleNodeIdsForVersion } = require("../services/planVisibilityService");
      const node = await PlanNode.findByPk(nodeId, {
        attributes: ["plan_node_id", "plan_version_id"],
      });
      if (node) {
        const canReadVersion = await userCanReadPlanVersion(req, node.plan_version_id);
        const visibleNodeIds = await getVisibleNodeIdsForVersion(
          req,
          node.plan_version_id
        );
        if (
          canReadVersion &&
          (!visibleNodeIds || visibleNodeIds.has(node.plan_node_id))
        ) {
          return next();
        }
      }
    }

    return sendPermissionDenied(res, {
      message: "Access denied",
      permissions: PLAN_READ_PERMISSIONS,
      mode: "any",
    });
  };
}

function requirePlanVersionReadAccessFromQuery(queryKey = "plan_version_id") {
  return async (req, res, next) => {
    const versionId = req.query[queryKey];
    if (!versionId) {
      return sendPermissionDenied(res, {
        message: "Access denied",
        permissions: PLAN_READ_PERMISSIONS,
        mode: "any",
      });
    }

    if (await userCanReadPlanVersion(req, versionId)) {
      return next();
    }

    return sendPermissionDenied(res, {
      message: "Access denied",
      permissions: PLAN_READ_PERMISSIONS,
      mode: "any",
    });
  };
}

module.exports = {
  requirePlanVersionReadAccess,
  requirePlanNodeReadAccess,
  requirePlanVersionReadAccessFromQuery,
};
