import { baseApi } from "../baseApi";
import type {
  BrandingPublicResponse,
  BrandingSettings,
  UpdateBrandingSettingsPayload,
} from "../types/branding";

export const brandingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPublicBranding: builder.query<BrandingPublicResponse, void>({
      query: () => "/branding/public",
      transformResponse: (response: { data: BrandingPublicResponse }) => response.data,
      providesTags: ["Branding"],
    }),

    getBrandingSettings: builder.query<BrandingSettings, void>({
      query: () => "/branding",
      transformResponse: (response: { data: BrandingSettings }) => response.data,
      providesTags: ["Branding"],
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

  }),
});

export const {
  useGetPublicBrandingQuery,
  useGetBrandingSettingsQuery,
  useUpdateBrandingSettingsMutation,
  useRestoreDefaultBrandingMutation,
} = brandingApi;
