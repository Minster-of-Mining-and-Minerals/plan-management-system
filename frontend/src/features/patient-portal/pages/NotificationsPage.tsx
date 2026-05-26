"use client";

import { useState } from "react";
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
import { PatientPortalShell } from "../components/PatientPortalShell";
import { DemoBanner } from "../components/DemoBanner";
import { MOCK_NOTIFICATIONS, formatDateTime } from "../data/mockPatientPortalData";
import type { NotificationType } from "../types";

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  appointment: Calendar,
  prescription: Pill,
  lab: FlaskConical,
  billing: CreditCard,
  general: Bell,
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? notifications
      : filter === "unread"
        ? notifications.filter((n) => !n.read)
        : notifications.filter((n) => n.type === filter);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <PatientPortalShell
      title="Notifications"
      description="Appointment reminders, lab alerts, prescription updates, and billing notices."
      action={
        <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
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
        {filtered.map((n) => {
          const Icon = TYPE_ICONS[n.type];
          return (
            <Card
              key={n.id}
              className={cn(
                "border-border/60 transition-colors cursor-pointer hover:shadow-sm",
                !n.read && "border-l-4 border-l-primary bg-section-accent-subtle-10"
              )}
              onClick={() =>
                setNotifications((prev) =>
                  prev.map((item) =>
                    item.id === n.id ? { ...item, read: true } : item
                  )
                )
              }
            >
              <CardContent className="flex gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("font-medium text-sm", !n.read && "text-foreground")}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDateTime(n.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  {n.actionLabel ? (
                    <Button variant="link" className="h-auto p-0 mt-2 text-primary text-xs">
                      {n.actionLabel} →
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PatientPortalShell>
  );
}
