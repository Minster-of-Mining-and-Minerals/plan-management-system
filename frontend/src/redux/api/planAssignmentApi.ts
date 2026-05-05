import { baseApi } from "../baseApi";
import {
    PlanAssignmentAction,
    CreateAssignmentActionPayload,
    UpdateAssignmentActionPayload,
    GetAssignmentActionsQueryParams,
    ExternalAssignment,
    CreateExternalAssignmentPayload,
    UpdateExternalAssignmentPayload,
    InternalAssignment,
    CreateInternalAssignmentPayload,
    UpdateInternalAssignmentPayload,
    PlanNodeActionLog,
    CreateActionLogPayload,
    UpdateActionLogStatusPayload,
    GetActionLogsQueryParams,
    NodeActionSummary,
} from "../types/plan";

export const planAssignmentApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /**
         * ================= ASSIGNMENT ACTIONS =================
         */

        /** ---------------------------
         * GET ALL ASSIGNMENT ACTIONS
         * --------------------------- */
        getAssignmentActions: builder.query<
            PlanAssignmentAction[],
            GetAssignmentActionsQueryParams | void
        >({
            query: (params) =>
                params
                    ? { url: "/plan-assignments/actions", params }
                    : { url: "/plan-assignments/actions" },
            transformResponse: (response: any): PlanAssignmentAction[] =>
                response.data ?? [],
            providesTags: ["AssignmentActions"],
        }),

        /** ---------------------------
         * CREATE ASSIGNMENT ACTION
         * --------------------------- */
        createAssignmentAction: builder.mutation<
            PlanAssignmentAction,
            CreateAssignmentActionPayload
        >({
            query: (body) => ({
                url: "/plan-assignments/actions",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): PlanAssignmentAction =>
                response.data,
            invalidatesTags: ["AssignmentActions"],
        }),

        /** ---------------------------
         * UPDATE ASSIGNMENT ACTION
         * --------------------------- */
        updateAssignmentAction: builder.mutation<
            PlanAssignmentAction,
            { id: string; data: UpdateAssignmentActionPayload }
        >({
            query: ({ id, data }) => ({
                url: `/plan-assignments/actions/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: any): PlanAssignmentAction =>
                response.data,
            invalidatesTags: ["AssignmentActions"],
        }),

        /**
         * ================= EXTERNAL ASSIGNMENTS =================
         */

        /** ---------------------------
         * CREATE EXTERNAL ASSIGNMENT
         * --------------------------- */
        createExternalAssignment: builder.mutation<
            ExternalAssignment,
            CreateExternalAssignmentPayload
        >({
            query: (body) => ({
                url: "/plan-assignments/external",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): ExternalAssignment =>
                response.data,
            invalidatesTags: ["ExternalAssignments", "PlanNodes"],
        }),

        /** ---------------------------
         * GET EXTERNAL ASSIGNMENTS BY NODE
         * --------------------------- */
        getExternalAssignmentsByNode: builder.query<
            ExternalAssignment[],
            string
        >({
            query: (plan_node_id) => `/plan-assignments/external/node/${plan_node_id}`,
            transformResponse: (response: any): ExternalAssignment[] =>
                response.data ?? [],
            providesTags: (result, _e, plan_node_id) => [
                { type: "ExternalAssignments", id: plan_node_id },
                ...(result?.map(({ external_assignment_id }) => ({ type: "ExternalAssignments" as const, id: external_assignment_id })) ?? []),
            ],
        }),

        /** ---------------------------
         * UPDATE EXTERNAL ASSIGNMENT
         * --------------------------- */
        updateExternalAssignment: builder.mutation<
            ExternalAssignment,
            { id: string; data: UpdateExternalAssignmentPayload }
        >({
            query: ({ id, data }) => ({
                url: `/plan-assignments/external/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: any): ExternalAssignment =>
                response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "ExternalAssignments", id },
                "PlanNodes",
            ],
        }),

        /** ---------------------------
         * DELETE EXTERNAL ASSIGNMENT
         * --------------------------- */
        deleteExternalAssignment: builder.mutation<
            { message: string },
            string
        >({
            query: (id) => ({
                url: `/plan-assignments/external/${id}`,
                method: "DELETE",
            }),
            transformResponse: (response: any) => response,
            invalidatesTags: ["ExternalAssignments", "PlanNodes"],
        }),

        /**
         * ================= INTERNAL ASSIGNMENTS =================
         */

        /** ---------------------------
         * CREATE INTERNAL ASSIGNMENT
         * --------------------------- */
        createInternalAssignment: builder.mutation<
            InternalAssignment,
            CreateInternalAssignmentPayload
        >({
            query: (body) => ({
                url: "/plan-assignments/internal",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): InternalAssignment =>
                response.data,
            invalidatesTags: ["InternalAssignments", "PlanNodes"],
        }),

        /** ---------------------------
         * GET INTERNAL ASSIGNMENTS BY NODE
         * --------------------------- */
        getInternalAssignmentsByNode: builder.query<
            InternalAssignment[],
            string
        >({
            query: (plan_node_id) => `/plan-assignments/internal/node/${plan_node_id}`,
            transformResponse: (response: any): InternalAssignment[] =>
                response.data ?? [],
            providesTags: (result, _e, plan_node_id) => [
                { type: "InternalAssignments", id: plan_node_id },
                ...(result?.map(({ internal_assignment_id }) => ({ type: "InternalAssignments" as const, id: internal_assignment_id })) ?? []),
            ],
        }),

        /** ---------------------------
         * GET ASSIGNMENTS BY USER
         * --------------------------- */
        getAssignmentsByUser: builder.query<
            InternalAssignment[],
            string
        >({
            query: (user_id) => `/plan-assignments/internal/user/${user_id}`,
            transformResponse: (response: any): InternalAssignment[] =>
                response.data ?? [],
            providesTags: ["InternalAssignments"],
        }),

        /** ---------------------------
         * UPDATE INTERNAL ASSIGNMENT
         * --------------------------- */
        updateInternalAssignment: builder.mutation<
            InternalAssignment,
            { id: string; data: UpdateInternalAssignmentPayload }
        >({
            query: ({ id, data }) => ({
                url: `/plan-assignments/internal/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: any): InternalAssignment =>
                response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "InternalAssignments", id },
                "PlanNodes",
            ],
        }),

        /** ---------------------------
         * DELETE INTERNAL ASSIGNMENT
         * --------------------------- */
        deleteInternalAssignment: builder.mutation<
            { message: string },
            string
        >({
            query: (id) => ({
                url: `/plan-assignments/internal/${id}`,
                method: "DELETE",
            }),
            transformResponse: (response: any) => response,
            invalidatesTags: ["InternalAssignments", "PlanNodes"],
        }),

        /**
         * ================= ACTION LOGS =================
         */

        /** ---------------------------
         * CREATE ACTION LOG
         * --------------------------- */
        createActionLog: builder.mutation<
            PlanNodeActionLog,
            CreateActionLogPayload
        >({
            query: (body) => ({
                url: "/plan-assignments/logs",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): PlanNodeActionLog =>
                response.data,
            invalidatesTags: ["ActionLogs", "PlanNodes"],
        }),

        /** ---------------------------
         * GET ACTION LOGS BY NODE
         * --------------------------- */
        getActionLogsByNode: builder.query<
            PlanNodeActionLog[],
            { plan_node_id: string; params?: GetActionLogsQueryParams }
        >({
            query: ({ plan_node_id, params }) => ({
                url: `/plan-assignments/logs/node/${plan_node_id}`,
                params,
            }),
            transformResponse: (response: any): PlanNodeActionLog[] =>
                response.data ?? [],
            providesTags: (result, _e, { plan_node_id }) => [
                { type: "ActionLogs", id: plan_node_id },
                ...(result?.map(({ action_log_id }) => ({ type: "ActionLogs" as const, id: action_log_id })) ?? []),
            ],
        }),

        /** ---------------------------
         * GET ACTION LOG BY ID
         * --------------------------- */
        getActionLogById: builder.query<
            PlanNodeActionLog,
            string
        >({
            query: (id) => `/plan-assignments/logs/${id}`,
            transformResponse: (response: any): PlanNodeActionLog =>
                response.data,
            providesTags: (_r, _e, id) => [
                { type: "ActionLogs", id },
            ],
        }),

        /** ---------------------------
         * UPDATE ACTION LOG STATUS
         * --------------------------- */
        updateActionLogStatus: builder.mutation<
            PlanNodeActionLog,
            { id: string; data: UpdateActionLogStatusPayload }
        >({
            query: ({ id, data }) => ({
                url: `/plan-assignments/logs/${id}/status`,
                method: "PATCH",
                body: data,
            }),
            transformResponse: (response: any): PlanNodeActionLog =>
                response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "ActionLogs", id },
                "PlanNodes",
            ],
        }),

        /** ---------------------------
         * GET NODE ACTION SUMMARY
         * --------------------------- */
        getNodeActionSummary: builder.query<
            NodeActionSummary[],
            string
        >({
            query: (plan_node_id) => `/plan-assignments/logs/node/${plan_node_id}/summary`,
            transformResponse: (response: any): NodeActionSummary[] =>
                response.data ?? [],
            providesTags: ["ActionLogs"],
        }),
    }),
});

export const {
    // Assignment Actions
    useGetAssignmentActionsQuery,
    useCreateAssignmentActionMutation,
    useUpdateAssignmentActionMutation,

    // External Assignments
    useCreateExternalAssignmentMutation,
    useGetExternalAssignmentsByNodeQuery,
    useUpdateExternalAssignmentMutation,
    useDeleteExternalAssignmentMutation,

    // Internal Assignments
    useCreateInternalAssignmentMutation,
    useGetInternalAssignmentsByNodeQuery,
    useGetAssignmentsByUserQuery,
    useUpdateInternalAssignmentMutation,
    useDeleteInternalAssignmentMutation,

    // Action Logs
    useCreateActionLogMutation,
    useGetActionLogsByNodeQuery,
    useGetActionLogByIdQuery,
    useUpdateActionLogStatusMutation,
    useGetNodeActionSummaryQuery,
} = planAssignmentApi;