import { baseApi } from "../baseApi";

export type DashboardSummary = {
  total_users: number;
  total_patients: number;
  new_patients_today: number;
  new_patients_this_month: number;
  active_patients: number;
  no_show_count?: number;
  no_show_rate_pct?: number;
  active_departments: number;
  active_staff: number;
  total_encounters: number;
  appointments_today: number;
  completed_encounters_today: number;
  active_encounters_today: number;
  cancelled_encounters_today: number;
  avg_encounter_duration_minutes?: number;
  avg_waiting_time_minutes?: number;
  diagnoses_recorded_today: number;
  clinical_orders_total: number;
  clinical_orders_completed: number;
  clinical_orders_pending: number;
  avg_order_turnaround_minutes?: number;
  payments_today_count: number;
  payments_today_amount: number;
  open_cashier_sessions: number;
  kpi_metrics?: {
    patients?: { current: number; prev: number; pct_change: number; direction: string; sparkline: Array<{ day: string; value: number }> };
    encounters?: { current: number; prev: number; pct_change: number; direction: string; sparkline: Array<{ day: string; value: number }> };
    orders?: { current: number; prev: number; pct_change: number; direction: string; sparkline: Array<{ day: string; value: number }> };
    financial?: { current: number; prev: number; pct_change: number; direction: string; sparkline: Array<{ day: string; value: number }> };
  };
  trends?: {
    encounters_pct: number;
    revenue_pct: number;
    patients_pct?: number;
    orders_pct?: number;
  };
};

export type ExecutiveOverviewResponse = {
  success: boolean;
  message?: string;
  data: {
    period: string;
    start: string;
    end: string;
    summary: DashboardSummary;
    generated_at: string;
  };
};

export type PipelineStage = {
  id: string;
  name: string;
  count: number;
  avg_wait_min: number;
  bottleneck: boolean;
  sla_status: string;
  longest_wait_patient: string;
};

export type EncounterPipelineResponse = {
  success: boolean;
  data: {
    pipeline: PipelineStage[];
    total_active_pipeline: number;
    bottleneck_stage: string;
    sla_health: string;
    generated_at: string;
  };
};

export type QueueItem = {
  domain: string;
  queue_size: number;
  claimed: number;
  pending: number;
  overdue: number;
  avg_processing_time_min: number;
  avg_wait_time_min: number;
  completion_rate_pct: number;
  oldest_item: string;
  sla_status: string;
  utilization_pct: number;
  pending_samples?: number;
  completed_today?: number;
  low_stock_alerts?: number;
  expiring_30_days?: number;
  pending_prescriptions?: number;
  dispensed_medications_today?: number;
  volume_by_day?: Array<{ day: string; prescriptions: number }>;
  sla_violations?: number;
  processing?: number;
  workflow_stages?: Array<{ stage: string; count: number }>;
};

export type QueueMonitoringResponse = {
  success: boolean;
  data: {
    queues: Record<string, QueueItem>;
    summary: {
      total_active_queue: number;
      total_overdue_items: number;
      system_utilization_pct: number;
    };
    workflow?: {
      active_tasks: number;
      pending_tasks: number;
      overdue_tasks: number;
      avg_completion_time_minutes: number;
    };
    recent_activities?: Array<{
      id: string;
      type: string;
      message: string;
      module: string;
      time: string;
    }>;
    generated_at: string;
  };
};

export type DoctorProductivityItem = {
  id: string;
  name: string;
  specialty: string;
  patients_seen: number;
  consultations_completed: number;
  avg_consultation_duration_min: number;
  orders_requested: number;
  orders_reviewed: number;
  followups_scheduled: number;
  diagnosis_completion_rate_pct: number;
  documentation_completion_pct: number;
  encounter_closure_rate_pct: number;
  avg_patient_waiting_time_min: number;
  current_queue: number;
  active_encounter_patient: string;
  idle_time_min: number;
  productivity_score: number;
};

export type DoctorProductivityResponse = {
  success: boolean;
  data: {
    doctors: DoctorProductivityItem[];
    summary: {
      total_active_clinicians: number;
      avg_productivity_score: number;
      total_consultations_today: number;
    };
    generated_at: string;
  };
};

export type NurseMetricsResponse = {
  success: boolean;
  data: {
    vitals_completed: number;
    patients_triaged: number;
    avg_triage_time_min: number;
    medication_administrations: number;
    pending_tasks: number;
    overdue_tasks: number;
    forwarded_patients: number;
    escalations: number;
    triage_breakdown: Array<{ priority: string; count: number; fill: string }>;
    generated_at: string;
  };
};

export type LaboratoryIntelligenceResponse = {
  success: boolean;
  data: {
    incoming_orders: number;
    collected_specimens: number;
    processing: number;
    quality_control_passed_pct: number;
    verified_results: number;
    critical_results_flagged: number;
    avg_turnaround_time_min: number;
    stat_compliance_pct: number;
    tech_workload: Array<{ tech: string; processed: number; pending: number; accuracy: string }>;
    test_volume_by_category: Array<{ category: string; count: number }>;
    doctor_performance?: Array<{ name: string; specialty: string; completed: number; todaySchedule: number; queue: number }>;
    generated_at: string;
  };
};

export type RadiologyIntelligenceResponse = {
  success: boolean;
  data: {
    pending_imaging: number;
    scanning_in_progress: number;
    reporting_queue: number;
    verified_reports: number;
    critical_findings: number;
    avg_reporting_time_min: number;
    equipment_utilization_pct: number;
    radiologist_workload: Array<{ radiologist: string; read_count: number; pending_reads: number }>;
    modality_breakdown: Array<{ modality: string; count: number }>;
    generated_at: string;
  };
};

