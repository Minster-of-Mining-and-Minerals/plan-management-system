export type RoleScope = "global" | "private" | "structure";

export function formatRoleScopeLabel(scope?: string): string {
  switch (scope) {
    case "global":
      return "Global";
    case "private":
      return "Private";
    case "structure":
      return "Structure";
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
  if (role.scope === "structure") return true;
  if (role.scope === "global" || role.scope === "private") return isSuperAdmin;
  return false;
}

export function canDeleteRole(
  role: { scope?: string },
  readOnly: boolean
): boolean {
  if (readOnly) return false;
  return role.scope === "structure";
}
