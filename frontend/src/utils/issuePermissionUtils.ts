import type { PermissionKey } from "@/lib/permissions";

export const ISSUE_PERMISSIONS = {
  CREATE: "ISSUES:CREATE" as PermissionKey,
  READ: "ISSUES:READ" as PermissionKey,
  READ_OWN: "ISSUES:READ_OWN" as PermissionKey,
  READ_ASSIGNED: "ISSUES:READ_ASSIGNED" as PermissionKey,
  READ_ALL: "ISSUES:READ_ALL" as PermissionKey,
  REVIEW: "ISSUES:REVIEW" as PermissionKey,
  RESOLVE: "ISSUES:RESOLVE" as PermissionKey,
  CLOSE: "ISSUES:CLOSE" as PermissionKey,
} as const;

export const ISSUE_CATEGORY_PERMISSIONS = {
  CREATE: "ISSUE_CATEGORIES:CREATE" as PermissionKey,
  READ: "ISSUE_CATEGORIES:READ" as PermissionKey,
  UPDATE: "ISSUE_CATEGORIES:UPDATE" as PermissionKey,
  DELETE: "ISSUE_CATEGORIES:DELETE" as PermissionKey,
} as const;

export const ISSUE_VIEW_PERMISSIONS: PermissionKey[] = [
  ISSUE_PERMISSIONS.READ_ALL,
  ISSUE_PERMISSIONS.READ,
  ISSUE_PERMISSIONS.READ_OWN,
  ISSUE_PERMISSIONS.READ_ASSIGNED,
];
