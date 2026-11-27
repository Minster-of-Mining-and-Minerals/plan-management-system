import type { CalendarSystem } from "@/utils/calendarUtils";

export type ShortTermFrequency = "monthly" | "weekly" | "daily";
export type ShortTermSubmissionType = "narrative_only" | "actual_and_narrative";

export interface ShortTermPlan {
  short_term_plan_id: string;
  title: string;
  description?: string | null;
  government_structure_id?: string | null;
  calendar_system: CalendarSystem;
  start_date: string;
  end_date: string;
  duration_months: number;
  default_frequency: ShortTermFrequency;
  status: string;
  sector?: { government_structure_id: string; name: string } | null;
  stats?: {
    kpi_count: number;
    assignment_count: number;
    total_reports: number;
    numeric_reports: number;
    narrative_only_reports: number;
    avg_achievement_percent: number;
  };
  kpis?: ShortTermKpi[];
}

export interface ShortTermDivision {
  period_index: number;
  period_label: string;
  parent_month_label?: string;
  start_date: string;
  end_date: string;
  display_start_date: string;
  display_end_date: string;
  calendar_system: CalendarSystem;
  planned_target: number | null;
  recommended_submission_type: ShortTermSubmissionType;
  report?: {
    report_id: string;
    submission_type: ShortTermSubmissionType;
    planned_target: number | null;
    reported_actual: number | null;
    achievement_percent: number | null;
    narrative?: string | null;
    submitted_at: string;
    review_status: string;
    submittedByUser?: { user_id: string; full_name: string; email: string } | null;
  } | null;
}

export interface ShortTermKpiAssignment {
  assignment_id: string;
  short_term_kpi_id: string;
  government_structure_id: string;
  internal_structure_id?: string | null;
  assigned_user_id?: string | null;
  assignee_label?: string | null;
  allocated_target?: number | null;
  period_targets: Record<string, number | string>;
  reporting_frequency_override?: ShortTermFrequency | null;
  effective_frequency?: ShortTermFrequency;
  sector?: { government_structure_id: string; name: string } | null;
  department?: { internal_structure_id: string; name: string } | null;
  assignedUser?: { user_id: string; full_name: string; email: string } | null;
  divisions?: ShortTermDivision[];
  progress_summary?: {
    total_divisions: number;
    reported_count: number;
    numeric_reports_count: number;
    narrative_only_count: number;
    allocated_target: number | null;
    overall_actual: number | null;
    overall_achievement_percent: number | null;
  };
}

export interface ShortTermKpi {
  short_term_kpi_id: string;
  short_term_plan_id: string;
  code: string;
  title: string;
  unit: string;
  total_target: number | null;
  target_mode: "cumulative" | "milestone" | "continuous";
  reporting_frequency: ShortTermFrequency;
  requires_numeric: boolean;
  requires_narrative: boolean;
  allow_narrative_only_updates: boolean;
  order_index: number;
  assignments?: ShortTermKpiAssignment[];
}
