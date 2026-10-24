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
  scope?: "global" | "private" | "structure" | "regional" | "company" | "purchasing_center";
  government_structure_id?: string | null;
  region_id?: string | null;
  company_id?: string | null;
  purchasing_center_id?: string | null;
  permissions_count?: number;
  rolePermissions: RolePermission[];
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permission_ids?: string[];
  government_structure_id?: string;
  region_id?: string;
  company_id?: string;
  purchasing_center_id?: string;
  scope?: "global" | "private" | "structure" | "regional" | "company" | "purchasing_center";
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permission_ids?: string[];
}
