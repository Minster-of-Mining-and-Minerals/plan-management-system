export type PermissionKey = `${string}:${string}`;

export type RawPermission = {
  resource?: string;
  action?: string;
};

export const normalizePermissions = (
  permissions?: RawPermission[],
): PermissionKey[] => {
  if (!permissions || !Array.isArray(permissions)) return [];

  return permissions
    .filter((p) => p.resource && p.action)
    .map(
      (p) =>
        `${p.resource!.toUpperCase()}:${p.action!.toUpperCase()}` as PermissionKey,
    );
};

// Helper function to normalize different permission formats
export const normalizeToPermissionKeys = (
  permissions?: readonly (PermissionKey | RawPermission)[] | null
): PermissionKey[] => {
  if (!permissions || !Array.isArray(permissions)) return [];

  return permissions.map(p => {
    // If it's already a string (PermissionKey), return it as is
    if (typeof p === 'string') return p as PermissionKey;

    // If it's a RawPermission object, convert it
    if (p.resource && p.action) {
      return `${p.resource!.toUpperCase()}:${p.action!.toUpperCase()}` as PermissionKey;
    }

    return null;
  }).filter((p): p is PermissionKey => p !== null);
};

/**
 * User must have ALL permissions
 */
export const hasAllPermissions = (
  userPermissions?: readonly (PermissionKey | RawPermission)[] | null,
  required?: readonly PermissionKey[],
): boolean => {
  if (!required?.length) return true;

  const permissionKeys = normalizeToPermissionKeys(userPermissions);
  return required.every((p) => permissionKeys.includes(p));
};

/**
 * User must have AT LEAST ONE permission
 */
export const hasAnyPermission = (
  userPermissions?: readonly (PermissionKey | RawPermission)[] | null,
  required?: readonly PermissionKey[],
): boolean => {
  if (!required?.length) return true;

  const permissionKeys = normalizeToPermissionKeys(userPermissions);
  return required.some((p) => permissionKeys.includes(p));
};

/**
 * User must have ONLY these permissions
 */
export const hasOnlyPermissions = (
  userPermissions?: readonly (PermissionKey | RawPermission)[] | null,
  required?: readonly PermissionKey[],
): boolean => {
  if (!required?.length) return false;

  const permissionKeys = normalizeToPermissionKeys(userPermissions);

  if (permissionKeys.length !== required.length) return false;
  return required.every((p) => permissionKeys.includes(p));
};
/**
 * Combined permission checker that handles all three types
 */
export function hasPermission(
  userPermissions: string[] | readonly RawPermission[] | null | undefined,
  required: {
    anyPermissions?: PermissionKey[];
    allPermissions?: PermissionKey[];
    onlyPermissions?: PermissionKey[];
  },
): boolean {
  const { anyPermissions, allPermissions, onlyPermissions } = required;

  // If no permissions required, grant access
  if (
    !anyPermissions?.length &&
    !allPermissions?.length &&
    !onlyPermissions?.length
  ) {
    return true;
  }

  // Normalize permissions if they're in RawPermission format
  const normalizedPermissions = Array.isArray(userPermissions)
    ? userPermissions.every((p) => typeof p === "string")
      ? (userPermissions as string[])
      : normalizePermissions(userPermissions as RawPermission[])
    : [];

  // Check onlyPermissions (user must have exactly these permissions)
  if (onlyPermissions?.length) {
    return (
      onlyPermissions.every((p) => normalizedPermissions.includes(p)) &&
      normalizedPermissions.length === onlyPermissions.length
    );
  }

  // Check allPermissions (user must have all of these)
  if (allPermissions?.length) {
    return allPermissions.every((p) => normalizedPermissions.includes(p));
  }

  // Check anyPermissions (user must have at least one of these)
  if (anyPermissions?.length) {
    return anyPermissions.some((p) => normalizedPermissions.includes(p));
  }

  return false;
}

// Also add a version that works with the raw permissions from your session
export function hasPermissionFromSession(
  session: { user?: { permissions?: string[] | null } } | null,
  required: {
    anyPermissions?: PermissionKey[];
    allPermissions?: PermissionKey[];
    onlyPermissions?: PermissionKey[];
  },
): boolean {
  const userPermissions = session?.user?.permissions || [];
  return hasPermission(userPermissions, required);
}
