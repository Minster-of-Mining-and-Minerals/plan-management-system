import { User } from "./user";

export interface Permission {
    permission_id: string;
    resource: string;
    action: string;
}

export interface PermissionGroup {
    permission_group_id: string;
    name: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    permissions?: Permission[];
    users?: User[];
    strength?: number;
    permission_count?: number;
    total_permissions?: number;
}

export interface CreatePermissionGroupPayload {
    name: string;
    description?: string;
    permission_ids?: string[];
    user_ids?: string[];
}

export interface UpdatePermissionGroupPayload {
    name?: string;
    description?: string;
    is_active?: boolean;
    permission_ids?: string[];
}

export interface AddPermissionsPayload {
    permission_group_id: string;
    permission_ids: string[];
}

export interface RemovePermissionPayload {
    permission_group_id: string;
    permission_id: string;
}

export interface AddUsersPayload {
    permission_group_id: string;
    user_ids: string[];
}

export interface RemoveUserPayload {
    permission_group_id: string;
    user_id: string;
}
