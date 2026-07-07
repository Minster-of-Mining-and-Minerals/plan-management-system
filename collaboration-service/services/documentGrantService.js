"use strict";

const { Op } = require("sequelize");
const { DocumentGrant } = require("../models");
const { getIntegrationAdapters } = require("./integrationContext");
const userProfileService = require("./userProfileService");
const { maxGrantRole } = require("../utils/documentAccessUtils");

function isGrantActive(grant) {
  if (!grant.expires_at) return true;
  return new Date(grant.expires_at).getTime() > Date.now();
}

async function resolveUserPermissionGroupIds(user) {
  const adapters = getIntegrationAdapters();
  if (user && adapters.getUserPermissionGroupIds) {
    return adapters.getUserPermissionGroupIds(user);
  }
  return [];
}

async function resolveGrantRolesForUser(documentIds, userId, user = null) {
  const uniqueIds = [...new Set((documentIds || []).filter(Boolean))];
  const roleByDocumentId = new Map();
  if (!userId) {
    return roleByDocumentId;
  }

  const groupIds = await resolveUserPermissionGroupIds(user);
  const principalClauses = [{ principal_type: "user", principal_id: userId }];
  if (groupIds.length) {
    principalClauses.push({
      principal_type: "permission_group",
      principal_id: { [Op.in]: groupIds },
    });
  }

  const where = {
    [Op.or]: principalClauses,
  };
  if (uniqueIds.length) {
    where.document_id = { [Op.in]: uniqueIds };
  }

  const grants = await DocumentGrant.findAll({
    where,
    order: [["created_at", "ASC"]],
  });

  for (const grant of grants) {
    if (!isGrantActive(grant)) continue;
    const current = roleByDocumentId.get(grant.document_id) || null;
    roleByDocumentId.set(grant.document_id, maxGrantRole(current, grant.role));
  }

  return roleByDocumentId;
}

function serializeGrant(grant, principal = null) {
  return {
    document_grant_id: grant.document_grant_id,
    document_id: grant.document_id,
    principal_type: grant.principal_type,
    principal_id: grant.principal_id,
    role: grant.role,
    granted_by: grant.granted_by,
    expires_at: grant.expires_at,
    created_at: grant.created_at,
    updated_at: grant.updated_at,
    principal_name: principal?.name || null,
    principal_email: principal?.email || null,
  };
}

async function enrichGrantPrincipals(grants, accessToken, user = null) {
  const userIds = grants
    .filter((grant) => grant.principal_type === "user")
    .map((grant) => grant.principal_id);
  const displayNames = await userProfileService.resolveUserDisplayNames(accessToken, userIds, user);

  return grants.map((grant) => {
    if (grant.principal_type !== "user") {
      return serializeGrant(grant, { name: grant.principal_id });
    }
    const profile = displayNames[grant.principal_id];
    return serializeGrant(grant, {
      name: profile?.full_name || profile?.email || grant.principal_id,
      email: profile?.email || null,
    });
  });
}

async function listDocumentGrants(documentId) {
  return DocumentGrant.findAll({
    where: { document_id: documentId },
    order: [["created_at", "DESC"]],
  });
}

async function createDocumentGrant({
  documentId,
  principalType,
  principalId,
  role,
  grantedBy,
  expiresAt = null,
}) {
  let grant = await DocumentGrant.findOne({
    where: {
      document_id: documentId,
      principal_type: principalType,
      principal_id: principalId,
    },
  });

  if (grant) {
    await grant.update({
      role,
      granted_by: grantedBy,
      expires_at: expiresAt,
    });
    return grant;
  }

  return DocumentGrant.create({
    document_id: documentId,
    principal_type: principalType,
    principal_id: principalId,
    role,
    granted_by: grantedBy,
    expires_at: expiresAt,
  });
}

async function deleteDocumentGrant(documentId, grantId) {
  const grant = await DocumentGrant.findOne({
    where: {
      document_grant_id: grantId,
      document_id: documentId,
    },
  });

  if (!grant) {
    return null;
  }

  await grant.destroy();
  return true;
}

async function ensureViewerGrant(documentId, recipientUserId, grantedBy) {
  const existingRole = await resolveGrantRolesForUser([documentId], recipientUserId);
  if (existingRole.get(documentId)) {
    return null;
  }

  return createDocumentGrant({
    documentId,
    principalType: "user",
    principalId: recipientUserId,
    role: "viewer",
    grantedBy,
  });
}

module.exports = {
  resolveGrantRolesForUser,
  listDocumentGrants,
  createDocumentGrant,
  deleteDocumentGrant,
  ensureViewerGrant,
  enrichGrantPrincipals,
  serializeGrant,
};
