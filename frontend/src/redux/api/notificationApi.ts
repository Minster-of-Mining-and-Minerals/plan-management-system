import { baseApi } from "../baseApi";

export type AppNotification = {
  notification_id: string;
  recipient_id: string;
  category?: "system" | "logs" | "appointments" | "workflow";
  title: string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationCategory = "system" | "logs" | "appointments" | "workflow";

/** Navigate to the screen for an internal notification, if applicable. */
export function getNotificationHref(notification: AppNotification): string | null {
  const id = notification.related_entity_id;
  if (!id) return null;

  const type = notification.related_entity_type?.toLowerCase();
  if (type === "appointment" || type === "workflow_task") {
    return `/appointments/${id}`;
  }
  if (notification.category === "workflow") {
    return `/appointments/${id}`;
  }
  return null;
}

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
