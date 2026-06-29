import type { PermissionKey } from "@/lib/permissions";

export type PermissionGroupKind = "standard" | "special";

export type PermissionGroupSectionConfig = {
  groupKind: PermissionGroupKind;
  basePath: string;
  listTitle: string;
  listDescription: string;
  createTitle: string;
  editTitle: string;
  viewTitle: string;
  readPermission: PermissionKey;
  createPermission: PermissionKey;
  updatePermission: PermissionKey;
  deletePermission: PermissionKey;
};

export const STANDARD_PERMISSION_GROUP_CONFIG: PermissionGroupSectionConfig = {
  groupKind: "standard",
  basePath: "/users/permission-groups",
  listTitle: "Permission Group Management",
  listDescription: "View and manage standard permission groups",
  createTitle: "Create New Permission Group",
  editTitle: "Edit Permission Group",
  viewTitle: "View Permission Group",
  readPermission: "PERMISSION_GROUPS:READ",
  createPermission: "PERMISSION_GROUPS:CREATE",
  updatePermission: "PERMISSION_GROUPS:UPDATE",
  deletePermission: "PERMISSION_GROUPS:DELETE",
};

export const SPECIAL_PERMISSION_GROUP_CONFIG: PermissionGroupSectionConfig = {
  groupKind: "special",
  basePath: "/users/special-permission-groups",
  listTitle: "Special Permission Groups",
  listDescription:
    "Governance groups that grant special permissions such as sector plan hierarchy oversight",
  createTitle: "Create Special Permission Group",
  editTitle: "Edit Special Permission Group",
  viewTitle: "View Special Permission Group",
  readPermission: "SPECIAL_PERMISSION_GROUPS:READ",
  createPermission: "SPECIAL_PERMISSION_GROUPS:CREATE",
  updatePermission: "SPECIAL_PERMISSION_GROUPS:UPDATE",
  deletePermission: "SPECIAL_PERMISSION_GROUPS:DELETE",
};
