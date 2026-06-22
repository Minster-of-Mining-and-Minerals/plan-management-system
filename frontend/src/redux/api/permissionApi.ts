import { baseApi } from "../baseApi";
import type { Permission } from "../types/permission";

export type GetPermissionsParams = {
  government_structure_id?: string;
  scope?: "all";
};

export const permissionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPermissions: builder.query<Permission[], GetPermissionsParams | void>({
      query: (params) =>
        params
          ? { url: "/permissions", params }
          : { url: "/permissions" },
      transformResponse: (response: any): Permission[] => {
        return response.data ?? [];
      },
      providesTags: ["Permissions"],
    }),

    // ACTIVATE
    activatePermission: builder.mutation<Permission, string>({
      query: (permission_id) => ({
        url: `/permissions/activate/${permission_id}`,
        method: "PUT",
      }),
      transformResponse: (response: any): Permission => response.data,
      invalidatesTags: ["Permissions"],
    }),

    // DEACTIVATE
    deactivatePermission: builder.mutation<Permission, string>({
      query: (permission_id) => ({
        url: `/permissions/deactivate/${permission_id}`,
        method: "PUT",
      }),
      transformResponse: (response: any): Permission => response.data,
      invalidatesTags: ["Permissions"],
    }),

    // TOGGLE
    togglePermission: builder.mutation<Permission, string>({
      query: (permission_id) => ({
        url: `/permissions/toggle/${permission_id}`,
        method: "PUT",
        body: {},
      }),
      transformResponse: (response: any): Permission => response.data,
      invalidatesTags: ["Permissions"],
    }),
  }),
});

export const {
  useGetPermissionsQuery,
  useActivatePermissionMutation,
  useDeactivatePermissionMutation,
  useTogglePermissionMutation,
} = permissionApi;
