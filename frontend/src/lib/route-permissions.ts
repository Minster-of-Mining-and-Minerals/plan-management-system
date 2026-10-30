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

  // Federal Production Management & Configuration
  { pattern: "/admin/production/dashboard", anyPermissions: ["PRODUCTION_DASHBOARD:READ", "PRODUCTION_ITEMS:READ"] },
  { pattern: "/admin/production/items", anyPermissions: ["PRODUCTION_ITEMS:READ", "PRODUCTION_ITEMS:MANAGE"] },
  { pattern: "/admin/production/frequencies", anyPermissions: ["PRODUCTION_FREQUENCIES:READ", "PRODUCTION_FREQUENCIES:MANAGE"] },
  { pattern: "/admin/production/assignments", anyPermissions: ["COMPANY_PRODUCTION:READ", "COMPANY_PRODUCTION:ASSIGN", "COMPANY_PRODUCTION:MANAGE"] },
  { pattern: "/admin/production/reports", anyPermissions: ["COMPANY_PRODUCTION_REPORTS:READ", "COMPANY_PRODUCTION_REPORTS:MANAGE", "COMPANY_PRODUCTION:READ"] },
  { pattern: "/admin/production", anyPermissions: ["PRODUCTION_DASHBOARD:READ", "PRODUCTION_ITEMS:READ", "COMPANY_PRODUCTION:READ"] },

  // Gold Operations Administration
  {
    pattern: "/admin/gold-operations/purchases/[purchaseId]",
    anyPermissions: ["GOLD_PURCHASES:READ", "GOLD_PURCHASES:MANAGE", "GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE"],
  },
  {
    pattern: "/admin/gold-operations/purchases",
    anyPermissions: ["GOLD_PURCHASES:READ", "GOLD_PURCHASES:MANAGE", "GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE"],
  },
  {
    pattern: "/admin/gold-operations/reports",
    anyPermissions: ["GOLD_REPORTS:READ", "GOLD_REPORTS:MANAGE", "GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE"],
  },
  {
    pattern: "/admin/gold-operations/asm",
    anyPermissions: ["ASM:READ", "ASM:MANAGE", "GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE"],
  },
  {
    pattern: "/admin/gold-operations/units",
    anyPermissions: ["GOLD_UNITS:READ", "GOLD_UNITS:MANAGE"],
  },
  {
    pattern: "/admin/gold-operations/pricing",
    anyPermissions: ["GOLD_PRICES:READ", "GOLD_PRICES:MANAGE", "GOLD_OVERSIGHT:MANAGE", "GOLD_OVERSIGHT:READ"],
  },
  {
    pattern: "/admin/gold-operations",
    anyPermissions: ["GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE", "PURCHASING_CENTERS:READ", "PURCHASING_CENTERS:MANAGE"],
  },

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
  { pattern: "/regions/[id]/plans/configuration", anyPermissions: ["REGIONAL_PLANNING_CONFIG:READ", "REGIONAL_PLANNING_CONFIG:UPDATE", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/regions/[id]/plans/rules", anyPermissions: ["REGIONAL_PLAN_RULES:READ", "REGIONAL_PLAN_RULES:CREATE", "REGIONAL_PLAN_RULES:UPDATE", "REGIONAL_PLAN_RULES:DELETE"] },
  { pattern: "/regions/[id]/plans/review", anyPermissions: ["REGIONAL_PLANS:REVIEW", "REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/regions/[id]/plans/performance-colors", anyPermissions: ["REGIONAL_PERFORMANCE_COLORS:READ", "REGIONAL_PERFORMANCE_COLORS:CREATE", "REGIONAL_PERFORMANCE_COLORS:UPDATE", "REGIONAL_PERFORMANCE_COLORS:DELETE", "REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/regions/[id]/plans/dashboard", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_DASHBOARD:VIEW"] },
  { pattern: "/regions/[id]/plans/[versionId]/details", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE", "REGIONS:READ", "REGIONS:MANAGE"] },
  { pattern: "/regions/[id]/plans/[versionId]/nodes/[nodeId]", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE", "REGIONS:READ", "REGIONS:MANAGE"] },
  { pattern: "/regions/[id]/plans/[versionId]", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/regions/[id]/plans", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
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

  { pattern: "/[id]/plans/configuration", anyPermissions: ["REGIONAL_PLANNING_CONFIG:READ", "REGIONAL_PLANNING_CONFIG:UPDATE", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/[id]/plans/rules", anyPermissions: ["REGIONAL_PLAN_RULES:READ", "REGIONAL_PLAN_RULES:CREATE", "REGIONAL_PLAN_RULES:UPDATE", "REGIONAL_PLAN_RULES:DELETE"] },
  { pattern: "/[id]/plans/review", anyPermissions: ["REGIONAL_PLANS:REVIEW", "REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/[id]/plans/performance-colors", anyPermissions: ["REGIONAL_PERFORMANCE_COLORS:READ", "REGIONAL_PERFORMANCE_COLORS:CREATE", "REGIONAL_PERFORMANCE_COLORS:UPDATE", "REGIONAL_PERFORMANCE_COLORS:DELETE", "REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/[id]/plans/dashboard", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_DASHBOARD:VIEW"] },
  { pattern: "/[id]/plans/[versionId]/details", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE", "REGIONS:READ", "REGIONS:MANAGE"] },
  { pattern: "/[id]/plans/[versionId]/nodes/[nodeId]", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE", "REGIONS:READ", "REGIONS:MANAGE"] },
  { pattern: "/[id]/plans/[versionId]", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/[id]/plans", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
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
  { pattern: "/regional/plans/configuration", anyPermissions: ["REGIONAL_PLANNING_CONFIG:READ", "REGIONAL_PLANNING_CONFIG:UPDATE", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/regional/plans/rules", anyPermissions: ["REGIONAL_PLAN_RULES:READ", "REGIONAL_PLAN_RULES:CREATE", "REGIONAL_PLAN_RULES:UPDATE", "REGIONAL_PLAN_RULES:DELETE"] },
  { pattern: "/regional/plans/review", anyPermissions: ["REGIONAL_PLANS:REVIEW", "REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/regional/plans/performance-colors", anyPermissions: ["REGIONAL_PERFORMANCE_COLORS:READ", "REGIONAL_PERFORMANCE_COLORS:CREATE", "REGIONAL_PERFORMANCE_COLORS:UPDATE", "REGIONAL_PERFORMANCE_COLORS:DELETE", "REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/regional/plans/dashboard", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_DASHBOARD:VIEW"] },
  { pattern: "/regional/plans/[versionId]/details", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE", "REGIONS:READ", "REGIONS:MANAGE"] },
  { pattern: "/regional/plans/[versionId]/nodes/[nodeId]", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE", "REGIONS:READ", "REGIONS:MANAGE"] },
  { pattern: "/regional/plans/[versionId]", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
  { pattern: "/regional/plans", anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] },
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
  { pattern: "/companies/[id]/plans/configuration", anyPermissions: ["COMPANY_PLANNING_CONFIG:READ", "COMPANY_PLANNING_CONFIG:UPDATE", "COMPANY_PLANS:MANAGE"] },
  { pattern: "/companies/[id]/plans/rules", anyPermissions: ["COMPANY_PLAN_RULES:READ", "COMPANY_PLAN_RULES:CREATE", "COMPANY_PLAN_RULES:UPDATE", "COMPANY_PLAN_RULES:DELETE"] },
  { pattern: "/companies/[id]/plans/dashboard", anyPermissions: ["COMPANY_PLANS:READ", "COMPANY_DASHBOARD:VIEW"] },
  { pattern: "/companies/[id]/plans/[versionId]/hierarchy", anyPermissions: ["COMPANY_PLANS:READ", "COMPANY_PLANS:MANAGE"] },
  { pattern: "/companies/[id]/plans/[versionId]", anyPermissions: ["COMPANY_PLANS:READ", "COMPANY_PLANS:MANAGE"] },
  { pattern: "/companies/[id]/plans", anyPermissions: ["COMPANY_PLANS:READ", "COMPANY_PLANS:MANAGE"] },
  { pattern: "/companies/[id]/production/submit", anyPermissions: ["COMPANY_PRODUCTION_REPORTS:CREATE", "COMPANY_PRODUCTION_REPORTS:UPDATE", "COMPANY_PRODUCTION_REPORTS:MANAGE"] },
  { pattern: "/companies/[id]/production/reports", anyPermissions: ["COMPANY_PRODUCTION_REPORTS:READ", "COMPANY_PRODUCTION_REPORTS:MANAGE"] },
  { pattern: "/companies/[id]/production", anyPermissions: ["COMPANY_PRODUCTION:READ", "COMPANY_PRODUCTION_REPORTS:READ", "COMPANY_DASHBOARD:VIEW"] },
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

  // Company Workspace fallback aliases
  { pattern: "/company/plans/configuration", anyPermissions: ["COMPANY_PLANNING_CONFIG:READ", "COMPANY_PLANNING_CONFIG:UPDATE", "COMPANY_PLANS:MANAGE"] },
  { pattern: "/company/plans/rules", anyPermissions: ["COMPANY_PLAN_RULES:READ", "COMPANY_PLAN_RULES:CREATE", "COMPANY_PLAN_RULES:UPDATE", "COMPANY_PLAN_RULES:DELETE"] },
  { pattern: "/company/plans/dashboard", anyPermissions: ["COMPANY_PLANS:READ", "COMPANY_DASHBOARD:VIEW"] },
  { pattern: "/company/plans/[versionId]/hierarchy", anyPermissions: ["COMPANY_PLANS:READ", "COMPANY_PLANS:MANAGE"] },
  { pattern: "/company/plans/[versionId]", anyPermissions: ["COMPANY_PLANS:READ", "COMPANY_PLANS:MANAGE"] },
  { pattern: "/company/plans", anyPermissions: ["COMPANY_PLANS:READ", "COMPANY_PLANS:MANAGE"] },
  { pattern: "/company/production/submit", anyPermissions: ["COMPANY_PRODUCTION_REPORTS:CREATE", "COMPANY_PRODUCTION_REPORTS:UPDATE", "COMPANY_PRODUCTION_REPORTS:MANAGE"] },
  { pattern: "/company/production/reports", anyPermissions: ["COMPANY_PRODUCTION_REPORTS:READ", "COMPANY_PRODUCTION_REPORTS:MANAGE"] },
  { pattern: "/company/production", anyPermissions: ["COMPANY_PRODUCTION:READ", "COMPANY_PRODUCTION_REPORTS:READ", "COMPANY_DASHBOARD:VIEW"] },
  { pattern: "/company/dashboard", anyPermissions: ["COMPANY_DASHBOARD:VIEW"] },
  { pattern: "/company/departments", anyPermissions: ["COMPANY_STRUCTURES:READ", "COMPANY_STRUCTURES:MANAGE"] },
  { pattern: "/company/users", anyPermissions: ["COMPANY_USERS:READ", "COMPANY_USERS:MANAGE"] },
  { pattern: "/company/settings", anyPermissions: ["COMPANY_BRANDING:READ", "COMPANY_BRANDING:MANAGE"] },
  { pattern: "/company", anyPermissions: ["COMPANY_DASHBOARD:VIEW"] },

  // Dynamic Purchasing Center Workspace (strictly NO departments!)
  { pattern: "/purchasing-centers/[id]/purchases/new", anyPermissions: ["GOLD_PURCHASES:CREATE", "GOLD_PURCHASES:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/purchases/[purchaseId]", anyPermissions: ["GOLD_PURCHASES:READ", "GOLD_PURCHASES:MANAGE", "GOLD_OVERSIGHT:READ"] },
  { pattern: "/purchasing-centers/[id]/purchases", anyPermissions: ["GOLD_PURCHASES:READ", "GOLD_PURCHASES:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/reports/daily", anyPermissions: ["GOLD_REPORTS:READ", "GOLD_REPORTS:GENERATE", "GOLD_REPORTS:SUBMIT", "GOLD_REPORTS:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/reports", anyPermissions: ["GOLD_REPORTS:READ", "GOLD_REPORTS:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/sellers/asm", anyPermissions: ["ASM:READ", "ASM:CREATE", "ASM:MANAGE"] },
  { pattern: "/purchasing-centers/[id]/sellers", anyPermissions: ["ASM:READ", "ASM:MANAGE"] },
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
  { pattern: "/purchasing-center/purchases/new", anyPermissions: ["GOLD_PURCHASES:CREATE", "GOLD_PURCHASES:MANAGE"] },
  { pattern: "/purchasing-center/purchases/[purchaseId]", anyPermissions: ["GOLD_PURCHASES:READ", "GOLD_PURCHASES:MANAGE", "GOLD_OVERSIGHT:READ"] },
  { pattern: "/purchasing-center/purchases", anyPermissions: ["GOLD_PURCHASES:READ", "GOLD_PURCHASES:MANAGE"] },
  { pattern: "/purchasing-center/reports/daily", anyPermissions: ["GOLD_REPORTS:READ", "GOLD_REPORTS:GENERATE", "GOLD_REPORTS:SUBMIT", "GOLD_REPORTS:MANAGE"] },
  { pattern: "/purchasing-center/reports", anyPermissions: ["GOLD_REPORTS:READ", "GOLD_REPORTS:MANAGE"] },
  { pattern: "/purchasing-center/sellers/asm", anyPermissions: ["ASM:READ", "ASM:CREATE", "ASM:MANAGE"] },
  { pattern: "/purchasing-center/sellers", anyPermissions: ["ASM:READ", "ASM:MANAGE"] },
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
  regionId?: string | null,
  companyId?: string | null,
  purchasingCenterId?: string | null
): string {
  const hasRegionalPerm = userPermissions.some((p) => p.startsWith("REGIONAL_"));
  const hasCompanyPerm = userPermissions.some((p) => p.startsWith("COMPANY_"));
  const hasPurchasingCenterPerm = userPermissions.some(
    (p) => p.startsWith("PURCHASING_CENTER_") || p.startsWith("GOLD_") || p.startsWith("ASM:")
  );

  const shouldUseRegional = isRegional !== undefined ? isRegional : hasRegionalPerm;
  const regionalPrefix = regionId ? `/regions/${regionId}` : "/regions";
  const companyPrefix = companyId ? `/companies/${companyId}` : "/companies";
  const pcPrefix = purchasingCenterId ? `/purchasing-centers/${purchasingCenterId}` : "/purchasing-centers";

  const regionalCandidates: Array<{ path: string; rule: PermissionRule }> = [
    { path: `${regionalPrefix}`, rule: { anyPermissions: ["REGIONAL_DASHBOARD:VIEW", "REGIONS:READ"] } },
    { path: `${regionalPrefix}/departments`, rule: { anyPermissions: ["REGIONAL_STRUCTURES:READ", "REGIONAL_STRUCTURES:MANAGE"] } },
    { path: `${regionalPrefix}/plans`, rule: { anyPermissions: ["REGIONAL_PLANS:READ", "REGIONAL_PLANS:MANAGE"] } },
    { path: `${regionalPrefix}/users`, rule: { anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"] } },
    { path: `${regionalPrefix}/settings`, rule: { anyPermissions: ["REGIONAL_BRANDING:READ", "REGIONAL_BRANDING:MANAGE"] } },
    { path: "/notifications", rule: {} },
  ];

  const companyCandidates: Array<{ path: string; rule: PermissionRule }> = [
    { path: `${companyPrefix}`, rule: { anyPermissions: ["COMPANY_DASHBOARD:VIEW", "COMPANIES:READ"] } },
    { path: `${companyPrefix}/departments`, rule: { anyPermissions: ["COMPANY_STRUCTURES:READ", "COMPANY_STRUCTURES:MANAGE"] } },
    { path: `${companyPrefix}/users`, rule: { anyPermissions: ["COMPANY_USERS:READ", "COMPANY_USERS:MANAGE"] } },
    { path: `${companyPrefix}/settings`, rule: { anyPermissions: ["COMPANY_BRANDING:READ", "COMPANY_BRANDING:MANAGE"] } },
    { path: "/notifications", rule: {} },
  ];

  const purchasingCenterCandidates: Array<{ path: string; rule: PermissionRule }> = [
    { path: `${pcPrefix}`, rule: { anyPermissions: ["PURCHASING_CENTER_DASHBOARD:VIEW", "PURCHASING_CENTERS:READ"] } },
    { path: `${pcPrefix}/purchases`, rule: { anyPermissions: ["GOLD_PURCHASES:READ", "GOLD_PURCHASES:MANAGE"] } },
    { path: `${pcPrefix}/reports`, rule: { anyPermissions: ["GOLD_REPORTS:READ", "GOLD_REPORTS:MANAGE"] } },
    { path: `${pcPrefix}/sellers/asm`, rule: { anyPermissions: ["ASM:READ", "ASM:MANAGE"] } },
    { path: `${pcPrefix}/users`, rule: { anyPermissions: ["PURCHASING_CENTER_USERS:READ", "PURCHASING_CENTER_USERS:MANAGE"] } },
    { path: `${pcPrefix}/settings`, rule: { anyPermissions: ["PURCHASING_CENTER_BRANDING:READ", "PURCHASING_CENTER_BRANDING:MANAGE"] } },
    { path: "/notifications", rule: {} },
  ];

  const federalCandidates: Array<{ path: string; rule: PermissionRule }> = [
    { path: "/dashboard", rule: { anyPermissions: ["DASHBOARD:VIEW"] } },
    { path: "/admin/gold-operations", rule: { anyPermissions: ["GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE", "PURCHASING_CENTERS:READ"] } },
    { path: "/admin/regions", rule: { anyPermissions: ["REGIONS:READ", "REGIONS:MANAGE"] } },
    { path: "/admin/companies", rule: { anyPermissions: ["COMPANIES:READ", "COMPANIES:MANAGE"] } },
    { path: "/admin/purchasing-centers", rule: { anyPermissions: ["PURCHASING_CENTERS:READ", "PURCHASING_CENTERS:MANAGE"] } },
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
    { path: "/users/list", rule: { allPermissions: ["USERS:READ"] } },
    { path: "/notifications", rule: {} },
  ];

  const candidates = shouldUseRegional
    ? regionalCandidates
    : Boolean(companyId) || hasCompanyPerm
    ? companyCandidates
    : Boolean(purchasingCenterId) || hasPurchasingCenterPerm
    ? purchasingCenterCandidates
    : federalCandidates;

  for (const { path, rule } of candidates) {
    if (canAccessRoute([...userPermissions], rule)) {
      return path;
    }
  }

  return "/notifications";
}

