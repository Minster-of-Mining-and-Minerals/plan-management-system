"use strict";

const { SystemAuditLog } = require("../models");

const AUDIT_MODULES = {
  BRANDING_SETTINGS: "branding_settings",
  USERS: "users",
  ROLES: "roles",
  PLANS: "plans",
  GOVERNMENT_STRUCTURES: "government_structures",
  INTERNAL_STRUCTURES: "internal_structures",
  PERMISSION_GROUPS: "permission_groups",
  PERFORMANCE_COLOR_THRESHOLDS: "performance_color_thresholds",
  NOTIFICATIONS: "notifications",
};

const MODULE_LABELS = {
  branding_settings: "Branding",
  users: "Users",
  roles: "Roles",
  plans: "Plans",
  government_structures: "Government Structures",
  internal_structures: "Internal Structures",
  permission_groups: "Permission Groups",
  performance_color_thresholds: "Performance Colors",
  notifications: "Notifications",
};

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || null;
}

function buildSummary({ module, action, entityLabel, previousValues, newValues }) {
  const moduleLabel = MODULE_LABELS[module] || module;
  const label = entityLabel || moduleLabel;

  if (action === "create") return `Created ${label}`;
  if (action === "delete") return `Deleted ${label}`;
  if (action === "restore") return `Restored ${label} to defaults`;

  if (module === AUDIT_MODULES.BRANDING_SETTINGS && newValues?.system_name_full) {
    const prevName = previousValues?.system_name_full;
    if (prevName && prevName !== newValues.system_name_full) {
      return `Branding updated: ${prevName} → ${newValues.system_name_full}`;
    }
    return "Branding settings updated";
  }

  if (module === AUDIT_MODULES.USERS && newValues?.full_name) {
    if (action === "create") return `User created: ${newValues.full_name}`;
    return `User updated: ${newValues.full_name}`;
  }

  return `${moduleLabel} ${action}`;
}

async function recordSystemAuditLog(
  {
    module,
    action,
    entityId = null,
    entityLabel = null,
    summary = null,
    previousValues = null,
    newValues = null,
    changedBy,
    ipAddress = null,
  },
  transaction = null
) {
  if (!changedBy) {
    throw new Error("changedBy is required to record an audit log");
  }

  const resolvedSummary =
    summary ||
    buildSummary({
      module,
      action,
      entityLabel,
      previousValues,
      newValues,
    });

  return SystemAuditLog.create(
    {
      module,
      action,
      entity_id: entityId,
      entity_label: entityLabel,
      summary: resolvedSummary,
      previous_values: previousValues,
      new_values: newValues,
      changed_by: changedBy,
      ip_address: ipAddress,
    },
    transaction ? { transaction } : undefined
  );
}

module.exports = {
  AUDIT_MODULES,
  MODULE_LABELS,
  getClientIp,
  buildSummary,
  recordSystemAuditLog,
};
