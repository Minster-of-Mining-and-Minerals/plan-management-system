"use client";

import { useRouter } from "@/i18n/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetPharmacyPortalNotificationsQuery,
  useMarkAllPharmacyNotificationsReadMutation,
  useMarkPharmacyNotificationReadMutation,
} from "@/redux/api/pharmacyPortalApi";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PharmacyNotificationsPage() {
  const router = useRouter();
  const { data: notifications = [], isLoading } =
    useGetPharmacyPortalNotificationsQuery();
  const [markRead] = useMarkPharmacyNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllPharmacyNotificationsReadMutation();

  const unread = notifications.filter((n) => !n.is_read).length;

  const handleOpen = async (notification: (typeof notifications)[0]) => {
    if (!notification.is_read) {
      await markRead(notification.notification_id);
    }
    if (
      notification.related_entity_type === "pharmacy_prescription" &&
      notification.related_entity_id
    ) {
      router.push(`/pharmacy/prescriptions/${notification.related_entity_id}`);
    }
  };

  if (isLoading) return <Loading01 />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Bell className="h-6 w-6" />
            Notifications
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
            <CardContent className="py-10 text-center text-muted-foreground">
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.notification_id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                !n.is_read ? "border-primary/40 bg-primary/5" : ""
              }`}
              onClick={() => handleOpen(n)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatWhen(n.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
