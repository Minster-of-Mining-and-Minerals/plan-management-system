import { baseApi } from "../baseApi";
import {
    PlanVersion,
    CreatePlanVersionPayload,
    UpdatePlanVersionPayload,
    UpdatePlanVersionStatusPayload,
    GetPlanVersionsQueryParams,
    FinalizationReadiness,
    AnnualVersionsResponse,
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
            ],
        }),

        getAnnualVersions: builder.query<AnnualVersionsResponse, string>({
            query: (id) => `/plan/versions/${id}/annual-versions`,
            transformResponse: (response: { data: AnnualVersionsResponse }) => response.data,
            providesTags: (_r, _e, id) => [{ type: "PlanVersions", id }],
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
            ],
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
            invalidatesTags: ["PlanNodes", "PlanVersions"],
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
            invalidatesTags: ["PlanNodes"],
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
            invalidatesTags: ["PlanNodes"],
        }),
    }),
});

export const {
    // Plan Versions
    useGetPlanVersionsQuery,
    useGetPlanVersionByIdQuery,
    useCreatePlanVersionMutation,
    useUpdatePlanVersionMutation,
    useDeletePlanVersionMutation,
    useUpdatePlanVersionStatusMutation,
    useGetFinalizationReadinessQuery,
    useFinalizePlanDraftMutation,
    useGetAnnualVersionsQuery,
    useCompleteAnnualVersionMutation,
    useUpdateAnnualTargetMutation,

    // Plan Nodes
    useGetPlanNodesQuery,
    useGetPlanNodeByIdQuery,
    useCreatePlanNodeMutation,
    useUpdatePlanNodeMutation,
    useDeletePlanNodeMutation,
    useGetPlanHierarchyQuery,
    useReorderPlanNodesMutation,
} = planApi;