"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Bell, CalendarClock, ClipboardList, Inbox, ShieldAlert, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  getNotificationHref,
  type AppNotification,
} from "@/redux/api/notificationApi";

const CATEGORY_OPTIONS = [
  { key: "appointments" as const, label: "Appointments", icon: CalendarClock },
  { key: "workflow" as const, label: "Workflow", icon: Inbox },
  { key: "system" as const, label: "System", icon: ShieldAlert },
  { key: "logs" as const, label: "Logs", icon: ClipboardList },
];

function iconForCategory(category?: AppNotification["category"]) {
  const option = CATEGORY_OPTIONS.find((x) => x.key === category);
  const Icon = option?.icon || Bell;
  return <Icon className="h-4 w-4" />;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TemplateNotificationDropdown({
  notificationCount = 0,
}: {
  notificationCount?: number;
}) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<
    "appointments" | "workflow" | "system" | "logs"
  >("appointments");

  const { data: notifications = [], isLoading } = useGetNotificationsQuery({
    category: activeCategory,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  const unread = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.is_read) {
      await markRead(notification.notification_id);
    }
    const href = getNotificationHref(notification);
    if (href) {
      router.push(href);
      return;
    }
    router.push("/notifications");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {notificationCount > 0 && (
            <span className="absolute text-white font-bold -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={markingAll}
              onClick={() => markAllRead()}
              className="h-7 px-2 text-xs"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="flex gap-1 border-b px-2 py-2">
          {CATEGORY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = option.key === activeCategory;
            return (
              <Button
                key={option.key}
                size="sm"
                variant={active ? "default" : "ghost"}
                className="h-7 text-xs"
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
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications in this category.
            </div>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <button
                key={n.notification_id}
                type="button"
                onClick={() => handleOpen(n)}
                className={`w-full border-b px-3 py-3 text-left transition hover:bg-muted/40 ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 text-muted-foreground">
                    {iconForCategory(n.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatWhen(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && <span className="mt-1 size-2 rounded-full bg-primary" />}
                </div>
              </button>
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

