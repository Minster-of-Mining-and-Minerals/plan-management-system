import { baseApi } from "../baseApi";
import { Role, CreateRolePayload, UpdateRolePayload } from "../types/roles";

export const roleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** ---------------------------
     * GET ALL ROLES
     * --------------------------- */
    getRoles: builder.query<
      Role[],
      { is_active?: boolean; government_structure_id?: string; scope?: string } | void
    >({
      query: (params) => {
        return params ? { url: "/roles", params } : { url: "/roles" };
      },
      transformResponse: (response: any): Role[] => response.data ?? [],
      providesTags: ["Roles"],
    }),

    /** ---------------------------
     * GET ROLE BY ID
     * --------------------------- */
    getRoleById: builder.query<Role, string>({
      query: (role_id) => `/roles/${role_id}`,
      transformResponse: (response: any): Role => response.data,
      providesTags: (_r, _e, id) => [{ type: "Roles", id }],
    }),

    /** ---------------------------
     * CREATE ROLE
     * --------------------------- */
    createRole: builder.mutation<Role, CreateRolePayload>({
      query: (body) => ({
        url: "/roles",
        method: "POST",
        body,
      }),
      transformResponse: (response: any): Role => response.data,
      invalidatesTags: ["Roles"],
    }),

    /** ---------------------------
     * UPDATE ROLE
     * --------------------------- */
    updateRole: builder.mutation<Role, { id: string; data: UpdateRolePayload }>(
      {
        query: ({ id, data }) => ({
          url: `/roles/${id}`,
          method: "PUT",
          body: data,
        }),
        transformResponse: (response: any): Role => response.data,
        invalidatesTags: (_r, _e, { id }) => [{ type: "Roles", id }, "Roles"],
      }
    ),

    /** ---------------------------
     * DELETE ROLE (SOFT DELETE)
     * --------------------------- */
    deleteRole: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: any) => response,
      invalidatesTags: ["Roles"],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = roleApi;
