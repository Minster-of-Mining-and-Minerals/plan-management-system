import { baseApi } from "../baseApi";
import type { SystemSettings, UpdateSystemSettingsPayload } from "../types/systemSettings";

export const systemSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSecuritySystemSettings: builder.query<
      Pick<SystemSettings, "expose_required_permissions">,
      void
    >({
      query: () => "/system-settings/security",
      transformResponse: (response: {
        data: Pick<SystemSettings, "expose_required_permissions">;
      }) => response.data,
      providesTags: ["SystemSettings"],
    }),

    getSystemSettings: builder.query<SystemSettings, void>({
      query: () => "/system-settings",
      transformResponse: (response: { data: SystemSettings }) => response.data,
      providesTags: ["SystemSettings"],
    }),

    updateSystemSettings: builder.mutation<SystemSettings, UpdateSystemSettingsPayload>({
      query: (body) => ({
        url: "/system-settings",
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: SystemSettings }) => response.data,
      invalidatesTags: ["SystemSettings", "SystemAuditLog"],
    }),
  }),
});

export const {
  useGetSecuritySystemSettingsQuery,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
} = systemSettingsApi;
