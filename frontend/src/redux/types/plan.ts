/**
 * ================= PLAN VERSION TYPES =================
 */

export type PlanVersionKind = "master" | "annual" | "execution_period";
export type PlanVersionStatus = "draft" | "active" | "completed" | "finalized" | "locked";
export type PlanExecutionStatus = "locked" | "open" | "completed";
export type ExecutionEvaluationStatus =
    | "completed"
    | "in_progress"
    | "not_started"
    | "no_evaluation";
export type PlanAccessRole = "owner" | "participant" | "oversight" | "global";

export type PlanAchievementStatus = "empty" | "submitted" | "approved" | "rejected";
export type PlanReviewStatus = "under_review" | "corrections_unlocked" | "review_completed";
export type PeriodSubdivisionMode = "quarterly" | "semi_annual" | "custom";

export interface PlanVersion {
    plan_version_id: string;
    draft_name: string;
    planning_start_date: string;
    planning_end_date: string;
    start_year: number;
    start_month: number;
    end_year: number;
    end_month: number;
    planning_duration_years: number;
    /** @deprecated Use start_year — kept for backward compatibility */
    year: number;
    version_number: number;
    version_kind: PlanVersionKind;
    parent_plan_version_id: string | null;
    planning_year: number | null;
    sequence_index: number | null;
    period_label: string | null;
    is_locked: boolean;
    finalized_at: string | null;
    annual_targets_finalized_at?: string | null;
    period_subdivision_mode?: PeriodSubdivisionMode | null;
    period_targets_finalized_at?: string | null;
    process_started_at?: string | null;
    review_status?: PlanReviewStatus | null;
    published_for_review_at?: string | null;
    review_unlocked_at?: string | null;
    review_completed_at?: string | null;
    review_snapshot_of_version_id?: string | null;
    review_snapshot_root_id?: string | null;
    active_review_snapshot_id?: string | null;
    review_version_number?: number | null;
    active_review_version_number?: number | null;
    review_round_count?: number | null;
    live_master_version_id?: string | null;
    live_master_version_number?: number | null;
    live_master_draft_name?: string | null;
    active_execution_snapshot_id?: string | null;
    execution_snapshot_of_version_id?: string | null;
    execution_snapshot_root_id?: string | null;
    execution_version_number?: number | null;
    execution_status?: PlanExecutionStatus | null;
    execution_snapshot_plan_version_id?: string | null;
    execution_access?: {
        execution_status: PlanExecutionStatus | null;
        can_view: boolean;
        can_edit_actuals: boolean;
        can_complete: boolean;
        is_locked: boolean;
        planning_mode?: boolean;
    } | null;
    execution_periods_total?: number;
    execution_periods_completed?: number;
    all_execution_periods_completed?: boolean;
    execution_actuals_ready?: boolean;
    execution_actuals_readiness?: {
        required_count: number;
        recorded_count: number;
        approved_count?: number;
        pending_approval_count?: number;
        pending_approval_titles?: string[];
        missing_count?: number;
        ready: boolean;
        missing_titles?: string[];
    };
    execution_has_recorded_actuals?: boolean;
    execution_has_contributing_progress?: boolean;
    execution_progress_percent?: number | null;
    execution_is_evaluable?: boolean;
    execution_evaluation_status?: ExecutionEvaluationStatus | null;
    execution_annual_progress?: Array<{
        plan_version_id: string;
        planning_year: number | null;
        sequence_index: number | null;
        execution_status: PlanExecutionStatus | null;
        execution_progress_percent: number | null;
        is_evaluable?: boolean;
        evaluation_status?: ExecutionEvaluationStatus | null;
        has_contributing_data?: boolean;
    }>;
    active_planning_year?: number | null;
    active_annual_plan_version_id?: string | null;
    execution_period_progress?: Array<{
        plan_version_id: string;
        period_label: string | null;
        sequence_index: number | null;
        execution_status: PlanExecutionStatus | null;
        execution_progress_percent: number | null;
        is_evaluable?: boolean;
        evaluation_status?: ExecutionEvaluationStatus | null;
        has_contributing_data?: boolean;
    }>;
    status: PlanVersionStatus;
    government_structure_id: string;
    based_on_version_id: string | null;
    plan_rule_id?: string | null;
    access_role?: PlanAccessRole;
    tree_access_mode?: "full" | "sector" | "direct" | "participant" | "none";
    created_at: string;
    updated_at: string;
    governmentStructure?: GovernmentStructure;
    baseVersion?: PlanVersion;
    parentPlanVersion?: PlanVersion;
    annualVersions?: PlanVersion[];
    executionPeriodVersions?: PlanVersion[];
    planRule?: PlanRule;
    planNodes?: PlanNode[];
}

export interface CreatePlanVersionPayload {
    draft_name: string;
    planning_start_date: string;
    planning_duration_years: number;
    government_structure_id: string;
    based_on_version_id?: string | null;
    plan_rule_id?: string | null;
}

