import { NavItem } from "@/navigation.config";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasOnlyPermissions,
  PermissionKey,
} from "./permissions";

export const canAccessItem = (
  item: NavItem,
  userPermissions: readonly PermissionKey[],
): boolean => {
  if (item.onlyPermissions) {
    return hasOnlyPermissions(userPermissions, item.onlyPermissions);
  }

  if (item.allPermissions) {
    return hasAllPermissions(userPermissions, item.allPermissions);
  }

  if (item.anyPermissions) {
    return hasAnyPermission(userPermissions, item.anyPermissions);
  }

  return true; // public
};
