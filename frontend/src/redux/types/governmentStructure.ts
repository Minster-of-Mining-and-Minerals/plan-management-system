export interface GovernmentStructure {
    government_structure_id: string;
    parent_id?: string | null;
    name: string;
    level: number;
    is_active: boolean;
    logo_path?: string | null;
    created_at?: string;
    updated_at?: string;

    parent?: GovernmentStructure;
    children?: GovernmentStructure[];

    users?: any[]; // replace with User type if you have it
    permissionGroups?: any[]; // replace with PermissionGroup type if needed
}

/**
 * ================= PAYLOADS =================
 */

export interface CreateGovernmentStructurePayload {
    name: string;
    parent_id?: string | null;
    level?: number;
    is_active?: boolean;
    logo_path?: string | null;
}

export interface UpdateGovernmentStructurePayload {
    name?: string;
    parent_id?: string | null;
    level?: number;
    is_active?: boolean;
    logo_path?: string | null;
}

export interface AddUsersToStructurePayload {
    government_structure_id: string;
    user_ids: string[];
}

export interface RemoveUserFromStructurePayload {
    user_id: string;
}

export interface AddPermissionGroupsToStructurePayload {
    government_structure_id: string;
    permission_group_ids: string[];
}

export interface RemovePermissionGroupFromStructurePayload {
    government_structure_id: string;
    permission_group_id: string;
}