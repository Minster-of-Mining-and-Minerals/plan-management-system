export interface UserType {
  user_type_id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPosition {
  user_position_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  role_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionGroup {
  permission_group_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InternalUserProfile {
  profile_id?: string;
  user_id?: string;
  department_id?: string | null;
  department?: string | null;
  job_title?: string | null;
  employee_id?: string | null;
  departmentRef?: {
    department_id: string;
    name: string;
    code: string;
    status?: string;
  };
}

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  is_active: boolean;
  is_first_logged_in: boolean;
  last_login_at?: string;
  password_changed_at?: string;
  profile_image?: string;
  created_at: string;
  updated_at: string;
  roles?: Role[];
  permissionGroups?: PermissionGroup[];
  internalProfile?: InternalUserProfile;
}

export interface CreateUserPayload {
  full_name?: string;
  email?: string;
  phone_number?: string;
  profile_image?: string;
  is_active?: boolean;
  role_ids?: string[];
  department_id?: string | null;
  department?: string | null;
  job_title?: string | null;
  employee_id?: string | null;
  [key: string]: unknown;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  phone_number?: string;
  role_ids?: string[];
  is_active?: boolean;
  department_id?: string | null;
  department?: string | null;
  job_title?: string | null;
  employee_id?: string | null;
}

export interface ToggleUserStatusPayload {
  is_active: boolean;
}
