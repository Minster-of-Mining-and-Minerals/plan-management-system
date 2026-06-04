"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type AppNotification,
} from "@/redux/api/notificationApi";
import {
  NotificationCategoryTabs,
  NotificationEmptyState,
  NotificationListItem,
  NotificationCategory,
  NOTIFICATION_CATEGORY_OPTIONS,
  resolveNotificationLink,
} from "@/features/notifications";
import { Bell } from "lucide-react";

export default function TemplateNotificationDropdown() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("plans");

  const { data: unreadData } = useGetUnreadNotificationCountQuery();
  const { data: notifications = [], isLoading } = useGetNotificationsQuery({
    category: activeCategory,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  const unreadTotal = unreadData?.count ?? 0;
  const unreadInCategory = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.is_read) {
      await markRead(notification.notification_id);
    }
    const link = resolveNotificationLink(notification);
    if (link) {
      router.push(link);
      return;
    }
    router.push("/notifications");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadTotal > 0 && (
            <span className="absolute text-white font-bold -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {unreadTotal > 9 ? "9+" : unreadTotal}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadInCategory > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={markingAll}
              onClick={() => markAllRead({ category: activeCategory })}
              className="h-7 px-2 text-xs"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="flex gap-1 border-b px-2 py-2 overflow-x-auto">
          {NOTIFICATION_CATEGORY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = option.key === activeCategory;
            return (
              <Button
                key={option.key}
                size="sm"
                variant={active ? "default" : "ghost"}
                className="h-7 text-xs shrink-0"
                onClick={() => setActiveCategory(option.key)}
              >
                <Icon className="mr-1 h-3 w-3" />
                {option.label}
              </Button>
            );
          })}
        </div>

        <div className="max-h-[340px] overflow-auto">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <NotificationEmptyState message="No notifications in this category." />
          ) : (
            notifications.slice(0, 10).map((n) => (
              <NotificationListItem
                key={n.notification_id}
                notification={n}
                onOpen={handleOpen}
                compact
              />
            ))
          )}
        </div>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm"
            onClick={() => router.push("/notifications")}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
