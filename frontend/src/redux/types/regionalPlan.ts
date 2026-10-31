export interface RegionalPlanRuleStep {
  regional_plan_rule_step_id: string;
  regional_plan_rule_id: string;
  level: number;
  name: string;
  step_order?: number;
  label?: string;
  node_type?: string;
  requires_weight: boolean;
  requires_contribution_weight: boolean;
  allow_kpi: boolean;
  color_hex?: string;
  inherits_weight_from_level?: number | null;
}

export interface RegionalPerformanceColorThreshold {
  regional_performance_color_threshold_id: string;
  region_id: string;
  label: string;
  min_percentage: number;
  max_percentage: number;
  color_hex: string;
  is_active: boolean;
  description?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface RegionalPlanRule {
  regional_plan_rule_id: string;
  region_id: string;
  name: string;
  is_active: boolean;
  performance_scoring_policy: "CAP_100" | "ALLOW_OVER_ACHIEVEMENT";
  amendment_policy?: {
    allow_kpi_target_amendment?: boolean;
    allow_kpi_weight_amendment?: boolean;
    require_approval?: boolean;
    completed_periods_editable?: boolean;
    automatic_redistribution?: string;
    allow_emergency_approvals?: boolean;
    allow_structural_amendments_after_execution?: boolean;
    allow_ownership_transfer?: boolean;
  };
  steps?: Array<Partial<RegionalPlanRuleStep> & Record<string, any>>;
  owned_by_plan_version_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RegionalTargetUnit {
  id: string;
  label: string;
  symbol?: string;
}

export interface RegionalPlanningConfiguration {
  regional_planning_config_id: string;
  region_id: string;
  min_duration_years: number;
  max_duration_years: number;
  draft_entity_label_singular: string;
  draft_entity_label_plural: string;
  create_action_label: string;
  planning_period_label: string;
  duration_label: string;
  start_year_label: string;
  end_year_label: string;
  target_units: Array<string | RegionalTargetUnit>;
  breakdown_mode: "quarterly" | "monthly" | "semi_annual" | "custom";
  custom_periods: Array<{ label: string; start_month?: number; end_month?: number }>;
  owned_by_plan_version_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RegionalPlanReviewDashboard {
  version: RegionalPlanVersion;
  stats: {
    total: number;
    submitted: number;
    under_review: number;
    accepted: number;
    rejected: number;
    resolved: number;
  };
  issues: Array<Record<string, unknown>>;
}

export interface RegionalPlanNode {
  regional_plan_node_id: string;
  regional_plan_version_id: string;
  parent_id?: string | null;
  source_regional_plan_node_id?: string | null;
  type: string;
  title: string;
  description?: string | null;
  weight: number;
  weight_mode?: string | null;
  contribution_weight?: number | null;
  target_unit?: string | null;
  target_allocation_mode?: string;
  achievement_mode?: string;
  regional_structure_id?: string | null;
  assigned_user_id?: string | null;
  assignment_sharing_mode?: string | null;
  level: number;
  order: number;
  is_active: boolean;
  annual_target?: number | null;
  annual_actual?: number | null;
  annual_actual_status?: "empty" | "submitted" | "approved" | "validated" | "rejected";
  period_target?: number | null;
  period_actual?: number | null;
  period_actual_status?: "empty" | "submitted" | "approved" | "validated" | "rejected";
  period_actual_submitted_at?: string | null;
  period_actual_approved_at?: string | null;
  period_actual_validated_at?: string | null;
  period_actual_rejection_comment?: string | null;
  narration?: string | null;
  evidence_attachment_ids?: string[];
  execution_progress_percent?: number | null;
  evaluation_status?: "not_started" | "in_progress" | "completed";
  internalAssignments?: Array<{
    regional_internal_assignment_id: string;
    regional_structure_id?: string;
    assigned_user_id?: string | null;
    is_active?: boolean;
    department?: { regional_structure_id: string; name: string };
    assignedUser?: { user_id: string; full_name: string; email: string };
  }>;
  parent?: RegionalPlanNode | null;
  children?: RegionalPlanNode[];
}

export interface RegionalPlanVersion {
  regional_plan_version_id: string;
  region_id: string;
  region?: { region_id: string; name: string; code?: string };
  parent_plan_version_id?: string | null;
  parentPlanVersion?: RegionalPlanVersion | null;
  based_on_version_id?: string | null;
  regional_plan_rule_id?: string | null;
  regional_planning_config_id?: string | null;
  draft_name: string;
  version_kind: "master" | "annual" | "execution_period";
  status: "draft" | "finalized" | "active" | "completed" | "locked";
  version_number: number;
  planning_year?: number | null;
  sequence_index?: number | null;
  period_label?: string | null;
  period_subdivision_mode?: string | null;
  start_year: number;
  end_year: number;
  start_month: number;
  end_month: number;
  planning_duration_years: number;
  planning_start_date?: string;
  planning_end_date?: string;
  is_locked: boolean;
  finalized_at?: string | null;
  annual_targets_finalized_at?: string | null;
  period_targets_finalized_at?: string | null;
  process_started_at?: string | null;
  published_for_review_at?: string | null;
  review_completed_at?: string | null;
  execution_status?: string | null;
  review_status?: string | null;
  planRule?: RegionalPlanRule;
  planningConfiguration?: RegionalPlanningConfiguration;
  ownedPlanRule?: RegionalPlanRule;
  ownedPlanningConfiguration?: RegionalPlanningConfiguration;
  annualVersions?: RegionalPlanVersion[];
  executionPeriodVersions?: RegionalPlanVersion[];
  created_at?: string;
  updated_at?: string;
}

export interface RegionalExecutionDashboardSummary {
  region_id: string;
  total_plans?: number;
  active_plans?: number;
  portfolio_progress_percent?: number;
  active_milestones?: number;
  delayed_kpis?: number;
  summary: {
    total_plans: number;
    avg_progress: number;
    active_milestones: number;
    delayed_kpis: number;
    status_breakdown: {
      total_plans: number;
      draft_plans: number;
      finalized_plans: number;
      active_plans: number;
      completed_plans: number;
    };
  };
  plans: Array<{
    regional_plan_version_id: string;
    draft_name: string;
    status: string;
    start_year: number;
    end_year: number;
    created_at: string;
  }>;
}
