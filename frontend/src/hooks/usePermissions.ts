import { useAuth } from "./use-auth";
import { PermissionKey, hasPermission, normalizeToPermissionKeys } from "@/lib/permissions";

/**
 * Returns the current user's permission keys from Redux (via /auth/permissions).
 * Use this for UI gating — same source as route protection.
 */
export function usePermissions() {
  const { permissions, isLoading } = useAuth();
  const userPermissions = normalizeToPermissionKeys(permissions);

  const checkPermission = (required: {
    anyPermissions?: PermissionKey[];
    allPermissions?: PermissionKey[];
    onlyPermissions?: PermissionKey[];
  }) => hasPermission(userPermissions, required);

  const can = (permission: PermissionKey) =>
    userPermissions.includes(permission.toUpperCase() as PermissionKey);

  const canAny = (perms: PermissionKey[]) =>
    perms.some((p) => can(p));

  const canAll = (perms: PermissionKey[]) =>
    perms.every((p) => can(p));

  return {
    permissions: userPermissions,
    isLoading,
    check: checkPermission,
    can,
    canAny,
    canAll,
  };
}
