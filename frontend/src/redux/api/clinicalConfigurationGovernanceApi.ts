import { baseApi } from "../baseApi";

export type ValidationSummary = {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  validated_at: string;
};

export type ImpactAnalysis = {
  dependent_active_orders: number;
  dependent_historical_orders: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  can_safely_delete: boolean;
  message: string;
};

export type DependencyNode = {
  level: number;
  type: string;
  name: string;
};

export type GovernanceLog = {
  governance_id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  entity_code: string;
  version: string;
  previous_status?: string;
  new_status: string;
  validation_summary_json: ValidationSummary;
  impact_analysis_json: ImpactAnalysis;
  created_at: string;
};

export const clinicalConfigurationGovernanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    validateConfiguration: builder.mutation<ValidationSummary, { entity_type: string; entity_data: Record<string, any> }>({
      query: (body) => ({
        url: "/clinical-governance/validate",
        method: "POST",
        body,
      }),
    }),
    transitionLifecycleStatus: builder.mutation<any, { entity_type: string; entity_id: string; entity_code: string; target_status: string; reason?: string }>({
      query: (body) => ({
        url: "/clinical-governance/transition",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    getImpactAnalysis: builder.query<ImpactAnalysis, { entity_type: string; entity_id: string }>({
      query: (params) => ({
        url: "/clinical-governance/impact-analysis",
        params,
      }),
    }),
    getDependencyTree: builder.query<{ entity_code: string; hierarchy: DependencyNode[] }, { entity_code: string }>({
      query: (params) => ({
        url: "/clinical-governance/dependency-tree",
        params,
      }),
    }),
    getGovernanceLogs: builder.query<GovernanceLog[], void>({
      query: () => "/clinical-governance/logs",
      providesTags: ["ClinicalOrder"],
    }),
  }),
});

export const {
  useValidateConfigurationMutation,
  useTransitionLifecycleStatusMutation,
  useGetImpactAnalysisQuery,
  useGetDependencyTreeQuery,
  useGetGovernanceLogsQuery,
} = clinicalConfigurationGovernanceApi;
