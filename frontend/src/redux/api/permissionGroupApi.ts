import { baseApi } from "../baseApi";
import {
    PermissionGroup,
    CreatePermissionGroupPayload,
    UpdatePermissionGroupPayload,
    AddPermissionsPayload,
    RemovePermissionPayload,
    AddUsersPayload,
    RemoveUserPayload,
    AddStructuresPayload,
    RemoveStructurePayload,
} from "../types/permissionGroup";

export const permissionGroupApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /** ---------------------------
         * GET ALL GROUPS
         * --------------------------- */
        getPermissionGroups: builder.query<PermissionGroup[], { government_structure_id?: string; search?: string } | void>({
            query: (params) => ({
                url: "/permission-groups",
                params: params || {},
            }),
            transformResponse: (response: any): PermissionGroup[] =>
                response.data ?? [],
            providesTags: ["PermissionGroups"],
        }),

        /** ---------------------------
         * GET GROUP BY ID
         * --------------------------- */
        getPermissionGroupById: builder.query<PermissionGroup, string>({
            query: (id) => `/permission-groups/${id}`,
            transformResponse: (response: any): PermissionGroup => response.data,
            providesTags: (_r, _e, id) => [{ type: "PermissionGroups", id }],
        }),

        /** ---------------------------
         * CREATE GROUP
         * --------------------------- */
        createPermissionGroup: builder.mutation<
            PermissionGroup,
            CreatePermissionGroupPayload
        >({
            query: (body) => ({
                url: "/permission-groups",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): PermissionGroup => response.data,
            invalidatesTags: ["PermissionGroups"],
        }),

        /** ---------------------------
         * UPDATE GROUP
         * --------------------------- */
        updatePermissionGroup: builder.mutation<
            PermissionGroup,
            { id: string; data: UpdatePermissionGroupPayload }
        >({
            query: ({ id, data }) => ({
                url: `/permission-groups/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: any): PermissionGroup => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PermissionGroups", id },
                "PermissionGroups",
            ],
        }),

        /** ---------------------------
         * DELETE GROUP
         * --------------------------- */
        deletePermissionGroup: builder.mutation<
            { message: string },
            string | { id: string; government_structure_id?: string }
        >({
            query: (arg) => {
                const id = typeof arg === "string" ? arg : arg.id;
                const government_structure_id =
                    typeof arg === "string" ? undefined : arg.government_structure_id;
                return {
                    url: `/permission-groups/${id}`,
                    method: "DELETE",
                    params: government_structure_id
                        ? { government_structure_id }
                        : undefined,
                };
            },
            transformResponse: (response: any) => response,
            invalidatesTags: ["PermissionGroups"],
        }),

        /** ---------------------------
         * ADD PERMISSIONS
         * --------------------------- */
        addPermissionsToGroup: builder.mutation<
            { message: string },
            AddPermissionsPayload
        >({
            query: (body) => ({
                url: "/permission-groups/add-permissions",
                method: "POST",
                body,
            }),
            invalidatesTags: ["PermissionGroups"],
        }),

        /** ---------------------------
         * REMOVE PERMISSION
         * --------------------------- */
        removePermissionFromGroup: builder.mutation<
            { message: string },
            RemovePermissionPayload
        >({
            query: (body) => ({
                url: "/permission-groups/remove-permission",
                method: "POST",
                body,
            }),
            invalidatesTags: ["PermissionGroups"],
        }),

        /** ---------------------------
         * ADD USERS
         * --------------------------- */
        addUsersToGroup: builder.mutation<
            { message: string },
            AddUsersPayload
        >({
            query: (body) => ({
                url: "/permission-groups/add-users",
                method: "POST",
                body,
            }),
            invalidatesTags: ["PermissionGroups"],
        }),

        /** ---------------------------
         * REMOVE USER
         * --------------------------- */
        removeUserFromGroup: builder.mutation<
            { message: string },
            RemoveUserPayload
        >({
            query: (body) => ({
                url: "/permission-groups/remove-user",
                method: "POST",
                body,
            }),
            invalidatesTags: ["PermissionGroups"],
        }),

        /** ---------------------------
         * ADD STRUCTURES
         * --------------------------- */
        addStructuresToGroup: builder.mutation<
            { message: string },
            AddStructuresPayload
        >({
            query: (body) => ({
                url: "/permission-groups/add-structures",
                method: "POST",
                body,
            }),
            invalidatesTags: ["PermissionGroups"],
        }),

        /** ---------------------------
         * REMOVE STRUCTURE
         * --------------------------- */
        removeStructureFromGroup: builder.mutation<
            { message: string },
            RemoveStructurePayload
        >({
            query: (body) => ({
                url: "/permission-groups/remove-structure",
                method: "POST",
                body,
            }),
            invalidatesTags: ["PermissionGroups"],
        }),
    }),
});

export const {
    useGetPermissionGroupsQuery,
    useGetPermissionGroupByIdQuery,
    useCreatePermissionGroupMutation,
    useUpdatePermissionGroupMutation,
    useDeletePermissionGroupMutation,

    useAddPermissionsToGroupMutation,
    useRemovePermissionFromGroupMutation,

    useAddUsersToGroupMutation,
    useRemoveUserFromGroupMutation,

    useAddStructuresToGroupMutation,
    useRemoveStructureFromGroupMutation,
} = permissionGroupApi;