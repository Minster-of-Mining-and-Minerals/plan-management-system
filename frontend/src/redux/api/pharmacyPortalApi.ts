import { baseApi } from "../baseApi";
import type {
  PharmacyPrescription,
  PharmacyDashboardStats,
} from "../types/pharmacy";

export const pharmacyPortalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPharmacyPortalProfile: builder.query<
      {
        user: { user_id: string; full_name: string; email: string };
        pharmacy: { pharmacy_id: string; pharmacy_name: string; pharmacy_code: string };
        portal_role: string;
      },
      void
    >({
      query: () => "/pharmacy-portal/me",
      transformResponse: (r: { data: unknown }) => r.data as {
        user: { user_id: string; full_name: string; email: string };
        pharmacy: { pharmacy_id: string; pharmacy_name: string; pharmacy_code: string };
        portal_role: string;
      },
    }),

    getPharmacyDashboard: builder.query<PharmacyDashboardStats, void>({
      query: () => "/pharmacy-portal/dashboard",
      transformResponse: (r: { data: PharmacyDashboardStats }) => r.data,
      providesTags: ["PharmacyPortal"],
    }),

    getPharmacyPortalPrescriptions: builder.query<
      PharmacyPrescription[],
      { queue?: boolean; pharmacy_status?: string; search?: string }
    >({
      query: (params) => ({
        url: "/pharmacy-portal/prescriptions",
        params: {
          ...params,
          queue: params.queue ? "true" : undefined,
        },
      }),
      transformResponse: (r: { data: PharmacyPrescription[] }) => r.data ?? [],
      providesTags: ["PharmacyPortal"],
    }),

    getPharmacyPortalPrescription: builder.query<PharmacyPrescription, string>({
      query: (id) => `/pharmacy-portal/prescriptions/${id}`,
      transformResponse: (r: { data: PharmacyPrescription }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "PharmacyPortal", id }],
    }),

    updatePharmacyPrescriptionWorkflow: builder.mutation<
      PharmacyPrescription,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/pharmacy-portal/prescriptions/${id}/workflow`,
        method: "PATCH",
        body,
      }),
      transformResponse: (r: { data: PharmacyPrescription }) => r.data,
      invalidatesTags: ["PharmacyPortal"],
    }),

    getPharmacyPortalNotifications: builder.query<
      {
        notification_id: string;
        title: string;
        message: string;
        is_read: boolean;
        created_at: string;
        related_entity_type?: string | null;
        related_entity_id?: string | null;
      }[],
      void
    >({
      query: () => "/pharmacy-portal/notifications",
      transformResponse: (r: { data: unknown[] }) => (r.data ?? []) as {
        notification_id: string;
        title: string;
        message: string;
        is_read: boolean;
        created_at: string;
        related_entity_type?: string | null;
        related_entity_id?: string | null;
      }[],
      providesTags: ["PharmacyPortal"],
    }),

    getPharmacyPortalUnreadCount: builder.query<number, void>({
      query: () => "/pharmacy-portal/notifications/unread-count",
      transformResponse: (r: { data: { count: number } }) => r.data?.count ?? 0,
      providesTags: ["PharmacyPortal"],
    }),

    markPharmacyNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/pharmacy-portal/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["PharmacyPortal"],
    }),

    markAllPharmacyNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: "/pharmacy-portal/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["PharmacyPortal"],
    }),
  }),
});

export const {
  useGetPharmacyPortalProfileQuery,
  useGetPharmacyDashboardQuery,
  useGetPharmacyPortalPrescriptionsQuery,
  useGetPharmacyPortalPrescriptionQuery,
  useLazyGetPharmacyPortalPrescriptionQuery,
  useUpdatePharmacyPrescriptionWorkflowMutation,
  useGetPharmacyPortalNotificationsQuery,
  useGetPharmacyPortalUnreadCountQuery,
  useMarkPharmacyNotificationReadMutation,
  useMarkAllPharmacyNotificationsReadMutation,
} = pharmacyPortalApi;
