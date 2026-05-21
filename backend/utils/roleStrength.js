/**
 * Count unique active permissions assigned to a role.
 */
function countRolePermissions(rolePermissions = []) {
  const ids = new Set();
  for (const rp of rolePermissions) {
    if (rp.is_active === false) continue;
    const id = rp.permission_id ?? rp.permission?.permission_id;
    if (id) ids.add(id);
  }
  return ids.size;
}

/**
 * Percentage of system permissions held by the role (0–100).
 */
function computeStrength(permissionCount, totalPermissions) {
  if (!totalPermissions) return 0;
  return Math.round((permissionCount / totalPermissions) * 100);
}

/**
 * Attach strength metadata to a role record.
 */
function enrichRoleWithStrength(role, totalPermissions) {
  const plain = role.toJSON ? role.toJSON() : { ...role };
  const permissionCount = countRolePermissions(plain.rolePermissions);

  return {
    ...plain,
    permission_count: permissionCount,
    total_permissions: totalPermissions,
    strength: computeStrength(permissionCount, totalPermissions),
  };
}

/**
 * Count unique active permissions on a permission group.
 */
function countGroupPermissions(permissions = []) {
  const ids = new Set();
  for (const permission of permissions) {
    if (permission.is_active === false) continue;
    const id = permission.permission_id;
    if (id) ids.add(id);
  }
  return ids.size;
}

/**
 * Attach strength metadata to a permission group record.
 */
function enrichPermissionGroupWithStrength(group, totalPermissions) {
  const plain = group.toJSON ? group.toJSON() : { ...group };
  const permissionCount = countGroupPermissions(plain.permissions);

  return {
    ...plain,
    permission_count: permissionCount,
    total_permissions: totalPermissions,
    strength: computeStrength(permissionCount, totalPermissions),
  };
}

module.exports = {
  countRolePermissions,
  countGroupPermissions,
  computeStrength,
  enrichRoleWithStrength,
  enrichPermissionGroupWithStrength,
};
