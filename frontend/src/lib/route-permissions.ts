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
  { pattern: "/users/list/[userId]", allPermissions: ["USERS:READ"] },
  { pattern: "/users/roles/[id]", allPermissions: ["ROLES:READ"] },
  { pattern: "/users/permission-groups/[id]", allPermissions: ["PERMISSION_GROUPS:READ"] },
  { pattern: "/users/list", allPermissions: ["USERS:READ"] },
  { pattern: "/users/roles", allPermissions: ["ROLES:READ"] },
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

  // Issues
  { pattern: "/issues/form-config", allPermissions: ["FORM_CONFIG_CONTAINERS:READ"] },
  { pattern: "/issues/categories", allPermissions: ["ISSUE_CATEGORIES:READ"] },
  {
    pattern: "/issues/[id]",
    anyPermissions: [
      "ISSUES:READ",
      "ISSUES:READ_ALL",
      "ISSUES:READ_OWN",
      "ISSUES:READ_ASSIGNED",
    ],
  },
  {
    pattern: "/issues",
    anyPermissions: [
      "ISSUES:READ",
      "ISSUES:READ_ALL",
      "ISSUES:READ_OWN",
      "ISSUES:READ_ASSIGNED",
    ],
  },

  // Settings
  { pattern: "/settings/system", allPermissions: ["SYSTEM_SETTINGS:READ"] },
  { pattern: "/settings/branding", allPermissions: ["BRANDING_SETTINGS:READ"] },
  { pattern: "/settings/audit-logs", allPermissions: ["SYSTEM_AUDIT_LOGS:READ"] },

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
  userPermissions: readonly PermissionKey[]
): string {
  const candidates: Array<{ path: string; rule: PermissionRule }> = [
    { path: "/dashboard", rule: { anyPermissions: ["DASHBOARD:VIEW"] } },
    { path: "/issues", rule: { anyPermissions: ["ISSUES:READ", "ISSUES:READ_ALL", "ISSUES:READ_OWN", "ISSUES:READ_ASSIGNED"] } },
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
    { path: "/users/list", rule: { allPermissions: ["USERS:READ"] } },
    { path: "/notifications", rule: {} },
  ];

  for (const { path, rule } of candidates) {
    if (canAccessRoute([...userPermissions], rule)) {
      return path;
    }
  }

  return "/notifications";
}