export interface DuplicatePlanDraftPayload {
    draft_name?: string;
}

export interface UpdatePlanVersionPayload {
    draft_name?: string;
    planning_start_date?: string;
    planning_duration_years?: number;
    year?: number;
    version_number?: number;
    status?: "draft" | "active" | "completed";
    government_structure_id?: string;
    based_on_version_id?: string | null;
    plan_rule_id?: string | null;
}

export interface UpdatePlanVersionStatusPayload {
    status: PlanVersionStatus;
}

export interface FinalizationReadiness {
    ready: boolean;
    errors: string[];
    planning_years: number[];
}

export interface AnnualExecutionReadiness {
    ready: boolean;
    errors: string[];
    planning_years: number[];
    annual_targets_finalized_at: string | null;
}

export interface ExecutionPeriodFinalizationReadiness {
    ready: boolean;
    errors: string[];
    period_subdivision_mode: PeriodSubdivisionMode | null;
    period_targets_finalized_at: string | null;
}

export interface GlobalPeriodTargetFinalizationReadiness {
    ready: boolean;
    errors: string[];
    period_subdivision_mode: PeriodSubdivisionMode | null;
    period_targets_finalized_at: string | null;
    planning_years: number[];
}

export interface StartProcessReadiness {
    ready: boolean;
    errors: string[];
    process_started_at: string | null;
    period_targets_finalized_at: string | null;
}

export interface PlanReviewReadiness {
    ready: boolean;
    errors: string[];
    review_status?: PlanReviewStatus | null;
    issue_count?: number;
}

export interface PlanReviewDashboardResponse {
    stats: import("./issue").IssueDashboardStats;
    issues: import("./issue").Issue[];
    scope?: "all" | "own";
}

export interface PeriodTargetAllocation {
    plan_node_id: string;
    source_plan_node_id: string;
    annual_target: number;
    allocated_other_periods: number;
    current_period_value: number;
    allocated_total: number;
    remaining_for_this_period: number;
    remaining_overall: number;
}

export interface AnnualTargetAllocation {
    plan_node_id: string;
    source_plan_node_id: string;
    draft_target: number;
    allocated_other_years: number;
    current_year_value: number;
    allocated_total: number;
    remaining_for_this_year: number;
    remaining_overall: number;
}

export interface AnnualVersionsResponse {
    master: PlanVersion;
    annualVersions: PlanVersion[];
    executionSnapshot?: {
        snapshot_root_id: string;
        execution_version_number: number | null;
        snapshot_master_plan_version_id?: string;
    } | null;
}

export interface ExecutionPeriodsResponse {
    annual: PlanVersion;
    executionPeriods: PlanVersion[];
    executionSnapshot?: {
        snapshot_root_id: string;
        execution_version_number: number | null;
    } | null;
}

export interface PlanAchievementWorkflowScope {
    master_version_id: string | null;
    plan_version_id: string;
    executor_node_ids: string[];
    approver_node_ids: string[];
}

export interface PlanExecutionAccessResponse {
    found: boolean;
    is_execution_snapshot?: boolean;
    live_plan_version_id?: string;
    snapshot_plan_version_id?: string | null;
    access?: PlanVersion["execution_access"];
}

export interface GetPlanVersionsQueryParams {
    year?: number;
    government_structure_id?: string;
    status?: PlanVersionStatus;
    version_kind?: PlanVersionKind;
    parent_plan_version_id?: string;
    search?: string;
    /** Lite list payload for tables and dropdowns (default: full). */
    view?: "summary" | "full";
}

/**
 * ================= PLAN NODE TYPES =================
 */

export type AssignmentSharingMode = "exclusive" | "shared";

export type PlanAssignmentContextType = "sector" | "user" | "department" | "role" | "permission_group";

export interface PlanNodeAssignmentContextEntry {
    rootSectorId: string | null;
    assignmentType: PlanAssignmentContextType;
    assignmentTargetId: string;
    scopeType: "sector" | "department_subtree" | null;
    scopeReferenceId: string | null;
    label: string | null;
    externalAssignmentId?: string;
    internalAssignmentId?: string;
    branchExternalAssignmentId?: string | null;
    branchInternalAssignmentId?: string | null;
}

export interface PlanNodeAssignmentContext {
    entries: PlanNodeAssignmentContextEntry[];
}

