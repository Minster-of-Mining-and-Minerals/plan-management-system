"use strict";

const { userHasPermission } = require("./issuePermissionUtils");

function hasPlanReviewDashboardAllAccess(userPermissions) {
  return (
    userHasPermission(userPermissions, "plans", "read") ||
    userHasPermission(userPermissions, "issues", "read_all") ||
    userHasPermission(userPermissions, "issues", "read") ||
    userHasPermission(userPermissions, "plan", "view_review_dashboard") ||
    userHasPermission(userPermissions, "plan", "complete_review") ||
    userHasPermission(userPermissions, "plan", "publish_for_review") ||
    userHasPermission(userPermissions, "plan", "unlock_review_corrections") ||
    userHasPermission(userPermissions, "plan", "republish_review")
  );
}

function hasPlanReviewOwnIssuesAccess(userPermissions) {
  return userHasPermission(userPermissions, "plan", "view_own_review_issues");
}

function canAccessPlanReviewDashboard(userPermissions) {
  return (
    hasPlanReviewDashboardAllAccess(userPermissions) ||
    hasPlanReviewOwnIssuesAccess(userPermissions)
  );
}

function canRaisePlanReviewIssue(userPermissions) {
  return (
    userHasPermission(userPermissions, "plan", "raise_review_issue") ||
    userHasPermission(userPermissions, "issues", "create")
  );
}

function applyPlanReviewIssueFilters(filters = {}, userId, userPermissions) {
  if (!canAccessPlanReviewDashboard(userPermissions)) {
    return null;
  }

  const scoped = { ...filters };

  if (hasPlanReviewDashboardAllAccess(userPermissions)) {
    return scoped;
  }

  scoped.raised_by = userId;
  return scoped;
}

function canViewPlanReviewIssue(issue, userId, userPermissions) {
  if (!issue?.review_snapshot_id) {
    return null;
  }

  if (hasPlanReviewDashboardAllAccess(userPermissions)) {
    return true;
  }

  if (hasPlanReviewOwnIssuesAccess(userPermissions)) {
    return issue.raised_by === userId;
  }

  return false;
}

const PLAN_REVIEW_ISSUE_ROUTE_PERMISSIONS = [
  { resource: "PLAN", action: "VIEW_OWN_REVIEW_ISSUES" },
  { resource: "PLAN", action: "VIEW_REVIEW_DASHBOARD" },
  { resource: "PLAN", action: "RAISE_REVIEW_ISSUE" },
  { resource: "PLAN", action: "VIEW_ASSIGNED_REVIEW" },
  { resource: "PLANS", action: "READ" },
  { resource: "PLAN", action: "COMPLETE_REVIEW" },
  { resource: "PLAN", action: "PUBLISH_FOR_REVIEW" },
];

module.exports = {
  hasPlanReviewDashboardAllAccess,
  hasPlanReviewOwnIssuesAccess,
  canAccessPlanReviewDashboard,
  canRaisePlanReviewIssue,
  applyPlanReviewIssueFilters,
  canViewPlanReviewIssue,
  PLAN_REVIEW_ISSUE_ROUTE_PERMISSIONS,
};
