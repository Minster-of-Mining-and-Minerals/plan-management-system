import type { PermissionKey } from "@/lib/permissions";

export const ISSUE_PERMISSIONS = {
  CREATE: "ISSUES:CREATE" as PermissionKey,
  /** View issues you raised or are assigned to */
  READ: "ISSUES:READ" as PermissionKey,
  /** View all issues in organization scope */
  READ_ALL: "ISSUES:READ_ALL" as PermissionKey,
  REVIEW: "ISSUES:REVIEW" as PermissionKey,
  RESOLVE: "ISSUES:RESOLVE" as PermissionKey,
  CLOSE: "ISSUES:CLOSE" as PermissionKey,
} as const;

export const FORM_CONFIG_PERMISSIONS = {
  CREATE: "FORM_CONFIG_CONTAINERS:CREATE" as PermissionKey,
  READ: "FORM_CONFIG_CONTAINERS:READ" as PermissionKey,
  UPDATE: "FORM_CONFIG_CONTAINERS:UPDATE" as PermissionKey,
  DELETE: "FORM_CONFIG_CONTAINERS:DELETE" as PermissionKey,
} as const;

export const ISSUE_CATEGORY_PERMISSIONS = {
  CREATE: "ISSUE_CATEGORIES:CREATE" as PermissionKey,
  READ: "ISSUE_CATEGORIES:READ" as PermissionKey,
  UPDATE: "ISSUE_CATEGORIES:UPDATE" as PermissionKey,
  DELETE: "ISSUE_CATEGORIES:DELETE" as PermissionKey,
  CONFIGURE_FORM: "ISSUE_CATEGORIES:CONFIGURE_FORM" as PermissionKey,
} as const;

export const ISSUE_VIEW_PERMISSIONS: PermissionKey[] = [
  ISSUE_PERMISSIONS.READ,
  ISSUE_PERMISSIONS.READ_ALL,
];

export const ISSUE_GLOBAL_VIEW_PERMISSIONS: PermissionKey[] = [
  ISSUE_PERMISSIONS.READ_ALL,
];

export const ISSUE_SELF_VIEW_PERMISSIONS: PermissionKey[] = [
  ISSUE_PERMISSIONS.READ,
];
