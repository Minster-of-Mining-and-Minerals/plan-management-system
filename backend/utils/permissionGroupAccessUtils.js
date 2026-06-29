"use strict";

const { GROUP_KIND, normalizeGroupKind } = require("./specialPermissionGroupUtils");
const { userHasPermission } = require("./userPermissionsUtils");

const STANDARD_RESOURCE = "permission_groups";
const SPECIAL_RESOURCE = "special_permission_groups";

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
  return normalizeGroupKind(groupKind) === GROUP_KIND.SPECIAL
    ? SPECIAL_RESOURCE
    : STANDARD_RESOURCE;
}

function buildPermissionKey(groupKind, action) {
  const mappedAction = ACTION_MAP[action] || action;
  return `${permissionResourceForGroupKind(groupKind)}:${mappedAction}`;
}

function userCanManagePermissionGroup(user, groupKind, action) {
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
  ACTION_MAP,
  permissionResourceForGroupKind,
  buildPermissionKey,
  userCanManagePermissionGroup,
  assertCanManagePermissionGroup,
  resolveRequestedGroupKind,
};
