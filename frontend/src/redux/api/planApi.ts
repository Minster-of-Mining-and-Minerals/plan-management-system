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
    PlanAchievementWorkflowScope,
    PlanNode,
    CreatePlanNodePayload,
    UpdatePlanNodePayload,
    GetPlanNodesQueryParams,
    ReorderPlanNodesPayload,
    PlanNodeHierarchy,
    TargetReallocationRequest,
    CreateTargetReallocationPayload,
    ListTargetReallocationsParams,
    ListTargetReallocationsResponse,
    PeriodTargetReallocationReportingResponse,
    PlanAmendment,
    CreateAnnualTargetRevisionPayload,
    AnnualTargetRevisionReportingResponse,
    CreateKpiAdditionPayload,
    KpiAdditionReportingResponse,
    CreateExecutionWindowReopeningPayload,
    ExecutionWindowReopeningReportingResponse,
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

        getPlanExecutionDashboard: builder.query<
            import("@/features/plan-management/dashboard/types").PlanExecutionDashboardResponse,
            {
                government_structure_id?: string;
                master_plan_version_id?: string;
                period_version_id?: string;
                status?: string;
                sharing_mode?: string;
                search?: string;
                date_from?: string;
                date_to?: string;
            } | void
        >({
            query: (params) => {
                if (!params) return { url: "/plan/execution-dashboard" };
                const cleanParams = Object.fromEntries(
                    Object.entries(params).filter(
                        ([, value]) => value !== "" && value != null && value !== "all" && value !== "auto"
                    )
                );
                return Object.keys(cleanParams).length > 0
                    ? { url: "/plan/execution-dashboard", params: cleanParams }
                    : { url: "/plan/execution-dashboard" };
            },
            transformResponse: (response: {
                data: import("@/features/plan-management/dashboard/types").PlanExecutionDashboardResponse;
            }) => response.data,
            providesTags: ["PlanExecutionDashboard"],
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
            { id: string; subdivision_mode: "quarterly" | "semi_annual" | "monthly" | "custom"; custom_periods?: { label: string }[] }
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
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        submitAchievement: builder.mutation<
            PlanNode,
            { id: string; period_actual: number | null; narration?: string | null }
        >({
            query: ({ id, period_actual, narration }) => ({
                url: `/plan/nodes/${id}/achievement/submit`,
                method: "POST",
                body: { period_actual, narration },
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        submitAnnualAchievement: builder.mutation<
            PlanNode,
            { id: string; annual_actual: number | null; narration?: string | null }
        >({
            query: ({ id, annual_actual, narration }) => ({
                url: `/plan/nodes/${id}/annual-achievement/submit`,
                method: "POST",
                body: { annual_actual, narration },
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        approveAnnualAchievement: builder.mutation<PlanNode, { id: string }>({
            query: ({ id }) => ({
                url: `/plan/nodes/${id}/annual-achievement/approve`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        validateAnnualAchievement: builder.mutation<PlanNode, { id: string }>({
            query: ({ id }) => ({
                url: `/plan/nodes/${id}/annual-achievement/validate`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        rejectAnnualAchievement: builder.mutation<
            PlanNode,
            { id: string; comment?: string | null }
        >({
            query: ({ id, comment }) => ({
                url: `/plan/nodes/${id}/annual-achievement/reject`,
                method: "POST",
                body: { comment },
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        rejectValidationAnnualAchievement: builder.mutation<
            PlanNode,
            { id: string; comment?: string | null }
        >({
            query: ({ id, comment }) => ({
                url: `/plan/nodes/${id}/annual-achievement/validation-reject`,
                method: "POST",
                body: { comment },
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        approveAchievement: builder.mutation<PlanNode, { id: string }>({
            query: ({ id }) => ({
                url: `/plan/nodes/${id}/achievement/approve`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        rejectAchievement: builder.mutation<
            PlanNode,
            { id: string; comment?: string | null }
        >({
            query: ({ id, comment }) => ({
                url: `/plan/nodes/${id}/achievement/reject`,
                method: "POST",
                body: { comment },
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        validateAchievement: builder.mutation<PlanNode, { id: string }>({
            query: ({ id }) => ({
                url: `/plan/nodes/${id}/achievement/validate`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
                { type: "PlanVersions", id: "LIST" },
            ],
        }),

        rejectValidationAchievement: builder.mutation<
            PlanNode,
            { id: string; comment?: string | null }
        >({
            query: ({ id, comment }) => ({
                url: `/plan/nodes/${id}/achievement/validation-reject`,
                method: "POST",
                body: { comment },
            }),
            transformResponse: (response: { data: PlanNode }) => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanNodes", id },
                "PlanNodes",
                "PlanVersions",
                "PlanExecutionDashboard",
                "PlanAchievementWorkflowScope",
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

        getPlanAchievementWorkflowScope: builder.query<PlanAchievementWorkflowScope, string>({
            query: (id) => `/plan/versions/${id}/achievement-workflow-scope`,
            transformResponse: (response: { data: PlanAchievementWorkflowScope }) => response.data,
            providesTags: (_r, _e, id) => [{ type: "PlanAchievementWorkflowScope", id }],
        }),

        getSectorAggregationPublishes: builder.query<
            {
                plan_version_id: string;
                has_sector_publish_gate: boolean;
                branches: Array<{
                    external_assignment_id: string;
                    government_structure_id: string;
                    government_structure_name: string;
                    plan_node_id: string;
                    has_gate: boolean;
                    status: "pending" | "published" | "rejected";
                    published_at: string | null;
                    published_by: string | null;
                    rejection_comment: string | null;
                }>;
            },
            string
        >({
            query: (id) => `/plan/versions/${id}/sector-aggregation-publishes`,
            transformResponse: (response: { data: any }) => response.data,
            providesTags: (_r, _e, id) => [
                { type: "PlanAchievementWorkflowScope", id },
                { type: "PlanNodes", id },
            ],
        }),

        publishSectorAggregation: builder.mutation<
            unknown,
            { versionId: string; external_assignment_id: string }
        >({
            query: ({ versionId, external_assignment_id }) => ({
                url: `/plan/versions/${versionId}/sector-aggregation-publishes/publish`,
                method: "POST",
                body: { external_assignment_id },
            }),
            invalidatesTags: (_r, _e, arg) => [
                { type: "PlanAchievementWorkflowScope", id: arg.versionId },
                "PlanNodes",
            ],
        }),

        rejectSectorAggregationPublish: builder.mutation<
            unknown,
            { versionId: string; external_assignment_id: string; comment?: string }
        >({
            query: ({ versionId, external_assignment_id, comment }) => ({
                url: `/plan/versions/${versionId}/sector-aggregation-publishes/reject`,
                method: "POST",
                body: { external_assignment_id, comment },
            }),
            invalidatesTags: (_r, _e, arg) => [
                { type: "PlanAchievementWorkflowScope", id: arg.versionId },
                "PlanNodes",
            ],
        }),

        getTargetReallocations: builder.query<
            ListTargetReallocationsResponse,
            ListTargetReallocationsParams | void
        >({
            query: (params) => {
                if (!params) return { url: "/plan/target-reallocations" };
                const cleanParams = Object.fromEntries(
                    Object.entries(params).filter(
                        ([, v]) => v !== "" && v !== null && v !== undefined
                    )
                );
                return Object.keys(cleanParams).length > 0
                    ? { url: "/plan/target-reallocations", params: cleanParams }
                    : { url: "/plan/target-reallocations" };
            },
            transformResponse: (response: {
                data: TargetReallocationRequest[];
                pagination: ListTargetReallocationsResponse["pagination"];
            }): ListTargetReallocationsResponse => ({
                data: response.data ?? [],
                pagination: response.pagination ?? {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0,
                },
            }),
            providesTags: ["TargetReallocations"],
        }),

        createTargetReallocation: builder.mutation<
            TargetReallocationRequest,
            CreateTargetReallocationPayload
        >({
            query: (body) => ({
                url: "/plan/target-reallocations",
                method: "POST",
                body,
            }),
            transformResponse: (response: { data: TargetReallocationRequest }) =>
                response.data,
            invalidatesTags: [
                "TargetReallocations",
                "PeriodTargetReallocationReporting",
            ],
        }),

        approveTargetReallocation: builder.mutation<
            TargetReallocationRequest,
            { id: string; comment?: string | null }
        >({
            query: ({ id, comment }) => ({
                url: `/plan/target-reallocations/${id}/approve`,
                method: "POST",
                body: { comment },
            }),
            transformResponse: (response: { data: TargetReallocationRequest }) =>
                response.data,
            invalidatesTags: [
                "TargetReallocations",
                "PeriodTargetReallocationReporting",
                "PlanNodes",
                "PeriodTargetAllocations",
                "PlanVersions",
            ],
        }),

        rejectTargetReallocation: builder.mutation<
            TargetReallocationRequest,
            { id: string; comment: string }
        >({
            query: ({ id, comment }) => ({
                url: `/plan/target-reallocations/${id}/reject`,
                method: "POST",
                body: { comment },
            }),
            transformResponse: (response: { data: TargetReallocationRequest }) =>
                response.data,
            invalidatesTags: ["TargetReallocations"],
        }),

        cancelTargetReallocation: builder.mutation<
            TargetReallocationRequest,
            { id: string }
        >({
            query: ({ id }) => ({
                url: `/plan/target-reallocations/${id}/cancel`,
                method: "POST",
            }),
            transformResponse: (response: { data: TargetReallocationRequest }) =>
                response.data,
            invalidatesTags: ["TargetReallocations"],
        }),

        getPeriodTargetReallocationReporting: builder.query<
            PeriodTargetReallocationReportingResponse,
            { versionId: string; kpiId?: string }
        >({
            query: ({ versionId, kpiId }) => ({
                url: `/plan/versions/${versionId}/period-target-reallocation-reporting`,
                params: kpiId ? { kpiId } : undefined,
            }),
            transformResponse: (response: {
                data: PeriodTargetReallocationReportingResponse;
            }) =>
                response.data ?? {
                    master_plan_version_id: "",
                    has_execution_snapshot: false,
                    items: [],
                },
            providesTags: (_r, _e, { versionId }) => [
                { type: "PeriodTargetReallocationReporting", id: versionId },
                "PeriodTargetReallocationReporting",
            ],
        }),

        getPlanAmendments: builder.query<
            {
                data: PlanAmendment[];
                pagination: {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                };
            },
            {
                draftId?: string;
                amendmentType?: string;
                status?: string;
                page?: number;
                limit?: number;
            } | void
        >({
            query: (params) => {
                if (!params) return { url: "/plan/plan-amendments" };
                const cleanParams = Object.fromEntries(
                    Object.entries(params).filter(
                        ([, v]) => v != null && v !== ""
                    )
                );
                return { url: "/plan/plan-amendments", params: cleanParams };
            },
            transformResponse: (response: {
                data?: PlanAmendment[];
                pagination?: {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                };
            }) => ({
                data: response.data ?? [],
                pagination: response.pagination ?? {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0,
                },
            }),
            providesTags: ["PlanAmendments"],
        }),

        getPlanAmendmentById: builder.query<PlanAmendment, string>({
            query: (id) => ({ url: `/plan/plan-amendments/${id}` }),
            transformResponse: (response: { data: PlanAmendment }) =>
                response.data,
            providesTags: (_r, _e, id) => [
                { type: "PlanAmendments", id },
                "PlanAmendments",
            ],
        }),

        createAnnualTargetRevision: builder.mutation<
            PlanAmendment,
            CreateAnnualTargetRevisionPayload
        >({
            query: (payload) => ({
                url: "/plan/plan-amendments",
                method: "POST",
                body: {
                    draftId: payload.draftId,
                    title: payload.title,
                    reason: payload.reason,
                    description: payload.description,
                    effectiveMode: payload.effectiveMode ?? "immediate",
                    effectiveDate: payload.effectiveDate ?? null,
                    amendmentType: "annual_target_revision",
                    submit: payload.submit !== false,
                    metadata: {
                        kpiId: payload.kpiId,
                        revisedAnnualTarget: payload.revisedAnnualTarget,
                        redistributionMode: payload.redistributionMode,
                        periodAllocations: payload.periodAllocations ?? [],
                        reason: payload.reason,
                        reasonCode: payload.reasonCode,
                        description: payload.description,
                    },
                },
            }),
            transformResponse: (response: { data: PlanAmendment }) =>
                response.data,
            invalidatesTags: [
                "PlanAmendments",
                "AnnualTargetRevisionReporting",
                "PlanNodes",
            ],
        }),

        createKpiAddition: builder.mutation<
            PlanAmendment,
            CreateKpiAdditionPayload
        >({
            query: (payload) => ({
                url: "/plan/plan-amendments",
                method: "POST",
                body: {
                    draftId: payload.draftId,
                    title: payload.title,
                    reason: payload.reason,
                    description: payload.description,
                    effectiveMode: payload.effectiveMode ?? "immediate",
                    effectiveDate: payload.effectiveDate ?? null,
                    amendmentType: payload.amendmentType ?? "kpi_addition",
                    submit: payload.submit !== false,
                    metadata: {
                        parentId: payload.parentId,
                        annualVersionId: payload.annualVersionId,
                        title: payload.kpiTitle,
                        description: payload.kpiDescription,
                        weight: payload.weight ?? 0,
                        contributionWeight: payload.contributionWeight ?? null,
                        annualTarget: payload.annualTarget ?? null,
                        startPeriodId: payload.startPeriodId ?? null,
                        endPeriodId: payload.endPeriodId ?? null,
                        periodAllocations: payload.periodAllocations ?? [],
                        weightRedistributionMode: payload.weightRedistributionMode,
                        siblingWeightAdjustments:
                            payload.siblingWeightAdjustments ?? [],
                        ownerUserId: payload.ownerUserId ?? null,
                        governmentStructureId: payload.governmentStructureId ?? null,
                        internalStructureId: payload.internalStructureId ?? null,
                        reason: payload.reason,
                        reasonCode: payload.reasonCode,
                        effectiveDate: payload.effectiveDate,
                        targetAllocationMode:
                            payload.targetAllocationMode ?? "divisible",
                        achievementMode: payload.achievementMode ?? "period",
                    },
                },
            }),
            transformResponse: (response: { data: PlanAmendment }) =>
                response.data,
            invalidatesTags: [
                "PlanAmendments",
                "KpiAdditionReporting",
                "PlanNodes",
            ],
        }),

        createExecutionWindowReopening: builder.mutation<
            PlanAmendment,
            CreateExecutionWindowReopeningPayload
        >({
            query: (payload) => ({
                url: "/plan/plan-amendments",
                method: "POST",
                body: {
                    draftId: payload.draftId,
                    title: payload.title,
                    reason: payload.reason,
                    description: payload.description,
                    effectiveMode: payload.effectiveMode ?? "immediate",
                    effectiveDate: payload.effectiveDate ?? null,
                    amendmentType: "execution_window_reopening",
                    submit: payload.submit !== false,
                    metadata: {
                        annualVersionId: payload.annualVersionId,
                        periodVersionIds: payload.periodVersionIds,
                        reopenStart: payload.reopenStart,
                        reopenEnd: payload.reopenEnd,
                        reason: payload.reason,
                        reasonCode: payload.reasonCode,
                        description: payload.description,
                        kpiPlanNodeId: payload.kpiPlanNodeId ?? null,
                        goalPlanNodeId: payload.goalPlanNodeId ?? null,
                        governmentStructureId: payload.governmentStructureId ?? null,
                    },
                },
            }),
            transformResponse: (response: { data: PlanAmendment }) =>
                response.data,
            invalidatesTags: [
                "PlanAmendments",
                "ExecutionWindowReopeningReporting",
            ],
        }),

        submitPlanAmendment: builder.mutation<PlanAmendment, string>({
            query: (id) => ({
                url: `/plan/plan-amendments/${id}/submit`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanAmendment }) =>
                response.data,
            invalidatesTags: ["PlanAmendments"],
        }),

        previewPlanAmendment: builder.query<
            {
                amendment: PlanAmendment;
                preview: unknown;
                legacy_preview?: unknown;
            },
            string
        >({
            query: (id) => ({ url: `/plan/plan-amendments/${id}/preview` }),
            transformResponse: (response: {
                data: {
                    amendment: PlanAmendment;
                    preview: unknown;
                    legacy_preview?: unknown;
                };
            }) => response.data,
        }),

        approvePlanAmendment: builder.mutation<
            PlanAmendment,
            { id: string; comment?: string }
        >({
            query: ({ id, comment }) => ({
                url: `/plan/plan-amendments/${id}/approve`,
                method: "POST",
                body: comment ? { comment } : {},
            }),
            transformResponse: (response: { data: PlanAmendment }) =>
                response.data,
            invalidatesTags: [
                "PlanAmendments",
                "AnnualTargetRevisionReporting",
                "KpiAdditionReporting",
                "ExecutionWindowReopeningReporting",
                "PlanNodes",
                "PeriodTargetAllocations",
                "AnnualTargetAllocations",
            ],
        }),

        rejectPlanAmendment: builder.mutation<
            PlanAmendment,
            { id: string; comment: string }
        >({
            query: ({ id, comment }) => ({
                url: `/plan/plan-amendments/${id}/reject`,
                method: "POST",
                body: { comment },
            }),
            transformResponse: (response: { data: PlanAmendment }) =>
                response.data,
            invalidatesTags: ["PlanAmendments"],
        }),

        cancelPlanAmendment: builder.mutation<PlanAmendment, string>({
            query: (id) => ({
                url: `/plan/plan-amendments/${id}/cancel`,
                method: "POST",
            }),
            transformResponse: (response: { data: PlanAmendment }) =>
                response.data,
            invalidatesTags: ["PlanAmendments"],
        }),

        getAnnualTargetRevisionReporting: builder.query<
            AnnualTargetRevisionReportingResponse,
            { versionId: string; kpiId?: string }
        >({
            query: ({ versionId, kpiId }) => ({
                url: `/plan/versions/${versionId}/annual-target-revision-reporting`,
                params: kpiId ? { kpiId } : undefined,
            }),
            transformResponse: (response: {
                data: AnnualTargetRevisionReportingResponse;
            }) =>
                response.data ?? {
                    draft_id: "",
                    process_started: false,
                    kpis: [],
                    applied_revisions: [],
                },
            providesTags: (_r, _e, { versionId }) => [
                { type: "AnnualTargetRevisionReporting", id: versionId },
                "AnnualTargetRevisionReporting",
            ],
        }),

        getKpiAdditionReporting: builder.query<
            KpiAdditionReportingResponse,
            { versionId: string }
        >({
            query: ({ versionId }) => ({
                url: `/plan/versions/${versionId}/kpi-addition-reporting`,
            }),
            transformResponse: (response: {
                data: KpiAdditionReportingResponse;
            }) =>
                response.data ?? {
                    draft_id: "",
                    process_started: false,
                    added_kpis: [],
                },
            providesTags: (_r, _e, { versionId }) => [
                { type: "KpiAdditionReporting", id: versionId },
                "KpiAdditionReporting",
            ],
        }),

        getExecutionWindowReopeningReporting: builder.query<
            ExecutionWindowReopeningReportingResponse,
            { versionId: string }
        >({
            query: ({ versionId }) => ({
                url: `/plan/versions/${versionId}/execution-window-reopening-reporting`,
            }),
            transformResponse: (response: {
                data: ExecutionWindowReopeningReportingResponse;
            }) =>
                response.data ?? {
                    draft_id: "",
                    process_started: false,
                    periods: [],
                    applied_reopenings: [],
                },
            providesTags: (_r, _e, { versionId }) => [
                { type: "ExecutionWindowReopeningReporting", id: versionId },
                "ExecutionWindowReopeningReporting",
            ],
        }),

        getPlanAmendmentTypes: builder.query<
            {
                available: string[];
                catalog: Array<{
                    type: string;
                    label: string;
                    available: boolean;
                }>;
                annual_target_revision_reasons: Array<{
                    code: string;
                    label: string;
                }>;
                execution_window_reopening_reasons: Array<{
                    code: string;
                    label: string;
                }>;
            },
            void
        >({
            query: () => ({ url: "/plan/plan-amendments/types" }),
            transformResponse: (response: {
                data: {
                    available: string[];
                    catalog: Array<{
                        type: string;
                        label: string;
                        available: boolean;
                    }>;
                    annual_target_revision_reasons: Array<{
                        code: string;
                        label: string;
                    }>;
                    execution_window_reopening_reasons: Array<{
                        code: string;
                        label: string;
                    }>;
                };
            }) => response.data,
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
    useGetPlanExecutionDashboardQuery,
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
    useSubmitAchievementMutation,
    useSubmitAnnualAchievementMutation,
    useApproveAnnualAchievementMutation,
    useRejectAnnualAchievementMutation,
    useValidateAnnualAchievementMutation,
    useRejectValidationAnnualAchievementMutation,
    useApproveAchievementMutation,
    useRejectAchievementMutation,
    useValidateAchievementMutation,
    useRejectValidationAchievementMutation,
    useGetPeriodTargetAllocationsQuery,
    useGetGlobalPeriodTargetFinalizationReadinessQuery,
    useFinalizeGlobalPeriodTargetsMutation,
    useGetStartProcessReadinessQuery,
    useGetExecutionAccessQuery,
    useGetPlanAchievementWorkflowScopeQuery,
    useGetSectorAggregationPublishesQuery,
    usePublishSectorAggregationMutation,
    useRejectSectorAggregationPublishMutation,
    useGetTargetReallocationsQuery,
    useCreateTargetReallocationMutation,
    useApproveTargetReallocationMutation,
    useRejectTargetReallocationMutation,
    useCancelTargetReallocationMutation,
    useGetPeriodTargetReallocationReportingQuery,
    useGetPlanAmendmentsQuery,
    useGetPlanAmendmentByIdQuery,
    useCreateAnnualTargetRevisionMutation,
    useCreateKpiAdditionMutation,
    useCreateExecutionWindowReopeningMutation,
    useSubmitPlanAmendmentMutation,
    useLazyPreviewPlanAmendmentQuery,
    useApprovePlanAmendmentMutation,
    useRejectPlanAmendmentMutation,
    useCancelPlanAmendmentMutation,
    useGetAnnualTargetRevisionReportingQuery,
    useGetKpiAdditionReportingQuery,
    useGetExecutionWindowReopeningReportingQuery,
    useGetPlanAmendmentTypesQuery,
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