import { baseApi } from "../baseApi";
import {
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
    PlanNodeAssignmentOptions,
    PlanNodeAssignmentScope,
} from "../types/plan";

export const planAssignmentApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getPlanNodeAssignmentOptions: builder.query<
            PlanNodeAssignmentOptions,
            { nodeId: string; branchExternalAssignmentId?: string; branchInternalAssignmentId?: string }
        >({
            query: ({ nodeId, branchExternalAssignmentId, branchInternalAssignmentId }) => ({
                url: `/plan-assignments/options/node/${nodeId}`,
                params: {
                    ...(branchExternalAssignmentId
                        ? { branch_external_assignment_id: branchExternalAssignmentId }
                        : {}),
                    ...(branchInternalAssignmentId
                        ? { branch_internal_assignment_id: branchInternalAssignmentId }
                        : {}),
                },
            }),
            transformResponse: (response: any): PlanNodeAssignmentOptions => response.data,
            providesTags: (_r, _e, { nodeId }) => [{ type: "PlanAssignmentOptions", id: nodeId }],
        }),

        getPlanNodeAssignmentScope: builder.query<
            PlanNodeAssignmentScope,
            { nodeId: string; branchExternalAssignmentId?: string; branchInternalAssignmentId?: string }
        >({
            query: ({ nodeId, branchExternalAssignmentId, branchInternalAssignmentId }) => ({
                url: `/plan-assignments/scope/node/${nodeId}`,
                params: {
                    ...(branchExternalAssignmentId
                        ? { branch_external_assignment_id: branchExternalAssignmentId }
                        : {}),
                    ...(branchInternalAssignmentId
                        ? { branch_internal_assignment_id: branchInternalAssignmentId }
                        : {}),
                },
            }),
            transformResponse: (response: any): PlanNodeAssignmentScope => response.data,
            providesTags: (_r, _e, { nodeId }) => [{ type: "PlanAssignmentScope", id: nodeId }],
        }),

        /**
         * ================= EXTERNAL ASSIGNMENTS =================
         */
        getExternalAssignmentsByNode: builder.query<
            ExternalAssignment[],
            { nodeId: string; includeInactive?: boolean }
        >({
            query: ({ nodeId, includeInactive }) => ({
                url: `/plan-assignments/external/node/${nodeId}`,
                params: includeInactive ? { include_inactive: true } : {},
            }),
            transformResponse: (response: any): ExternalAssignment[] => response.data ?? [],
            providesTags: (result, _error, { nodeId }) => [
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
                { type: "PlanAssignmentOptions", id: plan_node_id },
                "PlanNodes",
            ],
        }),

        deleteExternalAssignment: builder.mutation<{ message: string }, { id: string; nodeId: string }>({
            query: ({ id }) => ({
                url: `/plan-assignments/external/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { nodeId }) => [
                { type: "ExternalAssignments", id: nodeId },
                { type: "PlanAssignmentOptions", id: nodeId },
                "PlanNodes",
            ],
        }),

        /**
         * ================= INTERNAL ASSIGNMENTS =================
         */
        getInternalAssignmentsByNode: builder.query<
            InternalAssignment[],
            { nodeId: string; includeInactive?: boolean }
        >({
            query: ({ nodeId, includeInactive }) => ({
                url: `/plan-assignments/internal/node/${nodeId}`,
                params: includeInactive ? { include_inactive: true } : {},
            }),
            transformResponse: (response: any): InternalAssignment[] => response.data ?? [],
            providesTags: (result, _error, { nodeId }) => [
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
                { type: "PlanAssignmentOptions", id: plan_node_id },
                "PlanNodes",
            ],
        }),

        deleteInternalAssignment: builder.mutation<{ message: string }, { id: string; nodeId: string }>({
            query: ({ id }) => ({
                url: `/plan-assignments/internal/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { nodeId }) => [
                { type: "InternalAssignments", id: nodeId },
                { type: "PlanAssignmentOptions", id: nodeId },
                "PlanNodes",
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
    useGetPlanNodeAssignmentOptionsQuery,
    useGetPlanNodeAssignmentScopeQuery,
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