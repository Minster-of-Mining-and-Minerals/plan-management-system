import type { IssueListScope } from "@/redux/types/issue";
import {
  ISSUE_PERMISSIONS,
  ISSUE_VIEW_PERMISSIONS,
} from "@/utils/issuePermissionUtils";
import type { PermissionKey } from "@/lib/permissions";

export function canViewIssueGlobal(
  can: (permission: PermissionKey) => boolean
): boolean {
  return can(ISSUE_PERMISSIONS.READ_ALL);
}

export function canViewIssueSelf(
  can: (permission: PermissionKey) => boolean
): boolean {
  return can(ISSUE_PERMISSIONS.READ);
}

export function canViewAnyIssues(
  can: (permission: PermissionKey) => boolean,
  canAny: (permissions: PermissionKey[]) => boolean
): boolean {
  return canAny(ISSUE_VIEW_PERMISSIONS);
}

export function resolveDefaultIssueListScope(
  can: (permission: PermissionKey) => boolean
): IssueListScope {
  if (canViewIssueGlobal(can)) {
    return "global";
  }
  return "mine";
}

export function resolveDashboardIssueListScope(
  can: (permission: PermissionKey) => boolean
): IssueListScope {
  return canViewIssueGlobal(can) ? "global" : "mine";
}

export function issueDashboardAnalyticsLabel(
  can: (permission: PermissionKey) => boolean
): string {
  const hasGlobal = canViewIssueGlobal(can);
  const hasSelf = canViewIssueSelf(can);

  if (hasGlobal && hasSelf) {
    return "Consolidated issue analytics across your organization scope and personal assignments.";
  }
  if (hasGlobal) {
    return issueListScopeLabel("global");
  }
  return issueListScopeLabel("mine");
}

export function issueDashboardAnalyticsBadge(
  can: (permission: PermissionKey) => boolean
): string {
  const hasGlobal = canViewIssueGlobal(can);
  const hasSelf = canViewIssueSelf(can);

  if (hasGlobal && hasSelf) {
    return "Consolidated";
  }
  if (hasGlobal) {
    return issueListScopeBadge("global");
  }
  return issueListScopeBadge("mine");
}

export function issueListScopeLabel(scope: IssueListScope): string {
  return scope === "global"
    ? "All issues in your organization scope."
    : "Issues you raised or that are assigned to you.";
}

export function issueListScopeBadge(scope: IssueListScope): string {
  return scope === "global" ? "All issues" : "My issues";
}
