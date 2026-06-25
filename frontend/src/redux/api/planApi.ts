import { baseApi } from "../baseApi";
import {
    PlanVersion,
    CreatePlanVersionPayload,
    DuplicatePlanDraftPayload,
    UpdatePlanVersionPayload,
    UpdatePlanVersionStatusPayload,
    GetPlanVersionsQueryParams,
    FinalizationReadiness,
    AnnualExecutionReadiness,
    ExecutionPeriodFinalizationReadiness,
    AnnualTargetAllocation,
    GlobalPeriodTargetFinalizationReadiness,
    StartProcessReadiness,
    PlanReviewReadiness,
    PlanReviewDashboardResponse,
    PeriodTargetAllocation,
    AnnualVersionsResponse,
    ExecutionPeriodsResponse,
    PlanExecutionAccessResponse,
    PlanNode,
    CreatePlanNodePayload,
    UpdatePlanNodePayload,
    GetPlanNodesQueryParams,
    ReorderPlanNodesPayload,
    PlanNodeHierarchy,
} from "../types/plan";

export const planApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /**
         * ================= PLAN VERSIONS =================
         */

        /** ---------------------------
         * GET ALL PLAN VERSIONS
         * --------------------------- */
        getPlanVersions: builder.query<
            PlanVersion[],
            GetPlanVersionsQueryParams | void
        >({
            query: (params) => {
                if (!params) return { url: "/plan/versions" };
                const cleanParams = Object.fromEntries(
                    Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)
                );
                return Object.keys(cleanParams).length > 0
                    ? { url: "/plan/versions", params: cleanParams }
                    : { url: "/plan/versions" };
            },
            transformResponse: (response: any): PlanVersion[] =>
                response.data ?? [],
            providesTags: ["PlanVersions"],
        }),

        getPlanVersionsForReview: builder.query<
            PlanVersion[],
            Pick<GetPlanVersionsQueryParams, "search"> | void
        >({
            query: (params) => {
                if (!params?.search) {
                    return { url: "/plan/versions/for-review" };
                }
                return {
                    url: "/plan/versions/for-review",
                    params: { search: params.search },
                };
            },
            transformResponse: (response: any): PlanVersion[] =>
                response.data ?? [],
            providesTags: ["PlanVersions"],
        }),

        /** ---------------------------
         * GET PLAN VERSION BY ID
         * --------------------------- */
        getPlanVersionById: builder.query<
            PlanVersion,
            string
        >({
            query: (id) => `/plan/versions/${id}`,
            transformResponse: (response: any): PlanVersion =>
                response.data,
            providesTags: (_r, _e, id) => [
                { type: "PlanVersions", id },
            ],
        }),

        /** ---------------------------
         * CREATE PLAN VERSION
         * --------------------------- */
        createPlanVersion: builder.mutation<
            PlanVersion,
            CreatePlanVersionPayload
        >({
            query: (body) => ({
                url: "/plan/versions",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): PlanVersion =>
                response.data,
            invalidatesTags: ["PlanVersions"],
        }),

        duplicatePlanDraft: builder.mutation<PlanVersion, { id: string; data?: DuplicatePlanDraftPayload }>({
            query: ({ id, data }) => ({
                url: `/plan/versions/${id}/duplicate`,
                method: "POST",
                body: data ?? {},
            }),
            transformResponse: (response: any): PlanVersion => response.data,
            invalidatesTags: ["PlanVersions", "PlanNodes"],
        }),

        /** ---------------------------
         * UPDATE PLAN VERSION
         * --------------------------- */
        updatePlanVersion: builder.mutation<
            PlanVersion,
            { id: string; data: UpdatePlanVersionPayload }
        >({
            query: ({ id, data }) => ({
                url: `/plan/versions/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: any): PlanVersion =>
                response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanVersions", id },
                "PlanVersions",
            ],
        }),

        /** ---------------------------
         * DELETE PLAN VERSION
         * --------------------------- */
        deletePlanVersion: builder.mutation<
            { message: string },
            string
        >({
            query: (id) => ({
                url: `/plan/versions/${id}`,
                method: "DELETE",
            }),
            transformResponse: (response: any) => response,
            invalidatesTags: ["PlanVersions"],
        }),

        /** ---------------------------
         * UPDATE PLAN VERSION STATUS
         * --------------------------- */
        updatePlanVersionStatus: builder.mutation<
            PlanVersion,
            { id: string; data: UpdatePlanVersionStatusPayload }
        >({
            query: ({ id, data }) => ({
                url: `/plan/versions/${id}/status`,
                method: "PATCH",
                body: data,
            }),
            transformResponse: (response: any): PlanVersion =>
                response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanVersions", id },
                "PlanVersions",
            ],
        }),

        getFinalizationReadiness: builder.query<FinalizationReadiness, string>({
            query: (id) => `/plan/versions/${id}/finalization-readiness`,
            transformResponse: (response: { data: FinalizationReadiness }) => response.data,
        }),

        finalizePlanDraft: builder.mutation<
            { data: PlanVersion; annualVersions: PlanVersion[] },
            string
        >({
            query: (id) => ({
                url: `/plan/versions/${id}/finalize`,
                method: "POST",
            }),
            transformResponse: (response: {
                data: PlanVersion;
                annualVersions: PlanVersion[];
            }) => response,
            invalidatesTags: (_r, _e, id) => [
                { type: "PlanVersions", id },
                "PlanVersions",
                "PlanNodes",
                "AnnualTargetAllocations",
                "PeriodTargetAllocations",
            ],
        }),

        reopenFinalizedPlanForEdit: builder.mutation<PlanVersion, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/reopen-for-edit`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: (_r, _e, id) => [
                { type: "PlanVersions", id },
                "PlanVersions",
                "PlanNodes",
                "AnnualTargetAllocations",
                "PeriodTargetAllocations",
            ],
        }),

        getAnnualVersions: builder.query<AnnualVersionsResponse, string>({
            query: (id) => `/plan/versions/${id}/annual-versions`,
            transformResponse: (response: { data: AnnualVersionsResponse }) => response.data,
            providesTags: (_r, _e, id) => [{ type: "PlanVersions", id }],
        }),

        getAnnualTargetAllocations: builder.query<AnnualTargetAllocation[], string>({
            query: (id) => `/plan/versions/${id}/annual-target-allocations`,
            transformResponse: (response: { data: AnnualTargetAllocation[] }) => response.data,
            providesTags: (_r, _e, id) => [{ type: "AnnualTargetAllocations", id }],
        }),

        getAnnualExecutionReadiness: builder.query<AnnualExecutionReadiness, string>({
            query: (id) => `/plan/versions/${id}/annual-execution-readiness`,
            transformResponse: (response: { data: AnnualExecutionReadiness }) => response.data,
        }),

        finalizeAnnualExecution: builder.mutation<
            { data: PlanVersion; activatedVersion?: PlanVersion },
            string
        >({
            query: (id) => ({
                url: `/plan/versions/${id}/finalize-annual-execution`,
                method: "POST",
            }),
            transformResponse: (response: {
                data: PlanVersion;
                activatedVersion?: PlanVersion;
            }) => response,
            invalidatesTags: ["PlanVersions", "PlanNodes"],
        }),

        lockAnnualVersion: builder.mutation<PlanVersion, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/lock-annual`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions"],
        }),

        unlockAnnualVersion: builder.mutation<PlanVersion, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/unlock-annual`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions"],
        }),

        completeAnnualVersion: builder.mutation<
            PlanVersion,
            string
        >({
            query: (id) => ({
                url: `/plan/versions/${id}/complete-annual`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions"],
        }),

        updateAnnualTarget: builder.mutation<
            PlanNode,
            { id: string; annual_target: number | null }
        >({
            query: ({ id, annual_target }) => ({
                url: `/plan/nodes/${id}/annual-target`,
                method: "PATCH",
                body: { annual_target },
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "AnnualTargetAllocations",
                "PeriodTargetAllocations",
            ],
        }),

        getExecutionPeriods: builder.query<ExecutionPeriodsResponse, string>({
            query: (id) => `/plan/versions/${id}/execution-periods`,
            transformResponse: (response: { data: ExecutionPeriodsResponse }) => response.data,
            providesTags: (_r, _e, id) => [{ type: "PlanVersions", id }],
        }),

        getExecutionPeriodFinalizationReadiness: builder.query<
            ExecutionPeriodFinalizationReadiness,
            string
        >({
            query: (id) => `/plan/versions/${id}/execution-period-readiness`,
            transformResponse: (response: { data: ExecutionPeriodFinalizationReadiness }) =>
                response.data,
        }),

        initializeExecutionPeriods: builder.mutation<
            { data: PlanVersion; executionPeriods: PlanVersion[] },
            { id: string; subdivision_mode: "quarterly" | "semi_annual" | "custom"; custom_periods?: { label: string }[] }
        >({
            query: ({ id, subdivision_mode, custom_periods }) => ({
                url: `/plan/versions/${id}/initialize-execution-periods`,
                method: "POST",
                body: { subdivision_mode, custom_periods },
            }),
            transformResponse: (response: {
                data: PlanVersion;
                executionPeriods: PlanVersion[];
            }) => response,
            invalidatesTags: ["PlanVersions", "PlanNodes"],
        }),

        finalizeExecutionPeriodTargets: builder.mutation<{ data: PlanVersion }, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/finalize-execution-periods`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response,
            invalidatesTags: ["PlanVersions", "PlanNodes"],
        }),

        completeExecutionPeriod: builder.mutation<
            PlanVersion,
            string
        >({
            query: (id) => ({
                url: `/plan/versions/${id}/complete-period`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions"],
        }),

        updatePeriodTarget: builder.mutation<
            PlanNode,
            { id: string; period_target: number | null }
        >({
            query: ({ id, period_target }) => ({
                url: `/plan/nodes/${id}/period-target`,
                method: "PATCH",
                body: { period_target },
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PeriodTargetAllocations",
            ],
        }),

        updatePeriodActual: builder.mutation<
            PlanNode,
            {
                id: string;
                period_actual: number | null;
                use_parent_override?: boolean;
                clear_parent_override?: boolean;
            }
        >({
            query: ({ id, period_actual, use_parent_override, clear_parent_override }) => ({
                url: `/plan/nodes/${id}/period-actual`,
                method: "PATCH",
                body: { period_actual, use_parent_override, clear_parent_override },
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        getPeriodTargetAllocations: builder.query<PeriodTargetAllocation[], string>({
            query: (id) => `/plan/versions/${id}/period-target-allocations`,
            transformResponse: (response: { data: PeriodTargetAllocation[] }) => response.data,
            providesTags: (_r, _e, id) => [{ type: "PeriodTargetAllocations", id }],
        }),

        getGlobalPeriodTargetFinalizationReadiness: builder.query<
            GlobalPeriodTargetFinalizationReadiness,
            string
        >({
            query: (id) => `/plan/versions/${id}/global-period-target-readiness`,
            transformResponse: (response: { data: GlobalPeriodTargetFinalizationReadiness }) =>
                response.data,
        }),

        finalizeGlobalPeriodTargets: builder.mutation<PlanVersion, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/finalize-global-period-targets`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions", "PlanNodes", "PeriodTargetAllocations"],
        }),

        getExecutionAccess: builder.query<PlanExecutionAccessResponse, string>({
            query: (id) => `/plan/versions/${id}/execution-access`,
            transformResponse: (response: { data: PlanExecutionAccessResponse }) => response.data,
        }),

        getStartProcessReadiness: builder.query<StartProcessReadiness, string>({
            query: (id) => `/plan/versions/${id}/start-process-readiness`,
            transformResponse: (response: { data: StartProcessReadiness }) => response.data,
        }),

        startPlanProcess: builder.mutation<PlanVersion, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/start-process`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions"],
        }),

        getPublishForReviewReadiness: builder.query<PlanReviewReadiness, string>({
            query: (id) => `/plan/versions/${id}/publish-for-review-readiness`,
            transformResponse: (response: { data: PlanReviewReadiness }) => response.data,
        }),

        publishForReview: builder.mutation<PlanVersion, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/publish-for-review`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions", "Issues", "IssueDashboard"],
        }),

        unlockReviewCorrections: builder.mutation<PlanVersion, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/unlock-review-corrections`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions"],
        }),

        republishForReview: builder.mutation<PlanVersion, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/republish-for-review`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions", "Issues", "IssueDashboard"],
        }),

        getCompleteReviewReadiness: builder.query<PlanReviewReadiness, string>({
            query: (id) => `/plan/versions/${id}/complete-review-readiness`,
            transformResponse: (response: { data: PlanReviewReadiness }) => response.data,
        }),

        completeReview: builder.mutation<PlanVersion, string>({
            query: (id) => ({
                url: `/plan/versions/${id}/complete-review`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanVersion }) => response.data,
            invalidatesTags: ["PlanVersions"],
        }),

        getPlanReviewDashboard: builder.query<
            PlanReviewDashboardResponse,
            { masterId: string; status?: string; issue_category_id?: string; issue_priority_id?: string; raised_by?: string; assigned_to?: string }
        >({
            query: ({ masterId, ...params }) => ({
                url: `/plan/versions/${masterId}/review-dashboard`,
                params,
            }),
            transformResponse: (response: { data: PlanReviewDashboardResponse }) => response.data,
            providesTags: ["Issues", "IssueDashboard"],
        }),

        /**
         * ================= PLAN NODES =================
         */

        /** ---------------------------
         * GET ALL PLAN NODES
         * --------------------------- */
        getPlanNodes: builder.query<
            PlanNode[],
            GetPlanNodesQueryParams
        >({
            query: (params) => ({
                url: "/plan/nodes",
                params,
            }),
            transformResponse: (response: any): PlanNode[] =>
                response.data ?? [],
            providesTags: (result) => [
                "PlanNodes",
                ...(result?.map(({ plan_node_id }) => ({ type: "PlanNodes" as const, id: plan_node_id })) ?? []),
            ],
        }),

        /** ---------------------------
         * GET PLAN NODE BY ID
         * --------------------------- */
        getPlanNodeById: builder.query<
            PlanNode,
            string
        >({
            query: (id) => `/plan/nodes/${id}`,
            transformResponse: (response: any): PlanNode =>
                response.data,
            providesTags: (_r, _e, id) => [
                { type: "PlanNodes", id },
            ],
        }),

        /** ---------------------------
         * CREATE PLAN NODE
         * --------------------------- */
        createPlanNode: builder.mutation<
            PlanNode,
            CreatePlanNodePayload
        >({
            query: (body) => ({
                url: "/plan/nodes",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): PlanNode =>
                response.data,
            invalidatesTags: [
                "PlanNodes",
                "PlanVersions",
                "AnnualTargetAllocations",
                "PeriodTargetAllocations",
            ],
        }),

        /** ---------------------------
         * UPDATE PLAN NODE
         * --------------------------- */
        updatePlanNode: builder.mutation<
            PlanNode,
            { id: string; data: UpdatePlanNodePayload }
        >({
            query: ({ id, data }) => ({
                url: `/plan/nodes/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: any): PlanNode =>
                response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "AnnualTargetAllocations",
                "PeriodTargetAllocations",
            ],
        }),

        /** ---------------------------
         * DELETE PLAN NODE
         * --------------------------- */
        deletePlanNode: builder.mutation<
            { message: string },
            string
        >({
            query: (id) => ({
                url: `/plan/nodes/${id}`,
                method: "DELETE",
            }),
            transformResponse: (response: any) => response,
            invalidatesTags: [
                "PlanNodes",
                "AnnualTargetAllocations",
                "PeriodTargetAllocations",
            ],
        }),

        /** ---------------------------
         * GET PLAN HIERARCHY
         * --------------------------- */
        getPlanHierarchy: builder.query<
            PlanNodeHierarchy[],
            string
        >({
            query: (plan_version_id) => `/plan/hierarchy/${plan_version_id}`,
            transformResponse: (response: any): PlanNodeHierarchy[] =>
                response.data ?? [],
            providesTags: ["PlanNodes"],
        }),

        /** ---------------------------
         * REORDER PLAN NODES
         * --------------------------- */
        reorderPlanNodes: builder.mutation<
            { message: string },
            ReorderPlanNodesPayload
        >({
            query: (body) => ({
                url: "/plan/nodes/reorder",
                method: "POST",
                body,
            }),
            transformResponse: (response: any) => response,
            invalidatesTags: [
                "PlanNodes",
                "AnnualTargetAllocations",
                "PeriodTargetAllocations",
            ],
        }),
    }),
});

export const {
    // Plan Versions
    useGetPlanVersionsQuery,
    useGetPlanVersionsForReviewQuery,
    useGetPlanVersionByIdQuery,
    useCreatePlanVersionMutation,
    useDuplicatePlanDraftMutation,
    useUpdatePlanVersionMutation,
    useDeletePlanVersionMutation,
    useUpdatePlanVersionStatusMutation,
    useGetFinalizationReadinessQuery,
    useFinalizePlanDraftMutation,
    useReopenFinalizedPlanForEditMutation,
    useGetAnnualVersionsQuery,
    useGetAnnualTargetAllocationsQuery,
    useGetAnnualExecutionReadinessQuery,
    useFinalizeAnnualExecutionMutation,
    useLockAnnualVersionMutation,
    useUnlockAnnualVersionMutation,
    useCompleteAnnualVersionMutation,
    useUpdateAnnualTargetMutation,
    useGetExecutionPeriodsQuery,
    useGetExecutionPeriodFinalizationReadinessQuery,
    useInitializeExecutionPeriodsMutation,
    useFinalizeExecutionPeriodTargetsMutation,
    useCompleteExecutionPeriodMutation,
    useUpdatePeriodTargetMutation,
    useUpdatePeriodActualMutation,
    useGetPeriodTargetAllocationsQuery,
    useGetGlobalPeriodTargetFinalizationReadinessQuery,
    useFinalizeGlobalPeriodTargetsMutation,
    useGetStartProcessReadinessQuery,
    useGetExecutionAccessQuery,
    useStartPlanProcessMutation,
    useGetPublishForReviewReadinessQuery,
    usePublishForReviewMutation,
    useUnlockReviewCorrectionsMutation,
    useRepublishForReviewMutation,
    useGetCompleteReviewReadinessQuery,
    useCompleteReviewMutation,
    useGetPlanReviewDashboardQuery,

    // Plan Nodes
    useGetPlanNodesQuery,
    useGetPlanNodeByIdQuery,
    useCreatePlanNodeMutation,
    useUpdatePlanNodeMutation,
    useDeletePlanNodeMutation,
    useGetPlanHierarchyQuery,
    useReorderPlanNodesMutation,
} = planApi;