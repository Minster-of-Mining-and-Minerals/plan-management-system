"use client";

import { useRouter } from "@/i18n/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type AppNotification,
} from "@/redux/api/notificationApi";
import {
  NotificationEmptyState,
  NotificationListItem,
  resolveNotificationLink,
} from "@/features/notifications";

export default function InternalNotificationsPage() {
  const router = useRouter();
  const { data: notifications = [], isLoading } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  const unread = notifications.filter((n) => !n.is_read).length;

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.is_read) {
      await markRead(notification.notification_id);
    }
    const link = resolveNotificationLink(notification);
    if (link) {
      router.push(link);
    }
  };

  if (isLoading) return <Loading01 />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            All Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0
              ? `${unread} unread notification${unread === 1 ? "" : "s"}`
              : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={markingAll}
            onClick={() => markAllRead()}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent>
              <NotificationEmptyState message="No notifications yet." />
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <NotificationListItem key={n.notification_id} notification={n} onOpen={handleOpen} />
          ))
        )}
      </div>
    </div>
  );
}
