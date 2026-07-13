"use strict";

const {
  sequelize,
  GovernmentStructure,
  PermissionGroupPermission,
  GovernmentStructurePermissionGroup,
} = require("../models");

/**
 * Union of active permissions from all permission groups assigned to a structure.
 */
async function getStructureEffectivePermissions(
  governmentStructureId,
  options = {}
) {
  if (!governmentStructureId) {
    return [];
  }

  const excludeGroupId = options.excludePermissionGroupId || null;

  return sequelize.query(
    `SELECT DISTINCT p.permission_id, p.resource, p.action, p.permission_tier, p.is_active, p.created_at, p.updated_at
     FROM government_structure_permission_groups gspg
     INNER JOIN permission_groups pg ON pg.permission_group_id = gspg.permission_group_id
     INNER JOIN permission_group_permissions pgp ON pgp.permission_group_id = gspg.permission_group_id
     INNER JOIN permissions p ON p.permission_id = pgp.permission_id
     WHERE gspg.government_structure_id = :structureId
       AND pg.is_active = true
       AND p.is_active = true
       AND (:excludeGroupId::uuid IS NULL OR gspg.permission_group_id <> :excludeGroupId::uuid)
     ORDER BY p.resource ASC, p.action ASC`,
    {
      replacements: { structureId: governmentStructureId, excludeGroupId },
      type: sequelize.QueryTypes.SELECT,
      transaction: options.transaction,
    }
  );
}

async function getStructureEffectivePermissionIdSet(governmentStructureId, options = {}) {
  const permissions = await getStructureEffectivePermissions(governmentStructureId, options);
  return new Set(permissions.map((p) => p.permission_id));
}

async function getStructureEffectivePermissionKeySet(governmentStructureId, options = {}) {
  const permissions = await getStructureEffectivePermissions(governmentStructureId, options);
  return new Set(
    permissions.map((p) => `${String(p.resource).toLowerCase()}:${String(p.action).toLowerCase()}`)
  );
}

async function getParentStructureId(governmentStructureId, options = {}) {
  if (!governmentStructureId) {
    return null;
  }

  const structure = await GovernmentStructure.findByPk(governmentStructureId, {
    attributes: ["parent_id"],
    transaction: options.transaction,
  });

  return structure?.parent_id ?? null;
}

/**
 * Permissions a structure may assign to roles, expose in pickers, or place in subset groups.
 * Sector-local only — no inheritance from parent structures.
 */
async function getStructureAssignablePermissionIdSet(governmentStructureId, options = {}) {
  return getStructureEffectivePermissionIdSet(governmentStructureId, options);
}

async function getStructureAssignablePermissions(governmentStructureId, options = {}) {
  return getStructureEffectivePermissions(governmentStructureId, options);
}

function findUnauthorizedPermissionIds(requestedIds, allowedIdSet) {
  const unique = [...new Set((requestedIds || []).filter(Boolean))];
  return unique.filter((id) => !allowedIdSet.has(id));
}

function buildPermissionScopeError(permissionIds, governmentStructureId, allowedIdSet, unauthorized) {
  const notEnabled = findUnauthorizedPermissionIds(permissionIds, allowedIdSet);

  const message =
    notEnabled.length > 0
      ? "One or more permissions are not enabled for the selected structure."
      : "One or more permissions are not available for the selected structure.";

  const error = new Error(message);
  error.status = 403;
  error.unauthorizedPermissionIds = unauthorized;
  error.structure_id = governmentStructureId;
  return error;
}

/**
 * Ensures permission IDs are enabled on the structure (union of its linked groups).
 * When excludePermissionGroupId is set, that group's current link is omitted so updates
 * can replace permissions without counting the group being edited.
 * allowBootstrap permits any IDs when the structure has no enabled permissions yet.
 */
