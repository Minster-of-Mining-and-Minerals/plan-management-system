
export interface UserType {
  user_type_id: string;
  name: string;
  description?: string;
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
  government_structure_id?: string;
  internal_structure_id?: string;
  governmentStructure?: {
    government_structure_id: string;
    name: string;
  };
  internalStructure?: {
    internal_structure_id: string;
    name: string;
  };
}

// Payloads
export interface CreateUserPayload {
  full_name: string;
  email: string;
  phone_number?: string;
  role_ids?: string[];
  government_structure_id?: string;
  internal_structure_id?: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  phone_number?: string;
  role_ids?: string[];
  government_structure_id?: string;
  internal_structure_id?: string;
  is_active?: boolean;
  is_first_logged_in?: boolean;
  profile_image?: string | null;
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone_number?: string | null;
  profile_image?: string | null;
}

export interface ToggleUserStatusPayload {
  is_active: boolean;
}
