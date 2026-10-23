// types/permissionGroup.ts

import { User } from "./user";
import { GovernmentStructure } from "./governmentStructure";
import { InternalStructure } from "./internalStructure";

export type PermissionGroupKind = "standard" | "special" | "regional" | "company";

export interface Permission {
    permission_id: string;
    resource: string;
    action: string;
    permission_tier?: string;
}

export interface PermissionGroup {
    permission_group_id: string;

    name: string;
    description?: string;

    is_active: boolean;
    group_kind?: PermissionGroupKind;
    region_id?: string;
    company_id?: string;

    created_at?: string;
    updated_at?: string;

    permissions?: Permission[];
    users?: User[];
    structures?: GovernmentStructure[];
    internalStructures?: InternalStructure[];
}

/** ---------------------------
 * CREATE
 * --------------------------- */
export interface CreatePermissionGroupPayload {
    name: string;
    description?: string;
    group_kind?: PermissionGroupKind;

    permission_ids?: string[];
    user_ids?: string[];
    government_structure_ids?: string[];
    government_structure_id?: string;
    region_id?: string | null;
    company_id?: string | null;
}

/** ---------------------------
 * UPDATE
 * --------------------------- */
export interface UpdatePermissionGroupPayload {
    name?: string;
    description?: string;
    is_active?: boolean;
    group_kind?: PermissionGroupKind;
    permission_ids?: string[];
    government_structure_id?: string;
    region_id?: string | null;
    company_id?: string | null;
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

export interface AddDepartmentsPayload {
    permission_group_id: string;
    internal_structure_ids: string[];
}

export interface RemoveDepartmentPayload {
    permission_group_id: string;
    internal_structure_id: string;
}

export interface GetPermissionGroupsParams {
    government_structure_id?: string;
    search?: string;
    group_kind?: PermissionGroupKind;
    region_id?: string;
    company_id?: string;
}