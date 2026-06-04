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

export interface MockDepartment {
  id: string;
  name: string;
  structureId: string;
  planCount: number;
  progress: number;
  status: Exclude<PlanStatus, "all">;
  userIds: string[];
}

export interface MockUser {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  structureId: string;
  performance: PerformanceLevel;
  activityScore: number;
}

export interface MockStructure {
  id: string;
  name: string;
  code: string;
  totalPlans: number;
  completionPercent: number;
  activeDepartments: number;
  performance: PerformanceLevel;
  departmentIds: string[];
  userIds: string[];
}

export interface MockPlanNode {
  id: string;
  title: string;
  sharingMode: "shared" | "exclusive";
  progress: number;
  status: Exclude<PlanStatus, "all">;
  children?: MockPlanNode[];
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
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  structureId: "all",
  departmentId: "all",
  userId: "all",
  sharingMode: "all",
  status: "all",
  priority: "all",
  dateFrom: "2026-01-01",
  dateTo: "2026-12-31",
};

/** Hook return shape for future API integration */
export interface PlanDashboardData {
  structures: MockStructure[];
  departments: MockDepartment[];
  users: MockUser[];
  planTree: MockPlanNode[];
  isLoading: boolean;
  error: null;
}
