import type { PermissionKey } from "@/lib/permissions";
import type { PermissionRule } from "@/lib/permission-guard";

export type PermissionRequirementMode = "all" | "any" | "only";

export interface PermissionRequirement {
  mode: PermissionRequirementMode;
  permissions: PermissionKey[];
}

const PERMISSION_LABELS: Partial<Record<PermissionKey, string>> = {
  "DASHBOARD:VIEW": "View dashboard",
  "PLANS:READ": "View plans",
  "PLANS:CREATE": "Create plans",
  "PLANS:UPDATE": "Update plans",
  "PLANS:DELETE": "Delete plans",
  "PLANS:EDIT_FINALIZED": "Edit finalized plans",
  "PLAN:VIEW_ASSIGNED_REVIEW": "View assigned review plans",
  "PLAN_RULES:READ": "View plan rules",
  "PLAN_RULES:CREATE": "Create plan rules",
  "PLAN_RULES:UPDATE": "Update plan rules",
  "PLAN_RULES:DELETE": "Delete plan rules",
  "PLAN:PUBLISH_FOR_REVIEW": "Publish plan for review",
  "PLAN:COMPLETE_REVIEW": "Complete plan review",
  "PLAN:RAISE_REVIEW_ISSUE": "Raise plan review issues",
  "PLAN:VIEW_OWN_REVIEW_ISSUES": "View own plan review issues",
  "PLAN:VIEW_REVIEW_DASHBOARD": "View all plan review issues",
  "PLAN:START_PROCESS": "Start plan process",
  "PLAN:OVERRIDE_PARENT_ACHIEVEMENT": "Override parent achievement rollup",
  "PLAN:BYPASS_ACHIEVEMENT_ASSIGNMENT":
    "Bypass plan-tree assignment for achievement execute/approve (QA)",
  "PLAN:EXECUTE_ACHIEVEMENT": "Submit achievement on assigned plan leaf nodes",
  "PLAN:APPROVE_ACHIEVEMENT": "Approve submitted plan achievements in assigned scope",
  "PLAN:VALIDATE_APPROVAL": "Validate approved period achievements (sector-local)",
  "PLAN:PUBLISH_SECTOR_AGGREGATION":
    "Finalize sector achievement package for structure-to-structure aggregation",
  "PLAN:VIEW_SECTOR_PLAN_HIERARCHY": "View sector-assigned plan subtree (read-only)",
  "PLAN:VIEW_FULL_PLAN_HIERARCHY": "View complete plan hierarchy (read-only)",
  "SPECIAL_PERMISSION_GROUPS:READ": "View special permission groups",
  "SPECIAL_PERMISSION_GROUPS:CREATE": "Create special permission groups",
  "SPECIAL_PERMISSION_GROUPS:UPDATE": "Update special permission groups",
  "SPECIAL_PERMISSION_GROUPS:DELETE": "Delete special permission groups",
  "ISSUES:READ": "View own and assigned issues",
  "ISSUES:READ_ALL": "View all issues",
  "ISSUES:CREATE": "Create issues",
  "ISSUE_CATEGORIES:READ": "View issue categories",
  "USERS:READ": "View users",
  "ROLES:READ": "View roles",
  "PERMISSIONS:READ": "View permissions",
  "PERMISSION_GROUPS:READ": "View permission groups",
  "GOVERNMENT_STRUCTURES:READ": "View sector structures",
  "INTERNAL_STRUCTURES:READ": "View internal structures",
  "BRANDING_SETTINGS:READ": "View branding settings",
  "SYSTEM_AUDIT_LOGS:READ": "View audit logs",
  "SYSTEM_SETTINGS:READ": "View system settings",
  "SYSTEM_SETTINGS:UPDATE": "Update system settings",
  "PERFORMANCE_COLOR_THRESHOLDS:READ": "View performance color thresholds",

  // Regional Management
  "REGIONS:READ": "View regions",
  "REGIONS:CREATE": "Create regions",
  "REGIONS:UPDATE": "Update regions",
  "REGIONS:DELETE": "Delete regions",
  "REGIONS:MANAGE": "Manage regions",
  "REGIONAL_DASHBOARD:VIEW": "View regional dashboard",
  "REGIONAL_STRUCTURES:READ": "View regional structures",
  "REGIONAL_STRUCTURES:MANAGE": "Manage regional structures",
  "REGIONAL_USERS:READ": "View regional users",
  "REGIONAL_USERS:MANAGE": "Manage regional users",
  "REGIONAL_ROLES:READ": "View regional roles",
  "REGIONAL_ROLES:MANAGE": "Manage regional roles",
  "REGIONAL_PERMISSION_GROUPS:READ": "View regional permission groups",
  "REGIONAL_PERMISSION_GROUPS:MANAGE": "Manage regional permission groups",
  "REGIONAL_PERMISSIONS:READ": "View regional permissions",
  "REGIONAL_BRANDING:READ": "View regional branding",
  "REGIONAL_BRANDING:MANAGE": "Manage regional branding",
  "REGIONAL_PLANS:READ": "View regional plans",
  "REGIONAL_PLANS:MANAGE": "Manage regional plans",
  "REGIONAL_PLANS:REOPEN_PERIOD": "Reopen completed execution periods",
  "REGIONAL_PLAN_RULES:READ": "View regional plan rules",
  "REGIONAL_PLANNING_CONFIG:READ": "View regional planning configuration",

  // Companies Management
  "COMPANIES:READ": "View companies",
  "COMPANIES:CREATE": "Create companies",
  "COMPANIES:UPDATE": "Update companies",
  "COMPANIES:DELETE": "Delete companies",
  "COMPANIES:MANAGE": "Manage companies",
  "COMPANY_DASHBOARD:VIEW": "View company dashboard",
  "COMPANY_STRUCTURES:READ": "View company structures",
  "COMPANY_STRUCTURES:MANAGE": "Manage company structures",
  "COMPANY_USERS:READ": "View company users",
  "COMPANY_USERS:MANAGE": "Manage company users",
  "COMPANY_ROLES:READ": "View company roles",
  "COMPANY_ROLES:MANAGE": "Manage company roles",
  "COMPANY_PERMISSION_GROUPS:READ": "View company permission groups",
  "COMPANY_PERMISSION_GROUPS:MANAGE": "Manage company permission groups",
  "COMPANY_PERMISSIONS:READ": "View company permissions",
  "COMPANY_BRANDING:READ": "View company branding",
  "COMPANY_BRANDING:MANAGE": "Manage company branding",

  // Gold Purchasing Centers Management
  "PURCHASING_CENTERS:READ": "View purchasing centers",
  "PURCHASING_CENTERS:CREATE": "Create purchasing centers",
  "PURCHASING_CENTERS:UPDATE": "Update purchasing centers",
  "PURCHASING_CENTERS:DELETE": "Delete purchasing centers",
  "PURCHASING_CENTERS:MANAGE": "Manage purchasing centers",
  "PURCHASING_CENTER_DASHBOARD:VIEW": "View purchasing center dashboard",
  "PURCHASING_CENTER_USERS:READ": "View purchasing center users",
  "PURCHASING_CENTER_USERS:MANAGE": "Manage purchasing center users",
  "PURCHASING_CENTER_ROLES:READ": "View purchasing center roles",
  "PURCHASING_CENTER_ROLES:MANAGE": "Manage purchasing center roles",
  "PURCHASING_CENTER_PERMISSION_GROUPS:READ": "View purchasing center permission groups",
  "PURCHASING_CENTER_PERMISSION_GROUPS:MANAGE": "Manage purchasing center permission groups",
  "PURCHASING_CENTER_PERMISSIONS:READ": "View purchasing center permissions",
  "PURCHASING_CENTER_BRANDING:READ": "View purchasing center branding",
  "PURCHASING_CENTER_BRANDING:MANAGE": "Manage purchasing center branding",

  // Gold Operations
  "GOLD_OVERSIGHT:READ": "View gold oversight dashboard",
  "GOLD_OVERSIGHT:MANAGE": "Manage gold oversight",
  "GOLD_PURCHASES:READ": "View gold purchases register",
  "GOLD_PURCHASES:CREATE": "Record gold purchase",
  "GOLD_PURCHASES:UPDATE": "Update gold purchase",
  "GOLD_PURCHASES:CANCEL": "Cancel gold purchase",
  "GOLD_PURCHASES:MANAGE": "Manage gold purchases",
  "GOLD_REPORTS:READ": "View gold daily reports",
  "GOLD_REPORTS:GENERATE": "Generate gold daily report",
  "GOLD_REPORTS:SUBMIT": "Submit gold daily report",
  "GOLD_REPORTS:EXPORT": "Export gold reports",
  "GOLD_REPORTS:MANAGE": "Manage gold reports",
  "ASM:READ": "View Artisanal and Small-Scale Miner sellers",
  "ASM:CREATE": "Register Artisanal and Small-Scale Miner seller",
  "ASM:UPDATE": "Update Artisanal and Small-Scale Miner seller",
  "ASM:DEACTIVATE": "Deactivate Artisanal and Small-Scale Miner seller",
  "ASM:MANAGE": "Manage Artisanal and Small-Scale Miner sellers",
  "GOLD_UNITS:READ": "View gold measurement units",
  "GOLD_UNITS:CREATE": "Create gold measurement unit",
  "GOLD_UNITS:UPDATE": "Update gold measurement unit",
  "GOLD_UNITS:DEACTIVATE": "Deactivate gold measurement unit",
  "GOLD_UNITS:MANAGE": "Manage gold measurement units",
};

