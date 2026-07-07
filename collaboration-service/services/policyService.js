const { getUserPermissions } = require("./userProfileService");
const { getIntegrationAdapters } = require("./integrationContext");

const PLAN_API_URL = process.env.PLAN_API_URL || "http://localhost:4000/api";

const LOCKED_PLAN_STATUSES = new Set(["finalized", "locked", "completed"]);

async function fetchPlanVersion(ownerId, accessToken) {
  const response = await fetch(`${PLAN_API_URL}/plan/versions/${ownerId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return payload?.data || null;
}

async function loadPlanVersion(ownerId, accessToken, user = null) {
  const adapters = getIntegrationAdapters();
  if (user && adapters.loadPlanVersion) {
    return adapters.loadPlanVersion(ownerId, user);
  }

  return fetchPlanVersion(ownerId, accessToken);
}

function hasPermission(permissions, key) {
  return permissions.includes(key);
}

async function resolveStandaloneAccess({
  permissions,
  createdBy,
  userId,
  documentStatus,
}) {
  const canManage = hasPermission(permissions, "DOCUMENTS:MANAGE");
  const canReadAll = canManage || hasPermission(permissions, "DOCUMENTS:READ");
  const canUpdate =
    canManage ||
    hasPermission(permissions, "DOCUMENTS:UPDATE") ||
    (createdBy && userId && createdBy === userId);
  const canDelete =
    canManage ||
    hasPermission(permissions, "DOCUMENTS:DELETE") ||
    (createdBy && userId && createdBy === userId && canUpdate);
  const isOwner = Boolean(createdBy && userId && createdBy === userId);
  const canRead = canReadAll || isOwner;

  if (documentStatus === "finalized") {
    return {
      canRead,
      canEdit: false,
      canDelete: canManage || hasPermission(permissions, "DOCUMENTS:DELETE"),
      canFinalize: false,
      canUnfinalize: canManage,
      mode: "view",
      reason: "document_finalized",
    };
  }

  return {
    canRead,
    canEdit: canUpdate,
    canDelete,
    canFinalize: canUpdate,
    canUnfinalize: false,
    mode: canUpdate ? "edit" : "view",
    reason: canUpdate ? "document_editor" : "document_read_only",
  };
}

async function resolvePlanVersionAccess({
  ownerId,
  accessToken,
  documentStatus,
  permissions,
  user = null,
}) {
  const planVersion = await loadPlanVersion(ownerId, accessToken, user);
  if (!planVersion) {
    return {
      canRead: false,
      canEdit: false,
      canDelete: false,
      canFinalize: false,
      canUnfinalize: false,
      mode: "view",
      reason: "plan_not_accessible",
    };
  }

  const canUpdatePlan =
    hasPermission(permissions, "PLANS:UPDATE") ||
    hasPermission(permissions, "PLANS:EDIT_FINALIZED");
  const canManage = hasPermission(permissions, "DOCUMENTS:MANAGE");

  const planLocked =
    Boolean(planVersion.is_locked) || LOCKED_PLAN_STATUSES.has(planVersion.status);

  if (documentStatus === "finalized") {
    return {
      canRead: true,
      canEdit: false,
      canDelete: canManage,
      canFinalize: false,
      canUnfinalize: canManage || canUpdatePlan,
      mode: "view",
      reason: "document_finalized",
    };
  }

  if (planLocked) {
    return {
      canRead: true,
      canEdit: false,
      canDelete: false,
      canFinalize: false,
      canUnfinalize: false,
      mode: "view",
      reason: "plan_locked",
    };
  }

  return {
    canRead: true,
    canEdit: canUpdatePlan,
    canDelete: canUpdatePlan,
    canFinalize: canUpdatePlan,
    canUnfinalize: false,
    mode: canUpdatePlan ? "edit" : "view",
    reason: canUpdatePlan ? "plan_update" : "plan_read_only",
  };
}

async function resolveDocumentAccess({
  ownerType,
  ownerId,
  accessToken,
  documentStatus,
  createdBy,
  userId,
  user = null,
}) {
  const { permissions } = await getUserPermissions(accessToken, user);

  if (ownerType === "standalone" || !ownerId) {
    return resolveStandaloneAccess({ permissions, createdBy, userId, documentStatus });
  }

  if (ownerType === "plan_version") {
    return resolvePlanVersionAccess({
      ownerId,
      accessToken,
      documentStatus,
      permissions,
      user,
    });
  }

  return {
    canRead: false,
    canEdit: false,
    canDelete: false,
    canFinalize: false,
    canUnfinalize: false,
    mode: "view",
    reason: "unsupported_owner",
  };
}

async function resolveCreateAccess({ ownerType, ownerId, accessToken, user = null }) {
  const { permissions } = await getUserPermissions(accessToken, user);
  const canManage = hasPermission(permissions, "DOCUMENTS:MANAGE");

  if (ownerType === "plan_version" && ownerId) {
    const planAccess = await resolvePlanVersionAccess({
      ownerId,
      accessToken,
      documentStatus: "draft",
      permissions,
      user,
    });
    return { canCreate: planAccess.canEdit };
  }

  return {
    canCreate:
      canManage ||
      hasPermission(permissions, "DOCUMENTS:CREATE"),
  };
}

module.exports = {
  resolveDocumentAccess,
  resolveCreateAccess,
};