export interface PlanNode {
    plan_node_id: string;
    plan_version_id: string;
    parent_id: string | null;
    type: "strategic" | "goal" | "kpi" | "task";
    title: string;
    description: string | null;
    weight: number;
    weight_mode: PlanRuleWeightMode | null;
    target_unit?: string | null;
    level: number;
    order: number;
    is_active: boolean;
    assignment_sharing_mode: AssignmentSharingMode;
    assignment_context?: PlanNodeAssignmentContext | null;
    source_plan_node_id?: string | null;
    annual_target?: number | null;
    period_target?: number | null;
    period_actual?: number | null;
    period_actual_override?: boolean;
    period_actual_status?: PlanAchievementStatus;
    period_actual_submitted_at?: string | null;
    period_actual_submitted_by?: string | null;
    period_actual_approved_at?: string | null;
    period_actual_approved_by?: string | null;
    period_actual_rejection_comment?: string | null;
    periodActualSubmittedBy?: User;
    periodActualApprovedBy?: User;
    execution_progress_percent?: number | null;
    computed_period_actual?: number | null;
    computed_period_target?: number | null;
    is_evaluable?: boolean;
    evaluation_status?: ExecutionEvaluationStatus | null;
    has_contributing_data?: boolean;
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
    target_unit?: string | null;
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
    target_unit?: string | null;
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
    color_hex?: string | null;
    inherits_weight_from_level?: number | null;
    created_at: string;
    updated_at: string;
}

export interface PlanRule {
    plan_rule_id: string;
    name: string;
    government_structure_id: string | null;
    inherit_to_descendants?: boolean;
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
    color_hex?: string;
}

export interface CreatePlanRulePayload {
    name: string;
    government_structure_id?: string | null;
    inherit_to_descendants?: boolean;
    is_active?: boolean;
    steps: PlanRuleStepInput[];
}

export interface UpdatePlanRulePayload {
    name?: string;
    government_structure_id?: string | null;
    inherit_to_descendants?: boolean;
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

export interface PlanNodeAssignmentOptionRole {
    role_id: string;
    name: string;
    scope: string;
    government_structure_id: string | null;
}

export interface PlanNodeAssignmentOptionPermissionGroup {
    permission_group_id: string;
    name: string;
    description?: string | null;
    structure_names?: string[];
}

export interface PlanNodeAssignmentParentContext {
    type: "sector" | "department" | "user" | "role" | "permission_group";
    label?: string;
    government_structure_id?: string | null;
    internal_structure_id?: string;
    user_id?: string;
    role_id?: string;
    permission_group_id?: string;
}

export interface PlanNodeAssignmentBranchOption {
    external_assignment_id?: string;
    internal_assignment_id?: string;
    label?: string;
    type?: "user" | "department" | "sector" | "role" | "permission_group";
    government_structure_id?: string;
    user_id?: string | null;
    internal_structure_id?: string | null;
    role_id?: string | null;
    permission_group_id?: string | null;
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
    allow_role: boolean;
    requires_branch_selection: boolean;
    supports_branch_selection: boolean;
    allow_propagate_all_branches: boolean;
    branch_assignment_mode: "auto" | "controlled";
    parent_is_shared: boolean;
    active_parent_branch_count?: number;
    parent_branch_options: PlanNodeAssignmentBranchOption[];
    active_assignment_count?: number;
    parent_context: PlanNodeAssignmentParentContext | null;
    sectors: PlanNodeAssignmentOptionSector[];
    departments: PlanNodeAssignmentOptionDepartment[];
    users: PlanNodeAssignmentOptionUser[];
    roles: PlanNodeAssignmentOptionRole[];
    permission_groups: PlanNodeAssignmentOptionPermissionGroup[];
    scope_type: "sector" | "department_subtree" | null;
    scope_reference_id: string | null;
    scope_label: string | null;
    root_sector_id: string | null;
    message: string | null;
}

export interface PlanNodeAssignmentScope {
    plan_node_id: string;
    level: number;
    mode: "external" | "internal";
    can_assign: boolean;
    root_sector_id: string | null;
    scope_type: "sector" | "department_subtree" | null;
    scope_reference_id: string | null;
    parent_assignment: PlanNodeAssignmentParentContext | null;
    allow_sector: boolean;
    allow_user: boolean;
    allow_department: boolean;
    allow_role: boolean;
    scope_label: string | null;
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
    role_id: string | null;
    permission_group_id: string | null;
    action_id?: string | null;
    is_active: boolean;
    branch_external_assignment_id?: string | null;
    branch_internal_assignment_id?: string | null;
    branch_label?: string | null;
    created_at: string;
    updated_at: string;
    planNode?: PlanNode;
    action?: PlanAssignmentAction;
    internalStructure?: InternalStructure;
    user?: User;
    role?: Role;
    permissionGroup?: {
        permission_group_id: string;
        name: string;
        description?: string | null;
    };
}

export interface CreateInternalAssignmentPayload {
    plan_node_id: string;
    internal_structure_id?: string | null;
    user_id?: string | null;
    role_id?: string | null;
    permission_group_id?: string | null;
    branch_external_assignment_id?: string | null;
    branch_internal_assignment_id?: string | null;
    propagate_all_branches?: boolean;
}

export interface UpdateInternalAssignmentPayload {
    internal_structure_id?: string | null;
    user_id?: string | null;
    role_id?: string | null;
    permission_group_id?: string | null;
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
    full_name: string;
    name?: string;
    email: string;
    // Add other fields as needed
}

export interface Role {
    role_id: string;
    name: string;
}