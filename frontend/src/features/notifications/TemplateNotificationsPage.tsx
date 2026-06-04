"use client";

import { useMemo, useState } from "react";
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
  NotificationCategoryTabs,
  NotificationEmptyState,
  NotificationListItem,
  NotificationCategory,
  resolveNotificationLink,
} from "@/features/notifications";

export default function TemplateNotificationsPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("plans");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data: notifications = [], isLoading } = useGetNotificationsQuery({
    category: activeCategory,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  const filtered = useMemo(
    () => (showUnreadOnly ? notifications.filter((n) => !n.is_read) : notifications),
    [notifications, showUnreadOnly]
  );
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
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0
              ? `${unread} unread in ${activeCategory}`
              : `No unread ${activeCategory} notifications`}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={markingAll}
            onClick={() => markAllRead({ category: activeCategory })}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <NotificationCategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        <Button
          size="sm"
          variant={showUnreadOnly ? "default" : "outline"}
          onClick={() => setShowUnreadOnly((v) => !v)}
        >
          {showUnreadOnly ? "Showing unread" : "Show unread only"}
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent>
              <NotificationEmptyState message="No notifications in this category." />
            </CardContent>
          </Card>
        ) : (
          filtered.map((n) => (
            <NotificationListItem key={n.notification_id} notification={n} onOpen={handleOpen} />
          ))
        )}
      </div>
    </div>
  );
}
