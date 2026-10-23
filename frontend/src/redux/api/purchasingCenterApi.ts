import { baseApi } from "../baseApi";
import type {
  PurchasingCenter,
  PurchasingCenterBrandingData,
  PurchasingCenterDashboardData,
  CreatePurchasingCenterPayload,
  UpdatePurchasingCenterPayload,
} from "../types/purchasingCenter";
import type { Role } from "../types/user";

export const purchasingCenterApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getPurchasingCenters: builder.query<
      PurchasingCenter[],
      { is_active?: boolean; search?: string } | void
    >({
      query: (params) => ({
        url: "/purchasing-centers",
        params: params || undefined,
      }),
      transformResponse: (res: { data: PurchasingCenter[] }) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ purchasing_center_id }) => ({
                type: "PurchasingCenters" as const,
                id: purchasing_center_id,
              })),
              { type: "PurchasingCenters", id: "LIST" },
            ]
          : [{ type: "PurchasingCenters", id: "LIST" }],
    }),

    getPurchasingCenterById: builder.query<PurchasingCenter, string>({
      query: (id) => `/purchasing-centers/${id}`,
      transformResponse: (res: { data: PurchasingCenter }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "PurchasingCenters", id }],
    }),

    createPurchasingCenter: builder.mutation<PurchasingCenter, CreatePurchasingCenterPayload>({
      query: (body) => ({
        url: "/purchasing-centers",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: PurchasingCenter }) => res.data,
      invalidatesTags: [{ type: "PurchasingCenters", id: "LIST" }],
    }),

    updatePurchasingCenter: builder.mutation<
      PurchasingCenter,
      { id: string; data: UpdatePurchasingCenterPayload }
    >({
      query: ({ id, data }) => ({
        url: `/purchasing-centers/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: PurchasingCenter }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "PurchasingCenters", id },
        { type: "PurchasingCenters", id: "LIST" },
        "PurchasingCenterBranding",
      ],
    }),

    togglePurchasingCenterStatus: builder.mutation<
      PurchasingCenter,
      { id: string; is_active: boolean }
    >({
      query: ({ id, is_active }) => ({
        url: `/purchasing-centers/${id}/status`,
        method: "PATCH",
        body: { is_active },
      }),
      transformResponse: (res: { data: PurchasingCenter }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "PurchasingCenters", id },
        { type: "PurchasingCenters", id: "LIST" },
      ],
    }),

    deletePurchasingCenter: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/purchasing-centers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "PurchasingCenters", id: "LIST" }],
    }),

    // Purchasing Center Branding
    getPurchasingCenterBranding: builder.query<PurchasingCenterBrandingData, string>({
      query: (purchasing_center_id) => ({
        url: "/purchasing-center-branding",
        params: { purchasing_center_id },
      }),
      transformResponse: (res: { data: PurchasingCenterBrandingData }) => res.data,
      providesTags: (_res, _err, purchasing_center_id) => [
        { type: "PurchasingCenterBranding", id: purchasing_center_id },
      ],
    }),

    updatePurchasingCenterBranding: builder.mutation<
      PurchasingCenterBrandingData,
      { purchasing_center_id: string; data: Partial<PurchasingCenterBrandingData> }
    >({
      query: ({ purchasing_center_id, data }) => ({
        url: "/purchasing-center-branding",
        method: "PUT",
        body: { ...data, purchasing_center_id },
      }),
      transformResponse: (res: { data: PurchasingCenterBrandingData }) => res.data,
      invalidatesTags: (_res, _err, { purchasing_center_id }) => [
        { type: "PurchasingCenterBranding", id: purchasing_center_id },
        { type: "PurchasingCenters", id: purchasing_center_id },
        { type: "PurchasingCenters", id: "LIST" },
        { type: "PurchasingCenterDashboard", id: purchasing_center_id },
      ],
    }),

    // Purchasing Center Dashboard
    getPurchasingCenterDashboard: builder.query<
      PurchasingCenterDashboardData,
      { purchasing_center_id?: string } | void
    >({
      query: (params) => ({
        url: "/purchasing-center/dashboard",
        params: params?.purchasing_center_id
          ? { purchasing_center_id: params.purchasing_center_id }
          : undefined,
      }),
      transformResponse: (res: { data: PurchasingCenterDashboardData }) => res.data,
      providesTags: (_res, _err, arg) => [
        { type: "PurchasingCenterDashboard", id: arg?.purchasing_center_id || "CURRENT" },
      ],
    }),

    // Purchasing Center Roles
    getPurchasingCenterRoles: builder.query<Role[], void>({
      query: () => ({
        url: "/purchasing-center/roles",
      }),
      transformResponse: (res: { data: Role[] }) => res.data,
      providesTags: [{ type: "Roles", id: "PURCHASING_CENTER_LIST" }],
    }),
  }),
});

export const {
  useGetPurchasingCentersQuery,
  useGetPurchasingCenterByIdQuery,
  useCreatePurchasingCenterMutation,
  useUpdatePurchasingCenterMutation,
  useTogglePurchasingCenterStatusMutation,
  useDeletePurchasingCenterMutation,
  useGetPurchasingCenterBrandingQuery,
  useUpdatePurchasingCenterBrandingMutation,
  useGetPurchasingCenterDashboardQuery,
  useGetPurchasingCenterRolesQuery,
} = purchasingCenterApi;
