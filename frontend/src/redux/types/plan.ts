/**
 * ================= PLAN VERSION TYPES =================
 */

export interface PlanVersion {
    plan_version_id: string;
    year: number;
    version_number: number;
    status: "draft" | "active" | "completed";
    government_structure_id: string;
    based_on_version_id: string | null;
    created_at: string;
    updated_at: string;
    governmentStructure?: GovernmentStructure;
    baseVersion?: PlanVersion;
    planNodes?: PlanNode[];
}

export interface CreatePlanVersionPayload {
    year: number;
    government_structure_id: string;
    based_on_version_id?: string | null;
}

export interface UpdatePlanVersionPayload {
    year?: number;
    version_number?: number;
    status?: "draft" | "active" | "completed";
    government_structure_id?: string;
    based_on_version_id?: string | null;
}

export interface UpdatePlanVersionStatusPayload {
    status: "draft" | "active" | "completed";
}

export interface GetPlanVersionsQueryParams {
    year?: number;
    government_structure_id?: string;
    status?: "draft" | "active" | "completed";
    search?: string;
}

/**
 * ================= PLAN NODE TYPES =================
 */

export interface PlanNode {
    plan_node_id: string;
    plan_version_id: string;
    parent_id: string | null;
    type: "strategic" | "goal" | "kpi" | "task";
    title: string;
    description: string | null;
    weight: number;
    level: number;
    order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    planVersion?: PlanVersion;
    parent?: PlanNode;
    children?: PlanNode[];
    externalAssignments?: ExternalAssignment[];
    internalAssignments?: InternalAssignment[];
}

export interface CreatePlanNodePayload {
    plan_version_id: string;
    parent_id?: string | null;
    type: "strategic" | "goal" | "kpi" | "task";
    title: string;
    description?: string | null;
    weight?: number;
    level?: number;
    order?: number;
}

export interface UpdatePlanNodePayload {
    parent_id?: string | null;
    type?: "strategic" | "goal" | "kpi" | "task";
    title?: string;
    description?: string | null;
    weight?: number;
    level?: number;
    order?: number;
    is_active?: boolean;
}

export interface GetPlanNodesQueryParams {
    plan_version_id: string;
    type?: "strategic" | "goal" | "kpi" | "task";
    parent_id?: string | null;
    level?: number;
    is_active?: boolean;
}

export interface ReorderPlanNodesPayload {
    parent_id?: string | null;
    nodeOrders: Array<{
        plan_node_id: string;
        order: number;
    }>;
}

export interface PlanNodeHierarchy extends PlanNode {
    children: PlanNodeHierarchy[];
}

/**
 * ================= ASSIGNMENT ACTION TYPES =================
 */

export interface PlanAssignmentAction {
    action_id: string;
    name: string;
    code: string;
    description: string | null;
    is_approval: boolean;
    is_execution: boolean;
    is_reporting: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateAssignmentActionPayload {
    name: string;
    code: string;
    description?: string | null;
    is_approval?: boolean;
    is_execution?: boolean;
    is_reporting?: boolean;
}

export interface UpdateAssignmentActionPayload {
    name?: string;
    description?: string | null;
    is_approval?: boolean;
    is_execution?: boolean;
    is_reporting?: boolean;
}

export interface GetAssignmentActionsQueryParams {
    type?: "approval" | "execution" | "reporting";
}

/**
 * ================= EXTERNAL ASSIGNMENT TYPES =================
 */

export interface ExternalAssignment {
    external_assignment_id: string;
    plan_node_id: string;
    government_structure_id: string;
    role: "owner" | "collaborator";
    created_at: string;
    updated_at: string;
    planNode?: PlanNode;
    governmentStructure?: GovernmentStructure;
}

export interface CreateExternalAssignmentPayload {
    plan_node_id: string;
    government_structure_id: string;
    role?: "owner" | "collaborator";
}

export interface UpdateExternalAssignmentPayload {
    role?: "owner" | "collaborator";
}

/**
 * ================= INTERNAL ASSIGNMENT TYPES =================
 */

export interface InternalAssignment {
    internal_assignment_id: string;
    plan_node_id: string;
    internal_structure_id: string | null;
    user_id: string | null;
    action_id: string;
    created_at: string;
    updated_at: string;
    planNode?: PlanNode;
    action?: PlanAssignmentAction;
    internalStructure?: InternalStructure;
    user?: User;
}

export interface CreateInternalAssignmentPayload {
    plan_node_id: string;
    internal_structure_id?: string | null;
    user_id?: string | null;
    action_id: string;
}

export interface UpdateInternalAssignmentPayload {
    internal_structure_id?: string | null;
    user_id?: string | null;
    action_id?: string;
}

/**
 * ================= ACTION LOG TYPES =================
 */

export interface PlanNodeActionLog {
    action_log_id: string;
    plan_node_id: string;
    action_id: string;
    user_id: string;
    comment: string | null;
    status: "pending" | "submitted" | "approved" | "rejected" | "forwarded";
    created_at: string;
    planNode?: PlanNode;
    action?: PlanAssignmentAction;
    user?: User;
}

export interface CreateActionLogPayload {
    plan_node_id: string;
    action_id: string;
    user_id: string;
    comment?: string | null;
    status?: "pending" | "submitted" | "approved" | "rejected" | "forwarded";
}

export interface UpdateActionLogStatusPayload {
    status: "pending" | "submitted" | "approved" | "rejected" | "forwarded";
    comment?: string | null;
}

export interface GetActionLogsQueryParams {
    status?: "pending" | "submitted" | "approved" | "rejected" | "forwarded";
    action_id?: string;
}

export interface NodeActionSummary {
    action_id: string;
    status: string;
    count: number;
    action?: {
        name: string;
        code: string;
    };
}

// Re-export from governmentStructure if needed
export interface GovernmentStructure {
    government_structure_id: string;
    name: string;
    parent_id: string | null;
    level: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface InternalStructure {
    internal_structure_id: string;
    name: string;
    // Add other fields as needed
}

export interface User {
    user_id: string;
    name: string;
    email: string;
    // Add other fields as needed
}