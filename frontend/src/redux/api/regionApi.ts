import { baseApi } from "../baseApi";
import type {
  Region,
  RegionalStructure,
  RegionalBrandingData,
  RegionalDashboardData,
  CreateRegionPayload,
  UpdateRegionPayload,
  CreateRegionalStructurePayload,
  UpdateRegionalStructurePayload,
} from "../types/region";
import type { Role } from "../types/user";

export const regionApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRegions: builder.query<Region[], { is_active?: boolean; search?: string } | void>({
      query: (params) => ({
        url: "/regions",
        params: params || undefined,
      }),
      transformResponse: (res: { data: Region[] }) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ region_id }) => ({ type: "Regions" as const, id: region_id })),
              { type: "Regions", id: "LIST" },
            ]
          : [{ type: "Regions", id: "LIST" }],
    }),

    getRegionById: builder.query<Region, string>({
      query: (id) => `/regions/${id}`,
      transformResponse: (res: { data: Region }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "Regions", id }],
    }),

    createRegion: builder.mutation<Region, CreateRegionPayload>({
      query: (body) => ({
        url: "/regions",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: Region }) => res.data,
      invalidatesTags: [{ type: "Regions", id: "LIST" }],
    }),

    updateRegion: builder.mutation<Region, { id: string; data: UpdateRegionPayload }>({
      query: ({ id, data }) => ({
        url: `/regions/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: Region }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Regions", id },
        { type: "Regions", id: "LIST" },
        "RegionalBranding",
      ],
    }),

    toggleRegionStatus: builder.mutation<Region, { id: string; is_active: boolean }>({
      query: ({ id, is_active }) => ({
        url: `/regions/${id}/status`,
        method: "PATCH",
        body: { is_active },
      }),
      transformResponse: (res: { data: Region }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Regions", id },
        { type: "Regions", id: "LIST" },
      ],
    }),

    deleteRegion: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/regions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Regions", id: "LIST" }],
    }),

    // Regional Structures
    getRegionalStructures: builder.query<
      RegionalStructure[],
      { region_id: string; is_active?: boolean }
    >({
      query: ({ region_id, is_active }) => ({
        url: "/regional-structures",
        params: {
          region_id,
          is_active: is_active !== undefined ? String(is_active) : undefined,
        },
      }),
      transformResponse: (res: { data: RegionalStructure[] }) => res.data,
      providesTags: (result, _err, { region_id }) =>
        result
          ? [
              ...result.map(({ regional_structure_id }) => ({
                type: "RegionalStructures" as const,
                id: regional_structure_id,
              })),
              { type: "RegionalStructures", id: region_id },
            ]
          : [{ type: "RegionalStructures", id: region_id }],
    }),

    getRegionalStructureById: builder.query<RegionalStructure, string>({
      query: (id) => `/regional-structures/${id}`,
      transformResponse: (res: { data: RegionalStructure }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "RegionalStructures", id }],
    }),

    createRegionalStructure: builder.mutation<RegionalStructure, CreateRegionalStructurePayload>({
      query: (body) => ({
        url: "/regional-structures",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: RegionalStructure }) => res.data,
      invalidatesTags: (_res, _err, { region_id }) => [
        { type: "RegionalStructures", id: region_id },
        { type: "Regions", id: region_id },
      ],
    }),

    updateRegionalStructure: builder.mutation<
      RegionalStructure,
      { id: string; data: UpdateRegionalStructurePayload; region_id: string }
    >({
      query: ({ id, data }) => ({
        url: `/regional-structures/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: RegionalStructure }) => res.data,
      invalidatesTags: (_res, _err, { id, region_id }) => [
        { type: "RegionalStructures", id },
        { type: "RegionalStructures", id: region_id },
      ],
    }),

    deleteRegionalStructure: builder.mutation<
      { success: boolean; message: string },
      { id: string; region_id: string }
    >({
      query: ({ id }) => ({
        url: `/regional-structures/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, { region_id }) => [
        { type: "RegionalStructures", id: region_id },
        { type: "Regions", id: region_id },
      ],
    }),

    assignUsersToRegionalStructure: builder.mutation<
      RegionalStructure,
      { id: string; user_ids: string[]; region_id: string }
    >({
      query: ({ id, user_ids }) => ({
        url: `/regional-structures/${id}/users`,
        method: "POST",
        body: { user_ids },
      }),
      transformResponse: (res: { data: RegionalStructure }) => res.data,
      invalidatesTags: (_res, _err, { id, region_id }) => [
        { type: "RegionalStructures", id },
        { type: "RegionalStructures", id: region_id },
        { type: "User", id: "LIST" },
      ],
    }),

    removeUserFromRegionalStructure: builder.mutation<
      { success: boolean },
      { id: string; user_id: string; region_id: string }
    >({
      query: ({ id, user_id }) => ({
        url: `/regional-structures/${id}/users/${user_id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, { id, region_id }) => [
        { type: "RegionalStructures", id },
        { type: "RegionalStructures", id: region_id },
        { type: "User", id: "LIST" },
      ],
    }),

    // Regional Branding
    getRegionalBranding: builder.query<RegionalBrandingData, string>({
      query: (region_id) => ({
        url: "/regional-branding",
        params: { region_id },
      }),
      transformResponse: (res: { data: RegionalBrandingData }) => res.data,
      providesTags: (_res, _err, region_id) => [{ type: "RegionalBranding", id: region_id }],
    }),

    updateRegionalBranding: builder.mutation<
      RegionalBrandingData,
      { region_id: string; data: Partial<RegionalBrandingData> }
    >({
      query: ({ region_id, data }) => ({
        url: "/regional-branding",
        method: "PUT",
        body: { ...data, region_id },
      }),
      transformResponse: (res: { data: RegionalBrandingData }) => res.data,
      invalidatesTags: (_res, _err, { region_id }) => [
        { type: "RegionalBranding", id: region_id },
        { type: "Regions", id: region_id },
        { type: "Regions", id: "LIST" },
        { type: "RegionalDashboard", id: region_id },
      ],
    }),

    getRegionalDashboard: builder.query<
      RegionalDashboardData,
      { region_id?: string } | void
    >({
      query: (params) => ({
        url: "/regional/dashboard",
        params: params?.region_id ? { region_id: params.region_id } : undefined,
      }),
      transformResponse: (res: { data: RegionalDashboardData }) => res.data,
      providesTags: (_res, _err, arg) => [
        { type: "RegionalDashboard", id: arg?.region_id || "CURRENT" },
      ],
    }),

    getRegionalRoles: builder.query<Role[], void>({
      query: () => ({
        url: "/regional/roles",
      }),
      transformResponse: (res: { data: Role[] }) => res.data,
      providesTags: [{ type: "Roles", id: "REGIONAL_LIST" }],
    }),
  }),
});

export const {
  useGetRegionsQuery,
  useGetRegionByIdQuery,
  useCreateRegionMutation,
  useUpdateRegionMutation,
  useToggleRegionStatusMutation,
  useDeleteRegionMutation,
  useGetRegionalStructuresQuery,
  useGetRegionalStructureByIdQuery,
  useCreateRegionalStructureMutation,
  useUpdateRegionalStructureMutation,
  useDeleteRegionalStructureMutation,
  useAssignUsersToRegionalStructureMutation,
  useRemoveUserFromRegionalStructureMutation,
  useGetRegionalBrandingQuery,
  useUpdateRegionalBrandingMutation,
  useGetRegionalDashboardQuery,
  useGetRegionalRolesQuery,
} = regionApi;
