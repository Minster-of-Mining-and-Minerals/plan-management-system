"use strict";

const {
  Permission,
  PermissionGroup,
  InternalStructure,
  InternalStructurePermissionGroup,
} = require("../models");

const GROUP_KIND = {
  STANDARD: "standard",
  SPECIAL: "special",
};

const PERMISSION_TIER = {
  STANDARD: "standard",
  SPECIAL: "special",
};

const VIEW_SECTOR_PLAN_HIERARCHY_KEY = "plan:view_sector_plan_hierarchy";
const VIEW_FULL_PLAN_HIERARCHY_KEY = "plan:view_full_plan_hierarchy";
const VALIDATE_APPROVAL_KEY = "plan:validate_approval";
const PUBLISH_SECTOR_AGGREGATION_KEY = "plan:publish_sector_aggregation";

const SPECIAL_PERMISSION_KEYS = new Set([
  "plans:edit_finalized",
  "plan:override_parent_achievement",
  "plan:bypass_achievement_assignment",
  VALIDATE_APPROVAL_KEY,
  PUBLISH_SECTOR_AGGREGATION_KEY,
  VIEW_SECTOR_PLAN_HIERARCHY_KEY,
  VIEW_FULL_PLAN_HIERARCHY_KEY,
]);

function normalizeGroupKind(groupKind) {
  const value = String(groupKind || GROUP_KIND.STANDARD).trim().toLowerCase();
  return value === GROUP_KIND.SPECIAL ? GROUP_KIND.SPECIAL : GROUP_KIND.STANDARD;
}

function normalizePermissionTier(permissionTier) {
  const value = String(permissionTier || PERMISSION_TIER.STANDARD).trim().toLowerCase();
  return value === PERMISSION_TIER.SPECIAL ? PERMISSION_TIER.SPECIAL : PERMISSION_TIER.STANDARD;
}

function expectedTierForGroupKind(groupKind) {
  return normalizeGroupKind(groupKind) === GROUP_KIND.SPECIAL
    ? PERMISSION_TIER.SPECIAL
    : PERMISSION_TIER.STANDARD;
}

function buildPermissionScopeError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function assertPermissionIdsMatchGroupKind(
  permissionIds,
  groupKind,
  options = {}
) {
  if (!permissionIds?.length) {
    return;
  }

  const expectedTier = expectedTierForGroupKind(groupKind);
  const permissions = await Permission.findAll({
    where: { permission_id: permissionIds },
    attributes: ["permission_id", "resource", "action", "permission_tier"],
    transaction: options.transaction,
  });

  const mismatched = permissions.filter(
    (permission) => normalizePermissionTier(permission.permission_tier) !== expectedTier
  );

  if (mismatched.length > 0) {
    const label =
      expectedTier === PERMISSION_TIER.SPECIAL ? "special" : "standard";
    throw buildPermissionScopeError(
      `Permission group kind '${normalizeGroupKind(groupKind)}' may only include ${label} permissions.`,
      400
    );
  }
}

async function assertGroupIsSpecial(permissionGroup, options = {}) {
  const group =
    typeof permissionGroup === "string"
      ? await PermissionGroup.findByPk(permissionGroup, {
          transaction: options.transaction,
        })
      : permissionGroup;

  if (!group) {
    throw buildPermissionScopeError("Permission group not found.", 404);
  }

  if (normalizeGroupKind(group.group_kind) !== GROUP_KIND.SPECIAL) {
    throw buildPermissionScopeError(
      "Only special permission groups can have department members.",
      400
    );
  }

  return group;
}

async function loadDepartmentPermissionGroups(internalStructureId, options = {}) {
  if (!internalStructureId) {
    return [];
  }

  const links = await InternalStructurePermissionGroup.findAll({
    where: { internal_structure_id: internalStructureId },
    include: [
      {
        model: PermissionGroup,
        as: "permissionGroup",
        required: true,
        where: { is_active: true, group_kind: GROUP_KIND.SPECIAL },
        include: [
          {
            model: Permission,
            as: "permissions",
            attributes: ["resource", "action", "is_active", "permission_tier"],
            through: { attributes: [] },
          },
        ],
      },
    ],
    transaction: options.transaction,
  });

  return links.map((link) => link.permissionGroup).filter(Boolean);
}

async function assertInternalStructuresFitPermissionGroup(
  permissionGroupId,
  internalStructureIds,
  options = {}
) {
  const group = await assertGroupIsSpecial(permissionGroupId, options);

  const structures = await InternalStructure.findAll({
    where: { internal_structure_id: internalStructureIds },
    attributes: ["internal_structure_id", "government_structure_id", "name"],
    transaction: options.transaction,
  });

  if (structures.length !== internalStructureIds.length) {
    throw buildPermissionScopeError("One or more departments were not found.", 404);
  }

  const { GovernmentStructurePermissionGroup } = require("../models");
  const structureLinks = await GovernmentStructurePermissionGroup.findAll({
    where: { permission_group_id: group.permission_group_id },
    attributes: ["government_structure_id"],
    transaction: options.transaction,
  });

  const allowedStructureIds = new Set(
    structureLinks.map((link) => link.government_structure_id)
  );

  if (allowedStructureIds.size === 0) {
    throw buildPermissionScopeError(
      "Permission group is not assigned to any government structure.",
      400
    );
  }

  const invalid = structures.filter(
    (structure) => !allowedStructureIds.has(structure.government_structure_id)
  );

  if (invalid.length > 0) {
    throw buildPermissionScopeError(
      "One or more departments do not belong to a structure linked to this permission group.",
      403
    );
  }
}

function filterPermissionsByTier(permissions, tier) {
  const normalizedTier = normalizePermissionTier(tier);
  return (permissions || []).filter(
    (permission) =>
      normalizePermissionTier(permission.permission_tier) === normalizedTier
  );
}

module.exports = {
  GROUP_KIND,
  PERMISSION_TIER,
  VIEW_SECTOR_PLAN_HIERARCHY_KEY,
  VIEW_FULL_PLAN_HIERARCHY_KEY,
  VALIDATE_APPROVAL_KEY,
  PUBLISH_SECTOR_AGGREGATION_KEY,
  SPECIAL_PERMISSION_KEYS,
  normalizeGroupKind,
  normalizePermissionTier,
  expectedTierForGroupKind,
  filterPermissionsByTier,
  assertPermissionIdsMatchGroupKind,
  assertGroupIsSpecial,
  loadDepartmentPermissionGroups,
  assertInternalStructuresFitPermissionGroup,
};
