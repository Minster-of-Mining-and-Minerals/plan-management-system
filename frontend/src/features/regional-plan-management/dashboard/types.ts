import type {
  RegionalDashboardKpiSummary,
  RegionalDashboardPlanRow,
  RegionalDashboardDepartment,
  RegionalDashboardUser,
  RegionalDashboardProgressNode,
  RegionalDashboardAvailablePeriod,
  RegionalHierarchyStepConfig,
  RegionalExecutionDashboardSummary,
} from "@/redux/types/regionalPlan";

export type RegionalDashboardSectionId =
  | "overview"
  | "hierarchy"
  | "directorates"
  | "assignees"
  | "tree"
  | "sharing"
  | "reports";

export interface RegionalDashboardFilters {
  status: string;
  sharingMode: string;
  planSearch: string;
  masterPlanVersionId: string;
  periodVersionId: string;
  selectedHierarchyLevel: number | "all";
  selectedPathByLevel: Record<number, string>;
  departmentId: string;
  userId: string;
}

export const DEFAULT_REGIONAL_DASHBOARD_FILTERS: RegionalDashboardFilters = {
  status: "all",
  sharingMode: "all",
  planSearch: "",
  masterPlanVersionId: "auto",
  periodVersionId: "auto",
  selectedHierarchyLevel: "all",
  selectedPathByLevel: {},
  departmentId: "all",
  userId: "all",
};

export interface RegionalPlanDashboardState {
  filters: RegionalDashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<RegionalDashboardFilters>>;
  updateFilter: <K extends keyof RegionalDashboardFilters>(key: K, value: RegionalDashboardFilters[K]) => void;
  resetFilters: () => void;
  activeSection: RegionalDashboardSectionId;
  setActiveSection: (section: RegionalDashboardSectionId) => void;
  regionId: string;
  
  // Data
  summaryData: RegionalExecutionDashboardSummary | undefined;
  kpi: RegionalDashboardKpiSummary;
  plans: RegionalDashboardPlanRow[];
  departments: RegionalDashboardDepartment[];
  users: RegionalDashboardUser[];
  treeNodes: RegionalDashboardProgressNode[];
  availablePeriods: RegionalDashboardAvailablePeriod[];
  currentPeriodLabel: string | null;
  currentPeriodPhase: "active" | "past" | "upcoming" | null;
  currentPlanningYear: number | null;
  hierarchyConfig: RegionalHierarchyStepConfig[];
  annualTimeline: Array<{ label: string; average_percent: number; plan_count: number }>;
  performanceDistribution: { excellent: number; good: number; average: number; at_risk: number };
  statusDistribution: { active: number; completed: number; delayed: number; draft: number };
  sharing: {
    shared: Array<{ id: string; plan_version_id?: string; title: string; progress: number; status: string; branches?: number }>;
    exclusive: Array<{ id: string; plan_version_id?: string; title: string; progress: number; status: string; target?: string }>;
  };
  
  // Filtered projections
  filteredDepartments: RegionalDashboardDepartment[];
  filteredUsers: RegionalDashboardUser[];
  filteredTreeNodes: RegionalDashboardProgressNode[];
  levelNodeOptions: Record<number, Array<{ id: string; title: string; progress: number }>>;
  
  // Loading & Error States
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

