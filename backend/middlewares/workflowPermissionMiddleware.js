"use strict";

const { LOG_ACTION_TYPES } = require("../config/medicalWorkflowConstants");

const ACTION_TO_PERMISSION = {
  submit: { resource: "workflow", action: "submit" },
  forward: { resource: "workflow", action: "forward" },
  return: { resource: "workflow", action: "return" },
  prescribe: { resource: "workflow", action: "prescribe" },
  complete: { resource: "workflow", action: "complete" },
};

function userHasPermission(req, resource, action) {
  const required = `${resource.toLowerCase()}:${action.toLowerCase()}`;
  const perms = req.user?.permissions || [];
  return perms.includes(required) || perms.includes("*:*");
}

function requireWorkflowAction(req, res, next) {
  const actionType = req.body?.action_type || "submit";

  if (!LOG_ACTION_TYPES.includes(actionType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid workflow action type",
    });
  }

  const mapped = ACTION_TO_PERMISSION[actionType];
  if (!mapped) {
    return res.status(400).json({
      success: false,
      message: "Unsupported workflow action",
    });
  }

  if (!userHasPermission(req, mapped.resource, mapped.action)) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Required permission ${mapped.resource}:${mapped.action}`,
    });
  }

  return next();
}

module.exports = {
  requireWorkflowAction,
  userHasPermission,
  ACTION_TO_PERMISSION,
};
