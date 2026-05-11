export interface Structure {
    structure_id: string;
    parent_id?: string | null;
    name: string;
    level: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;

    parent?: Structure;
    children?: Structure[];

    users?: any[]; 
    permissionGroups?: any[]; 
}

/**
 * ================= PAYLOADS =================
 */

export interface CreateStructurePayload {
    name: string;
    parent_id?: string | null;
    level?: number;
    is_active?: boolean;
}

export interface UpdateStructurePayload {
    name?: string;
    parent_id?: string | null;
    level?: number;
    is_active?: boolean;
}

export interface AddUsersToStructurePayload {
    structure_id: string;
    user_ids: string[];
}

export interface RemoveUserFromStructurePayload {
    user_id: string;
}

export interface AddPermissionGroupsToStructurePayload {
    structure_id: string;
    permission_group_ids: string[];
}

export interface RemovePermissionGroupFromStructurePayload {
    structure_id: string;
    permission_group_id: string;
}
