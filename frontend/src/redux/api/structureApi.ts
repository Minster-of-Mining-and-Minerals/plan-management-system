import { baseApi } from "../baseApi";
import {
    Structure,
    CreateStructurePayload,
    UpdateStructurePayload,
    AddUsersToStructurePayload,
    RemoveUserFromStructurePayload,
    AddPermissionGroupsToStructurePayload,
    RemovePermissionGroupFromStructurePayload,
} from "../types/structure";

export const structureApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({

        /** ---------------------------
         * GET ALL STRUCTURES
         * --------------------------- */
        getStructures: builder.query<
            Structure[],
            { is_active?: boolean; search?: string; parent_id?: string } | void
        >({
            query: (params) =>
                params
                    ? { url: "/structures", params }
                    : { url: "/structures" },
            transformResponse: (response: any): Structure[] =>
                response.data ?? [],
            providesTags: ["Structure"],
        }),

        /** ---------------------------
         * GET BY ID
         * --------------------------- */
        getStructureById: builder.query<
            Structure,
            string
        >({
            query: (id) => `/structures/${id}`,
            transformResponse: (response: any): Structure =>
                response.data,
            providesTags: (_r, _e, id) => [
                { type: "Structure", id },
            ],
        }),

        /** ---------------------------
         * CREATE
         * --------------------------- */
        createStructure: builder.mutation<
            Structure,
            CreateStructurePayload
        >({
            query: (body) => ({
                url: "/structures",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): Structure =>
                response.data,
            invalidatesTags: ["Structure"],
        }),

        /** ---------------------------
         * UPDATE
         * --------------------------- */
        updateStructure: builder.mutation<
            Structure,
            { id: string; data: UpdateStructurePayload }
        >({
            query: ({ id, data }) => ({
                url: `/structures/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: any): Structure =>
                response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "Structure", id },
                "Structure",
            ],
        }),

        /** ---------------------------
         * DELETE (SOFT)
         * --------------------------- */
        deleteStructure: builder.mutation<
            { message: string },
            string
        >({
            query: (id) => ({
                url: `/structures/${id}`,
                method: "DELETE",
            }),
            transformResponse: (response: any) => response,
            invalidatesTags: ["Structure"],
        }),

        /** ---------------------------
         * ADD USERS
         * --------------------------- */
        addUsersToStructure: builder.mutation<
            { message: string },
            AddUsersToStructurePayload
        >({
            query: (body) => ({
                url: "/structures/users/add",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Structure"],
        }),

        /** ---------------------------
         * REMOVE USER
         * --------------------------- */
        removeUserFromStructure: builder.mutation<
            { message: string },
            RemoveUserFromStructurePayload
        >({
            query: (body) => ({
                url: "/structures/users/remove",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Structure"],
        }),

        /** ---------------------------
         * ADD PERMISSION GROUPS
         * --------------------------- */
        addPermissionGroupsToStructure: builder.mutation<
            { message: string },
            AddPermissionGroupsToStructurePayload
        >({
            query: (body) => ({
                url: "/structures/permission-groups/add",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Structure"],
        }),

        /** ---------------------------
         * REMOVE PERMISSION GROUP
         * --------------------------- */
        removePermissionGroupFromStructure: builder.mutation<
            { message: string },
            RemovePermissionGroupFromStructurePayload
        >({
            query: (body) => ({
                url: "/structures/permission-groups/remove",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Structure"],
        }),
    }),
});

export const {
    useGetStructuresQuery,
    useGetStructureByIdQuery,
    useCreateStructureMutation,
    useUpdateStructureMutation,
    useDeleteStructureMutation,

    useAddUsersToStructureMutation,
    useRemoveUserFromStructureMutation,

    useAddPermissionGroupsToStructureMutation,
    useRemovePermissionGroupFromStructureMutation,
} = structureApi;
