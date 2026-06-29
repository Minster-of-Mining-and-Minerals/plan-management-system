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
};

export function formatPermissionKey(permission: PermissionKey | string): string {
  const [resource, action] = String(permission).split(":");
  const normalized =
    resource && action
      ? (`${resource.toUpperCase()}:${action.toUpperCase()}` as PermissionKey)
      : (String(permission).toUpperCase() as PermissionKey);
  return PERMISSION_LABELS[normalized] ?? String(permission);
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
