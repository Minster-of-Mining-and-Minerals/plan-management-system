// types/permissionGroup.ts

import { User } from "./user";
import { GovernmentStructure } from "./governmentStructure";

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
    structures?: GovernmentStructure[];
}

/** ---------------------------
 * CREATE
 * --------------------------- */
export interface CreatePermissionGroupPayload {
    name: string;
    description?: string;

    permission_ids?: string[];
    user_ids?: string[];
    government_structure_ids?: string[];
}

/** ---------------------------
 * UPDATE
 * --------------------------- */
export interface UpdatePermissionGroupPayload {
    name?: string;
    description?: string;
    is_active?: boolean;
}

/** ---------------------------
 * ASSIGNMENTS
 * --------------------------- */
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

export interface AddStructuresPayload {
    permission_group_id: string;
    government_structure_ids: string[];
}

export interface RemoveStructurePayload {
    permission_group_id: string;
    government_structure_id: string;
}