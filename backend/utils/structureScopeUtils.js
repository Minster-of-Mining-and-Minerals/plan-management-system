"use strict";

const { Op } = require("sequelize");
const {
  SUPER_ADMIN_ROLE_ID,
  SUPER_ADMIN_ROLE_NAME,
  ROLE_SCOPE,
  STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS,
  SYSTEM_PROTECTED_ROLE_IDS,
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

  if (role.scope !== ROLE_SCOPE.STRUCTURE) {
    const error = new Error("Only structure-scoped roles can be deleted.");
    error.status = 403;
    throw error;
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
    return {};
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

module.exports = {
  isSuperAdminActor,
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
