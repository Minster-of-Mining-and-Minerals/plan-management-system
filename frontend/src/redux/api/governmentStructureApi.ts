import { baseApi } from "../baseApi";
import {
    GovernmentStructure,
    CreateGovernmentStructurePayload,
    UpdateGovernmentStructurePayload,
    AddUsersToStructurePayload,
    RemoveUserFromStructurePayload,
    AddPermissionGroupsToStructurePayload,
    RemovePermissionGroupFromStructurePayload,
} from "../types/governmentStructure";

export const governmentStructureApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /** ---------------------------
         * GET ALL STRUCTURES
         * --------------------------- */
        getGovernmentStructures: builder.query<
            GovernmentStructure[],
            { is_active?: boolean; search?: string } | void
        >({
            query: (params) =>
                params
                    ? { url: "/government-structures", params }
                    : { url: "/government-structures" },
            transformResponse: (response: any): GovernmentStructure[] =>
                response.data ?? [],
            providesTags: ["GovernmentStructures"],
        }),

        /** ---------------------------
         * GET BY ID
         * --------------------------- */
        getGovernmentStructureById: builder.query<
            GovernmentStructure,
            string
        >({
            query: (id) => `/government-structures/${id}`,
            transformResponse: (response: any): GovernmentStructure =>
                response.data,
            providesTags: (_r, _e, id) => [
                { type: "GovernmentStructures", id },
            ],
        }),

        /** ---------------------------
         * CREATE
         * --------------------------- */
        createGovernmentStructure: builder.mutation<
            GovernmentStructure,
            CreateGovernmentStructurePayload
        >({
            query: (body) => ({
                url: "/government-structures",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): GovernmentStructure =>
                response.data,
            invalidatesTags: ["GovernmentStructures"],
        }),

        /** ---------------------------
         * UPDATE
         * --------------------------- */
        updateGovernmentStructure: builder.mutation<
            GovernmentStructure,
            { id: string; data: UpdateGovernmentStructurePayload }
        >({
            query: ({ id, data }) => ({
                url: `/government-structures/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: any): GovernmentStructure =>
                response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "GovernmentStructures", id },
                "GovernmentStructures",
            ],
        }),

        /** ---------------------------
         * DELETE (SOFT)
         * --------------------------- */
        deleteGovernmentStructure: builder.mutation<
            { message: string },
            string
        >({
            query: (id) => ({
                url: `/government-structures/${id}`,
                method: "DELETE",
            }),
            transformResponse: (response: any) => response,
            invalidatesTags: ["GovernmentStructures"],
        }),

        /** ---------------------------
         * ADD USERS
         * --------------------------- */
        addUsersToStructure: builder.mutation<
            { message: string },
            AddUsersToStructurePayload
        >({
            query: (body) => ({
                url: "/government-structures/users/add",
                method: "POST",
                body,
            }),
            invalidatesTags: ["GovernmentStructures"],
        }),

        /** ---------------------------
         * REMOVE USER
         * --------------------------- */
        removeUserFromStructure: builder.mutation<
            { message: string },
            RemoveUserFromStructurePayload
        >({
            query: (body) => ({
                url: "/government-structures/users/remove",
                method: "POST",
                body,
            }),
            invalidatesTags: ["GovernmentStructures"],
        }),

        /** ---------------------------
         * ADD PERMISSION GROUPS
         * --------------------------- */
        addPermissionGroupsToStructure: builder.mutation<
            { message: string },
            AddPermissionGroupsToStructurePayload
        >({
            query: (body) => ({
                url: "/government-structures/permission-groups/add",
                method: "POST",
                body,
            }),
            invalidatesTags: ["GovernmentStructures"],
        }),

        /** ---------------------------
         * REMOVE PERMISSION GROUP
         * --------------------------- */
        removePermissionGroupFromStructure: builder.mutation<
            { message: string },
            RemovePermissionGroupFromStructurePayload
        >({
            query: (body) => ({
                url: "/government-structures/permission-groups/remove",
                method: "POST",
                body,
            }),
            invalidatesTags: ["GovernmentStructures"],
        }),
    }),
});

export const {
    useGetGovernmentStructuresQuery,
    useGetGovernmentStructureByIdQuery,
    useCreateGovernmentStructureMutation,
    useUpdateGovernmentStructureMutation,
    useDeleteGovernmentStructureMutation,

    useAddUsersToStructureMutation,
    useRemoveUserFromStructureMutation,

    useAddPermissionGroupsToStructureMutation,
    useRemovePermissionGroupFromStructureMutation,
} = governmentStructureApi;