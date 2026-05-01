import {
  hasAllPermissions,
  hasAnyPermission,
  hasOnlyPermissions,
  type PermissionKey,
} from "./permissions";

export function canAccessRoute(
  userPermissions: PermissionKey[],
  rule: {
    anyPermissions?: PermissionKey[];
    allPermissions?: PermissionKey[];
    onlyPermissions?: PermissionKey[];
  },
): boolean {
  if (rule.onlyPermissions) {
    return hasOnlyPermissions(userPermissions, rule.onlyPermissions);
  }

  if (rule.allPermissions) {
    return hasAllPermissions(userPermissions, rule.allPermissions);
  }

  if (rule.anyPermissions) {
    return hasAnyPermission(userPermissions, rule.anyPermissions);
  }

  return true; // No restriction
}
