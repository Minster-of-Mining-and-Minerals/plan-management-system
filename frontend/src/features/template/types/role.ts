import type { ReactNode } from "react";

export interface Permission {
  permission_id: string;
  resource: string;
  action: string;
  is_active: boolean | null;
}

export interface RolePermission {
  permission_id: string;
  permission: Permission;
  is_active: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  role_type: string;
  is_active: boolean;
  rolePermissions: RolePermission[];
  created_at?: string;
  updated_at?: string;
}

export interface ResourceGroup {
  resource: string;
  icon: ReactNode;
  permissions: Permission[];
  selected: boolean;
}

export type PermissionMatrixMap = Record<string, Record<string, boolean>>;

export interface CreateRolePayload {
  name: string;
  description: string;
  role_type: string;
  permission_ids: string[];
}

export interface UpdateRolePayload {
  name: string;
  description: string;
  role_type: string;
  permission_ids: string[];
}
