import { baseApi } from "../baseApi";
import {
    InternalStructure,
    CreateInternalStructurePayload,
    UpdateInternalStructurePayload,
    AssignUsersPayload,
    RemoveUserPayload,
} from "../types/internalStructure";

export const internalStructureApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        /** ---------------------------
         * GET ALL
         * --------------------------- */
        getInternalStructures: builder.query<
            InternalStructure[],
            { is_active?: boolean; search?: string; government_structure_id?: string; parent_id?: string } | void
        >({
            query: (params) =>
                params
                    ? { url: "/internal-structures", params }
                    : { url: "/internal-structures" },
            transformResponse: (res: any) => res.data ?? [],
            providesTags: ["InternalStructures"],
        }),

        /** ---------------------------
         * GET BY ID
         * --------------------------- */
        getInternalStructureById: builder.query<InternalStructure, string>({
            query: (id) => `/internal-structures/${id}`,
            transformResponse: (res: any) => res.data,
            providesTags: (_r, _e, id) => [{ type: "InternalStructures", id }],
        }),

        /** ---------------------------
         * CREATE
         * --------------------------- */
        createInternalStructure: builder.mutation<
            InternalStructure,
            CreateInternalStructurePayload
        >({
            query: (body) => ({
                url: "/internal-structures",
                method: "POST",
                body,
            }),
            transformResponse: (res: any) => res.data,
            invalidatesTags: ["InternalStructures"],
        }),

        /** ---------------------------
         * UPDATE
         * --------------------------- */
        updateInternalStructure: builder.mutation<
            InternalStructure,
            { id: string; data: UpdateInternalStructurePayload }
        >({
            query: ({ id, data }) => ({
                url: `/internal-structures/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (res: any) => res.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "InternalStructures", id },
                "InternalStructures",
            ],
        }),

        /** ---------------------------
         * DELETE
         * --------------------------- */
        deleteInternalStructure: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/internal-structures/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["InternalStructures"],
        }),

        /** ---------------------------
         * TOGGLE STATUS
         * --------------------------- */
        toggleInternalStructureStatus: builder.mutation<
            { message: string },
            string
        >({
            query: (id) => ({
                url: `/internal-structures/${id}/toggle-status`,
                method: "PATCH",
            }),
            invalidatesTags: ["InternalStructures"],
        }),

        /** ---------------------------
         * ASSIGN USERS
         * --------------------------- */
        assignUsers: builder.mutation<{ message: string }, AssignUsersPayload>({
            query: (body) => ({
                url: "/internal-structures/assign-users",
                method: "POST",
                body,
            }),
            invalidatesTags: ["InternalStructures"],
        }),

        /** ---------------------------
         * REMOVE USER
         * --------------------------- */
        removeUser: builder.mutation<{ message: string }, RemoveUserPayload>({
            query: (body) => ({
                url: "/internal-structures/remove-user",
                method: "POST",
                body,
            }),
            invalidatesTags: ["InternalStructures"],
        }),
    }),
});

export const {
    useGetInternalStructuresQuery,
    useGetInternalStructureByIdQuery,
    useCreateInternalStructureMutation,
    useUpdateInternalStructureMutation,
    useDeleteInternalStructureMutation,
    useToggleInternalStructureStatusMutation,
    useAssignUsersMutation,
    useRemoveUserMutation,
} = internalStructureApi;