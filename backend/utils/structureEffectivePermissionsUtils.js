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
async function getStructureEffectivePermissions(governmentStructureId, options = {}) {
  if (!governmentStructureId) {
    return [];
  }

  return sequelize.query(
    `SELECT DISTINCT p.permission_id, p.resource, p.action, p.is_active, p.created_at, p.updated_at
     FROM government_structure_permission_groups gspg
     INNER JOIN permission_groups pg ON pg.permission_group_id = gspg.permission_group_id
     INNER JOIN permission_group_permissions pgp ON pgp.permission_group_id = gspg.permission_group_id
     INNER JOIN permissions p ON p.permission_id = pgp.permission_id
     WHERE gspg.government_structure_id = :structureId
       AND pg.is_active = true
       AND p.is_active = true
     ORDER BY p.resource ASC, p.action ASC`,
    {
      replacements: { structureId: governmentStructureId },
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
 * Permissions a structure may assign to roles or expose in pickers:
 * own effective permissions intersected with the parent structure's effective permissions.
 */
async function getStructureAssignablePermissionIdSet(governmentStructureId, options = {}) {
  const childIds = await getStructureEffectivePermissionIdSet(governmentStructureId, options);
  const parentId = await getParentStructureId(governmentStructureId, options);

  if (!parentId) {
    return childIds;
  }

  const parentIds = await getStructureEffectivePermissionIdSet(parentId, options);
  return new Set([...childIds].filter((id) => parentIds.has(id)));
}

async function getStructureAssignablePermissions(governmentStructureId, options = {}) {
  const childPermissions = await getStructureEffectivePermissions(governmentStructureId, options);
  const parentId = await getParentStructureId(governmentStructureId, options);

  if (!parentId) {
    return childPermissions;
  }

  const parentIds = await getStructureEffectivePermissionIdSet(parentId, options);
  return childPermissions.filter((permission) => parentIds.has(permission.permission_id));
}

function findUnauthorizedPermissionIds(requestedIds, allowedIdSet) {
  const unique = [...new Set((requestedIds || []).filter(Boolean))];
  return unique.filter((id) => !allowedIdSet.has(id));
}

function buildPermissionScopeError(
  permissionIds,
  governmentStructureId,
  childIdSet,
  parentId,
  parentIdSet,
  unauthorized
) {
  const notInChild = findUnauthorizedPermissionIds(permissionIds, childIdSet);
  const notInParent =
    parentId && parentIdSet
      ? findUnauthorizedPermissionIds(permissionIds, parentIdSet)
      : [];

  let message = "One or more permissions are not available for the selected structure.";
  if (parentId && notInParent.length > 0) {
    message =
      "One or more permissions exceed the parent structure's permission scope.";
  } else if (notInChild.length > 0) {
    message = "One or more permissions are not enabled for the selected structure.";
  }

  const error = new Error(message);
  error.status = 403;
  error.unauthorizedPermissionIds = unauthorized;
  error.structure_id = governmentStructureId;
  error.parent_structure_id = parentId;
  return error;
}

async function assertPermissionIdsAllowedForStructure(
  permissionIds,
  governmentStructureId,
  options = {}
) {
  if (!permissionIds?.length) {
    return;
  }

  const childIdSet = await getStructureEffectivePermissionIdSet(
    governmentStructureId,
    options
  );
  const parentId = await getParentStructureId(governmentStructureId, options);
  const parentIdSet = parentId
    ? await getStructureEffectivePermissionIdSet(parentId, options)
    : null;
  const allowed = await getStructureAssignablePermissionIdSet(
    governmentStructureId,
    options
  );
  const unauthorized = findUnauthorizedPermissionIds(permissionIds, allowed);

  if (unauthorized.length > 0) {
    throw buildPermissionScopeError(
      permissionIds,
      governmentStructureId,
      childIdSet,
      parentId,
      parentIdSet,
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

async function assertPermissionGroupFitsStructureHierarchy(
  permissionGroupId,
  governmentStructureId,
  options = {}
) {
  const parentId = await getParentStructureId(governmentStructureId, options);
  if (!parentId) {
    return;
  }

  if (
    await isStructureLinkedToPermissionGroup(permissionGroupId, parentId, options)
  ) {
    return;
  }

  const groupPermissionIds = await getPermissionIdsInPermissionGroup(
    permissionGroupId,
    options
  );
  if (!groupPermissionIds.length) {
    return;
  }

  const parentAllowed = await getStructureEffectivePermissionIdSet(parentId, options);
  const unauthorized = findUnauthorizedPermissionIds(groupPermissionIds, parentAllowed);

  if (unauthorized.length > 0) {
    const error = new Error(
      "Permission group contains permissions that exceed the parent structure's permission scope."
    );
    error.status = 403;
    error.unauthorizedPermissionIds = unauthorized;
    error.parent_structure_id = parentId;
    throw error;
  }
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

async function assertPermissionIdsAllowedForParentStructure(
  permissionIds,
  governmentStructureId,
  options = {}
) {
  if (!permissionIds?.length) {
    return;
  }

  const parentId = await getParentStructureId(governmentStructureId, options);
  if (!parentId) {
    return;
  }

  const parentIdSet = await getStructureEffectivePermissionIdSet(parentId, options);
  const unauthorized = findUnauthorizedPermissionIds(permissionIds, parentIdSet);

  if (unauthorized.length > 0) {
    const error = new Error(
      "One or more permissions exceed the parent structure's permission scope."
    );
    error.status = 403;
    error.unauthorizedPermissionIds = unauthorized;
    error.parent_structure_id = parentId;
    throw error;
  }
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

  const linkedStructureIds = new Set(
    links.map((link) => link.government_structure_id)
  );

  for (const link of links) {
    const parentId = await getParentStructureId(link.government_structure_id, options);
    if (!parentId) {
      continue;
    }

    // Parent and child share this group — permissions apply as one bundle.
    if (linkedStructureIds.has(parentId)) {
      continue;
    }

    await assertPermissionIdsAllowedForParentStructure(
      permissionIds,
      link.government_structure_id,
      options
    );
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
