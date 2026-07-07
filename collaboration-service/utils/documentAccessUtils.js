"use strict";

const ROLE_RANK = {
  viewer: 1,
  editor: 2,
  manager: 3,
};

function hasPermission(permissions, key) {
  return permissions.includes(key);
}

function maxGrantRole(currentRole, nextRole) {
  if (!nextRole) return currentRole || null;
  if (!currentRole) return nextRole;
  return ROLE_RANK[nextRole] > ROLE_RANK[currentRole] ? nextRole : currentRole;
}

function accessFromGrantRole(grantRole, documentStatus) {
  if (!grantRole) {
    return {
      canRead: false,
      canEdit: false,
      canDelete: false,
      canFinalize: false,
      canUnfinalize: false,
    };
  }

  const finalized = documentStatus === "finalized";
  const canRead = true;
  const canEdit = !finalized && (grantRole === "editor" || grantRole === "manager");
  const canDelete = !finalized && grantRole === "manager";

  return {
    canRead,
    canEdit,
    canDelete,
    canFinalize: canEdit,
    canUnfinalize: false,
    mode: canEdit ? "edit" : "view",
    reason: `document_grant_${grantRole}`,
  };
}

function mergeDocumentAccess(baseAccess, grantAccess) {
  const canRead = Boolean(baseAccess.canRead || grantAccess.canRead);
  const canEdit = Boolean(baseAccess.canEdit || grantAccess.canEdit);
  const canDelete = Boolean(baseAccess.canDelete || grantAccess.canDelete);
  const canFinalize = Boolean(baseAccess.canFinalize || grantAccess.canFinalize);
  const canUnfinalize = Boolean(baseAccess.canUnfinalize || grantAccess.canUnfinalize);

  return {
    canRead,
    canEdit,
    canDelete,
    canFinalize,
    canUnfinalize,
    mode: canEdit ? "edit" : "view",
    reason: grantAccess.canRead && !baseAccess.canRead ? grantAccess.reason : baseAccess.reason,
  };
}

function appendShareForwardFlags(access, permissions, { isCreator, grantRole }) {
  const canManage = hasPermission(permissions, "DOCUMENTS:MANAGE");
  const canSharePerm = canManage || hasPermission(permissions, "DOCUMENTS:SHARE");
  const canForwardPerm = canManage || hasPermission(permissions, "DOCUMENTS:FORWARD");
  const isManager = canManage || isCreator || grantRole === "manager";

  return {
    ...access,
    canShare: Boolean(canSharePerm && isManager && access.canRead),
    canForward: Boolean(canForwardPerm && access.canRead),
    grantRole: grantRole || null,
  };
}

function canGrantRole(sharerGrantRole, isCreator, permissions, requestedRole) {
  const canManage = hasPermission(permissions, "DOCUMENTS:MANAGE");
  if (canManage || isCreator || sharerGrantRole === "manager") {
    return true;
  }
  if (sharerGrantRole === "editor") {
    return requestedRole === "viewer" || requestedRole === "editor";
  }
  return false;
}

module.exports = {
  ROLE_RANK,
  maxGrantRole,
  accessFromGrantRole,
  mergeDocumentAccess,
  appendShareForwardFlags,
  canGrantRole,
  hasPermission,
};
