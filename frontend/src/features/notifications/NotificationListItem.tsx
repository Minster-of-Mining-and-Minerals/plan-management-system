"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppNotification } from "@/redux/api/notificationApi";
import { PRIORITY_STYLES } from "./constants";
import { formatNotificationWhen, iconForNotification } from "./utils";

interface NotificationListItemProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  compact?: boolean;
}

export function NotificationListItem({
  notification,
  onOpen,
  compact = false,
}: NotificationListItemProps) {
  const Icon = iconForNotification(notification);
  const priorityStyle = PRIORITY_STYLES[notification.priority || "normal"];

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={`w-full border-b px-3 py-3 text-left transition hover:bg-muted/40 ${
          !notification.is_read ? priorityStyle.border || "bg-primary/5" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{notification.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {notification.message}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatNotificationWhen(notification.created_at)}
            </p>
          </div>
          {!notification.is_read && (
            <span className={`mt-1 size-2 rounded-full ${priorityStyle.dot}`} />
          )}
        </div>
      </button>
    );
  }

  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-muted/30 ${
        !notification.is_read ? priorityStyle.border || "border-primary/40 bg-primary/5" : ""
      }`}
      onClick={() => onOpen(notification)}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">{notification.title}</p>
              {notification.priority === "high" && (
                <Badge variant="destructive" className="text-[10px] h-5">
                  High
                </Badge>
              )}
              {notification.category && (
                <Badge variant="outline" className="text-[10px] h-5 capitalize">
                  {notification.category}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatNotificationWhen(notification.created_at)}
            </p>
          </div>
          {!notification.is_read && (
            <span className={`mt-1 size-2 rounded-full shrink-0 ${priorityStyle.dot}`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
