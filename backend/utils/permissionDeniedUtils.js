"use strict";

const { shouldExposeRequiredPermissions } = require("../services/systemSettingsService");

function toPermissionKey(resource, action) {
  return `${String(resource).toLowerCase()}:${String(action).toLowerCase()}`;
}

function buildPermissionDeniedBody({
  message = "Access denied",
  permissions = [],
  mode = "all",
}) {
  const body = {
    success: false,
    message,
  };

  if (shouldExposeRequiredPermissions() && permissions.length > 0) {
    body.required_permissions = permissions;
    body.required_permissions_mode = mode;
  }

  return body;
}

function sendPermissionDenied(res, options) {
  return res.status(403).json(buildPermissionDeniedBody(options));
}

module.exports = {
  toPermissionKey,
  buildPermissionDeniedBody,
  sendPermissionDenied,
};
