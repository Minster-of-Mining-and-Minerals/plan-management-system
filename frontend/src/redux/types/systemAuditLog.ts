export type SystemAuditLogAction = "create" | "update" | "delete" | "restore";

export type SystemAuditLogModule =
  | "branding_settings"
  | "users"
  | "roles"
  | "plans"
  | "government_structures"
  | "internal_structures"
  | "permission_groups"
  | "performance_color_thresholds"
  | "notifications";

export const SYSTEM_AUDIT_MODULE_OPTIONS: {
  value: SystemAuditLogModule;
  label: string;
}[] = [
  { value: "branding_settings", label: "Branding" },
  { value: "users", label: "Users" },
  { value: "roles", label: "Roles" },
  { value: "plans", label: "Plans" },
  { value: "government_structures", label: "Government Structures" },
  { value: "internal_structures", label: "Internal Structures" },
  { value: "permission_groups", label: "Permission Groups" },
  { value: "performance_color_thresholds", label: "Performance Colors" },
  { value: "notifications", label: "Notifications" },
];

export const SYSTEM_AUDIT_ACTION_OPTIONS: {
  value: SystemAuditLogAction;
  label: string;
}[] = [
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "restore", label: "Restore" },
];

export interface SystemAuditLogUser {
  user_id: string;
  full_name: string;
  email: string;
}

export interface SystemAuditLog {
  system_audit_log_id: string;
  module: SystemAuditLogModule;
  module_label?: string;
  action: SystemAuditLogAction;
  entity_id?: string | null;
  entity_label?: string | null;
  summary?: string | null;
  previous_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  changed_by: string;
  ip_address?: string | null;
  created_at: string;
  changedByUser?: SystemAuditLogUser;
}

export interface GetSystemAuditLogsQueryParams {
  page?: number;
  limit?: number;
  module?: SystemAuditLogModule;
  action?: SystemAuditLogAction;
  search?: string;
}

export interface SystemAuditLogsResponse {
  data: SystemAuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
