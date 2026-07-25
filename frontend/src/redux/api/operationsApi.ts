import { baseApi } from "../baseApi";

export type HospitalKPIs = {
  active_encounters: number;
  waiting_patients: number;
  active_clinical_orders: number;
  completed_clinical_orders: number;
  cancelled_clinical_orders: number;
  orders_by_domain: Record<string, number>;
  average_completion_time_minutes: number;
  active_providers_count: number;
  todays_appointments: number;
  todays_admissions: number;
  pending_followups: number;
  high_risk_patients_count: number;
  sla_warning_count: number;
  sla_breach_count: number;
  sla_compliance_percentage: number;
  completion_percentage: number;
  cancellation_percentage: number;
  high_priority_completion_percentage: number;
  patient_throughput: number;
  clinical_orders_per_hour: number;
  clinical_orders_per_day: number;
};

export type DepartmentKPIs = {
  department: string;
  current_workload: number;
  pending_queue: number;
  completed_today: number;
  average_turnaround_minutes: number;
  sla_warning_count: number;
  sla_breach_count: number;
  staff_count: number;
  current_staff_utilization_pct: number;
};

export type QueueMetrics = {
  current_size: number;
  average_waiting_time_minutes: number;
  oldest_order: {
    clinical_order_id: string;
    order_type: string;
    priority: string;
    created_at: string;
    elapsed_minutes: number;
  } | null;
  average_completion_minutes: number;
  current_processors_count: number;
  estimated_completion_minutes: number;
};

export type EnterpriseQueuesOverview = {
  hospital_queue: QueueMetrics;
  department_queues: Record<string, QueueMetrics>;
  stat_queue: QueueMetrics;
  overdue_queue: QueueMetrics;
};

export type OperationsFeedItem = {
  id: string;
  event_type: string;
  title: string;
  description: string;
  domain: string;
  timestamp: string;
  severity: "INFO" | "MEDIUM" | "HIGH";
};

export type ProviderWorkload = {
  provider_id: string;
  total_assigned_orders: number;
  pending_workload: number;
  completed_workload: number;
  stat_workload: number;
  capacity_status: "NORMAL" | "HIGH" | "OVERLOADED";
};

export type ExecutiveSummary = {
  hospital_overview: {
    active_encounters: number;
    total_active_orders: number;
    todays_completed_orders: number;
    high_risk_patients: number;
  };
  todays_workload: {
    total_orders: number;
    orders_per_hour: number;
    throughput: number;
  };
  critical_alerts: {
    sla_breaches: number;
    sla_warnings: number;
    stat_orders_pending: number;
  };
  sla_health: {
    sla_compliance_percentage: number;
    average_completion_time_minutes: number;
  };
  department_ranking: Array<{ department: string; workload: number; sla_breaches: number }>;
  operational_score: number;
};

export type HospitalTimelineItem = {
  id: string;
  timestamp: string;
  formatted_time: string;
  title: string;
  domain: string;
  category: string;
  order_id: string;
  patient_id?: string;
  status: string;
};

export const operationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOperationsDashboard: builder.query<{ queue: any[]; analytics: HospitalKPIs }, void>({
      query: () => "/operations/dashboard",
      providesTags: ["ClinicalOrder"],
    }),
    getDepartmentDashboard: builder.query<{ departmentId: string; queue: any[]; analytics: DepartmentKPIs }, string>({
      query: (departmentId) => `/operations/department/${departmentId}`,
      providesTags: ["ClinicalOrder"],
    }),
    getHospitalQueue: builder.query<EnterpriseQueuesOverview, void>({
      query: () => "/operations/queue",
      providesTags: ["ClinicalOrder"],
    }),
    getOperationsFeed: builder.query<OperationsFeedItem[], { limit?: number } | void>({
      query: (arg) => `/operations/feed${arg?.limit ? `?limit=${arg.limit}` : ""}`,
      providesTags: ["ClinicalOrder"],
    }),
    getProviderWorkload: builder.query<ProviderWorkload, string>({
      query: (providerId) => `/operations/provider/${providerId}/workload`,
      providesTags: ["ClinicalOrder"],
    }),
    getWorkloadDistribution: builder.query<any, void>({
      query: () => "/operations/workload",
      providesTags: ["ClinicalOrder"],
    }),
    getExecutiveSummary: builder.query<ExecutiveSummary, void>({
      query: () => "/operations/executive-summary",
      providesTags: ["ClinicalOrder"],
    }),
    getHospitalTimeline: builder.query<HospitalTimelineItem[], { limit?: number } | void>({
      query: (arg) => `/operations/timeline${arg?.limit ? `?limit=${arg.limit}` : ""}`,
      providesTags: ["ClinicalOrder"],
    }),
  }),
});

export const {
  useGetOperationsDashboardQuery,
  useGetDepartmentDashboardQuery,
  useGetHospitalQueueQuery,
  useGetOperationsFeedQuery,
  useGetProviderWorkloadQuery,
  useGetWorkloadDistributionQuery,
  useGetExecutiveSummaryQuery,
  useGetHospitalTimelineQuery,
} = operationsApi;