export function getCanonicalPermissionCode(permission: PermissionKey | string): string {
  const [resource, action] = String(permission).split(":");
  return resource && action
    ? `${resource.toUpperCase()}:${action.toUpperCase()}`
    : String(permission).toUpperCase();
}

export function getPermissionHumanLabel(permission: PermissionKey | string): string | null {
  const code = getCanonicalPermissionCode(permission);
  return PERMISSION_LABELS[code as PermissionKey] ?? null;
}

export function formatPermissionKey(permission: PermissionKey | string): string {
  const code = getCanonicalPermissionCode(permission);
  const label = PERMISSION_LABELS[code as PermissionKey];
  return label ? `${code} (${label})` : code;
}

export function describePermissionRule(rule: PermissionRule): PermissionRequirement | null {
  if (rule.onlyPermissions?.length) {
    return { mode: "only", permissions: [...rule.onlyPermissions] };
  }
  if (rule.allPermissions?.length) {
    return { mode: "all", permissions: [...rule.allPermissions] };
  }
  if (rule.anyPermissions?.length) {
    return { mode: "any", permissions: [...rule.anyPermissions] };
  }
  return null;
}

export function describePermissionRequirement(requirement: PermissionRequirement): string {
  const labels = requirement.permissions.map(formatPermissionKey);
  if (requirement.mode === "all") {
    return `All of: ${labels.join(", ")}`;
  }
  if (requirement.mode === "any") {
    return `One of: ${labels.join(", ")}`;
  }
  return `Only: ${labels.join(", ")}`;
}

export interface ApiPermissionErrorDetails {
  message: string;
  requiredPermissions?: string[];
  requiredPermissionsMode?: PermissionRequirementMode;
}

export function parseApiPermissionError(
  error: unknown,
  exposeRequiredPermissions: boolean
): ApiPermissionErrorDetails {
  const err = error as {
    data?: {
      message?: string;
      error?: string;
      errors?: string[];
      required_permissions?: string[];
      required_permissions_mode?: PermissionRequirementMode;
    };
  };

  const message =
    err.data?.errors?.join("; ") ||
    err.data?.message ||
    err.data?.error ||
    "Access denied";

  if (!exposeRequiredPermissions || !err.data?.required_permissions?.length) {
    return { message };
  }

  return {
    message,
    requiredPermissions: err.data.required_permissions,
    requiredPermissionsMode: err.data.required_permissions_mode ?? "all",
  };
}
