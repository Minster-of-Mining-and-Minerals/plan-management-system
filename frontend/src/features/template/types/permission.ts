import type { ReactNode } from "react";

export interface Permission {
  permission_id: string;
  resource: string;
  action: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PermissionListResponse {
  success: boolean;
  message: string;
  data: Permission[];
}

export interface PermissionResponse {
  success: boolean;
  message: string;
  data: Permission;
}

export interface PermissionStats {
  total: number;
  active: number;
  inactive: number;
}

export interface ResourceGroup {
  resource: string;
  icon: ReactNode;
  permissions: Permission[];
  isExpanded: boolean;
  activeCount: number;
  totalCount: number;
}

export interface ResourceIcons {
  [key: string]: ReactNode;
}
