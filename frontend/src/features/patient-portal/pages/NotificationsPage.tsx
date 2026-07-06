"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  CreditCard,
  FlaskConical,
  Pill,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetPatientPortalNotificationsQuery,
  useMarkAllPatientPortalNotificationsReadMutation,
  useMarkPatientPortalNotificationReadMutation,
} from "@/redux/api/patientPortalApi";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { DemoBanner } from "../components/DemoBanner";
import { formatDateTime } from "../data/mockPatientPortalData";
import { notificationTypeFromCategory } from "../patientPortalUtils";
import type { NotificationType } from "../types";

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  appointment: Calendar,
  prescription: Pill,
  lab: FlaskConical,
  billing: CreditCard,
  general: Bell,
};

export function NotificationsPage() {
  const { data: notifications = [], isLoading } =
    useGetPatientPortalNotificationsQuery();
  const [markRead] = useMarkPatientPortalNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllPatientPortalNotificationsReadMutation();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.is_read);
    return notifications.filter(
      (n) => notificationTypeFromCategory(n.category) === filter
    );
  }, [notifications, filter]);

  const handleMarkRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    await markRead(id);
  };

  if (isLoading) return <Loading01 />;

  return (
    <PatientPortalShell
      title="Notifications"
      description="Appointment reminders, lab alerts, prescription updates, and billing notices."
      action={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={markingAll}
          onClick={() => markAllRead()}
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      }
    >
      <DemoBanner />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="appointment">Appointments</TabsTrigger>
          <TabsTrigger value="lab">Labs</TabsTrigger>
          <TabsTrigger value="prescription">Prescriptions</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          filtered.map((n) => {
            const type = notificationTypeFromCategory(n.category);
            const Icon = TYPE_ICONS[type];
            return (
              <Card
                key={n.notification_id}
                className={cn(
                  "border-border/60 transition-colors cursor-pointer hover:shadow-sm",
                  !n.is_read && "border-l-4 border-l-primary bg-section-accent-subtle-10"
                )}
                onClick={() => handleMarkRead(n.notification_id, n.is_read)}
              >
                <CardContent className="flex gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "font-medium text-sm",
                          !n.is_read && "text-foreground"
                        )}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </PatientPortalShell>
  );
}
