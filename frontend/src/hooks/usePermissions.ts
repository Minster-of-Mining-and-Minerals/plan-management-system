import { useAuth } from "./use-auth";
import { PermissionKey, hasPermission } from "@/lib/permissions";

/**
 * Returns the current user's permission keys from Redux (via /auth/permissions).
 * Use this for UI gating — same source as route protection.
 */
export function usePermissions() {
  const { permissions, isLoading } = useAuth();
  const userPermissions = permissions as PermissionKey[];

  const checkPermission = (required: {
    anyPermissions?: PermissionKey[];
    allPermissions?: PermissionKey[];
    onlyPermissions?: PermissionKey[];
  }) => hasPermission(userPermissions, required);

  const can = (permission: PermissionKey) => userPermissions.includes(permission);

  const canAny = (perms: PermissionKey[]) =>
    perms.some((p) => userPermissions.includes(p));

  const canAll = (perms: PermissionKey[]) =>
    perms.every((p) => userPermissions.includes(p));

  return {
    permissions: userPermissions,
    isLoading,
    check: checkPermission,
    can,
    canAny,
    canAll,
  };
}
