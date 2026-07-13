"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Bell, CalendarClock, ClipboardList, Inbox, ShieldAlert, CheckCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  getNotificationHref,
  type AppNotification,
  type NotificationCategory,
} from "@/redux/api/notificationApi";

const CATEGORY_OPTIONS: Array<{
  key: NotificationCategory;
  label: string;
  icon: typeof Bell;
}> = [
  { key: "appointments", label: "Appointments", icon: CalendarClock },
  { key: "workflow", label: "Workflow", icon: Inbox },
  { key: "finance", label: "Finance", icon: Wallet },
  { key: "system", label: "System", icon: ShieldAlert },
  { key: "logs", label: "Logs", icon: ClipboardList },
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function iconForCategory(category?: NotificationCategory) {
  const option = CATEGORY_OPTIONS.find((x) => x.key === category);
  const Icon = option?.icon || Bell;
  return <Icon className="h-4 w-4" />;
}

export default function TemplateNotificationsPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] =
    useState<NotificationCategory>("appointments");
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
    const href = getNotificationHref(notification);
    if (href) router.push(href);
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
            onClick={() => markAllRead()}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = option.key === activeCategory;
          return (
            <Button
              key={option.key}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setActiveCategory(option.key)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {option.label}
            </Button>
          );
        })}
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
            <CardContent className="py-10 text-center text-muted-foreground">
              No notifications in this category.
            </CardContent>
          </Card>
        ) : (
          filtered.map((n) => (
            <Card
              key={n.notification_id}
              className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                !n.is_read ? "border-primary/40 bg-primary/5" : ""
              }`}
              onClick={() => handleOpen(n)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-muted-foreground">
                    {iconForCategory(n.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatWhen(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && <span className="mt-1 size-2 rounded-full bg-primary" />}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

