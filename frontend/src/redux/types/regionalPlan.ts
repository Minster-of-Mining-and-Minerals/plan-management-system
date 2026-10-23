export interface RegionalPlanRuleStep {
  regional_plan_rule_step_id: string;
  regional_plan_rule_id: string;
  level: number;
  name: string;
  requires_weight: boolean;
  requires_contribution_weight: boolean;
  allow_kpi: boolean;
}

export interface RegionalPlanRule {
  regional_plan_rule_id: string;
  region_id: string;
  name: string;
  is_active: boolean;
  performance_scoring_policy: "CAP_100" | "ALLOW_OVER_ACHIEVEMENT";
  steps?: RegionalPlanRuleStep[];
  created_at?: string;
  updated_at?: string;
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
  target_units: string[];
  breakdown_mode: "quarterly" | "monthly" | "semi_annual" | "custom";
  custom_periods: Array<{ label: string; start_month?: number; end_month?: number }>;
  created_at?: string;
  updated_at?: string;
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
  weight_mode?: string;
  contribution_weight?: number | null;
  target_unit?: string | null;
  target_allocation_mode?: string;
  achievement_mode?: string;
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
    department?: { regional_structure_id: string; name: string };
    assignedUser?: { user_id: string; full_name: string; email: string };
  }>;
  children?: RegionalPlanNode[];
}

export interface RegionalPlanVersion {
  regional_plan_version_id: string;
  region_id: string;
  parent_plan_version_id?: string | null;
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
  is_locked: boolean;
  finalized_at?: string | null;
  annual_targets_finalized_at?: string | null;
  period_targets_finalized_at?: string | null;
  process_started_at?: string | null;
  execution_status?: string | null;
  review_status?: string | null;
  planRule?: RegionalPlanRule;
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
