export type PlanSharingMode = "shared" | "exclusive" | "all";
export type PlanStatus = "active" | "completed" | "delayed" | "all";
export type PlanPriority = "high" | "medium" | "low" | "all";
export type PerformanceLevel = "excellent" | "good" | "average" | "at-risk";

export type DashboardSectionId =
  | "overview"
  | "structure"
  | "department"
  | "user"
  | "progress"
  | "sharing"
  | "reports";

export interface DashboardDepartment {
  id: string;
  name: string;
  structureId: string;
  planCount: number;
  assignedNodeCount: number;
  reportedNodeCount: number;
  progress: number;
  has_progress: boolean;
  status: Exclude<PlanStatus, "all">;
  userIds: string[];
}

export interface DashboardUser {
  id: string;
  name: string;
  role: string;
  departmentId?: string | null;
  structureId?: string | null;
  assignedNodeCount: number;
  reportedNodeCount: number;
  achievementPercent: number | null;
  has_progress: boolean;
  performance: PerformanceLevel;
  /** @deprecated Use achievementPercent */
  activityScore: number;
}

export interface DashboardStructure {
  id: string;
  name: string;
  code: string;
  totalPlans: number;
  completionPercent: number;
  activeDepartments: number;
  performance: PerformanceLevel;
  departmentIds: string[];
}

export interface DashboardProgressNode {
  id: string;
  title: string;
  sharingMode: "shared" | "exclusive";
  progress: number;
  has_progress?: boolean;
  status: Exclude<PlanStatus, "all">;
  children?: DashboardProgressNode[];
}

export interface DashboardPlanRow {
  plan_version_id: string;
  draft_name: string;
  status: string;
  government_structure_id: string;
  government_structure_name: string | null;
  government_structure_code: string | null;
  process_started_at: string | null;
  execution_progress_percent: number | null;
  is_evaluable?: boolean;
  evaluation_status?: string | null;
  has_contributing_data?: boolean;
  active_planning_year?: number | null;
  dashboard_status: Exclude<PlanStatus, "all">;
  start_year: number;
  end_year: number;
  created_at: string;
}

export interface DashboardKpiSummary {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  inExecutionPlans: number;
  sharedPlans: number;
  exclusivePlans: number;
  averageProgress: number | null;
}

export interface DashboardSharingPlan {
  id: string;
  plan_version_id?: string;
  title: string;
  progress: number;
  status: Exclude<PlanStatus, "all">;
  branches?: number;
  target?: string;
  structure_name?: string | null;
}

export type DashboardPeriodPhase = "active" | "past" | "upcoming";

export interface DashboardAvailablePeriod {
  plan_version_id: string;
  period_label: string | null;
  planning_year: number | null;
  sequence_index: number | null;
  execution_status: string | null;
  phase: DashboardPeriodPhase;
}

export interface PlanExecutionDashboardResponse {
  kpi: DashboardKpiSummary;
  plans: DashboardPlanRow[];
  structures: DashboardStructure[];
  departments: DashboardDepartment[];
  users: DashboardUser[];
  annual_timeline: Array<{
    label: string;
    average_percent: number;
    plan_count: number;
  }>;
  sharing: {
    shared: DashboardSharingPlan[];
    exclusive: DashboardSharingPlan[];
  };
  progress_tree: {
    period_label: string | null;
    planning_year: number | null;
    period_version_id: string | null;
    period_phase: DashboardPeriodPhase | null;
    available_periods: DashboardAvailablePeriod[];
    nodes: DashboardProgressNode[];
  };
  focus_master_plan_version_id: string | null;
  generated_at: string;
}

export interface DashboardFilters {
  structureId: string;
  departmentId: string;
  userId: string;
  sharingMode: PlanSharingMode;
  status: PlanStatus;
  priority: PlanPriority;
  dateFrom: string;
  dateTo: string;
  masterPlanVersionId: string;
  /** "auto" = backend picks active (open) period */
  periodVersionId: string;
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  structureId: "all",
  departmentId: "all",
  userId: "all",
  sharingMode: "all",
  status: "all",
  priority: "all",
  dateFrom: "",
  dateTo: "",
  masterPlanVersionId: "auto",
  periodVersionId: "auto",
};

export interface PlanDashboardData {
  kpi: DashboardKpiSummary;
  plans: DashboardPlanRow[];
  structures: DashboardStructure[];
  departments: DashboardDepartment[];
  users: DashboardUser[];
  planTree: DashboardProgressNode[];
  progressMeta: {
    period_label: string | null;
    planning_year: number | null;
    period_version_id: string | null;
    period_phase: DashboardPeriodPhase | null;
    available_periods: DashboardAvailablePeriod[];
    focus_master_plan_version_id: string | null;
  };
  annualTimeline: PlanExecutionDashboardResponse["annual_timeline"];
  sharing: PlanExecutionDashboardResponse["sharing"];
  generatedAt: string | null;
  isLoading: boolean;
  error: string | null;
  isFetching: boolean;
}

/** @deprecated Use DashboardStructure */
export type MockStructure = DashboardStructure;
/** @deprecated Use DashboardDepartment */
export type MockDepartment = DashboardDepartment;
/** @deprecated Use DashboardUser */
export type MockUser = DashboardUser;
/** @deprecated Use DashboardProgressNode */
export type MockPlanNode = DashboardProgressNode;
