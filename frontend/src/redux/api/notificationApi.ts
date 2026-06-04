import { baseApi } from "../baseApi";

export type NotificationCategory = "plans" | "assignments" | "system" | "logs";
export type NotificationPriority = "low" | "normal" | "high";

export interface AppNotification {
  notification_id: string;
  recipient_id: string;
  template_code?: string | null;
  category: NotificationCategory;
  notification_type: string;
  title: string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  link_path?: string | null;
  icon_variant?: string | null;
  priority: NotificationPriority;
  metadata?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  notification_template_id: string;
  template_code: string;
  category: NotificationCategory;
  notification_type: string;
  title_template: string;
  message_template: string;
  related_entity_type?: string | null;
  default_link_path?: string | null;
  icon_variant: string;
  priority: NotificationPriority;
  is_active: boolean;
}

export interface GetNotificationsParams {
  category?: NotificationCategory;
  unread_only?: boolean;
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<AppNotification[], GetNotificationsParams | void>({
      query: (params) => ({
        url: "/notifications",
        params: params
          ? {
              ...(params.category ? { category: params.category } : {}),
              ...(params.unread_only ? { unread_only: "true" } : {}),
            }
          : {},
      }),
      transformResponse: (response: { data?: AppNotification[] }) => response.data ?? [],
      providesTags: ["Notification"],
    }),

    getUnreadNotificationCount: builder.query<{ count: number }, void>({
      query: () => "/notifications/unread-count",
      transformResponse: (response: { data?: { count: number } }) =>
        response.data ?? { count: 0 },
      providesTags: ["Notification"],
    }),

    getNotificationTemplates: builder.query<NotificationTemplate[], void>({
      query: () => "/notifications/templates",
      transformResponse: (response: { data?: NotificationTemplate[] }) => response.data ?? [],
      providesTags: ["NotificationTemplate"],
    }),

    markNotificationRead: builder.mutation<AppNotification, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      transformResponse: (response: { data?: AppNotification }) => response.data as AppNotification,
      invalidatesTags: ["Notification"],
    }),

    markAllNotificationsRead: builder.mutation<
      { message: string },
      { category?: NotificationCategory } | void
    >({
      query: (body) => ({
        url: "/notifications/read-all",
        method: "PATCH",
        body: body || {},
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useGetNotificationTemplatesQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationApi;
