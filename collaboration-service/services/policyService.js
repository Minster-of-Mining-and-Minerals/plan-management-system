const { getUserPermissions } = require("./userProfileService");
const { getIntegrationAdapters } = require("./integrationContext");
const {
  accessFromGrantRole,
  mergeDocumentAccess,
  appendShareForwardFlags,
} = require("../utils/documentAccessUtils");

const PLAN_API_URL = process.env.PLAN_API_URL || "http://localhost:4000/api";

/** Plan statuses that mean the plan tree/structure is frozen. */
const STRUCTURE_LOCKED_STATUSES = new Set(["finalized", "locked"]);
/** Fully finished plans — documents become read-only. */
const COMPLETED_PLAN_STATUSES = new Set(["completed"]);

const DENY_ALL_ACCESS = {
  canRead: false,
  canEdit: false,
  canDelete: false,
  canFinalize: false,
  canUnfinalize: false,
  canShare: false,
  canForward: false,
  grantRole: null,
  mode: "view",
  reason: "access_denied",
};

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

function resolveStandaloneAccess({ permissions, createdBy, userId, documentStatus }) {
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
  const canCreateOrUpdateDocuments =
    canManage ||
    hasPermission(permissions, "DOCUMENTS:CREATE") ||
    hasPermission(permissions, "DOCUMENTS:UPDATE");

  const structureLocked =
    Boolean(planVersion.is_locked) ||
    STRUCTURE_LOCKED_STATUSES.has(planVersion.status);
  const planCompleted = COMPLETED_PLAN_STATUSES.has(planVersion.status);

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

  // Fully completed plans: documents are read-only.
  if (planCompleted) {
    return {
      canRead: true,
      canEdit: false,
      canDelete: false,
      canFinalize: false,
      canUnfinalize: false,
      mode: "view",
      reason: "plan_completed",
    };
  }

  // IMPORTANT: `finalized` / `is_locked` only freezes the plan tree structure.
  // Plan documents must still be creatable/editable during execution.
  const canEditDocuments = canUpdatePlan || canCreateOrUpdateDocuments;

  return {
    canRead: true,
    canEdit: canEditDocuments,
    canDelete: canUpdatePlan || canManage,
    canFinalize: canEditDocuments,
    canUnfinalize: false,
    mode: canEditDocuments ? "edit" : "view",
    reason: canEditDocuments
      ? structureLocked
        ? "plan_structure_locked_docs_allowed"
        : "plan_update"
      : "plan_read_only",
    structureLocked,
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
  grantRole = null,
}) {
  const { permissions } = await getUserPermissions(accessToken, user);
  let baseAccess;

  if (ownerType === "standalone" || !ownerId) {
    baseAccess = resolveStandaloneAccess({ permissions, createdBy, userId, documentStatus });
  } else if (ownerType === "plan_version") {
    baseAccess = await resolvePlanVersionAccess({
      ownerId,
      accessToken,
      documentStatus,
      permissions,
      user,
    });
  } else {
    return { ...DENY_ALL_ACCESS };
  }

  const grantAccess = accessFromGrantRole(grantRole, documentStatus);
  const merged = mergeDocumentAccess(baseAccess, grantAccess);
  const isCreator = Boolean(createdBy && userId && createdBy === userId);

  return appendShareForwardFlags(merged, permissions, {
    isCreator,
    grantRole,
  });
}

async function resolveCreateAccess({ ownerType, ownerId, accessToken, user = null }) {
  const { permissions } = await getUserPermissions(accessToken, user);
  const canManage = hasPermission(permissions, "DOCUMENTS:MANAGE");
  const canCreateDocuments =
    canManage || hasPermission(permissions, "DOCUMENTS:CREATE");

  if (ownerType === "plan_version" && ownerId) {
    const planAccess = await resolvePlanVersionAccess({
      ownerId,
      accessToken,
      documentStatus: "draft",
      permissions,
      user,
    });

    const canCreateOnPlan =
      planAccess.canEdit ||
      (canCreateDocuments &&
        planAccess.canRead &&
        planAccess.reason !== "plan_completed" &&
        planAccess.reason !== "plan_not_accessible" &&
        planAccess.reason !== "access_denied");

    return {
      canCreate: Boolean(canCreateOnPlan),
      reason: planAccess.reason,
    };
  }

  return {
    canCreate: canCreateDocuments,
    reason: canCreateDocuments ? "document_create" : "access_denied",
  };
}

module.exports = {
  resolveDocumentAccess,
  resolveCreateAccess,
};
