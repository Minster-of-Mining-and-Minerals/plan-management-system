export type RoleScope = "global" | "private" | "structure" | "regional";

export function formatRoleScopeLabel(scope?: string): string {
  switch (scope) {
    case "global":
      return "Global";
    case "private":
      return "Private";
    case "structure":
      return "Structure";
    case "regional":
      return "Regional";
    default:
      return "Structure";
  }
}

export function canEditRole(
  role: { scope?: string },
  isSuperAdmin: boolean,
  readOnly: boolean
): boolean {
  if (readOnly) return false;
  if (role.scope === "structure" || role.scope === "regional") return true;
  if (role.scope === "global" || role.scope === "private") return isSuperAdmin;
  return false;
}

export function canDeleteRole(
  role: { role_id?: string; scope?: string },
  readOnly: boolean
): boolean {
  if (readOnly) return false;
  const protectedRoleIds = new Set([
    "00000000-0000-4000-8000-000000000002", // Super Admin
    "10000000-0000-4000-8000-000000000010", // Base User
    "20000000-0000-4000-8000-000000000001", // Regional Administrator
    "20000000-0000-4000-8000-000000000002", // Regional Officer
    "20000000-0000-4000-8000-000000000003", // Regional Viewer
  ]);
  if (role.role_id && protectedRoleIds.has(role.role_id)) return false;
  return role.scope === "structure" || role.scope === "regional";
}
