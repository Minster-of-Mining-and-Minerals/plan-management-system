import { PermissionKey } from "./permissions";
import { canAccessRoute, type PermissionRule } from "./permission-guard";

export type { PermissionRule };

export type RoutePermissionRule = PermissionRule & {
  /** Path pattern without locale, e.g. `/plans/[id]/nodes/[nodeId]` */
  pattern: string;
};

/**
 * Route permission rules — most specific patterns first.
 * Add new protected routes here; sidebar nav should mirror the same permissions.
 */
export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  // Users — create/edit (static before dynamic)
  { pattern: "/users/roles/new", allPermissions: ["ROLES:CREATE"] },
  { pattern: "/users/permission-groups/new", allPermissions: ["PERMISSION_GROUPS:CREATE"] },
  { pattern: "/users/special-permission-groups/new", allPermissions: ["SPECIAL_PERMISSION_GROUPS:CREATE"] },
  { pattern: "/users/list/[userId]", allPermissions: ["USERS:READ"] },
  { pattern: "/users/roles/[id]", allPermissions: ["ROLES:READ"] },
  { pattern: "/users/special-permission-groups/[id]", allPermissions: ["SPECIAL_PERMISSION_GROUPS:READ"] },
  { pattern: "/users/permission-groups/[id]", allPermissions: ["PERMISSION_GROUPS:READ"] },
  { pattern: "/users/list", allPermissions: ["USERS:READ"] },
  { pattern: "/users/roles", allPermissions: ["ROLES:READ"] },
  { pattern: "/users/special-permission-groups", allPermissions: ["SPECIAL_PERMISSION_GROUPS:READ"] },
  { pattern: "/users/permission-groups", allPermissions: ["PERMISSION_GROUPS:READ"] },
  { pattern: "/users/permissions", allPermissions: ["PERMISSIONS:READ"] },

  // Plans — nested before parent
  {
    pattern: "/plans/review/[id]/nodes/[nodeId]",
    allPermissions: ["PLAN:VIEW_ASSIGNED_REVIEW"],
  },
  {
    pattern: "/plans/review/[id]",
    allPermissions: ["PLAN:VIEW_ASSIGNED_REVIEW"],
  },
  { pattern: "/plans/review", allPermissions: ["PLAN:VIEW_ASSIGNED_REVIEW"] },
  {
    pattern: "/plans/review/[id]/details",
    allPermissions: ["PLAN:VIEW_ASSIGNED_REVIEW"],
  },
  {
    pattern: "/plans/[id]/details",
    allPermissions: ["PLANS:READ"],
  },
  {
    pattern: "/plans/[id]/documents/[documentId]",
    anyPermissions: ["PLANS:READ", "DOCUMENTS:READ"],
  },
  {
    pattern: "/plans/[id]/documents",
    anyPermissions: ["PLANS:READ", "DOCUMENTS:READ"],
  },
  {
    pattern: "/documents/[id]",
    anyPermissions: ["DOCUMENTS:READ", "DOCUMENTS:MANAGE"],
  },
  { pattern: "/documents", anyPermissions: ["DOCUMENTS:READ", "DOCUMENTS:MANAGE"] },
  {
    pattern: "/plans/[id]/nodes/[nodeId]",
    allPermissions: ["PLANS:READ"],
  },
  { pattern: "/plans/configuration", allPermissions: ["PLANS:UPDATE"] },
  { pattern: "/plans/performance-colors", allPermissions: ["PERFORMANCE_COLOR_THRESHOLDS:READ"] },
  { pattern: "/plans/rules", allPermissions: ["PLAN_RULES:READ"] },
  {
    pattern: "/plans/[id]",
    allPermissions: ["PLANS:READ"],
  },
  { pattern: "/plans", allPermissions: ["PLANS:READ"] },

  // Structures
  { pattern: "/government-structures/[id]", anyPermissions: ["GOVERNMENT_STRUCTURES:READ"] },
  { pattern: "/government-structures", anyPermissions: ["GOVERNMENT_STRUCTURES:READ"] },
  { pattern: "/internal-structures/[id]", anyPermissions: ["INTERNAL_STRUCTURES:READ"] },
  { pattern: "/internal-structures", anyPermissions: ["INTERNAL_STRUCTURES:READ"] },

  // Regional Administration
  { pattern: "/admin/regions/[id]", anyPermissions: ["REGIONS:READ", "REGIONS:MANAGE", "REGIONS:UPDATE"] },
  { pattern: "/admin/regions", anyPermissions: ["REGIONS:READ", "REGIONS:MANAGE"] },

  // Company Administration
  { pattern: "/admin/companies/[id]", anyPermissions: ["COMPANIES:READ", "COMPANIES:MANAGE", "COMPANIES:UPDATE"] },
  { pattern: "/admin/companies", anyPermissions: ["COMPANIES:READ", "COMPANIES:MANAGE"] },

  // Purchasing Center Administration
  { pattern: "/admin/purchasing-centers/[id]", anyPermissions: ["PURCHASING_CENTERS:READ", "PURCHASING_CENTERS:MANAGE", "PURCHASING_CENTERS:UPDATE"] },
  { pattern: "/admin/purchasing-centers", anyPermissions: ["PURCHASING_CENTERS:READ", "PURCHASING_CENTERS:MANAGE"] },

  // Issues
  { pattern: "/issues/form-config", allPermissions: ["FORM_CONFIG_CONTAINERS:READ"] },
  { pattern: "/issues/categories", allPermissions: ["ISSUE_CATEGORIES:READ"] },
  {
    pattern: "/issues/[id]",
    anyPermissions: ["ISSUES:READ", "ISSUES:READ_ALL"],
  },
  {
    pattern: "/issues",
    anyPermissions: ["ISSUES:READ", "ISSUES:READ_ALL"],
  },

  // Settings
  { pattern: "/settings/system", allPermissions: ["SYSTEM_SETTINGS:READ"] },
  { pattern: "/settings/branding", allPermissions: ["BRANDING_SETTINGS:READ"] },
  { pattern: "/settings/audit-logs", allPermissions: ["SYSTEM_AUDIT_LOGS:READ"] },
  { pattern: "/settings/notes/new", anyPermissions: ["NOTES:CREATE", "NOTES:MANAGE"] },
  { pattern: "/settings/notes/[id]", anyPermissions: ["NOTES:VIEW", "NOTES:MANAGE"] },
  { pattern: "/settings/notes", anyPermissions: ["NOTES:VIEW", "NOTES:MANAGE"] },

  // Dynamic Regional Workspace (both /regions/[id] and /[id] variants)
  { pattern: "/regions/[id]/departments", anyPermissions: ["REGIONAL_STRUCTURES:READ", "REGIONAL_STRUCTURES:MANAGE"] },
  { pattern: "/regions/[id]/users/roles/new", anyPermissions: ["REGIONAL_ROLES:CREATE", "REGIONAL_ROLES:MANAGE"] },
  { pattern: "/regions/[id]/users/roles/[roleId]", anyPermissions: ["REGIONAL_ROLES:READ", "REGIONAL_ROLES:MANAGE"] },
  { pattern: "/regions/[id]/users/roles", anyPermissions: ["REGIONAL_ROLES:READ", "REGIONAL_ROLES:MANAGE"] },
  { pattern: "/regions/[id]/users/permission-groups/new", anyPermissions: ["REGIONAL_PERMISSION_GROUPS:CREATE", "REGIONAL_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/regions/[id]/users/permission-groups/[groupId]", anyPermissions: ["REGIONAL_PERMISSION_GROUPS:READ", "REGIONAL_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/regions/[id]/users/permission-groups", anyPermissions: ["REGIONAL_PERMISSION_GROUPS:READ", "REGIONAL_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/regions/[id]/users/permissions", anyPermissions: ["REGIONAL_PERMISSIONS:READ", "REGIONAL_PERMISSIONS:MANAGE", "REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] },
  { pattern: "/regions/[id]/users/list", anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] },
  { pattern: "/regions/[id]/users", anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] },
  { pattern: "/regions/[id]/settings", anyPermissions: ["REGIONAL_BRANDING:READ", "REGIONAL_BRANDING:MANAGE"] },
  { pattern: "/regions/[id]", anyPermissions: ["REGIONAL_DASHBOARD:VIEW"] },

  { pattern: "/[id]/departments", anyPermissions: ["REGIONAL_STRUCTURES:READ", "REGIONAL_STRUCTURES:MANAGE"] },
  { pattern: "/[id]/users/roles/new", anyPermissions: ["REGIONAL_ROLES:CREATE", "REGIONAL_ROLES:MANAGE"] },
  { pattern: "/[id]/users/roles/[roleId]", anyPermissions: ["REGIONAL_ROLES:READ", "REGIONAL_ROLES:MANAGE"] },
  { pattern: "/[id]/users/roles", anyPermissions: ["REGIONAL_ROLES:READ", "REGIONAL_ROLES:MANAGE"] },
  { pattern: "/[id]/users/permission-groups/new", anyPermissions: ["REGIONAL_PERMISSION_GROUPS:CREATE", "REGIONAL_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/[id]/users/permission-groups/[groupId]", anyPermissions: ["REGIONAL_PERMISSION_GROUPS:READ", "REGIONAL_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/[id]/users/permission-groups", anyPermissions: ["REGIONAL_PERMISSION_GROUPS:READ", "REGIONAL_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/[id]/users/permissions", anyPermissions: ["REGIONAL_PERMISSIONS:READ", "REGIONAL_PERMISSIONS:MANAGE", "REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] },
  { pattern: "/[id]/users/list", anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] },
  { pattern: "/[id]/users", anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] },
  { pattern: "/[id]/settings", anyPermissions: ["REGIONAL_BRANDING:READ", "REGIONAL_BRANDING:MANAGE"] },
  { pattern: "/[id]", anyPermissions: ["REGIONAL_DASHBOARD:VIEW"] },

  // Regional Workspace fallback aliases
  { pattern: "/regional/dashboard", anyPermissions: ["REGIONAL_DASHBOARD:VIEW"] },
  { pattern: "/regional/departments", anyPermissions: ["REGIONAL_STRUCTURES:READ", "REGIONAL_STRUCTURES:MANAGE"] },
  { pattern: "/regional/users/roles/new", anyPermissions: ["REGIONAL_ROLES:CREATE", "REGIONAL_ROLES:MANAGE"] },
  { pattern: "/regional/users/roles/[roleId]", anyPermissions: ["REGIONAL_ROLES:READ", "REGIONAL_ROLES:MANAGE"] },
  { pattern: "/regional/users/roles", anyPermissions: ["REGIONAL_ROLES:READ", "REGIONAL_ROLES:MANAGE"] },
  { pattern: "/regional/users/permission-groups/new", anyPermissions: ["REGIONAL_PERMISSION_GROUPS:CREATE", "REGIONAL_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/regional/users/permission-groups/[groupId]", anyPermissions: ["REGIONAL_PERMISSION_GROUPS:READ", "REGIONAL_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/regional/users/permission-groups", anyPermissions: ["REGIONAL_PERMISSION_GROUPS:READ", "REGIONAL_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/regional/users/permissions", anyPermissions: ["REGIONAL_PERMISSIONS:READ", "REGIONAL_PERMISSIONS:MANAGE", "REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] },
  { pattern: "/regional/users/list", anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] },
  { pattern: "/regional/users", anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] },
  { pattern: "/regional/settings", anyPermissions: ["REGIONAL_BRANDING:READ", "REGIONAL_BRANDING:MANAGE"] },
  { pattern: "/regional", anyPermissions: ["REGIONAL_DASHBOARD:VIEW", "REGIONAL_STRUCTURES:READ", "REGIONAL_USERS:READ", "REGIONAL_BRANDING:READ"] },

  // Dynamic Company Workspace
  { pattern: "/companies/[id]/departments", anyPermissions: ["COMPANY_STRUCTURES:READ", "COMPANY_STRUCTURES:MANAGE"] },
  { pattern: "/companies/[id]/users/roles/new", anyPermissions: ["COMPANY_ROLES:CREATE", "COMPANY_ROLES:MANAGE"] },
  { pattern: "/companies/[id]/users/roles/[roleId]", anyPermissions: ["COMPANY_ROLES:READ", "COMPANY_ROLES:MANAGE"] },
  { pattern: "/companies/[id]/users/roles", anyPermissions: ["COMPANY_ROLES:READ", "COMPANY_ROLES:MANAGE"] },
  { pattern: "/companies/[id]/users/permission-groups/new", anyPermissions: ["COMPANY_PERMISSION_GROUPS:CREATE", "COMPANY_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/companies/[id]/users/permission-groups/[groupId]", anyPermissions: ["COMPANY_PERMISSION_GROUPS:READ", "COMPANY_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/companies/[id]/users/permission-groups", anyPermissions: ["COMPANY_PERMISSION_GROUPS:READ", "COMPANY_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/companies/[id]/users/permissions", anyPermissions: ["COMPANY_PERMISSIONS:READ", "COMPANY_PERMISSIONS:MANAGE", "COMPANY_USERS:READ", "COMPANY_USERS:MANAGE"] },
  { pattern: "/companies/[id]/users/list", anyPermissions: ["COMPANY_USERS:READ", "COMPANY_USERS:MANAGE"] },
  { pattern: "/companies/[id]/users", anyPermissions: ["COMPANY_USERS:READ", "COMPANY_USERS:MANAGE"] },
  { pattern: "/companies/[id]/settings", anyPermissions: ["COMPANY_BRANDING:READ", "COMPANY_BRANDING:MANAGE"] },
  { pattern: "/companies/[id]", anyPermissions: ["COMPANY_DASHBOARD:VIEW"] },

  // Dynamic Purchasing Center Workspace (strictly NO departments!)
  { pattern: "/purchasing-centers/[id]/users/roles/new", anyPermissions: ["PURCHASING_CENTER_ROLES:CREATE", "PURCHASING_CENTER_ROLES:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/users/roles/[roleId]", anyPermissions: ["PURCHASING_CENTER_ROLES:READ", "PURCHASING_CENTER_ROLES:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/users/roles", anyPermissions: ["PURCHASING_CENTER_ROLES:READ", "PURCHASING_CENTER_ROLES:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/users/permission-groups/new", anyPermissions: ["PURCHASING_CENTER_PERMISSION_GROUPS:CREATE", "PURCHASING_CENTER_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/users/permission-groups/[groupId]", anyPermissions: ["PURCHASING_CENTER_PERMISSION_GROUPS:READ", "PURCHASING_CENTER_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/users/permission-groups", anyPermissions: ["PURCHASING_CENTER_PERMISSION_GROUPS:READ", "PURCHASING_CENTER_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/users/permissions", anyPermissions: ["PURCHASING_CENTER_PERMISSIONS:READ", "PURCHASING_CENTER_PERMISSIONS:MANAGE", "PURCHASING_CENTER_USERS:READ", "PURCHASING_CENTER_USERS:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/users/list", anyPermissions: ["PURCHASING_CENTER_USERS:READ", "PURCHASING_CENTER_USERS:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/users", anyPermissions: ["PURCHASING_CENTER_USERS:READ", "PURCHASING_CENTER_USERS:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/settings", anyPermissions: ["PURCHASING_CENTER_BRANDING:READ", "PURCHASING_CENTER_BRANDING:MANAGE"] },
  { pattern: "/purchasing-centers/[id]", anyPermissions: ["PURCHASING_CENTER_DASHBOARD:VIEW"] },

  // Purchasing Center Workspace fallback aliases
  { pattern: "/purchasing-center/dashboard", anyPermissions: ["PURCHASING_CENTER_DASHBOARD:VIEW"] },
  { pattern: "/purchasing-center/users/roles/new", anyPermissions: ["PURCHASING_CENTER_ROLES:CREATE", "PURCHASING_CENTER_ROLES:MANAGE"] },
  { pattern: "/purchasing-center/users/roles/[roleId]", anyPermissions: ["PURCHASING_CENTER_ROLES:READ", "PURCHASING_CENTER_ROLES:MANAGE"] },
  { pattern: "/purchasing-center/users/roles", anyPermissions: ["PURCHASING_CENTER_ROLES:READ", "PURCHASING_CENTER_ROLES:MANAGE"] },
  { pattern: "/purchasing-center/users/permission-groups/new", anyPermissions: ["PURCHASING_CENTER_PERMISSION_GROUPS:CREATE", "PURCHASING_CENTER_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/purchasing-center/users/permission-groups/[groupId]", anyPermissions: ["PURCHASING_CENTER_PERMISSION_GROUPS:READ", "PURCHASING_CENTER_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/purchasing-center/users/permission-groups", anyPermissions: ["PURCHASING_CENTER_PERMISSION_GROUPS:READ", "PURCHASING_CENTER_PERMISSION_GROUPS:MANAGE"] },
  { pattern: "/purchasing-center/users/permissions", anyPermissions: ["PURCHASING_CENTER_PERMISSIONS:READ", "PURCHASING_CENTER_PERMISSIONS:MANAGE", "PURCHASING_CENTER_USERS:READ", "PURCHASING_CENTER_USERS:MANAGE"] },
  { pattern: "/purchasing-center/users/list", anyPermissions: ["PURCHASING_CENTER_USERS:READ", "PURCHASING_CENTER_USERS:MANAGE"] },
  { pattern: "/purchasing-center/users", anyPermissions: ["PURCHASING_CENTER_USERS:READ", "PURCHASING_CENTER_USERS:MANAGE"] },
  { pattern: "/purchasing-center/settings", anyPermissions: ["PURCHASING_CENTER_BRANDING:READ", "PURCHASING_CENTER_BRANDING:MANAGE"] },
  { pattern: "/purchasing-center", anyPermissions: ["PURCHASING_CENTER_DASHBOARD:VIEW", "PURCHASING_CENTER_USERS:READ", "PURCHASING_CENTER_BRANDING:READ"] },

  // Dashboard
  { pattern: "/dashboard", anyPermissions: ["DASHBOARD:VIEW"] },

  // Authenticated-only routes (no extra permission required)
  { pattern: "/notifications" },
  { pattern: "/profile" },
];

export function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith("[") && segment.endsWith("]")) {
        return "[^/]+";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${escaped}$`);
}

/**
 * Resolve the permission rule for a pathname (without locale prefix).
 * Returns null when no rule matches — treated as authenticated-only access.
 */
export function matchRoutePermission(pathname: string): PermissionRule | null {
  const rule = matchRoutePermissionRule(pathname);
  if (!rule) return null;
  return {
    anyPermissions: rule.anyPermissions,
    allPermissions: rule.allPermissions,
    onlyPermissions: rule.onlyPermissions,
  };
}

export function matchRoutePermissionRule(pathname: string): RoutePermissionRule | null {
  const normalized = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  for (const rule of ROUTE_PERMISSION_RULES) {
    if (patternToRegExp(rule.pattern).test(normalized)) {
      return rule;
    }
  }

  return null;
}

/**
 * Fallback route when access is denied — first accessible destination for the user.
 */
export function getDefaultFallbackRoute(
  userPermissions: readonly PermissionKey[],
  isRegional?: boolean,
  regionId?: string | null
): string {
  const hasRegionalPerm = userPermissions.some((p) => p.startsWith("REGIONAL_"));
  const shouldUseRegional = isRegional !== undefined ? isRegional : hasRegionalPerm;
  const prefix = regionId ? `/regions/${regionId}` : "/regions";

  const regionalCandidates: Array<{ path: string; rule: PermissionRule }> = [
    { path: `${prefix}`, rule: { anyPermissions: ["REGIONAL_DASHBOARD:VIEW"] } },
    { path: `${prefix}/departments`, rule: { anyPermissions: ["REGIONAL_STRUCTURES:READ", "REGIONAL_STRUCTURES:MANAGE"] } },
    { path: `${prefix}/users`, rule: { anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] } },
    { path: `${prefix}/settings`, rule: { anyPermissions: ["REGIONAL_BRANDING:READ", "REGIONAL_BRANDING:MANAGE"] } },
    { path: "/notifications", rule: {} },
  ];

  const federalCandidates: Array<{ path: string; rule: PermissionRule }> = [
    { path: "/dashboard", rule: { anyPermissions: ["DASHBOARD:VIEW"] } },
    { path: "/issues", rule: { anyPermissions: ["ISSUES:READ", "ISSUES:READ_ALL"] } },
    {
      path: "/plans/review",
      rule: { allPermissions: ["PLAN:VIEW_ASSIGNED_REVIEW"] },
    },
    {
      path: "/plans",
      rule: { allPermissions: ["PLANS:READ"] },
    },
    { path: "/government-structures", rule: { anyPermissions: ["GOVERNMENT_STRUCTURES:READ"] } },
    { path: "/internal-structures", rule: { anyPermissions: ["INTERNAL_STRUCTURES:READ"] } },
    { path: "/admin/regions", rule: { anyPermissions: ["REGIONS:READ", "REGIONS:MANAGE"] } },
    { path: "/users/list", rule: { allPermissions: ["USERS:READ"] } },
    { path: "/notifications", rule: {} },
  ];

  const candidates = shouldUseRegional ? regionalCandidates : federalCandidates;

  for (const { path, rule } of candidates) {
    if (canAccessRoute([...userPermissions], rule)) {
      return path;
    }
  }

  return "/notifications";
}
