import { baseApi } from "../baseApi";
import {
    PlanAssignmentAction,
    CreateAssignmentActionPayload,
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
        getAssignmentActions: builder.query<PlanAssignmentAction[], GetAssignmentActionsQueryParams | void>({
            query: (params) => ({
                url: "/plan-assignments/actions",
                params: params || {},
            }),
            transformResponse: (response: any): PlanAssignmentAction[] => response.data ?? [],
            providesTags: ["AssignmentActions"],
        }),

        /**
         * ================= EXTERNAL ASSIGNMENTS =================
         */
        getExternalAssignmentsByNode: builder.query<ExternalAssignment[], string>({
            query: (nodeId) => `/plan-assignments/external/node/${nodeId}`,
            transformResponse: (response: any): ExternalAssignment[] => response.data ?? [],
            providesTags: (result, _error, nodeId) => [
                { type: "ExternalAssignments", id: nodeId },
                ...(result?.map(({ external_assignment_id }) => ({ type: "ExternalAssignments" as const, id: external_assignment_id })) ?? []),
            ],
        }),

        createExternalAssignment: builder.mutation<ExternalAssignment, CreateExternalAssignmentPayload>({
            query: (body) => ({
                url: "/plan-assignments/external",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): ExternalAssignment => response.data,
            invalidatesTags: (_result, _error, { plan_node_id }) => [
                { type: "ExternalAssignments", id: plan_node_id },
            ],
        }),

        deleteExternalAssignment: builder.mutation<{ message: string }, { id: string; nodeId: string }>({
            query: ({ id }) => ({
                url: `/plan-assignments/external/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { nodeId }) => [
                { type: "ExternalAssignments", id: nodeId },
            ],
        }),

        /**
         * ================= INTERNAL ASSIGNMENTS =================
         */
        getInternalAssignmentsByNode: builder.query<InternalAssignment[], string>({
            query: (nodeId) => `/plan-assignments/internal/node/${nodeId}`,
            transformResponse: (response: any): InternalAssignment[] => response.data ?? [],
            providesTags: (result, _error, nodeId) => [
                { type: "InternalAssignments", id: nodeId },
                ...(result?.map(({ internal_assignment_id }) => ({ type: "InternalAssignments" as const, id: internal_assignment_id })) ?? []),
            ],
        }),

        createInternalAssignment: builder.mutation<InternalAssignment, CreateInternalAssignmentPayload>({
            query: (body) => ({
                url: "/plan-assignments/internal",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): InternalAssignment => response.data,
            invalidatesTags: (_result, _error, { plan_node_id }) => [
                { type: "InternalAssignments", id: plan_node_id },
            ],
        }),

        deleteInternalAssignment: builder.mutation<{ message: string }, { id: string; nodeId: string }>({
            query: ({ id }) => ({
                url: `/plan-assignments/internal/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { nodeId }) => [
                { type: "InternalAssignments", id: nodeId },
            ],
        }),

        /**
         * ================= ACTION LOGS =================
         */
        getActionLogsByNode: builder.query<PlanNodeActionLog[], { nodeId: string; params?: GetActionLogsQueryParams }>({
            query: ({ nodeId, params }) => ({
                url: `/plan-assignments/logs/node/${nodeId}`,
                params: params || {},
            }),
            transformResponse: (response: any): PlanNodeActionLog[] => response.data ?? [],
            providesTags: (_result, _error, { nodeId }) => [{ type: "ActionLogs", id: nodeId }],
        }),

        createActionLog: builder.mutation<PlanNodeActionLog, CreateActionLogPayload>({
            query: (body) => ({
                url: "/plan-assignments/logs",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): PlanNodeActionLog => response.data,
            invalidatesTags: (_result, _error, { plan_node_id }) => [{ type: "ActionLogs", id: plan_node_id }],
        }),

        updateActionLogStatus: builder.mutation<PlanNodeActionLog, { id: string; nodeId: string; data: UpdateActionLogStatusPayload }>({
            query: ({ id, data }) => ({
                url: `/plan-assignments/logs/${id}/status`,
                method: "PATCH",
                body: data,
            }),
            transformResponse: (response: any): PlanNodeActionLog => response.data,
            invalidatesTags: (_result, _error, { nodeId }) => [{ type: "ActionLogs", id: nodeId }],
        }),

        getNodeActionSummary: builder.query<NodeActionSummary[], string>({
            query: (nodeId) => `/plan-assignments/logs/node/${nodeId}/summary`,
            transformResponse: (response: any): NodeActionSummary[] => response.data ?? [],
            providesTags: (_result, _error, nodeId) => [{ type: "ActionLogs", id: nodeId }],
        }),
    }),
});

export const {
    useGetAssignmentActionsQuery,
    useGetExternalAssignmentsByNodeQuery,
    useCreateExternalAssignmentMutation,
    useDeleteExternalAssignmentMutation,
    useGetInternalAssignmentsByNodeQuery,
    useCreateInternalAssignmentMutation,
    useDeleteInternalAssignmentMutation,
    useGetActionLogsByNodeQuery,
    useCreateActionLogMutation,
    useUpdateActionLogStatusMutation,
    useGetNodeActionSummaryQuery,
} = planAssignmentApi;