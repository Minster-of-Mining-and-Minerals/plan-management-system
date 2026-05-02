import { User } from "./user";

export interface InternalStructure {
    internal_structure_id: string;
    name: string;
    government_structure_id: string;
    parent_id?: string | null;
    level: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;

    children?: InternalStructure[];
    parent?: InternalStructure;
    users?: User[];
    governmentStructure?: import("./governmentStructure").GovernmentStructure;
}

/**
 * PAYLOADS
 */
export interface CreateInternalStructurePayload {
    name: string;
    government_structure_id: string;
    parent_id?: string | null;
    level?: number;
}

export interface UpdateInternalStructurePayload {
    name?: string;
    government_structure_id?: string;
    parent_id?: string | null;
    level?: number;
    is_active?: boolean;
}

export interface AssignUsersPayload {
    internal_structure_id: string;
    user_ids: string[];
}

export interface RemoveUserPayload {
    user_id: string;
}