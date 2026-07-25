import { baseApi } from "../baseApi";

export type HospitalCapacity = {
  current_capacity: number;
  max_capacity: number;
  available_capacity: number;
  reserved_capacity: number;
  utilization_percentage: number;
  peak_utilization_percentage: number;
  idle_capacity_percentage: number;
  capacity_trend: "OPTIMAL" | "MODERATE" | "HIGH_PRESSURE";
  room_capacity: { total: number; occupied: number; available: number };
  equipment_capacity: { total: number; in_use: number; available: number };
};

export type DepartmentCapacity = {
  department_id: string;
  current_capacity: number;
  max_capacity: number;
  available_capacity: number;
  utilization_percentage: number;
  average_waiting_time_minutes: number;
  estimated_completion_minutes: number;
  status: "NORMAL" | "BUSY" | "OVERLOADED";
};

export type ProviderAvailability = {
  provider_id: string;
  full_name?: string;
  email?: string;
  current_status: "AVAILABLE" | "BUSY" | "CONSULTING" | "PROCEDURE" | "BREAK" | "LEAVE" | "EMERGENCY" | "OFF_DUTY";
  current_workload: number;
  total_assigned_orders: number;
  stat_workload: number;
  capacity_status: "NORMAL" | "HIGH" | "OVERLOADED";
  next_availability_in_minutes: number;
  estimated_completion_time: string;
};

export type CapacityForecast = {
  todays_expected_workload: number;
  tomorrows_expected_workload: number;
  seven_day_forecast: Array<{ day: string; expected_orders: number; risk: "LOW" | "NORMAL" | "HIGH" }>;
  peak_hours: {
    consultation_peak: string;
    laboratory_peak: string;
    radiology_peak: string;
    pharmacy_peak: string;
  };
  risk_assessment: {
    department_overload_risk: string;
    provider_overload_risk: string;
    queue_growth_trend: string;
    equipment_shortage_risk: string;
    room_shortage_risk: string;
  };
  ml_readiness_score: number;
};

export type OperationalRecommendation = {
  id: string;
  title: string;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  expected_benefit: string;
  affected_department: string;
  confidence_score: number;
  action_type: string;
};

export type ThroughputMetrics = {
  patients_per_hour: number;
  orders_per_hour: number;
  average_turnaround_time_minutes: number;
  department_throughput: Record<string, any>;
  waiting_trend: string;
  completion_trend: string;
};

export type ExecutiveCapacityDashboard = {
  hospital_utilization_pct: number;
  department_utilization: Record<string, number>;
  room_utilization_pct: number;
  equipment_utilization_pct: number;
  staff_coverage_pct: number;
  queue_pressure: string;
  sla_risk: string;
  forecast_risk: string;
  operational_health_score: number;
  recommended_actions: OperationalRecommendation[];
};

export const capacityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHospitalCapacity: builder.query<HospitalCapacity, void>({
      query: () => "/operations/capacity/hospital",
      providesTags: ["ClinicalOrder"],
    }),
    getDepartmentCapacity: builder.query<DepartmentCapacity, string | void>({
      query: (departmentId) => `/operations/capacity/departments${departmentId ? `?departmentId=${departmentId}` : ""}`,
      providesTags: ["ClinicalOrder"],
    }),
    getProviderAvailability: builder.query<ProviderAvailability[], string | void>({
      query: (departmentId) => `/operations/capacity/providers${departmentId ? `?departmentId=${departmentId}` : ""}`,
      providesTags: ["ClinicalOrder"],
    }),
    getForecast: builder.query<CapacityForecast, void>({
      query: () => "/operations/capacity/forecast",
      providesTags: ["ClinicalOrder"],
    }),
    getRecommendations: builder.query<OperationalRecommendation[], void>({
      query: () => "/operations/capacity/recommendations",
      providesTags: ["ClinicalOrder"],
    }),
    acceptRecommendation: builder.mutation<{ success: boolean; status: string }, string>({
      query: (id) => ({
        url: `/operations/capacity/recommendations/${id}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    getThroughput: builder.query<ThroughputMetrics, void>({
      query: () => "/operations/capacity/throughput",
      providesTags: ["ClinicalOrder"],
    }),
    getExecutiveCapacity: builder.query<ExecutiveCapacityDashboard, void>({
      query: () => "/operations/capacity/executive-capacity",
      providesTags: ["ClinicalOrder"],
    }),
    allocateResource: builder.mutation<any, { resource_type: string; resource_id: string; assigned_to_type: string; assigned_to_id?: string; priority?: string; is_emergency?: boolean }>({
      query: (body) => ({
        url: "/operations/capacity/resource-allocation",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    updateAssignment: builder.mutation<any, { assignmentId: string }>({
      query: (body) => ({
        url: "/operations/capacity/resource-assignment",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
  }),
});

export const {
  useGetHospitalCapacityQuery,
  useGetDepartmentCapacityQuery,
  useGetProviderAvailabilityQuery,
  useGetForecastQuery,
  useGetRecommendationsQuery,
  useAcceptRecommendationMutation,
  useGetThroughputQuery,
  useGetExecutiveCapacityQuery,
  useAllocateResourceMutation,
  useUpdateAssignmentMutation,
} = capacityApi;
