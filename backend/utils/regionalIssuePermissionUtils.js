"use strict";

const { isSuperAdminActor, isRegionalActor } = require("./structureScopeUtils");

/**
 * Check if the user has a specific regional permission (or super admin).
 */
function hasRegionalIssuePermission(req, action) {
  if (isSuperAdminActor(req)) return true;
  const perms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
  return (
    perms.includes(`regional_issues:${action.toLowerCase()}`) ||
    perms.includes("regional_issues:manage")
  );
}

/**
 * Segregation of Duties:
 * An issue raiser cannot review, accept, reject, resolve, or close their own issue.
 */
function assertCanPerformRegionalIssueWorkflowAction(issue, userId, actionName) {
  if (String(issue.raised_by) === String(userId)) {
    const error = new Error(
      `Segregation of duties violation: You cannot ${actionName} an issue that you raised. Another authorized regional user must perform this action.`
    );
    error.status = 403;
    throw error;
  }
}

/**
 * Validate that an issue is editable by the caller.
 */
function assertCanEditRegionalIssue(issue, userId, req) {
  if (isSuperAdminActor(req)) return;
  if (String(issue.raised_by) !== String(userId)) {
    const error = new Error(
      "Access denied: You can only edit issues that you personally raised."
    );
    error.status = 403;
    throw error;
  }
}

module.exports = {
  hasRegionalIssuePermission,
  assertCanPerformRegionalIssueWorkflowAction,
  assertCanEditRegionalIssue,
};

