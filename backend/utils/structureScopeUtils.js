"use strict";

const { Op } = require("sequelize");
const {
  SUPER_ADMIN_ROLE_ID,
  SUPER_ADMIN_ROLE_NAME,
  ROLE_SCOPE,
  STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS,
  SYSTEM_PROTECTED_ROLE_IDS,
} = require("../constants/systemRoles");

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

function resolveManageableStructureId(req, requestedStructureId) {
  if (isSuperAdminActor(req)) {
    return requestedStructureId || getActorStructureId(req) || null;
  }

  const actorStructureId = getActorStructureId(req);
  if (!actorStructureId) {
    const error = new Error("Your account is not linked to a structure.");
    error.status = 403;
    throw error;
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

function assertUserInStructure(user, structureId, req) {
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
  sendScopeError,
};
