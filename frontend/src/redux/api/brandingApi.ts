import { baseApi } from "../baseApi";
import {
  SystemBranding,
  CreateBrandingPayload,
  UpdateBrandingPayload,
} from "../types/branding";

export const brandingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActiveBranding: builder.query<SystemBranding | null, void>({
      query: () => "/branding/active",
      transformResponse: (response: { data: SystemBranding | null }) =>
        response.data,
      providesTags: [{ type: "Branding", id: "ACTIVE" }],
    }),

    getBrandingList: builder.query<
      SystemBranding[],
      { is_active?: boolean } | void
    >({
      query: (params) => ({
        url: "/branding",
        params: params || {},
      }),
      transformResponse: (response: { data: SystemBranding[] }) =>
        response.data ?? [],
      providesTags: ["Branding"],
    }),

    getBrandingById: builder.query<SystemBranding, string>({
      query: (id) => `/branding/${id}`,
      transformResponse: (response: { data: SystemBranding }) => response.data,
      providesTags: (_r, _e, id) => [{ type: "Branding", id }],
    }),

    createBranding: builder.mutation<SystemBranding, CreateBrandingPayload>({
      query: (body) => ({
        url: "/branding",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: SystemBranding }) => response.data,
      invalidatesTags: ["Branding", { type: "Branding", id: "ACTIVE" }],
    }),

    updateBranding: builder.mutation<
      SystemBranding,
      { id: string; data: UpdateBrandingPayload }
    >({
      query: ({ id, data }) => ({
        url: `/branding/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { data: SystemBranding }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Branding", id },
        "Branding",
        { type: "Branding", id: "ACTIVE" },
      ],
    }),

    activateBranding: builder.mutation<SystemBranding, string>({
      query: (id) => ({
        url: `/branding/${id}/activate`,
        method: "PATCH",
      }),
      transformResponse: (response: { data: SystemBranding }) => response.data,
      invalidatesTags: ["Branding", { type: "Branding", id: "ACTIVE" }],
    }),

    deleteBranding: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/branding/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Branding"],
    }),
  }),
});

export const {
  useGetActiveBrandingQuery,
  useGetBrandingListQuery,
  useGetBrandingByIdQuery,
  useCreateBrandingMutation,
  useUpdateBrandingMutation,
  useActivateBrandingMutation,
  useDeleteBrandingMutation,
} = brandingApi;
