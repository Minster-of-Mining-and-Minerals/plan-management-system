import { baseApi } from "../baseApi";
import type {
  BrandingPublicResponse,
  BrandingScopeQuery,
  UpdateBrandingSettingsPayload,
} from "../types/branding";

function brandingQueryParams(params?: BrandingScopeQuery) {
  if (params?.government_structure_id) {
    return { government_structure_id: params.government_structure_id };
  }
  return undefined;
}

export const brandingApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getPublicBranding: builder.query<BrandingPublicResponse, BrandingScopeQuery | void>({
      query: (params) => ({
        url: "/branding/public",
        params: brandingQueryParams(params ?? undefined),
      }),
      transformResponse: (response: { data: BrandingPublicResponse }) => response.data,
      providesTags: ["Branding"],
    }),

    getBrandingSettings: builder.query<BrandingPublicResponse, BrandingScopeQuery | void>({
      query: (params) => ({
        url: "/branding",
        params: brandingQueryParams(params ?? undefined),
      }),
      transformResponse: (response: { data: BrandingPublicResponse }) => response.data,
      providesTags: (_result, _error, params) => [
        { type: "Branding", id: params?.government_structure_id ?? "global" },
        "Branding",
      ],
    }),

    updateBrandingSettings: builder.mutation<
      BrandingPublicResponse,
      UpdateBrandingSettingsPayload
    >({
      query: (body) => ({
        url: "/branding",
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: BrandingPublicResponse }) => response.data,
      invalidatesTags: ["Branding", "SystemAuditLog"],
    }),

    restoreDefaultBranding: builder.mutation<BrandingPublicResponse, void>({
      query: () => ({
        url: "/branding/restore-defaults",
        method: "POST",
      }),
      transformResponse: (response: { data: BrandingPublicResponse }) => response.data,
      invalidatesTags: ["Branding", "SystemAuditLog"],
    }),

    deleteSectorBranding: builder.mutation<BrandingPublicResponse, string>({
      query: (government_structure_id) => ({
        url: `/branding/sector/${government_structure_id}`,
        method: "DELETE",
      }),
      transformResponse: (response: { data: BrandingPublicResponse }) => response.data,
      invalidatesTags: ["Branding", "SystemAuditLog"],
    }),
  }),
});

export const {
  useGetPublicBrandingQuery,
  useGetBrandingSettingsQuery,
  useUpdateBrandingSettingsMutation,
  useRestoreDefaultBrandingMutation,
  useDeleteSectorBrandingMutation,
} = brandingApi;
