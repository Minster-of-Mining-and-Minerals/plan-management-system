import { baseApi } from "../baseApi";

export type AppNotification = {
  notification_id: string;
  recipient_id: string;
  category?: "system" | "logs" | "appointments";
  title: string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationCategory = "system" | "logs" | "appointments";

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      AppNotification[],
      { unread?: boolean; category?: NotificationCategory } | void
    >({
      query: (params) => ({
        url: "/notifications",
        params:
          params && (params.unread || params.category)
            ? {
                ...(params.unread ? { unread: "true" } : {}),
                ...(params.category ? { category: params.category } : {}),
              }
            : undefined,
      }),
      transformResponse: (r: { data: AppNotification[] }) => r.data ?? [],
      providesTags: ["Notification"],
    }),

    getUnreadNotificationCount: builder.query<number, void>({
      query: () => "/notifications/unread-count",
      transformResponse: (r: { data: { count: number } }) => r.data?.count ?? 0,
      providesTags: ["Notification"],
    }),

    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: "/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationApi;
