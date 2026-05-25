import { baseApi } from "../baseApi";
import {
    PermissionGroup,
    CreatePermissionGroupPayload,
    UpdatePermissionGroupPayload,
    AddPermissionsPayload,
    RemovePermissionPayload,
    AddUsersPayload,
    RemoveUserPayload,
} from "../types/permissionGroup";

export const permissionGroupApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getPermissionGroups: builder.query<PermissionGroup[], { search?: string } | void>({
            query: (params) => ({
                url: "/permission-groups",
                params: params || {},
            }),
            transformResponse: (response: any): PermissionGroup[] =>
                response.data ?? [],
            providesTags: ["PermissionGroups"],
        }),

        getPermissionGroupById: builder.query<PermissionGroup, string>({
            query: (id) => `/permission-groups/${id}`,
            transformResponse: (response: any): PermissionGroup => response.data,
            providesTags: (_r, _e, id) => [{ type: "PermissionGroups", id }],
        }),

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

        deletePermissionGroup: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/permission-groups/${id}`,
                method: "DELETE",
            }),
            transformResponse: (response: any) => response,
            invalidatesTags: ["PermissionGroups"],
        }),

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
} = permissionGroupApi;
