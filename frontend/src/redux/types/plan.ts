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
    plan_rule_id?: string | null;
    created_at: string;
    updated_at: string;
    governmentStructure?: GovernmentStructure;
    baseVersion?: PlanVersion;
    planRule?: PlanRule;
    planNodes?: PlanNode[];
}

export interface CreatePlanVersionPayload {
    year: number;
    government_structure_id: string;
    based_on_version_id?: string | null;
    plan_rule_id?: string | null;
}

export interface UpdatePlanVersionPayload {
    year?: number;
    version_number?: number;
    status?: "draft" | "active" | "completed";
    government_structure_id?: string;
    based_on_version_id?: string | null;
    plan_rule_id?: string | null;
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

export type AssignmentSharingMode = "exclusive" | "shared";

export interface PlanNode {
    plan_node_id: string;
    plan_version_id: string;
    parent_id: string | null;
    type: "strategic" | "goal" | "kpi" | "task";
    title: string;
    description: string | null;
    weight: number;
    weight_mode: PlanRuleWeightMode | null;
    level: number;
    order: number;
    is_active: boolean;
    assignment_sharing_mode: AssignmentSharingMode;
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
    weight_mode?: PlanRuleWeightMode | null;
    level?: number;
    order?: number;
    assignment_sharing_mode?: AssignmentSharingMode;
}

export interface UpdatePlanNodePayload {
    parent_id?: string | null;
    type?: "strategic" | "goal" | "kpi" | "task";
    title?: string;
    description?: string | null;
    weight?: number;
    weight_mode?: PlanRuleWeightMode | null;
    level?: number;
    order?: number;
    is_active?: boolean;
    assignment_sharing_mode?: AssignmentSharingMode;
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
 * ================= PLAN RULE TYPES =================
 */

export type PlanNodeType = "strategic" | "goal" | "kpi" | "task";
export type PlanRuleWeightMode = "number" | "percentage" | "frequency";

export interface PlanRuleStep {
    plan_rule_step_id: string;
    plan_rule_id: string;
    step_order: number;
    node_type: PlanNodeType;
    label: string;
    requires_weight: boolean;
    inherits_weight_from_level?: number | null;
    created_at: string;
    updated_at: string;
}

export interface PlanRule {
    plan_rule_id: string;
    name: string;
    government_structure_id: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    steps?: PlanRuleStep[];
    governmentStructure?: GovernmentStructure;
}

export interface PlanRuleStepInput {
    step_order: number;
    label: string;
    requires_weight?: boolean;
}

export interface CreatePlanRulePayload {
    name: string;
    government_structure_id?: string | null;
    is_active?: boolean;
    steps: PlanRuleStepInput[];
}

export interface UpdatePlanRulePayload {
    name?: string;
    government_structure_id?: string | null;
    is_active?: boolean;
    steps?: PlanRuleStepInput[];
}

export interface GetPlanRulesQueryParams {
    government_structure_id?: string;
    is_active?: boolean;
}

/**
 * ================= ASSIGNMENT ACTION TYPES =================
 */

export interface PlanAssignmentAction {
    assignment_action_id: string;
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

export interface PlanNodeAssignmentOptionSector {
    government_structure_id: string;
    name: string;
    level: number;
    parent_id: string | null;
}

export interface PlanNodeAssignmentOptionDepartment {
    internal_structure_id: string;
    name: string;
    level: number;
    parent_id: string | null;
    government_structure_id: string;
}

export interface PlanNodeAssignmentOptionUser {
    user_id: string;
    full_name: string;
    email: string;
    government_structure_id: string | null;
    internal_structure_id: string | null;
}

export interface PlanNodeAssignmentParentContext {
    type: "sector" | "department" | "user";
    label?: string;
    government_structure_id?: string | null;
    internal_structure_id?: string;
    user_id?: string;
}

export interface PlanNodeAssignmentBranchOption {
    external_assignment_id?: string;
    internal_assignment_id?: string;
    label?: string;
    type?: "user" | "department" | "sector";
    government_structure_id?: string;
    user_id?: string | null;
    internal_structure_id?: string | null;
}

export interface PlanNodeAssignmentOptions {
    plan_node_id: string;
    level: number;
    assignment_sharing_mode: AssignmentSharingMode;
    assignment_mode: "external" | "internal";
    can_assign: boolean;
    in_user_branch: boolean;
    allow_sector: boolean;
    allow_department: boolean;
    allow_user: boolean;
    requires_branch_selection: boolean;
    parent_branch_options: PlanNodeAssignmentBranchOption[];
    active_assignment_count?: number;
    parent_context: PlanNodeAssignmentParentContext | null;
    sectors: PlanNodeAssignmentOptionSector[];
    departments: PlanNodeAssignmentOptionDepartment[];
    users: PlanNodeAssignmentOptionUser[];
    message: string | null;
}

/**
 * ================= EXTERNAL ASSIGNMENT TYPES =================
 */

export interface ExternalAssignment {
    external_assignment_id: string;
    plan_node_id: string;
    government_structure_id: string;
    is_visible: boolean;
    requires_report: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    planNode?: PlanNode;
    governmentStructure?: GovernmentStructure;
}

export interface CreateExternalAssignmentPayload {
    plan_node_id: string;
    government_structure_id: string;
    is_visible: boolean;
    requires_report: boolean;
}

export interface UpdateExternalAssignmentPayload {
    is_visible?: boolean;
    requires_report?: boolean;
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
    is_active: boolean;
    branch_external_assignment_id?: string | null;
    branch_internal_assignment_id?: string | null;
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
    branch_external_assignment_id?: string | null;
    branch_internal_assignment_id?: string | null;
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