async function assertPermissionIdsAllowedForStructure(
  permissionIds,
  governmentStructureId,
  options = {}
) {
  if (!permissionIds?.length || !governmentStructureId) {
    return;
  }

  const allowed = await getStructureEffectivePermissionIdSet(governmentStructureId, {
    transaction: options.transaction,
    excludePermissionGroupId: options.excludePermissionGroupId,
  });

  if (allowed.size === 0) {
    if (options.allowBootstrap) {
      return;
    }

    const error = new Error(
      "This structure has no permissions enabled yet. Link an initial permission group or contact a Super Admin."
    );
    error.status = 403;
    error.structure_id = governmentStructureId;
    throw error;
  }

  const unauthorized = findUnauthorizedPermissionIds(permissionIds, allowed);

  if (unauthorized.length > 0) {
    throw buildPermissionScopeError(
      permissionIds,
      governmentStructureId,
      allowed,
      unauthorized
    );
  }
}

async function getPermissionIdsInPermissionGroup(permissionGroupId, options = {}) {
  const rows = await PermissionGroupPermission.findAll({
    where: { permission_group_id: permissionGroupId },
    attributes: ["permission_id"],
    transaction: options.transaction,
  });

  return rows.map((row) => row.permission_id);
}

async function isStructureLinkedToPermissionGroup(
  permissionGroupId,
  governmentStructureId,
  options = {}
) {
  if (!permissionGroupId || !governmentStructureId) {
    return false;
  }

  const link = await GovernmentStructurePermissionGroup.findOne({
    where: {
      permission_group_id: permissionGroupId,
      government_structure_id: governmentStructureId,
    },
    transaction: options.transaction,
  });

  return Boolean(link);
}

/**
 * When linking a permission group to a structure, its permissions must already be
 * enabled on that structure (subset delegation) unless bootstrapping an empty structure.
 */
async function assertPermissionGroupFitsStructureHierarchy(
  permissionGroupId,
  governmentStructureId,
  options = {}
) {
  const groupPermissionIds = await getPermissionIdsInPermissionGroup(
    permissionGroupId,
    options
  );
  if (!groupPermissionIds.length) {
    return;
  }

  await assertPermissionIdsAllowedForStructure(groupPermissionIds, governmentStructureId, {
    transaction: options.transaction,
    excludePermissionGroupId: options.excludePermissionGroupId,
    allowBootstrap: options.allowBootstrap,
  });
}

async function assertPermissionGroupsFitStructureHierarchy(
  permissionGroupIds,
  governmentStructureId,
  options = {}
) {
  for (const permissionGroupId of permissionGroupIds || []) {
    await assertPermissionGroupFitsStructureHierarchy(
      permissionGroupId,
      governmentStructureId,
      options
    );
  }
}

/**
 * @deprecated Parent-scope checks removed — sectors do not inherit permissions.
 */
async function assertPermissionIdsAllowedForParentStructure() {
  return;
}

async function assertPermissionIdsFitLinkedStructureHierarchies(
  permissionGroupId,
  permissionIds,
  options = {}
) {
  if (!permissionIds?.length) {
    return;
  }

  const links = await GovernmentStructurePermissionGroup.findAll({
    where: { permission_group_id: permissionGroupId },
    attributes: ["government_structure_id"],
    transaction: options.transaction,
  });

  for (const link of links) {
    await assertPermissionIdsAllowedForStructure(permissionIds, link.government_structure_id, {
      transaction: options.transaction,
      excludePermissionGroupId: permissionGroupId,
      allowBootstrap: options.allowBootstrap,
    });
  }
}

module.exports = {
  getStructureEffectivePermissions,
  getStructureEffectivePermissionIdSet,
  getStructureEffectivePermissionKeySet,
  getParentStructureId,
  getStructureAssignablePermissions,
  getStructureAssignablePermissionIdSet,
  findUnauthorizedPermissionIds,
  assertPermissionIdsAllowedForStructure,
  assertPermissionIdsAllowedForParentStructure,
  getPermissionIdsInPermissionGroup,
  assertPermissionGroupFitsStructureHierarchy,
  assertPermissionGroupsFitStructureHierarchy,
  assertPermissionIdsFitLinkedStructureHierarchies,
  isStructureLinkedToPermissionGroup,
};
