export interface RolePermission {
  role_permission_id: string;
  permission: {
    permission_id: string;
    resource: string;
    action: string;
  };
}

export interface Role {
  role_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  rolePermissions: RolePermission[];
  /** Percentage of all system permissions assigned to this role (0–100). */
  strength?: number;
  permission_count?: number;
  total_permissions?: number;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permission_ids?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permission_ids?: string[];
}
