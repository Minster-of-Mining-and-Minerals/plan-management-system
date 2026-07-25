import { baseApi } from "../baseApi";

export type ClinicalPrediction = {
  prediction_id?: string;
  prediction_type: string;
  domain: string;
  department: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  probability: number;
  expected_time?: string;
  reason: string[];
  confidence: number;
  actual_outcome?: string;
  accuracy?: number;
  created_at?: string;
};

export type OperationalRiskScore = {
  score_id: string;
  domain: string;
  department: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: string[];
  calculated_at: string;
};

export type PredictionModel = {
  model_id: string;
  model_name: string;
  model_version: string;
  prediction_type: string;
  accuracy_score: number;
  training_date: string;
  active_status: boolean;
};

export type PredictiveAnalytics = {
  prediction_accuracy_pct: number;
  false_positive_rate_pct: number;
  prevented_incidents_count: number;
  successful_recommendations_count: number;
  preventive_automation_success_pct: number;
  risk_reduction_rate_pct: number;
  accuracy_by_department: Array<{ department: string; accuracy: number }>;
};

export type PredictiveDashboardSummary = {
  hospital_future_risk_score: number;
  next_24h_predictions: ClinicalPrediction[];
  high_risk_departments: string[];
  expected_sla_breaches_count: number;
  predicted_workload_trend: string;
  recommended_interventions: any[];
  prediction_accuracy_pct: number;
  prevented_incidents_count: number;
};

export type DepartmentPrediction = {
  department: string;
  current_status: string;
  future_risk: OperationalRiskScore;
  predictions: ClinicalPrediction[];
  recommended_actions: any[];
};

export const predictiveOperationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPredictions: builder.query<ClinicalPrediction[], void>({
      query: () => "/operations/predictive",
      providesTags: ["ClinicalOrder"],
    }),
    getRiskScores: builder.query<OperationalRiskScore[], void>({
      query: () => "/operations/predictive/risk-scores",
      providesTags: ["ClinicalOrder"],
    }),
    getPredictiveRecommendations: builder.query<any[], void>({
      query: () => "/operations/predictive/recommendations",
      providesTags: ["ClinicalOrder"],
    }),
    executePreventiveAction: builder.mutation<any, { action_type: string; department?: string; target_entity_id?: string }>({
      query: (body) => ({
        url: "/operations/predictive/preventive-action",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    getModelRegistry: builder.query<PredictionModel[], void>({
      query: () => "/operations/predictive/models",
      providesTags: ["ClinicalOrder"],
    }),
    getPredictionHistory: builder.query<ClinicalPrediction[], void>({
      query: () => "/operations/predictive/history",
      providesTags: ["ClinicalOrder"],
    }),
    getPredictiveAnalytics: builder.query<PredictiveAnalytics, void>({
      query: () => "/operations/predictive/analytics",
      providesTags: ["ClinicalOrder"],
    }),
    getPredictiveDashboard: builder.query<PredictiveDashboardSummary, void>({
      query: () => "/operations/predictive/dashboard",
      providesTags: ["ClinicalOrder"],
    }),
    getDepartmentPredictions: builder.query<DepartmentPrediction, string>({
      query: (dept) => `/operations/predictive/department/${dept}`,
      providesTags: ["ClinicalOrder"],
    }),
  }),
});

export const {
  useGetPredictionsQuery,
  useGetRiskScoresQuery,
  useGetPredictiveRecommendationsQuery,
  useExecutePreventiveActionMutation,
  useGetModelRegistryQuery,
  useGetPredictionHistoryQuery,
  useGetPredictiveAnalyticsQuery,
  useGetPredictiveDashboardQuery,
  useGetDepartmentPredictionsQuery,
} = predictiveOperationsApi;
