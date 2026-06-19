"use strict";

const { Op } = require("sequelize");

function normalizePermissionKey(resource, action) {
  return `${String(resource).toUpperCase()}:${String(action).toUpperCase()}`;
}

function userHasPermission(userPermissions, resource, action) {
  const key = normalizePermissionKey(resource, action);
  const keys = (userPermissions || []).map((p) => {
    if (typeof p === "string") return p.toUpperCase();
    if (p?.resource && p?.action) {
      return normalizePermissionKey(p.resource, p.action);
    }
    return null;
  }).filter(Boolean);
  return keys.includes(key);
}

function buildIssueAccessScope(userId, userPermissions) {
  const canReadAll = userHasPermission(userPermissions, "issues", "read_all");
  const canReadAssigned = userHasPermission(userPermissions, "issues", "read_assigned");
  const canReadOwn = userHasPermission(userPermissions, "issues", "read_own");
  const canRead = userHasPermission(userPermissions, "issues", "read");

  if (canReadAll || canRead) {
    return { type: "all" };
  }

  const scopes = [];
  if (canReadOwn) {
    scopes.push({ raised_by: userId });
  }
  if (canReadAssigned) {
    scopes.push({ assigned_to: userId });
  }

  if (scopes.length === 0) {
    return { type: "none" };
  }

  return { type: "scoped", where: { [Op.or]: scopes } };
}

function canViewIssue(issue, userId, userPermissions) {
  if (issue?.review_snapshot_id) {
    const { canViewPlanReviewIssue } = require("./planReviewIssuePermissionUtils");
    const reviewAccess = canViewPlanReviewIssue(issue, userId, userPermissions);
    if (reviewAccess !== null) {
      return reviewAccess;
    }
  }

  const scope = buildIssueAccessScope(userId, userPermissions);
  if (scope.type === "all") return true;
  if (scope.type === "none") return false;
  return issue.raised_by === userId || issue.assigned_to === userId;
}

function assertCanPerformIssueWorkflowAction(issue, userId) {
  if (issue?.raised_by && issue.raised_by === userId) {
    const error = new Error(
      "You cannot review, resolve, or close an issue that you raised. Another user must perform these actions."
    );
    error.statusCode = 403;
    throw error;
  }
}

module.exports = {
  userHasPermission,
  buildIssueAccessScope,
  canViewIssue,
  assertCanPerformIssueWorkflowAction,
};
