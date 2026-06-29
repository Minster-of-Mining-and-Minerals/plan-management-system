"use strict";

const {
  VIEW_SECTOR_PLAN_HIERARCHY_KEY,
  VIEW_FULL_PLAN_HIERARCHY_KEY,
  SPECIAL_PERMISSION_KEYS,
} = require("./specialPermissionGroupUtils");

function toPermissionKeyLower(resource, action) {
  return `${String(resource).trim().toLowerCase()}:${String(action).trim().toLowerCase()}`;
}

function toPermissionKeyUpper(resource, action) {
  return `${String(resource).trim().toLowerCase()}:${String(action).trim().toLowerCase()}`.toUpperCase();
}

function normalizePermissionKey(key) {
  return String(key).trim().toLowerCase();
}

function collectPermissionKeysFromGroups(groups, permissionsSet) {
  groups?.forEach((group) => {
    if (group.is_active === false) return;

    group.permissions?.forEach((permission) => {
      if (permission?.resource && permission?.action && permission.is_active !== false) {
        permissionsSet.add(toPermissionKeyLower(permission.resource, permission.action));
      }
    });
  });
}

function collectUserPermissionKeys(user) {
  const permissionsSet = new Set();

  user.roles?.forEach((role) => {
    if (role.is_active === false) return;

    role.rolePermissions?.forEach((rolePermission) => {
      if (rolePermission.is_active === false) return;

      const permission = rolePermission.permission;
      if (permission?.resource && permission?.action && permission.is_active !== false) {
        permissionsSet.add(toPermissionKeyLower(permission.resource, permission.action));
      }
    });
  });

  collectPermissionKeysFromGroups(user.permissionGroups, permissionsSet);
  collectPermissionKeysFromGroups(user.departmentPermissionGroups, permissionsSet);

  return Array.from(permissionsSet);
}

function collectUserPermissionKeysUpper(user) {
  return collectUserPermissionKeys(user).map((key) => key.toUpperCase());
}

function getUserDepartmentPermissionKeys(user) {
  const permissionsSet = new Set();
  collectPermissionKeysFromGroups(user.departmentPermissionGroups, permissionsSet);
  return Array.from(permissionsSet);
}

function userHasPermission(userOrPermissions, permissionKey) {
  const normalized = normalizePermissionKey(permissionKey);

  if (Array.isArray(userOrPermissions)) {
    return userOrPermissions.map(normalizePermissionKey).includes(normalized);
  }

  if (userOrPermissions?.permissions) {
    return userOrPermissions.permissions.map(normalizePermissionKey).includes(normalized);
  }

  return collectUserPermissionKeys(userOrPermissions).includes(normalized);
}

function userHasSpecialPermission(userOrPermissions, permissionKey) {
  const normalized = normalizePermissionKey(permissionKey);
  if (!SPECIAL_PERMISSION_KEYS.has(normalized)) {
    return false;
  }
  return userHasPermission(userOrPermissions, normalized);
}

function userCanViewSectorPlanHierarchy(userOrPermissions) {
  return userHasSpecialPermission(userOrPermissions, VIEW_SECTOR_PLAN_HIERARCHY_KEY);
}

function userCanViewFullPlanHierarchy(userOrPermissions) {
  return userHasSpecialPermission(userOrPermissions, VIEW_FULL_PLAN_HIERARCHY_KEY);
}

module.exports = {
  toPermissionKeyLower,
  toPermissionKeyUpper,
  normalizePermissionKey,
  collectUserPermissionKeys,
  collectUserPermissionKeysUpper,
  getUserDepartmentPermissionKeys,
  userHasPermission,
  userHasSpecialPermission,
  userCanViewSectorPlanHierarchy,
  userCanViewFullPlanHierarchy,
  VIEW_SECTOR_PLAN_HIERARCHY_KEY,
  VIEW_FULL_PLAN_HIERARCHY_KEY,
};
