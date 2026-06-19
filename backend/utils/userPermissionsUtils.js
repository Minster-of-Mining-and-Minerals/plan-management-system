"use strict";

function toPermissionKeyLower(resource, action) {
  return `${String(resource).trim().toLowerCase()}:${String(action).trim().toLowerCase()}`;
}

function toPermissionKeyUpper(resource, action) {
  return `${String(resource).trim().toLowerCase()}:${String(action).trim().toLowerCase()}`.toUpperCase();
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

  user.permissionGroups?.forEach((group) => {
    if (group.is_active === false) return;

    group.permissions?.forEach((permission) => {
      if (permission?.resource && permission?.action && permission.is_active !== false) {
        permissionsSet.add(toPermissionKeyLower(permission.resource, permission.action));
      }
    });
  });

  return Array.from(permissionsSet);
}

function collectUserPermissionKeysUpper(user) {
  return collectUserPermissionKeys(user).map((key) => key.toUpperCase());
}

module.exports = {
  toPermissionKeyLower,
  toPermissionKeyUpper,
  collectUserPermissionKeys,
  collectUserPermissionKeysUpper,
};
