"use strict";

const { GROUP_KIND, normalizeGroupKind } = require("./specialPermissionGroupUtils");
const { userHasPermission } = require("./userPermissionsUtils");

const STANDARD_RESOURCE = "permission_groups";
const SPECIAL_RESOURCE = "special_permission_groups";
const REGIONAL_RESOURCE = "regional_permission_groups";

const ACTION_MAP = {
  create: "create",
  read: "read",
  update: "update",
  delete: "delete",
  addPermissions: "assign_permission",
  removePermission: "remove_permission",
  addUsers: "add_user",
  removeUser: "remove_user",
  addStructures: "add_structure",
  removeStructure: "remove_structure",
  addDepartments: "add_department",
  removeDepartment: "remove_department",
};

function permissionResourceForGroupKind(groupKind) {
  const normalized = normalizeGroupKind(groupKind);
  if (normalized === GROUP_KIND.SPECIAL) return SPECIAL_RESOURCE;
  if (normalized === GROUP_KIND.REGIONAL) return REGIONAL_RESOURCE;
  return STANDARD_RESOURCE;
}

function buildPermissionKey(groupKind, action) {
  const mappedAction = ACTION_MAP[action] || action;
  return `${permissionResourceForGroupKind(groupKind)}:${mappedAction}`;
}

function userCanManagePermissionGroup(user, groupKind, action) {
  const normalized = normalizeGroupKind(groupKind);
  if (normalized === GROUP_KIND.REGIONAL) {
    const mappedAction = ACTION_MAP[action] || action;
    const directKey = `${REGIONAL_RESOURCE}:${mappedAction}`;
    if (userHasPermission(user, directKey)) return true;
    if (userHasPermission(user, `${REGIONAL_RESOURCE}:manage`)) return true;
    if (userHasPermission(user, "regional_users:manage")) return true;
    if (userHasPermission(user, "regions:manage")) return true;
    if (userHasPermission(user, `${STANDARD_RESOURCE}:${mappedAction}`)) return true;
    if (userHasPermission(user, `${STANDARD_RESOURCE}:manage`)) return true;
    return false;
  }
  const key = buildPermissionKey(groupKind, action);
  return userHasPermission(user, key);
}

function assertCanManagePermissionGroup(user, groupKind, action) {
  if (userCanManagePermissionGroup(user, groupKind, action)) {
    return;
  }

  const error = new Error("Access denied: insufficient permission for this permission group operation.");
  error.status = 403;
  error.required_permission = buildPermissionKey(groupKind, action);
  throw error;
}

function resolveRequestedGroupKind(queryGroupKind, bodyGroupKind, fallback = GROUP_KIND.STANDARD) {
  if (queryGroupKind !== undefined) {
    return normalizeGroupKind(queryGroupKind);
  }
  if (bodyGroupKind !== undefined) {
    return normalizeGroupKind(bodyGroupKind);
  }
  return normalizeGroupKind(fallback);
}

module.exports = {
  STANDARD_RESOURCE,
  SPECIAL_RESOURCE,
  REGIONAL_RESOURCE,
  ACTION_MAP,
  permissionResourceForGroupKind,
  buildPermissionKey,
  userCanManagePermissionGroup,
  assertCanManagePermissionGroup,
  resolveRequestedGroupKind,
};
