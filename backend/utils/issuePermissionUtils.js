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

function hasIssueReadAll(userPermissions) {
  return userHasPermission(userPermissions, "issues", "read_all");
}

function hasIssueReadSelf(userPermissions) {
  return (
    userHasPermission(userPermissions, "issues", "read") ||
    userHasPermission(userPermissions, "issues", "read_own") ||
    userHasPermission(userPermissions, "issues", "read_assigned")
  );
}

function buildSelfIssueScope(userId) {
  return {
    [Op.or]: [{ raised_by: userId }, { assigned_to: userId }],
  };
}

/**
 * Resolves row-level scope for issue list/dashboard queries.
 * @param {"global"|"mine"|undefined} listScope
 */
function resolveIssueListScope(listScope, userId, userPermissions) {
  const canReadAll = hasIssueReadAll(userPermissions);
  const canReadSelf = hasIssueReadSelf(userPermissions);

  if (!canReadAll && !canReadSelf) {
    return { type: "none" };
  }

  const requested =
    listScope === "mine" ? "mine" : listScope === "global" ? "global" : null;

  if (requested === "global") {
    if (!canReadAll) {
      const error = new Error("You do not have permission to view all issues");
      error.statusCode = 403;
      throw error;
    }
    return { type: "all" };
  }

  if (requested === "mine") {
    if (!canReadSelf) {
      const error = new Error("You do not have permission to view your issues");
      error.statusCode = 403;
      throw error;
    }
    return { type: "scoped", where: buildSelfIssueScope(userId) };
  }

  if (canReadAll) {
    return { type: "all" };
  }

  return { type: "scoped", where: buildSelfIssueScope(userId) };
}

/** @deprecated Use resolveIssueListScope — kept for callers not yet passing list_scope */
function buildIssueAccessScope(userId, userPermissions) {
  return resolveIssueListScope(undefined, userId, userPermissions);
}

function canViewIssue(issue, userId, userPermissions) {
  if (issue?.review_snapshot_id) {
    const { canViewPlanReviewIssue } = require("./planReviewIssuePermissionUtils");
    const reviewAccess = canViewPlanReviewIssue(issue, userId, userPermissions);
    if (reviewAccess !== null) {
      return reviewAccess;
    }
  }

  if (hasIssueReadAll(userPermissions)) {
    return true;
  }

  if (!hasIssueReadSelf(userPermissions)) {
    return false;
  }

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
  hasIssueReadAll,
  hasIssueReadSelf,
  resolveIssueListScope,
  buildIssueAccessScope,
  canViewIssue,
  assertCanPerformIssueWorkflowAction,
};
