"use strict";

const { Op } = require("sequelize");
const {
  SUPER_ADMIN_ROLE_ID,
  SUPER_ADMIN_ROLE_NAME,
  ROLE_SCOPE,
  STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS,
  SYSTEM_PROTECTED_ROLE_IDS,
  PURCHASING_CENTER_ROLE_IDS,
} = require("../constants/systemRoles");
const { collectDescendantIds } = require("./structureLifecycleUtils");

function isSuperAdminActor(req) {
  return (
    Array.isArray(req.user?.roles) &&
    req.user.roles.some(
      (name) => String(name).toLowerCase() === SUPER_ADMIN_ROLE_NAME.toLowerCase()
    )
  );
}

function getActorStructureId(req) {
  return req.user?.government_structure_id ?? null;
}

function resolveManageableStructureId(req, requestedStructureId, structureIndex = null) {
  if (isSuperAdminActor(req)) {
    return requestedStructureId || getActorStructureId(req) || null;
  }

  const actorStructureId = getActorStructureId(req);
  if (!actorStructureId) {
    const error = new Error("Your account is not linked to a structure.");
    error.status = 403;
    throw error;
  }

  if (structureIndex) {
    const visibleIds = buildVisibleGovernmentStructureIdSet(
      structureIndex,
      actorStructureId
    );
    if (requestedStructureId) {
      if (!visibleIds.has(requestedStructureId)) {
        const error = new Error("Access denied: cannot manage another structure.");
        error.status = 403;
        throw error;
      }
      return requestedStructureId;
    }
    return actorStructureId;
  }

  if (requestedStructureId && requestedStructureId !== actorStructureId) {
    const error = new Error("Access denied: cannot manage another structure.");
    error.status = 403;
    throw error;
  }

  return actorStructureId;
}

/**
 * Role visibility:
 * - Super Admin (no structure filter): all roles including private
 * - Super Admin (structure filter): structure roles + global roles for that context
 * - Structure managers: structure roles + global User role only
 */
function buildRoleVisibilityWhere(req, structureId) {
  if (isSuperAdminActor(req) && !structureId) {
    return {};
  }

  if (!structureId) {
    const error = new Error("government_structure_id is required.");
    error.status = 400;
    throw error;
  }

  return {
    [Op.or]: [
      {
        scope: ROLE_SCOPE.STRUCTURE,
        government_structure_id: structureId,
      },
      {
        scope: ROLE_SCOPE.GLOBAL,
        role_id: { [Op.in]: [...STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS] },
      },
    ],
  };
}