export type PharmacyIntelligenceResponse = {
  success: boolean;
  data: {
    medication_orders_total: number;
    dispensed_orders: number;
    pending_dispense: number;
    waiting_payment: number;
    generic_substitutions: number;
    stock_warnings_low: number;
    controlled_drugs_dispensed: number;
    avg_dispense_time_min: number;
    top_prescribed_medications: Array<{ name: string; count: number }>;
    medication_categories: Array<{ category: string; pct: number }>;
    generated_at: string;
  };
};

export type FinancialExecutiveResponse = {
  success: boolean;
  data: {
    revenue_overview?: {
      today_revenue: number;
      weekly_revenue: number;
      monthly_revenue: number;
      yearly_revenue: number;
    };
    revenue_breakdown?: Array<{ source: string; amount: number; fill?: string }>;
    payment_trends?: Array<{ week: string; collected: number; outstanding: number }>;
    revenue_timeframes?: {
      daily: number;
      weekly: number;
      monthly: number;
      quarterly: number;
      yearly: number;
    };
    revenue_sources?: Array<{ source: string; amount: number; pct: number }>;
    payment_tenders?: Array<{ method: string; amount: number; pct: number }>;
    financial_health?: {
      total_collected: number;
      outstanding_balance: number;
      collections_count: number;
      refunds_total: number;
      waivers_total: number;
      discounts_applied: number;
      avg_revenue_per_encounter: number;
      avg_revenue_per_patient: number;
      collection_rate_pct: number;
      payment_success_rate_pct: number;
    };
    generated_at: string;
  };
};

export type DepartmentItem = {
  id: string;
  name: string;
  load: number;
  queue: number;
  activeStaff: number;
  consultations: number;
  pendingRequests: number;
  efficiency_pct?: number;
  sla_compliance_pct?: number;
};

export type DepartmentPerformanceResponse = {
  success: boolean;
  data: {
    departments: DepartmentItem[];
    generated_at: string;
  };
};

export type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  severity: "info" | "warning" | "success" | "error";
  user: string;
};

export type TimelineIntelligenceResponse = {
  success: boolean;
  data: {
    events: TimelineEvent[];
    total_events_today: number;
    generated_at: string;
  };
};

export type DrillDownResponse = {
  success: boolean;
  data: {
    metric_key: string;
    total_count: number;
    records: Array<Record<string, any>>;
    generated_at: string;
  };
};

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExecutiveOverview: builder.query<ExecutiveOverviewResponse, { period?: string; startDate?: string; endDate?: string } | void>({
      query: (params) => ({
        url: "/dashboard/overview",
        params: params || {},
      }),
    }),
    getEncounterPipeline: builder.query<EncounterPipelineResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/pipeline",
        params: params || {},
      }),
    }),
    getQueueMonitoring: builder.query<QueueMonitoringResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/queues",
        params: params || {},
      }),
    }),
    getDoctorProductivity: builder.query<DoctorProductivityResponse, { period?: string; doctor_id?: string } | void>({
      query: (params) => ({
        url: "/dashboard/doctor-productivity",
        params: params || {},
      }),
    }),
    getNurseMetrics: builder.query<NurseMetricsResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/nurse-metrics",
        params: params || {},
      }),
    }),
    getLaboratoryIntelligence: builder.query<LaboratoryIntelligenceResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/laboratory-intelligence",
        params: params || {},
      }),
    }),
    getRadiologyIntelligence: builder.query<RadiologyIntelligenceResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/radiology-intelligence",
        params: params || {},
      }),
    }),
    getPharmacyIntelligence: builder.query<PharmacyIntelligenceResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/pharmacy-intelligence",
        params: params || {},
      }),
    }),
    getFinancialExecutive: builder.query<FinancialExecutiveResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/financial-executive",
        params: params || {},
      }),
    }),
    getDepartmentPerformance: builder.query<DepartmentPerformanceResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/departments",
        params: params || {},
      }),
    }),
    getTimelineIntelligence: builder.query<TimelineIntelligenceResponse, { period?: string; limit?: number } | void>({
      query: (params) => ({
        url: "/dashboard/timeline-intelligence",
        params: params || {},
      }),
    }),
    getDrillDownRecords: builder.query<DrillDownResponse, { metricKey: string; period?: string }>({
      query: ({ metricKey, period }) => ({
        url: `/dashboard/drilldown/${metricKey}`,
        params: period ? { period } : {},
      }),
    }),
    getOperationalDashboard: builder.query<QueueMonitoringResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/operational",
        params: params || {},
      }),
    }),
    getClinicalAnalytics: builder.query<LaboratoryIntelligenceResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/clinical",
        params: params || {},
      }),
    }),
    getFinancialAnalytics: builder.query<FinancialExecutiveResponse, { period?: string } | void>({
      query: (params) => ({
        url: "/dashboard/financial",
        params: params || {},
      }),
    }),
  }),
});

export const {
  useGetExecutiveOverviewQuery,
  useGetEncounterPipelineQuery,
  useGetQueueMonitoringQuery,
  useGetDoctorProductivityQuery,
  useGetNurseMetricsQuery,
  useGetLaboratoryIntelligenceQuery,
  useGetRadiologyIntelligenceQuery,
  useGetPharmacyIntelligenceQuery,
  useGetFinancialExecutiveQuery,
  useGetDepartmentPerformanceQuery,
  useGetTimelineIntelligenceQuery,
  useGetDrillDownRecordsQuery,
  useGetOperationalDashboardQuery,
  useGetClinicalAnalyticsQuery,
  useGetFinancialAnalyticsQuery,
} = dashboardApi;
