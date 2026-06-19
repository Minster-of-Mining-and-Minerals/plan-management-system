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
    role.rolePermissions?.forEach((rolePermission) => {
      const permission = rolePermission.permission;
      if (permission?.resource && permission?.action) {
        permissionsSet.add(toPermissionKeyLower(permission.resource, permission.action));
      }
    });
  });

  user.permissionGroups?.forEach((group) => {
    group.permissions?.forEach((permission) => {
      if (permission?.resource && permission?.action) {
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