function assertRoleAccessible(role, req, structureId) {
  if (!role) {
    const error = new Error("Role not found.");
    error.status = 404;
    throw error;
  }

  if (role.scope === ROLE_SCOPE.PRIVATE) {
    if (!isSuperAdminActor(req)) {
      const error = new Error("Access denied: private roles are restricted to Super Admin.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (
    role.scope === ROLE_SCOPE.GLOBAL &&
    STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS.has(role.role_id)
  ) {
    return;
  }

  if (role.scope === ROLE_SCOPE.REGIONAL) {
    if (isSuperAdminActor(req)) {
      return;
    }
    if (isRegionalActor(req)) {
      if (role.region_id && req.user.region_id && role.region_id !== req.user.region_id) {
        const error = new Error("Access denied: role belongs to another region.");
        error.status = 403;
        throw error;
      }
      return;
    }
    const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
    const hasRegionalManage =
      perms.includes("regional_roles:read") ||
      perms.includes("regional_roles:manage") ||
      perms.includes("regional_users:read") ||
      perms.includes("regional_users:manage") ||
      perms.includes("regions:read") ||
      perms.includes("regions:manage") ||
      perms.includes("roles:read") ||
      perms.includes("roles:manage") ||
      perms.includes("users:read") ||
      perms.includes("users:manage");
    if (!hasRegionalManage) {
      const error = new Error("Access denied: regional roles are restricted to regional administrators.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (role.scope === ROLE_SCOPE.COMPANY) {
    if (isSuperAdminActor(req)) {
      return;
    }
    if (isCompanyActor(req)) {
      if (role.company_id && req.user.company_id && role.company_id !== req.user.company_id) {
        const error = new Error("Access denied: role belongs to another company.");
        error.status = 403;
        throw error;
      }
      return;
    }
    const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
    const hasCompanyManage =
      perms.includes("company_roles:read") ||
      perms.includes("company_roles:manage") ||
      perms.includes("company_users:read") ||
      perms.includes("company_users:manage") ||
      perms.includes("companies:read") ||
      perms.includes("companies:manage") ||
      perms.includes("roles:read") ||
      perms.includes("roles:manage") ||
      perms.includes("users:read") ||
      perms.includes("users:manage");
    if (!hasCompanyManage) {
      const error = new Error("Access denied: company roles are restricted to company administrators.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (role.scope === ROLE_SCOPE.PURCHASING_CENTER) {
    if (isSuperAdminActor(req)) {
      return;
    }
    if (isPurchasingCenterActor(req)) {
      if (role.purchasing_center_id && req.user.purchasing_center_id && role.purchasing_center_id !== req.user.purchasing_center_id) {
        const error = new Error("Access denied: role belongs to another purchasing center.");
        error.status = 403;
        throw error;
      }
      return;
    }
    const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
    const hasPurchasingCenterManage =
      perms.includes("purchasing_center_roles:read") ||
      perms.includes("purchasing_center_roles:manage") ||
      perms.includes("purchasing_center_users:read") ||
      perms.includes("purchasing_center_users:manage") ||
      perms.includes("purchasing_centers:read") ||
      perms.includes("purchasing_centers:manage") ||
      perms.includes("roles:read") ||
      perms.includes("roles:manage") ||
      perms.includes("users:read") ||
      perms.includes("users:manage");
    if (!hasPurchasingCenterManage) {
      const error = new Error("Access denied: purchasing center roles are restricted to purchasing center administrators.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (!structureId) {
    const error = new Error("Structure context is required.");
    error.status = 400;
    throw error;
  }

  if (
    role.scope !== ROLE_SCOPE.STRUCTURE ||
    role.government_structure_id !== structureId
  ) {
    const error = new Error("Access denied: role belongs to another structure.");
    error.status = 403;
    throw error;
  }
}

function assertCompanyRoleAssignable(role, req) {
  if (!role) {
    const error = new Error("Role not found.");
    error.status = 404;
    throw error;
  }

  if (role.scope !== ROLE_SCOPE.COMPANY && !STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS.has(role.role_id)) {
    const error = new Error("Access denied: only company-scoped roles can be assigned to company accounts.");
    error.status = 403;
    throw error;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());

  if (isCompanyActor(req)) {
    const hasRoleAssign =
      perms.includes("company_users:assign_role") ||
      perms.includes("company_users:create") ||
      perms.includes("company_users:update") ||
      perms.includes("company_users:manage") ||
      perms.includes("company_roles:manage") ||
      perms.includes("roles:manage");
    if (!hasRoleAssign) {
      const error = new Error("Access denied: missing company user role assignment permission.");
      error.status = 403;
      throw error;
    }
    return;
  }

  const hasFederalCompanyPerm =
    perms.includes("company_users:assign_role") ||
    perms.includes("company_users:create") ||
    perms.includes("company_users:update") ||
    perms.includes("company_users:manage") ||
    perms.includes("users:manage") ||
    perms.includes("users:update") ||
    perms.includes("users:create") ||
    perms.includes("users:assign_role") ||
    perms.includes("companies:manage");
  if (!hasFederalCompanyPerm) {
    const error = new Error("Access denied: federal account lacks company user management permission.");
    error.status = 403;
    throw error;
  }
}

function assertPurchasingCenterRoleAssignable(role, req) {
  if (!role) {
    const error = new Error("Role not found.");
    error.status = 404;
    throw error;
  }

  if (role.scope !== ROLE_SCOPE.PURCHASING_CENTER && !STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS.has(role.role_id)) {
    const error = new Error("Access denied: only purchasing-center-scoped roles can be assigned to purchasing center accounts.");
    error.status = 403;
    throw error;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());

  if (isPurchasingCenterActor(req)) {
    const hasRoleAssign =
      perms.includes("purchasing_center_users:assign_role") ||
      perms.includes("purchasing_center_users:create") ||
      perms.includes("purchasing_center_users:update") ||
      perms.includes("purchasing_center_users:manage") ||
      perms.includes("purchasing_center_roles:manage") ||
      perms.includes("roles:manage");
    if (!hasRoleAssign) {
      const error = new Error("Access denied: missing purchasing center user role assignment permission.");
      error.status = 403;
      throw error;
    }
    return;
  }

  const hasFederalPcPerm =
    perms.includes("purchasing_center_users:assign_role") ||
    perms.includes("purchasing_center_users:create") ||
    perms.includes("purchasing_center_users:update") ||
    perms.includes("purchasing_center_users:manage") ||
    perms.includes("users:manage") ||
    perms.includes("users:update") ||
    perms.includes("users:create") ||
    perms.includes("users:assign_role") ||
    perms.includes("purchasing_centers:manage");
  if (!hasFederalPcPerm) {
    const error = new Error("Access denied: federal account lacks purchasing center user management permission.");
    error.status = 403;
    throw error;
  }
}

/**
 * @param {object} role
 * @param {object} req
 * @param {string|null} [targetRegionId] Region of the user receiving the role.
 *   Defaults to the acting regional user's own region.
 */
function assertRegionalRoleAssignable(role, req, targetRegionId = null) {
  if (!role) {
    const error = new Error("Role not found.");
    error.status = 404;
    throw error;
  }

  if (role.scope !== ROLE_SCOPE.REGIONAL && !STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS.has(role.role_id)) {
    if (role.name && role.name.toLowerCase().startsWith("regional")) {
      role.scope = ROLE_SCOPE.REGIONAL;
      role.save().catch((err) => console.error("Failed to auto-heal role scope:", err));
    } else {
      const error = new Error("Access denied: only regional-scoped roles can be assigned to regional accounts.");
      error.status = 403;
      throw error;
    }
  }

  // A role created by a region belongs to that region only. Roles with no
  // region_id were created by the federal level and are shared by all regions.
  const regionForAssignment =
    targetRegionId || (isRegionalActor(req) ? req.user?.region_id : null);
  if (role.region_id && regionForAssignment && role.region_id !== regionForAssignment) {
    const error = new Error("Access denied: role belongs to another region.");
    error.status = 403;
    throw error;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());

  if (isRegionalActor(req)) {
    const hasRoleAssign =
      perms.includes("regional_users:assign_role") ||
      perms.includes("regional_users:create") ||
      perms.includes("regional_users:update") ||
      perms.includes("regional_users:manage") ||
      perms.includes("roles:manage");
    if (!hasRoleAssign) {
      const error = new Error("Access denied: missing regional user role assignment permission.");
      error.status = 403;
      throw error;
    }
    return;
  }

  const hasFederalRegionalPerm =
    perms.includes("regional_users:assign_role") ||
    perms.includes("regional_users:create") ||
    perms.includes("regional_users:update") ||
    perms.includes("regional_users:manage") ||
    perms.includes("users:manage") ||
    perms.includes("users:update") ||
    perms.includes("users:create") ||
    perms.includes("users:assign_role") ||
    perms.includes("regions:manage");
  if (!hasFederalRegionalPerm) {
    const error = new Error("Access denied: federal account lacks regional user management permission.");
    error.status = 403;
    throw error;
  }
}

function assertRoleAssignable(role, structureId, req) {
  assertRoleAccessible(role, req, structureId);

  if (role.role_id === SUPER_ADMIN_ROLE_ID && !isSuperAdminActor(req)) {
    const error = new Error("Only Super Admin can assign the Super Admin role.");
    error.status = 403;
    throw error;
  }
}

function assertRoleModifiable(role, req) {
  if (role.scope === ROLE_SCOPE.STRUCTURE) {
    return;
  }

  if (role.scope === ROLE_SCOPE.GLOBAL || role.scope === ROLE_SCOPE.PRIVATE) {
    if (!isSuperAdminActor(req)) {
      const error = new Error("Only Super Admin can modify global or private roles.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (role.scope === ROLE_SCOPE.REGIONAL) {
    if (isSuperAdminActor(req)) {
      return;
    }
    if (isRegionalActor(req)) {
      if (!role.region_id) {
        const error = new Error("System regional template roles cannot be modified.");
        error.status = 403;
        throw error;
      }
      if (role.region_id !== req.user.region_id) {
        const error = new Error("Access denied: role belongs to another region.");
        error.status = 403;
        throw error;
      }
      return;
    }
    const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
    if (
      perms.includes("regional_roles:update") ||
      perms.includes("regional_roles:manage") ||
      perms.includes("regional_users:manage") ||
      perms.includes("regional_users:update") ||
      perms.includes("roles:update") ||
      perms.includes("roles:manage") ||
      perms.includes("regions:manage")
    ) {
      return;
    }
    const error = new Error("Access denied: missing permission to modify regional roles.");
    error.status = 403;
    throw error;
  }

  if (role.scope === ROLE_SCOPE.COMPANY) {
    if (isSuperAdminActor(req)) {
      return;
    }
    if (isCompanyActor(req)) {
      if (!role.company_id) {
        const error = new Error("System company template roles cannot be modified.");
        error.status = 403;
        throw error;
      }
      if (role.company_id !== req.user.company_id) {
        const error = new Error("Access denied: role belongs to another company.");
        error.status = 403;
        throw error;
      }
      return;
    }
    const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
    if (
      perms.includes("company_roles:update") ||
      perms.includes("company_roles:manage") ||
      perms.includes("company_users:manage") ||
      perms.includes("company_users:update") ||
      perms.includes("roles:update") ||
      perms.includes("roles:manage") ||
      perms.includes("companies:manage")
    ) {
      return;
    }
    const error = new Error("Access denied: missing permission to modify company roles.");
    error.status = 403;
    throw error;
  }

  if (role.scope === ROLE_SCOPE.PURCHASING_CENTER) {
    if (isSuperAdminActor(req)) {
      return;
    }
    if (isPurchasingCenterActor(req)) {
      if (!role.purchasing_center_id) {
        const error = new Error("System purchasing center template roles cannot be modified.");
        error.status = 403;
        throw error;
      }
      if (role.purchasing_center_id !== req.user.purchasing_center_id) {
        const error = new Error("Access denied: role belongs to another purchasing center.");
        error.status = 403;
        throw error;
      }
      return;
    }
    const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
    if (
      perms.includes("purchasing_center_roles:update") ||
      perms.includes("purchasing_center_roles:manage") ||
      perms.includes("purchasing_center_users:manage") ||
      perms.includes("purchasing_center_users:update") ||
      perms.includes("roles:update") ||
      perms.includes("roles:manage") ||
      perms.includes("purchasing_centers:manage")
    ) {
      return;
    }
    const error = new Error("Access denied: missing permission to modify purchasing center roles.");
    error.status = 403;
    throw error;
  }

  const error = new Error("Unsupported role scope.");
  error.status = 400;
  throw error;
}

function assertRoleDeletable(role, req) {
  if (SYSTEM_PROTECTED_ROLE_IDS.has(role.role_id)) {
    const error = new Error("System roles cannot be deleted.");
    error.status = 403;
    throw error;
  }

  if (
    role.scope !== ROLE_SCOPE.STRUCTURE &&
    role.scope !== ROLE_SCOPE.REGIONAL &&
    role.scope !== ROLE_SCOPE.COMPANY &&
    role.scope !== ROLE_SCOPE.PURCHASING_CENTER
  ) {
    const error = new Error("Only structure-scoped, regional-scoped, company-scoped, or purchasing-center-scoped roles can be deleted.");
    error.status = 403;
    throw error;
  }

  if (role.scope === ROLE_SCOPE.REGIONAL) {
    if (!role.region_id && !isSuperAdminActor(req)) {
      const error = new Error("System regional template roles cannot be deleted.");
      error.status = 403;
      throw error;
    }
    if (role.region_id && isRegionalActor(req) && role.region_id !== req.user?.region_id) {
      const error = new Error("Access denied: role belongs to another region.");
      error.status = 403;
      throw error;
    }
  }

  if (role.scope === ROLE_SCOPE.COMPANY) {
    if (!role.company_id && !isSuperAdminActor(req)) {
      const error = new Error("System company template roles cannot be deleted.");
      error.status = 403;
      throw error;
    }
    if (role.company_id && isCompanyActor(req) && role.company_id !== req.user?.company_id) {
      const error = new Error("Access denied: role belongs to another company.");
      error.status = 403;
      throw error;
    }
  }

  if (role.scope === ROLE_SCOPE.PURCHASING_CENTER) {
    if (!role.purchasing_center_id && !isSuperAdminActor(req)) {
      const error = new Error("System purchasing center template roles cannot be deleted.");
      error.status = 403;
      throw error;
    }
    if (role.purchasing_center_id && isPurchasingCenterActor(req) && role.purchasing_center_id !== req.user?.purchasing_center_id) {
      const error = new Error("Access denied: role belongs to another purchasing center.");
      error.status = 403;
      throw error;
    }
  }
}

function assertUserInStructure(user, structureId, req, structureIndex = null) {
  if (isSuperAdminActor(req)) {
    if (!structureId || !user.government_structure_id) {
      return;
    }
    if (user.government_structure_id !== structureId) {
      const error = new Error("Access denied: user belongs to another structure.");
      error.status = 403;
      throw error;
    }
    return;
  }

  const actorStructureId = getActorStructureId(req);
  if (!actorStructureId) {
    const error = new Error("Your account is not linked to a structure.");
    error.status = 403;
    throw error;
  }

  if (!user.government_structure_id) {
    const error = new Error("Access denied: user belongs to another structure.");
    error.status = 403;
    throw error;
  }

  if (structureIndex) {
    const visibleIds = buildVisibleGovernmentStructureIdSet(
      structureIndex,
      actorStructureId
    );
    if (!visibleIds.has(user.government_structure_id)) {
      const error = new Error("Access denied: user belongs to another structure.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (user.government_structure_id !== actorStructureId) {
    const error = new Error("Access denied: user belongs to another structure.");
    error.status = 403;
    throw error;
  }
}

function sendScopeError(res, error) {
  return res.status(error.status || 403).json({
    success: false,
    message: error.message,
    ...(error.unauthorizedPermissionIds
      ? { unauthorized_permission_ids: error.unauthorizedPermissionIds }
      : {}),
  });
}

/**
 * Root of the visible government-structure subtree.
 * Super Admin: null (no filter). Sector users: their government_structure_id.
 */
function resolveVisibleGovernmentStructureRootId(req) {
  if (isSuperAdminActor(req)) {
    return null;
  }

  const actorStructureId = getActorStructureId(req);
  if (!actorStructureId) {
    const error = new Error("Your account is not linked to a structure.");
    error.status = 403;
    throw error;
  }

  return actorStructureId;
}

/**
 * Keep only rootId and its descendants within a flat structure list.
 */
function filterGovernmentStructuresToSubtree(allStructures, rootId) {
  if (!rootId) {
    return allStructures;
  }

  const root = allStructures.find(
    (structure) => structure.government_structure_id === rootId
  );
  if (!root) {
    return [];
  }

  const descendantIds = collectDescendantIds(
    rootId,
    allStructures,
    "government_structure_id"
  );
  const visibleIds = new Set([rootId, ...descendantIds]);

  return allStructures.filter((structure) =>
    visibleIds.has(structure.government_structure_id)
  );
}

function buildVisibleGovernmentStructureIdSet(structureIndex, rootId) {
  return new Set(
    filterGovernmentStructuresToSubtree(structureIndex, rootId).map(
      (structure) => structure.government_structure_id
    )
  );
}

/**
 * Resolve government_structure_id filter for user listings.
 * Returns null for Super Admin with no filter (all users), else an array of sector IDs.
 */
function resolveUserGovernmentStructureFilter(
  req,
  requestedStructureId,
  structureIndex
) {
  if (isSuperAdminActor(req)) {
    if (!requestedStructureId) {
      return null;
    }
    assertGovernmentStructureAccessible(req, requestedStructureId, structureIndex);
    return [
      ...buildVisibleGovernmentStructureIdSet(
        structureIndex,
        requestedStructureId
      ),
    ];
  }

  const actorStructureId = resolveVisibleGovernmentStructureRootId(req);
  const actorVisible = buildVisibleGovernmentStructureIdSet(
    structureIndex,
    actorStructureId
  );

  if (requestedStructureId) {
    if (!actorVisible.has(requestedStructureId)) {
      const error = new Error("Access denied: sector is outside your scope.");
      error.status = 403;
      throw error;
    }
    return [
      ...buildVisibleGovernmentStructureIdSet(
        structureIndex,
        requestedStructureId
      ),
    ];
  }

  return [...actorVisible];
}

function assertGovernmentStructureAccessible(req, structureId, allStructures) {
  if (!structureId) {
    return;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  const rootId = resolveVisibleGovernmentStructureRootId(req);
  const visible = filterGovernmentStructuresToSubtree(allStructures, rootId);
  const visibleIds = new Set(
    visible.map((structure) => structure.government_structure_id)
  );

  if (!visibleIds.has(structureId)) {
    const error = new Error("Access denied: sector is outside your scope.");
    error.status = 403;
    throw error;
  }
}

function assertGovernmentStructureParentAllowed(req, parentId, allStructures) {
  if (!parentId) {
    if (!isSuperAdminActor(req)) {
      const error = new Error("Only Super Admin can create root-level sectors.");
      error.status = 403;
      throw error;
    }
    return;
  }

  assertGovernmentStructureAccessible(req, parentId, allStructures);
}

/**
 * Plan rule visibility:
 * - Super Admin (no structure filter): all rules
 * - Otherwise: global rules + rules scoped to the visible subtree
 */
function buildPlanRuleVisibilityWhere(req, structureId, structureIndex) {
  if (isSuperAdminActor(req) && !structureId) {
    return { owned_by_plan_version_id: null };
  }

  if (!structureId) {
    const error = new Error("government_structure_id is required.");
    error.status = 400;
    throw error;
  }

  if (!structureIndex) {
    const error = new Error("Structure index is required.");
    error.status = 500;
    throw error;
  }

  const visibleIds = buildVisibleGovernmentStructureIdSet(structureIndex, structureId);

  return {
    owned_by_plan_version_id: null,
    [Op.or]: [
      { government_structure_id: null },
      { government_structure_id: { [Op.in]: [...visibleIds] } },
    ],
  };
}

function assertPlanRuleAccessible(rule, req, structureId, structureIndex) {
  if (!rule) {
    const error = new Error("Plan rule not found.");
    error.status = 404;
    throw error;
  }

  if (!rule.government_structure_id) {
    return;
  }

  if (isSuperAdminActor(req) && !structureId) {
    return;
  }

  const rootId = structureId || getActorStructureId(req);
  if (!rootId) {
    const error = new Error("Structure context is required.");
    error.status = 400;
    throw error;
  }

  const visibleIds = buildVisibleGovernmentStructureIdSet(structureIndex, rootId);
  if (!visibleIds.has(rule.government_structure_id)) {
    const error = new Error("Access denied: plan rule belongs to another structure.");
    error.status = 403;
    throw error;
  }
}

function assertPlanRuleModifiable(rule, req, structureIndex) {
  if (!rule.government_structure_id) {
    if (!isSuperAdminActor(req)) {
      const error = new Error("Only Super Admin can modify global plan rules.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  const actorStructureId = getActorStructureId(req);
  if (!actorStructureId) {
    const error = new Error("Your account is not linked to a structure.");
    error.status = 403;
    throw error;
  }

  const visibleIds = buildVisibleGovernmentStructureIdSet(
    structureIndex,
    actorStructureId
  );
  if (!visibleIds.has(rule.government_structure_id)) {
    const error = new Error("Access denied: plan rule belongs to another structure.");
    error.status = 403;
    throw error;
  }
}

function assertPlanRuleDeletable(rule, req, structureIndex) {
  if (!rule.government_structure_id) {
    const error = new Error("Global plan rules cannot be deleted.");
    error.status = 403;
    throw error;
  }

  assertPlanRuleModifiable(rule, req, structureIndex);
}

function isRegionalActor(req) {
  return Boolean(req.user?.region_id);
}

function isCompanyActor(req) {
  return Boolean(req.user?.company_id);
}

function isPurchasingCenterActor(req) {
  return Boolean(req.user?.purchasing_center_id);
}

function isFederalActor(req) {
  return Boolean(req.user?.government_structure_id);
}

function getUserDomain(user) {
  if (
    Array.isArray(user?.roles) &&
    user.roles.some((name) => String(name).toLowerCase() === "super admin")
  ) {
    return "super_admin";
  }
  if (user?.purchasing_center_id) {
    return "purchasing_center";
  }
  if (user?.region_id) {
    return "regional";
  }
  if (user?.company_id) {
    return "company";
  }
  if (user?.government_structure_id) {
    return "federal";
  }
  return "unassigned";
}

function assertCompanyAccessible(req, companyId, requiredAction = "read") {
  if (!companyId) {
    const error = new Error("Company ID is required.");
    error.status = 400;
    throw error;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  if (isCompanyActor(req)) {
    if (req.user.company_id !== companyId) {
      const error = new Error("Access denied: you do not have permission to access another company.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (isRegionalActor(req)) {
    const error = new Error("Access denied: regional accounts cannot access company domain resources.");
    error.status = 403;
    throw error;
  }

  // Federal actor acting under explicit company-management permissions
  const actionLower = String(requiredAction).toLowerCase();
  const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
  const hasExplicitCompanyPerm =
    perms.includes(`companies:${actionLower}`) ||
    perms.includes("companies:manage") ||
    perms.includes(`company_structures:${actionLower}`) ||
    perms.includes("company_structures:manage") ||
    perms.includes(`company_branding:${actionLower}`) ||
    perms.includes("company_branding:manage") ||
    perms.includes(`company_users:${actionLower}`) ||
    perms.includes("company_users:manage") ||
    perms.includes(`company_roles:${actionLower}`) ||
    perms.includes("company_roles:manage") ||
    perms.includes(`company_permission_groups:${actionLower}`) ||
    perms.includes("company_permission_groups:manage") ||
    perms.includes(`company_plans:${actionLower}`) ||
    perms.includes("company_plans:manage") ||
    perms.includes(`company_plan_rules:${actionLower}`) ||
    perms.includes(`company_planning_config:${actionLower}`);

  if (!hasExplicitCompanyPerm) {
    const error = new Error("Access denied: federal account lacks company management permission.");
    error.status = 403;
    throw error;
  }
}

function assertCompanyUserManageable(targetUser, req, action = "read") {
  if (!targetUser) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  if (isCompanyActor(req)) {
    if (targetUser.company_id !== req.user.company_id) {
      const error = new Error("Access denied: cannot manage users of another company.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (isRegionalActor(req)) {
    const error = new Error("Access denied: regional accounts cannot manage company users.");
    error.status = 403;
    throw error;
  }

  if (isPurchasingCenterActor(req)) {
    const error = new Error("Access denied: purchasing center accounts cannot manage company users.");
    error.status = 403;
    throw error;
  }

  const actionLower = String(action).toLowerCase();
  const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
  const hasExplicitPerm =
    perms.includes(`company_users:${actionLower}`) ||
    perms.includes("company_users:manage") ||
    perms.includes("companies:manage");

  if (!hasExplicitPerm) {
    const error = new Error("Access denied: federal account lacks company user management permission.");
    error.status = 403;
    throw error;
  }
}

function assertRegionAccessible(req, regionId, requiredAction = "read") {
  if (!regionId) {
    const error = new Error("Region ID is required.");
    error.status = 400;
    throw error;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  if (isRegionalActor(req)) {
    if (req.user.region_id !== regionId) {
      const error = new Error("Access denied: you do not have permission to access another region.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (isCompanyActor(req)) {
    const error = new Error("Access denied: company accounts cannot access regional domain resources.");
    error.status = 403;
    throw error;
  }

  if (isPurchasingCenterActor(req)) {
    const error = new Error("Access denied: purchasing center accounts cannot access regional domain resources.");
    error.status = 403;
    throw error;
  }

  // Federal actor acting under explicit regional-management permissions
  const actionLower = String(requiredAction).toLowerCase();
  const perms = req.user?.permissions || [];
  const hasExplicitRegionalPerm =
    perms.includes(`regions:${actionLower}`) ||
    perms.includes("regions:manage") ||
    perms.includes(`regional_structures:${actionLower}`) ||
    perms.includes("regional_structures:manage") ||
    perms.includes(`regional_branding:${actionLower}`) ||
    perms.includes("regional_branding:manage") ||
    perms.includes(`regional_users:${actionLower}`) ||
    perms.includes("regional_users:manage") ||
    perms.includes(`regional_plans:${actionLower}`) ||
    perms.includes("regional_plans:manage") ||
    perms.includes(`regional_plan_rules:${actionLower}`) ||
    perms.includes(`regional_planning_config:${actionLower}`);

  if (!hasExplicitRegionalPerm) {
    const error = new Error("Access denied: federal account lacks regional management permission.");
    error.status = 403;
    throw error;
  }
}

function assertRegionalUserManageable(targetUser, req, action = "read") {
  if (!targetUser) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  const actionLower = String(action).toLowerCase();
  const perms = req.user?.permissions || [];

  if (isRegionalActor(req)) {
    if (targetUser.region_id !== req.user.region_id) {
      const error = new Error("Access denied: you do not have permission to access another region.");
      error.status = 403;
      throw error;
    }

    const hasRegionalUserPerm =
      perms.includes(`regional_users:${actionLower}`) ||
      perms.includes("regional_users:manage");

    if (!hasRegionalUserPerm) {
      const error = new Error(`Access denied: missing regional user ${actionLower} permission.`);
      error.status = 403;
      throw error;
    }
    return;
  }

  if (isCompanyActor(req)) {
    const error = new Error("Access denied: company accounts cannot manage regional users.");
    error.status = 403;
    throw error;
  }

  if (isPurchasingCenterActor(req)) {
    const error = new Error("Access denied: purchasing center accounts cannot manage regional users.");
    error.status = 403;
    throw error;
  }

  // Federal actor managing regional accounts
  const hasFederalRegionalUserPerm =
    perms.includes(`regional_users:${actionLower}`) ||
    perms.includes("regional_users:manage") ||
    perms.includes(`users:${actionLower}`) ||
    perms.includes("users:manage") ||
    perms.includes("regions:manage");

  if (!hasFederalRegionalUserPerm) {
    const error = new Error("Access denied: federal account lacks regional user management permission.");
    error.status = 403;
    throw error;
  }
}

function assertFederalAccessible(req) {
  if (isSuperAdminActor(req)) {
    return;
  }

  if (isRegionalActor(req)) {
    const error = new Error("Access denied: regional users cannot access federal organizational resources.");
    error.status = 403;
    throw error;
  }

  if (isCompanyActor(req)) {
    const error = new Error("Access denied: company users cannot access federal organizational resources.");
    error.status = 403;
    throw error;
  }

  if (isPurchasingCenterActor(req)) {
    const error = new Error("Access denied: purchasing center users cannot access federal organizational resources.");
    error.status = 403;
    throw error;
  }
}

function assertPurchasingCenterAccessible(req, purchasingCenterId, requiredAction = "read") {
  if (!purchasingCenterId) {
    const error = new Error("Purchasing Center ID is required.");
    error.status = 400;
    throw error;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  if (isPurchasingCenterActor(req)) {
    if (req.user.purchasing_center_id !== purchasingCenterId) {
      const error = new Error("Access denied: you do not have permission to access another purchasing center.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (isRegionalActor(req)) {
    const error = new Error("Access denied: regional accounts cannot access purchasing center domain resources.");
    error.status = 403;
    throw error;
  }

  if (isCompanyActor(req)) {
    const error = new Error("Access denied: company accounts cannot access purchasing center domain resources.");
    error.status = 403;
    throw error;
  }

  // Federal actor acting under explicit purchasing center management permissions
  const actionLower = String(requiredAction).toLowerCase();
  const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
  const hasExplicitPerm =
    perms.includes(`purchasing_centers:${actionLower}`) ||
    perms.includes("purchasing_centers:manage") ||
    perms.includes(`purchasing_center_dashboard:${actionLower}`) ||
    perms.includes("purchasing_center_dashboard:view") ||
    perms.includes("purchasing_center_dashboard:manage") ||
    perms.includes("gold_oversight:read") ||
    perms.includes("gold_operations:read") ||
    perms.includes(`purchasing_center_branding:${actionLower}`) ||
    perms.includes("purchasing_center_branding:manage") ||
    perms.includes(`purchasing_center_users:${actionLower}`) ||
    perms.includes("purchasing_center_users:manage") ||
    perms.includes(`purchasing_center_roles:${actionLower}`) ||
    perms.includes("purchasing_center_roles:manage") ||
    perms.includes(`purchasing_center_permission_groups:${actionLower}`) ||
    perms.includes("purchasing_center_permission_groups:manage");

  if (!hasExplicitPerm) {
    const error = new Error("Access denied: federal account lacks purchasing center management permission.");
    error.status = 403;
    throw error;
  }
}

function assertPurchasingCenterUserManageable(targetUser, req, action = "read") {
  if (!targetUser) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  if (isSuperAdminActor(req)) {
    return;
  }

  if (isPurchasingCenterActor(req)) {
    if (targetUser.purchasing_center_id !== req.user.purchasing_center_id) {
      const error = new Error("Access denied: cannot manage users of another purchasing center.");
      error.status = 403;
      throw error;
    }
    return;
  }

  if (isRegionalActor(req)) {
    const error = new Error("Access denied: regional accounts cannot manage purchasing center users.");
    error.status = 403;
    throw error;
  }

  if (isCompanyActor(req)) {
    const error = new Error("Access denied: company accounts cannot manage purchasing center users.");
    error.status = 403;
    throw error;
  }

  const actionLower = String(action).toLowerCase();
  const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
  const hasExplicitPerm =
    perms.includes(`purchasing_center_users:${actionLower}`) ||
    perms.includes("purchasing_center_users:manage") ||
    perms.includes("purchasing_centers:manage");

  if (!hasExplicitPerm) {
    const error = new Error("Access denied: federal account lacks purchasing center user management permission.");
    error.status = 403;
    throw error;
  }
}

function assertUserManageable(targetUser, req, structureIndex, action = "update") {
  if (!targetUser) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  if (targetUser.purchasing_center_id) {
    assertPurchasingCenterUserManageable(targetUser, req, action);
    return;
  }

  if (targetUser.region_id) {
    assertRegionalUserManageable(targetUser, req, action);
    return;
  }

  if (targetUser.company_id) {
    assertCompanyUserManageable(targetUser, req, action);
    return;
  }

  assertFederalAccessible(req);
  assertUserInStructure(targetUser, targetUser.government_structure_id, req, structureIndex);
}

module.exports = {
  isSuperAdminActor,
  isRegionalActor,
  isCompanyActor,
  isPurchasingCenterActor,
  isFederalActor,
  getUserDomain,
  assertRegionAccessible,
  assertRegionalUserManageable,
  assertCompanyAccessible,
  assertCompanyUserManageable,
  assertPurchasingCenterAccessible,
  assertPurchasingCenterUserManageable,
  assertFederalAccessible,
  assertUserManageable,
  assertRegionalRoleAssignable,
  assertCompanyRoleAssignable,
  assertPurchasingCenterRoleAssignable,
  getActorStructureId,
  resolveManageableStructureId,
  buildRoleVisibilityWhere,
  assertRoleAccessible,
  assertRoleAssignable,
  assertRoleModifiable,
  assertRoleDeletable,
  assertUserInStructure,
  resolveVisibleGovernmentStructureRootId,
  filterGovernmentStructuresToSubtree,
  buildVisibleGovernmentStructureIdSet,
  resolveUserGovernmentStructureFilter,
  assertGovernmentStructureAccessible,
  assertGovernmentStructureParentAllowed,
  buildPlanRuleVisibilityWhere,
  assertPlanRuleAccessible,
  assertPlanRuleModifiable,
  assertPlanRuleDeletable,
  sendScopeError,
};
