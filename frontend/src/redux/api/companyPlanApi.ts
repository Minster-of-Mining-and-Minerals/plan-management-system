import { baseApi } from "../baseApi";
import type {
  CompanyPlanVersion,
  CompanyPlanNode,
  CompanyPlanningConfiguration,
  CompanyPlanRule,
  CompanyExecutionDashboardSummary,
} from "../types/companyPlan";

export const companyPlanApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // -------------------------------------------------------------
    // Configuration & Rules
    // -------------------------------------------------------------
    getCompanyPlanConfig: builder.query<CompanyPlanningConfiguration, { company_id: string }>({
      query: (params) => ({
        url: "/company/plans/config",
        params,
      }),
      transformResponse: (res: { data: CompanyPlanningConfiguration }) => res.data,
      providesTags: ["CompanyPlanConfig"],
    }),

    updateCompanyPlanConfig: builder.mutation<CompanyPlanningConfiguration, { company_id: string; data: Partial<CompanyPlanningConfiguration> }>({
      query: ({ company_id, data }) => ({
        url: `/company/plans/config?company_id=${company_id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: CompanyPlanningConfiguration }) => res.data,
      invalidatesTags: ["CompanyPlanConfig"],
    }),

    getCompanyPlanRules: builder.query<CompanyPlanRule[], { company_id: string }>({
      query: (params) => ({
        url: "/company/plans/rules",
        params,
      }),
      transformResponse: (res: { data: CompanyPlanRule[] }) => res.data,
      providesTags: ["CompanyPlanRules"],
    }),

    getCompanyPlanRuleById: builder.query<CompanyPlanRule, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/rules/${id}`,
        params: { company_id },
      }),
      transformResponse: (res: { data: CompanyPlanRule }) => res.data,
      providesTags: (_res, _err, { id }) => [{ type: "CompanyPlanRules", id }],
    }),

    createCompanyPlanRule: builder.mutation<CompanyPlanRule, { company_id: string; data: Partial<CompanyPlanRule> }>({
      query: ({ company_id, data }) => ({
        url: `/company/plans/rules?company_id=${company_id}`,
        method: "POST",
        body: data,
      }),
      transformResponse: (res: { data: CompanyPlanRule }) => res.data,
      invalidatesTags: ["CompanyPlanRules"],
    }),

    updateCompanyPlanRule: builder.mutation<CompanyPlanRule, { id: string; company_id: string; data: Partial<CompanyPlanRule> }>({
      query: ({ id, company_id, data }) => ({
        url: `/company/plans/rules/${id}?company_id=${company_id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: CompanyPlanRule }) => res.data,
      invalidatesTags: ["CompanyPlanRules"],
    }),

    deleteCompanyPlanRule: builder.mutation<{ success: boolean }, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/rules/${id}?company_id=${company_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CompanyPlanRules"],
    }),

    // -------------------------------------------------------------
    // Dashboard & Metrics
    // -------------------------------------------------------------
    getCompanyExecutionDashboardSummary: builder.query<CompanyExecutionDashboardSummary, { company_id: string }>({
      query: (params) => ({
        url: "/company/plans/dashboard/summary",
        params,
      }),
      transformResponse: (res: { data: CompanyExecutionDashboardSummary }) => res.data,
      providesTags: ["CompanyPlanDashboard"],
    }),

    getCompanyExecutionDashboardProgressTree: builder.query<
      { version: CompanyPlanVersion; tree: CompanyPlanNode[] },
      { company_id: string; plan_version_id?: string }
    >({
      query: (params) => ({
        url: "/company/plans/dashboard/progress-tree",
        params,
      }),
      transformResponse: (res: { data: { version: CompanyPlanVersion; tree: CompanyPlanNode[] } }) => res.data,
      providesTags: ["CompanyPlanDashboard", "CompanyPlanNodes"],
    }),

    getCompanyExecutionDashboardDepartmentUser: builder.query<
      { departments: Array<{ company_structure_id: string; name: string; level: number; assigned_nodes_count: number; avg_progress: number; status: string }> },
      { company_id: string; plan_version_id?: string }
    >({
      query: (params) => ({
        url: "/company/plans/dashboard/department-user",
        params,
      }),
      transformResponse: (res: {
        data: {
          departments: Array<{
            company_structure_id: string;
            name: string;
            level: number;
            assigned_nodes_count: number;
            avg_progress: number;
            status: string;
          }>;
        };
      }) => res.data,
      providesTags: ["CompanyPlanDashboard"],
    }),

    // -------------------------------------------------------------
    // Plan Versions
    // -------------------------------------------------------------
    getCompanyPlanVersions: builder.query<CompanyPlanVersion[], { company_id: string; version_kind?: string; status?: string }>({
      query: (params) => ({
        url: "/company/plans/versions",
        params,
      }),
      transformResponse: (res: { data: CompanyPlanVersion[] }) => res.data,
      providesTags: ["CompanyPlanVersions"],
    }),

    getCompanyPlanVersionById: builder.query<CompanyPlanVersion, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}`,
        params: { company_id },
      }),
      transformResponse: (res: { data: CompanyPlanVersion }) => res.data,
      providesTags: (_res, _err, { id }) => [{ type: "CompanyPlanVersions", id }],
    }),

    createCompanyPlanDraft: builder.mutation<CompanyPlanVersion, { company_id: string; data: Partial<CompanyPlanVersion> }>({
      query: ({ company_id, data }) => ({
        url: `/company/plans/versions?company_id=${company_id}`,
        method: "POST",
        body: data,
      }),
      transformResponse: (res: { data: CompanyPlanVersion }) => res.data,
      invalidatesTags: ["CompanyPlanVersions", "CompanyPlanDashboard"],
    }),

    updateCompanyPlanVersion: builder.mutation<CompanyPlanVersion, { id: string; company_id: string; data: Partial<CompanyPlanVersion> }>({
      query: ({ id, company_id, data }) => ({
        url: `/company/plans/versions/${id}?company_id=${company_id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: CompanyPlanVersion }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [{ type: "CompanyPlanVersions", id }, "CompanyPlanVersions"],
    }),

    deleteCompanyPlanVersion: builder.mutation<{ success: boolean }, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}?company_id=${company_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CompanyPlanVersions", "CompanyPlanDashboard"],
    }),

    duplicateCompanyPlanDraft: builder.mutation<CompanyPlanVersion, { id: string; company_id: string; data?: { draft_name?: string } }>({
      query: ({ id, company_id, data }) => ({
        url: `/company/plans/versions/${id}/duplicate?company_id=${company_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: CompanyPlanVersion }) => res.data,
      invalidatesTags: ["CompanyPlanVersions"],
    }),

    // Finalization & Start Process
    getCompanyDraftFinalizationReadiness: builder.query<{ ready: boolean; errors: string[]; planning_years: number[] }, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/finalization-readiness`,
        params: { company_id },
      }),
      transformResponse: (res: { data: { ready: boolean; errors: string[]; planning_years: number[] } }) => res.data,
      providesTags: (_res, _err, { id }) => [{ type: "CompanyPlanVersions", id }],
    }),

    finalizeCompanyPlanDraft: builder.mutation<CompanyPlanVersion, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/finalize?company_id=${company_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: CompanyPlanVersion }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [{ type: "CompanyPlanVersions", id }, "CompanyPlanVersions", "CompanyPlanDashboard"],
    }),

    reopenCompanyPlanDraft: builder.mutation<CompanyPlanVersion, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/reopen-for-edit?company_id=${company_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: CompanyPlanVersion }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [{ type: "CompanyPlanVersions", id }, "CompanyPlanVersions", "CompanyPlanDashboard"],
    }),

    startCompanyPlanProcess: builder.mutation<CompanyPlanVersion, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/start-process?company_id=${company_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: CompanyPlanVersion }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [{ type: "CompanyPlanVersions", id }, "CompanyPlanVersions", "CompanyPlanDashboard"],
    }),

    // Annual Planning
    getCompanyAnnualVersions: builder.query<CompanyPlanVersion[], { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/annual-versions`,
        params: { company_id },
      }),
      transformResponse: (res: { data: CompanyPlanVersion[] }) => res.data,
      providesTags: ["CompanyPlanVersions"],
    }),

    getCompanyAnnualTargetAllocations: builder.query<CompanyPlanNode[], { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/annual-target-allocations`,
        params: { company_id },
      }),
      transformResponse: (res: { data: CompanyPlanNode[] }) => res.data,
      providesTags: ["CompanyPlanNodes"],
    }),

    updateCompanyAnnualTarget: builder.mutation<CompanyPlanNode, { nodeId: string; company_id: string; annual_target: number }>({
      query: ({ nodeId, company_id, annual_target }) => ({
        url: `/company/plans/nodes/${nodeId}/annual-target?company_id=${company_id}`,
        method: "PATCH",
        body: { annual_target },
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      invalidatesTags: ["CompanyPlanNodes"],
    }),

    finalizeCompanyAnnualExecution: builder.mutation<CompanyPlanVersion, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/finalize-annual-execution?company_id=${company_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: CompanyPlanVersion }) => res.data,
      invalidatesTags: ["CompanyPlanVersions"],
    }),

    // Period Planning
    getCompanyExecutionPeriods: builder.query<CompanyPlanVersion[], { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/execution-periods`,
        params: { company_id },
      }),
      transformResponse: (res: { data: CompanyPlanVersion[] }) => res.data,
      providesTags: ["CompanyPlanVersions"],
    }),

    initializeCompanyExecutionPeriods: builder.mutation<
      CompanyPlanVersion[],
      { id: string; company_id: string; subdivision_mode: string; custom_periods?: Array<Record<string, unknown>> }
    >({
      query: ({ id, company_id, ...body }) => ({
        url: `/company/plans/versions/${id}/initialize-execution-periods?company_id=${company_id}`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: CompanyPlanVersion[] }) => res.data,
      invalidatesTags: ["CompanyPlanVersions"],
    }),

    getCompanyPeriodTargetAllocations: builder.query<CompanyPlanNode[], { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/period-target-allocations`,
        params: { company_id },
      }),
      transformResponse: (res: { data: CompanyPlanNode[] }) => res.data,
      providesTags: ["CompanyPlanNodes"],
    }),

    updateCompanyPeriodTarget: builder.mutation<CompanyPlanNode, { nodeId: string; company_id: string; period_target: number }>({
      query: ({ nodeId, company_id, period_target }) => ({
        url: `/company/plans/nodes/${nodeId}/period-target?company_id=${company_id}`,
        method: "PATCH",
        body: { period_target },
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      invalidatesTags: ["CompanyPlanNodes"],
    }),

    finalizeCompanyPeriodTargets: builder.mutation<CompanyPlanVersion, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/finalize-execution-periods?company_id=${company_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: CompanyPlanVersion }) => res.data,
      invalidatesTags: ["CompanyPlanVersions"],
    }),

    // Hierarchy & Nodes
    getCompanyPlanHierarchy: builder.query<
      { version: CompanyPlanVersion; tree: CompanyPlanNode[]; flat: CompanyPlanNode[] },
      { id: string; company_id: string }
    >({
      query: ({ id, company_id }) => ({
        url: `/company/plans/versions/${id}/hierarchy`,
        params: { company_id },
      }),
      transformResponse: (res: { data: { version: CompanyPlanVersion; tree: CompanyPlanNode[]; flat: CompanyPlanNode[] } }) => res.data,
      providesTags: ["CompanyPlanNodes"],
    }),

    createCompanyPlanNode: builder.mutation<CompanyPlanNode, { company_id: string; data: Partial<CompanyPlanNode> & { company_plan_version_id: string; department_ids?: string[] } }>({
      query: ({ company_id, data }) => ({
        url: `/company/plans/nodes?company_id=${company_id}`,
        method: "POST",
        body: data,
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      invalidatesTags: ["CompanyPlanNodes", "CompanyPlanDashboard"],
    }),

    getCompanyPlanNodeById: builder.query<CompanyPlanNode, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/nodes/${id}`,
        params: { company_id },
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      providesTags: (_res, _err, { id }) => [{ type: "CompanyPlanNodes", id }],
    }),

    updateCompanyPlanNode: builder.mutation<CompanyPlanNode, { id: string; company_id: string; data: Partial<CompanyPlanNode> & { department_ids?: string[] } }>({
      query: ({ id, company_id, data }) => ({
        url: `/company/plans/nodes/${id}?company_id=${company_id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      invalidatesTags: ["CompanyPlanNodes", "CompanyPlanDashboard"],
    }),

    deleteCompanyPlanNode: builder.mutation<{ success: boolean }, { id: string; company_id: string }>({
      query: ({ id, company_id }) => ({
        url: `/company/plans/nodes/${id}?company_id=${company_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CompanyPlanNodes", "CompanyPlanDashboard"],
    }),

    reorderCompanyPlanNodes: builder.mutation<{ success: boolean }, { company_id: string; version_id: string; ordered_node_ids: string[] }>({
      query: ({ company_id, ...body }) => ({
        url: `/company/plans/nodes/reorder?company_id=${company_id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["CompanyPlanNodes"],
    }),

    // Actuals & Workflow Signoffs
    updateCompanyPeriodActual: builder.mutation<CompanyPlanNode, { nodeId: string; company_id: string; period_actual: number }>({
      query: ({ nodeId, company_id, period_actual }) => ({
        url: `/company/plans/nodes/${nodeId}/period-actual?company_id=${company_id}`,
        method: "PATCH",
        body: { period_actual },
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      invalidatesTags: ["CompanyPlanNodes", "CompanyPlanDashboard"],
    }),

    submitCompanyAchievement: builder.mutation<CompanyPlanNode, { nodeId: string; company_id: string; data?: Record<string, unknown> }>({
      query: ({ nodeId, company_id, data }) => ({
        url: `/company/plans/nodes/${nodeId}/achievement/submit?company_id=${company_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      invalidatesTags: ["CompanyPlanNodes", "CompanyPlanDashboard"],
    }),

    approveCompanyAchievement: builder.mutation<CompanyPlanNode, { nodeId: string; company_id: string; data?: Record<string, unknown> }>({
      query: ({ nodeId, company_id, data }) => ({
        url: `/company/plans/nodes/${nodeId}/achievement/approve?company_id=${company_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      invalidatesTags: ["CompanyPlanNodes", "CompanyPlanDashboard"],
    }),

    rejectCompanyAchievement: builder.mutation<CompanyPlanNode, { nodeId: string; company_id: string; comment?: string }>({
      query: ({ nodeId, company_id, comment }) => ({
        url: `/company/plans/nodes/${nodeId}/achievement/reject?company_id=${company_id}`,
        method: "POST",
        body: { comment },
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      invalidatesTags: ["CompanyPlanNodes", "CompanyPlanDashboard"],
    }),

    validateCompanyAchievement: builder.mutation<CompanyPlanNode, { nodeId: string; company_id: string; data?: Record<string, unknown> }>({
      query: ({ nodeId, company_id, data }) => ({
        url: `/company/plans/nodes/${nodeId}/achievement/validate?company_id=${company_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: CompanyPlanNode }) => res.data,
      invalidatesTags: ["CompanyPlanNodes", "CompanyPlanDashboard"],
    }),
  }),
});

export const {
  useGetCompanyPlanConfigQuery,
  useUpdateCompanyPlanConfigMutation,
  useGetCompanyPlanRulesQuery,
  useGetCompanyPlanRuleByIdQuery,
  useCreateCompanyPlanRuleMutation,
  useUpdateCompanyPlanRuleMutation,
  useDeleteCompanyPlanRuleMutation,
  useGetCompanyExecutionDashboardSummaryQuery,
  useGetCompanyExecutionDashboardProgressTreeQuery,
  useGetCompanyExecutionDashboardDepartmentUserQuery,
  useGetCompanyPlanVersionsQuery,
  useGetCompanyPlanVersionByIdQuery,
  useCreateCompanyPlanDraftMutation,
  useUpdateCompanyPlanVersionMutation,
  useDeleteCompanyPlanVersionMutation,
  useDuplicateCompanyPlanDraftMutation,
  useGetCompanyDraftFinalizationReadinessQuery,
  useFinalizeCompanyPlanDraftMutation,
  useReopenCompanyPlanDraftMutation,
  useStartCompanyPlanProcessMutation,
  useGetCompanyAnnualVersionsQuery,
  useGetCompanyAnnualTargetAllocationsQuery,
  useUpdateCompanyAnnualTargetMutation,
  useFinalizeCompanyAnnualExecutionMutation,
  useGetCompanyExecutionPeriodsQuery,
  useInitializeCompanyExecutionPeriodsMutation,
  useGetCompanyPeriodTargetAllocationsQuery,
  useUpdateCompanyPeriodTargetMutation,
  useFinalizeCompanyPeriodTargetsMutation,
  useGetCompanyPlanHierarchyQuery,
  useCreateCompanyPlanNodeMutation,
  useGetCompanyPlanNodeByIdQuery,
  useUpdateCompanyPlanNodeMutation,
  useDeleteCompanyPlanNodeMutation,
  useReorderCompanyPlanNodesMutation,
  useUpdateCompanyPeriodActualMutation,
  useSubmitCompanyAchievementMutation,
  useApproveCompanyAchievementMutation,
  useRejectCompanyAchievementMutation,
  useValidateCompanyAchievementMutation,
} = companyPlanApi;
