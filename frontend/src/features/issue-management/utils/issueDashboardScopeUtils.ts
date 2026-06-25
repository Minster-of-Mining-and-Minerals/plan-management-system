import type { PermissionKey } from "@/lib/permissions";
import {
  ISSUE_PERMISSIONS,
  ISSUE_VIEW_PERMISSIONS,
} from "@/utils/issuePermissionUtils";

export type IssueDashboardScope = "all" | "own" | "assigned" | "own_and_assigned" | "none";

export function resolveIssueDashboardScope(
  can: (permission: PermissionKey) => boolean,
  canAny: (permissions: PermissionKey[]) => boolean
): IssueDashboardScope {
  if (!canAny(ISSUE_VIEW_PERMISSIONS)) {
    return "none";
  }
  if (
    can(ISSUE_PERMISSIONS.READ_ALL) ||
    can(ISSUE_PERMISSIONS.READ)
  ) {
    return "all";
  }

  const canOwn = can(ISSUE_PERMISSIONS.READ_OWN);
  const canAssigned = can(ISSUE_PERMISSIONS.READ_ASSIGNED);

  if (canOwn && canAssigned) {
    return "own_and_assigned";
  }
  if (canOwn) {
    return "own";
  }
  if (canAssigned) {
    return "assigned";
  }

  return "none";
}

export function issueDashboardScopeLabel(scope: IssueDashboardScope): string {
  switch (scope) {
    case "all":
      return "All issues visible in your organization scope.";
    case "own":
      return "Issues you raised during plan review and execution.";
    case "assigned":
      return "Issues assigned to you for review or resolution.";
    case "own_and_assigned":
      return "Issues you raised or that are assigned to you.";
    default:
      return "You do not have permission to view issues.";
  }
}

export function issueDashboardScopeBadge(scope: IssueDashboardScope): string {
  switch (scope) {
    case "all":
      return "Organization scope";
    case "own":
      return "Your issues";
    case "assigned":
      return "Assigned to you";
    case "own_and_assigned":
      return "Your scope";
    default:
      return "No access";
  }
}
