import { baseApi } from "../baseApi";
import type {
  RegionalPlanVersion,
  RegionalPlanNode,
  RegionalPlanningConfiguration,
  RegionalPlanRule,
  RegionalExecutionDashboardSummary,
  RegionalPerformanceColorThreshold,
  RegionalPlanReviewDashboard,
} from "../types/regionalPlan";

export const regionalPlanApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // -------------------------------------------------------------
    // Configuration & Rules
    // -------------------------------------------------------------
    getRegionalPlanConfig: builder.query<RegionalPlanningConfiguration, { region_id: string }>({
      query: (params) => ({
        url: "/regional/plans/config",
        params,
      }),
      transformResponse: (res: { data: RegionalPlanningConfiguration }) => res.data,
      providesTags: ["RegionalPlanConfig"],
    }),

    updateRegionalPlanConfig: builder.mutation<RegionalPlanningConfiguration, { region_id: string; data: Partial<RegionalPlanningConfiguration> }>({
      query: ({ region_id, data }) => ({
        url: `/regional/plans/config?region_id=${region_id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPlanningConfiguration }) => res.data,
      invalidatesTags: ["RegionalPlanConfig"],
    }),

    restoreDefaultRegionalPlanConfig: builder.mutation<RegionalPlanningConfiguration, { region_id: string }>({
      query: ({ region_id }) => ({
        url: `/regional/plans/config/restore-defaults?region_id=${region_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: RegionalPlanningConfiguration }) => res.data,
      invalidatesTags: ["RegionalPlanConfig"],
    }),

    getRegionalPlanRules: builder.query<RegionalPlanRule[], { region_id: string }>({
      query: (params) => ({
        url: "/regional/plans/rules",
        params,
      }),
      transformResponse: (res: { data: RegionalPlanRule[] }) => res.data,
      providesTags: ["RegionalPlanRules"],
    }),

    getRegionalPlanRuleById: builder.query<RegionalPlanRule, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/rules/${id}`,
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalPlanRule }) => res.data,
      providesTags: (_res, _err, { id }) => [{ type: "RegionalPlanRules", id }],
    }),

    createRegionalPlanRule: builder.mutation<RegionalPlanRule, { region_id: string; data: Partial<RegionalPlanRule> }>({
      query: ({ region_id, data }) => ({
        url: `/regional/plans/rules?region_id=${region_id}`,
        method: "POST",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPlanRule }) => res.data,
      invalidatesTags: ["RegionalPlanRules"],
    }),

    updateRegionalPlanRule: builder.mutation<RegionalPlanRule, { id: string; region_id: string; data: Partial<RegionalPlanRule> }>({
      query: ({ id, region_id, data }) => ({
        url: `/regional/plans/rules/${id}?region_id=${region_id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPlanRule }) => res.data,
      invalidatesTags: ["RegionalPlanRules"],
    }),

    deleteRegionalPlanRule: builder.mutation<{ success: boolean }, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/rules/${id}?region_id=${region_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["RegionalPlanRules"],
    }),

    // -------------------------------------------------------------
    // Performance Color Thresholds
    // -------------------------------------------------------------
    getRegionalPerformanceColorThresholds: builder.query<RegionalPerformanceColorThreshold[], { region_id: string }>({
      query: (params) => ({
        url: "/regional/plans/performance-colors",
        params,
      }),
      transformResponse: (res: { data: RegionalPerformanceColorThreshold[] }) => res.data,
      providesTags: ["RegionalPerformanceColorThresholds"],
    }),

    getRegionalPerformanceColorThresholdById: builder.query<RegionalPerformanceColorThreshold, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/performance-colors/${id}`,
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalPerformanceColorThreshold }) => res.data,
      providesTags: (_res, _err, { id }) => [{ type: "RegionalPerformanceColorThresholds", id }],
    }),

    createRegionalPerformanceColorThreshold: builder.mutation<
      RegionalPerformanceColorThreshold,
      { region_id: string; data: Partial<RegionalPerformanceColorThreshold> }
    >({
      query: ({ region_id, data }) => ({
        url: `/regional/plans/performance-colors?region_id=${region_id}`,
        method: "POST",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPerformanceColorThreshold }) => res.data,
      invalidatesTags: ["RegionalPerformanceColorThresholds"],
    }),

    updateRegionalPerformanceColorThreshold: builder.mutation<
      RegionalPerformanceColorThreshold,
      { id: string; region_id: string; data: Partial<RegionalPerformanceColorThreshold> }
    >({
      query: ({ id, region_id, data }) => ({
        url: `/regional/plans/performance-colors/${id}?region_id=${region_id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPerformanceColorThreshold }) => res.data,
      invalidatesTags: ["RegionalPerformanceColorThresholds"],
    }),

    deleteRegionalPerformanceColorThreshold: builder.mutation<{ success: boolean }, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/performance-colors/${id}?region_id=${region_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["RegionalPerformanceColorThresholds"],
    }),

    resolveRegionalPerformanceColor: builder.query<{ threshold: RegionalPerformanceColorThreshold; color_hex: string }, { region_id: string; percentage: number }>({
      query: (params) => ({
        url: "/regional/plans/performance-colors/resolve",
        params,
      }),
      transformResponse: (res: { data: { threshold: RegionalPerformanceColorThreshold; color_hex: string } }) => res.data,
    }),

    // -------------------------------------------------------------
    // Plan Review Workflow
    // -------------------------------------------------------------
    getRegionalPlanVersionsForReview: builder.query<RegionalPlanVersion[], { region_id: string; search?: string }>({
      query: (params) => ({
        url: "/regional/plans/versions/for-review",
        params,
      }),
      transformResponse: (res: { data: RegionalPlanVersion[] }) => res.data,
      providesTags: ["RegionalPlanReview", "RegionalPlanVersions"],
    }),

    getRegionalPublishForReviewReadiness: builder.query<
      { ready: boolean; errors: string[]; review_status: string | null },
      { id: string; region_id: string }
    >({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/publish-for-review-readiness`,
        params: { region_id },
      }),
      transformResponse: (res: { data: { ready: boolean; errors: string[]; review_status: string | null } }) => res.data,
    }),

    publishRegionalPlanForReview: builder.mutation<RegionalPlanVersion, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/publish-for-review?region_id=${region_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: ["RegionalPlanVersions", "RegionalPlanReview"],
    }),

    unlockRegionalReviewCorrections: builder.mutation<RegionalPlanVersion, { id: string; region_id: string; reason?: string }>({
      query: ({ id, region_id, reason }) => ({
        url: `/regional/plans/versions/${id}/unlock-review-corrections?region_id=${region_id}`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: ["RegionalPlanVersions", "RegionalPlanReview"],
    }),

    republishRegionalPlanForReview: builder.mutation<RegionalPlanVersion, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/republish-for-review?region_id=${region_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: ["RegionalPlanVersions", "RegionalPlanReview"],
    }),

    getRegionalCompleteReviewReadiness: builder.query<
      { ready: boolean; errors: string[]; review_status: string | null },
      { id: string; region_id: string }
    >({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/complete-review-readiness`,
        params: { region_id },
      }),
      transformResponse: (res: { data: { ready: boolean; errors: string[]; review_status: string | null } }) => res.data,
    }),

    completeRegionalPlanReview: builder.mutation<RegionalPlanVersion, { id: string; region_id: string; decision: "approve" | "reject" }>({
      query: ({ id, region_id, decision }) => ({
        url: `/regional/plans/versions/${id}/complete-review?region_id=${region_id}`,
        method: "POST",
        body: { decision },
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: ["RegionalPlanVersions", "RegionalPlanReview", "RegionalPlanDashboard"],
    }),

    getRegionalPlanReviewDashboard: builder.query<RegionalPlanReviewDashboard, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/review-dashboard`,
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalPlanReviewDashboard }) => res.data,
      providesTags: ["RegionalPlanReview"],
    }),

    // -------------------------------------------------------------
    // Dashboard & Metrics
    // -------------------------------------------------------------
    getRegionalExecutionDashboardSummary: builder.query<RegionalExecutionDashboardSummary, { region_id: string }>({
      query: (params) => ({
        url: "/regional/plans/dashboard/summary",
        params,
      }),
      transformResponse: (res: { data: RegionalExecutionDashboardSummary }) => res.data,
      providesTags: ["RegionalPlanDashboard"],
    }),

    getRegionalExecutionDashboardProgressTree: builder.query<
      { version: RegionalPlanVersion; tree: RegionalPlanNode[] },
      { region_id: string; plan_version_id?: string }
    >({
      query: (params) => ({
        url: "/regional/plans/dashboard/progress-tree",
        params,
      }),
      transformResponse: (res: { data: { version: RegionalPlanVersion; tree: RegionalPlanNode[] } }) => res.data,
      providesTags: ["RegionalPlanDashboard", "RegionalPlanNodes"],
    }),

    getRegionalExecutionDashboardDepartmentUser: builder.query<
      { departments: Array<{ regional_structure_id: string; name: string; level: number; assigned_nodes_count: number; avg_progress: number; status: string }> },
      { region_id: string; plan_version_id?: string }
    >({
      query: (params) => ({
        url: "/regional/plans/dashboard/department-user",
        params,
      }),
      transformResponse: (res: {
        data: {
          departments: Array<{
            regional_structure_id: string;
            name: string;
            level: number;
            assigned_nodes_count: number;
            avg_progress: number;
            status: string;
          }>;
        };
      }) => res.data,
      providesTags: ["RegionalPlanDashboard"],
    }),

    // -------------------------------------------------------------
    // Plan Versions
    // -------------------------------------------------------------
    getRegionalPlanVersions: builder.query<RegionalPlanVersion[], { region_id: string; version_kind?: string; status?: string }>({
      query: (params) => ({
        url: "/regional/plans/versions",
        params,
      }),
      transformResponse: (res: { data: RegionalPlanVersion[] }) => res.data,
      providesTags: ["RegionalPlanVersions"],
    }),

    getRegionalPlanVersionById: builder.query<RegionalPlanVersion, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}`,
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      providesTags: (_res, _err, { id }) => [{ type: "RegionalPlanVersions", id }],
    }),

    createRegionalPlanDraft: builder.mutation<RegionalPlanVersion, { region_id: string; data: Partial<RegionalPlanVersion> }>({
      query: ({ region_id, data }) => ({
        url: `/regional/plans/versions?region_id=${region_id}`,
        method: "POST",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: ["RegionalPlanVersions", "RegionalPlanDashboard"],
    }),

    updateRegionalPlanVersion: builder.mutation<RegionalPlanVersion, { id: string; region_id: string; data: Partial<RegionalPlanVersion> }>({
      query: ({ id, region_id, data }) => ({
        url: `/regional/plans/versions/${id}?region_id=${region_id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [{ type: "RegionalPlanVersions", id }, "RegionalPlanVersions"],
    }),

    deleteRegionalPlanVersion: builder.mutation<{ success: boolean }, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}?region_id=${region_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["RegionalPlanVersions", "RegionalPlanDashboard"],
    }),

    duplicateRegionalPlanDraft: builder.mutation<RegionalPlanVersion, { id: string; region_id: string; data?: { draft_name?: string } }>({
      query: ({ id, region_id, data }) => ({
        url: `/regional/plans/versions/${id}/duplicate?region_id=${region_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: ["RegionalPlanVersions"],
    }),

    // Finalization & Start Process
    getRegionalDraftFinalizationReadiness: builder.query<{ ready: boolean; errors: string[]; planning_years: number[] }, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/finalization-readiness`,
        params: { region_id },
      }),
      transformResponse: (res: { data: { ready: boolean; errors: string[]; planning_years: number[] } }) => res.data,
      providesTags: (_res, _err, { id }) => [{ type: "RegionalPlanVersions", id }],
    }),

    finalizeRegionalPlanDraft: builder.mutation<RegionalPlanVersion, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/finalize?region_id=${region_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [{ type: "RegionalPlanVersions", id }, "RegionalPlanVersions", "RegionalPlanDashboard"],
    }),

    reopenRegionalPlanDraft: builder.mutation<RegionalPlanVersion, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/reopen-for-edit?region_id=${region_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [{ type: "RegionalPlanVersions", id }, "RegionalPlanVersions", "RegionalPlanDashboard"],
    }),

    startRegionalPlanProcess: builder.mutation<RegionalPlanVersion, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/start-process?region_id=${region_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [{ type: "RegionalPlanVersions", id }, "RegionalPlanVersions", "RegionalPlanDashboard"],
    }),

    // Annual Planning
    getRegionalAnnualVersions: builder.query<RegionalPlanVersion[], { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/annual-versions`,
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalPlanVersion[] }) => res.data,
      providesTags: ["RegionalPlanVersions"],
    }),

    getRegionalAnnualTargetAllocations: builder.query<RegionalPlanNode[], { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/annual-target-allocations`,
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalPlanNode[] }) => res.data,
      providesTags: ["RegionalPlanNodes"],
    }),

    updateRegionalAnnualTarget: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; annual_target: number }>({
      query: ({ nodeId, region_id, annual_target }) => ({
        url: `/regional/plans/nodes/${nodeId}/annual-target?region_id=${region_id}`,
        method: "PATCH",
        body: { annual_target },
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes"],
    }),

    finalizeRegionalAnnualExecution: builder.mutation<RegionalPlanVersion, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/finalize-annual-execution?region_id=${region_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: ["RegionalPlanVersions"],
    }),

    // Period Planning
    getRegionalExecutionPeriods: builder.query<RegionalPlanVersion[], { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/execution-periods`,
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalPlanVersion[] }) => res.data,
      providesTags: ["RegionalPlanVersions"],
    }),

    initializeRegionalExecutionPeriods: builder.mutation<
      RegionalPlanVersion[],
      { id: string; region_id: string; subdivision_mode: string; custom_periods?: Array<{ label: string; start_month?: number; end_month?: number }> }
    >({
      query: ({ id, region_id, ...body }) => ({
        url: `/regional/plans/versions/${id}/initialize-execution-periods?region_id=${region_id}`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: RegionalPlanVersion[] }) => res.data,
      invalidatesTags: ["RegionalPlanVersions"],
    }),

    getRegionalPeriodTargetAllocations: builder.query<RegionalPlanNode[], { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/period-target-allocations`,
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalPlanNode[] }) => res.data,
      providesTags: ["RegionalPlanNodes"],
    }),

    updateRegionalPeriodTarget: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; period_target: number }>({
      query: ({ nodeId, region_id, period_target }) => ({
        url: `/regional/plans/nodes/${nodeId}/period-target?region_id=${region_id}`,
        method: "PATCH",
        body: { period_target },
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes"],
    }),

    finalizeRegionalPeriodTargets: builder.mutation<RegionalPlanVersion, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/finalize-execution-periods?region_id=${region_id}`,
        method: "POST",
      }),
      transformResponse: (res: { data: RegionalPlanVersion }) => res.data,
      invalidatesTags: ["RegionalPlanVersions"],
    }),

    // -------------------------------------------------------------
    // Hierarchy & Node Mutations
    // -------------------------------------------------------------
    getRegionalPlanHierarchy: builder.query<{ version: RegionalPlanVersion; nodes: RegionalPlanNode[] }, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/versions/${id}/hierarchy`,
        params: { region_id },
      }),
      transformResponse: (res: { data: { version: RegionalPlanVersion; nodes: RegionalPlanNode[] } }) => res.data,
      providesTags: ["RegionalPlanNodes"],
    }),

    createRegionalPlanNode: builder.mutation<RegionalPlanNode, { region_id: string; data: Partial<RegionalPlanNode> & { regional_plan_version_id: string; regional_structure_id?: string; assigned_user_id?: string } }>({
      query: ({ region_id, data }) => ({
        url: `/regional/plans/nodes?region_id=${region_id}`,
        method: "POST",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes"],
    }),

    getRegionalPlanNodeById: builder.query<RegionalPlanNode, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/nodes/${id}`,
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      providesTags: (_res, _err, { id }) => [{ type: "RegionalPlanNodes", id }],
    }),

    updateRegionalPlanNode: builder.mutation<RegionalPlanNode, { id: string; region_id: string; data: Partial<RegionalPlanNode> & { regional_structure_id?: string; assigned_user_id?: string } }>({
      query: ({ id, region_id, data }) => ({
        url: `/regional/plans/nodes/${id}?region_id=${region_id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes"],
    }),

    deleteRegionalPlanNode: builder.mutation<{ success: boolean }, { id: string; region_id: string }>({
      query: ({ id, region_id }) => ({
        url: `/regional/plans/nodes/${id}?region_id=${region_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["RegionalPlanNodes"],
    }),

    // -------------------------------------------------------------
    // Execution Reporting & Achievements
    // -------------------------------------------------------------
    updateRegionalPeriodActual: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; data: { period_actual: number; narration?: string; evidence_attachment_ids?: string[] } }>({
      query: ({ nodeId, region_id, data }) => ({
        url: `/regional/plans/nodes/${nodeId}/period-actual?region_id=${region_id}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),

    submitRegionalAchievement: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; data?: { period_actual?: number; narration?: string } }>({
      query: ({ nodeId, region_id, data }) => ({
        url: `/regional/plans/nodes/${nodeId}/achievement/submit?region_id=${region_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),

    approveRegionalAchievement: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; data?: Record<string, unknown> }>({
      query: ({ nodeId, region_id, data }) => ({
        url: `/regional/plans/nodes/${nodeId}/achievement/approve?region_id=${region_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),

    rejectRegionalAchievement: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; comment?: string }>({
      query: ({ nodeId, region_id, comment }) => ({
        url: `/regional/plans/nodes/${nodeId}/achievement/reject?region_id=${region_id}`,
        method: "POST",
        body: { comment },
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),

    validateRegionalAchievement: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; data?: Record<string, unknown> }>({
      query: ({ nodeId, region_id, data }) => ({
        url: `/regional/plans/nodes/${nodeId}/achievement/validate?region_id=${region_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),

    rejectValidationRegionalAchievement: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; comment?: string }>({
      query: ({ nodeId, region_id, comment }) => ({
        url: `/regional/plans/nodes/${nodeId}/achievement/validation-reject?region_id=${region_id}`,
        method: "POST",
        body: { comment },
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),

    submitRegionalAnnualAchievement: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; data: { annual_actual: number; narration?: string } }>({
      query: ({ nodeId, region_id, data }) => ({
        url: `/regional/plans/nodes/${nodeId}/annual-achievement/submit?region_id=${region_id}`,
        method: "POST",
        body: data,
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),

    approveRegionalAnnualAchievement: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; data?: Record<string, unknown> }>({
      query: ({ nodeId, region_id, data }) => ({
        url: `/regional/plans/nodes/${nodeId}/annual-achievement/approve?region_id=${region_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),

    rejectRegionalAnnualAchievement: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; comment?: string }>({
      query: ({ nodeId, region_id, comment }) => ({
        url: `/regional/plans/nodes/${nodeId}/annual-achievement/reject?region_id=${region_id}`,
        method: "POST",
        body: { comment },
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),

    validateRegionalAnnualAchievement: builder.mutation<RegionalPlanNode, { nodeId: string; region_id: string; data?: Record<string, unknown> }>({
      query: ({ nodeId, region_id, data }) => ({
        url: `/regional/plans/nodes/${nodeId}/annual-achievement/validate?region_id=${region_id}`,
        method: "POST",
        body: data || {},
      }),
      transformResponse: (res: { data: RegionalPlanNode }) => res.data,
      invalidatesTags: ["RegionalPlanNodes", "RegionalPlanDashboard"],
    }),
  }),
});

export const {
  useGetRegionalPlanConfigQuery,
  useUpdateRegionalPlanConfigMutation,
  useRestoreDefaultRegionalPlanConfigMutation,
  useGetRegionalPlanRulesQuery,
  useGetRegionalPlanRuleByIdQuery,
  useCreateRegionalPlanRuleMutation,
  useUpdateRegionalPlanRuleMutation,
  useDeleteRegionalPlanRuleMutation,
  useGetRegionalPerformanceColorThresholdsQuery,
  useGetRegionalPerformanceColorThresholdByIdQuery,
  useCreateRegionalPerformanceColorThresholdMutation,
  useUpdateRegionalPerformanceColorThresholdMutation,
  useDeleteRegionalPerformanceColorThresholdMutation,
  useResolveRegionalPerformanceColorQuery,
  useGetRegionalPlanVersionsForReviewQuery,
  useGetRegionalPublishForReviewReadinessQuery,
  usePublishRegionalPlanForReviewMutation,
  useUnlockRegionalReviewCorrectionsMutation,
  useRepublishRegionalPlanForReviewMutation,
  useGetRegionalCompleteReviewReadinessQuery,
  useCompleteRegionalPlanReviewMutation,
  useGetRegionalPlanReviewDashboardQuery,
  useGetRegionalExecutionDashboardSummaryQuery,
  useGetRegionalExecutionDashboardProgressTreeQuery,
  useGetRegionalExecutionDashboardDepartmentUserQuery,
  useGetRegionalPlanVersionsQuery,
  useGetRegionalPlanVersionByIdQuery,
  useCreateRegionalPlanDraftMutation,
  useUpdateRegionalPlanVersionMutation,
  useDeleteRegionalPlanVersionMutation,
  useDuplicateRegionalPlanDraftMutation,
  useGetRegionalDraftFinalizationReadinessQuery,
  useFinalizeRegionalPlanDraftMutation,
  useReopenRegionalPlanDraftMutation,
  useStartRegionalPlanProcessMutation,
  useGetRegionalAnnualVersionsQuery,
  useGetRegionalAnnualTargetAllocationsQuery,
  useUpdateRegionalAnnualTargetMutation,
  useFinalizeRegionalAnnualExecutionMutation,
  useGetRegionalExecutionPeriodsQuery,
  useInitializeRegionalExecutionPeriodsMutation,
  useGetRegionalPeriodTargetAllocationsQuery,
  useUpdateRegionalPeriodTargetMutation,
  useFinalizeRegionalPeriodTargetsMutation,
  useGetRegionalPlanHierarchyQuery,
  useCreateRegionalPlanNodeMutation,
  useGetRegionalPlanNodeByIdQuery,
  useUpdateRegionalPlanNodeMutation,
  useDeleteRegionalPlanNodeMutation,
  useUpdateRegionalPeriodActualMutation,
  useSubmitRegionalAchievementMutation,
  useApproveRegionalAchievementMutation,
  useRejectRegionalAchievementMutation,
  useValidateRegionalAchievementMutation,
  useRejectValidationRegionalAchievementMutation,
  useSubmitRegionalAnnualAchievementMutation,
  useApproveRegionalAnnualAchievementMutation,
  useRejectRegionalAnnualAchievementMutation,
  useValidateRegionalAnnualAchievementMutation,
} = regionalPlanApi;
