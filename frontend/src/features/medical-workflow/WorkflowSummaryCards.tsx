"use client";

import { CalendarDays, ClipboardList, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useGetMyAppointmentsQuery } from "@/redux/api/appointmentApi";
import { useGetWorkflowInboxQuery } from "@/redux/api/medicalWorkflowApi";

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  /** When set, today's visit count uses this schedule date (defaults to today). */
  scheduleDate?: string;
};

export function WorkflowSummaryCards({ scheduleDate = formatToday() }: Props) {
  const { data: todayAppointments = [], isLoading: loadingAppointments } =
    useGetMyAppointmentsQuery({
      schedule_date: scheduleDate,
      status: "admitted",
    });

  const { data: pendingTasks = [], isLoading: loadingInbox } =
    useGetWorkflowInboxQuery({ status: "pending" });

  const activeWorkflows = todayAppointments.filter(
    (a) => a.workflow_status === "active" || !a.workflow_status
  ).length;

  const cards = [
    {
      label: "Today's visits",
      value: loadingAppointments ? "…" : String(todayAppointments.length),
      hint: scheduleDate,
      icon: CalendarDays,
    },
    {
      label: "Active workflows",
      value: loadingAppointments ? "…" : String(activeWorkflows),
      hint: "Admitted today",
      icon: ClipboardList,
    },
    {
      label: "Inbox pending",
      value: loadingInbox ? "…" : String(pendingTasks.length),
      hint: "Forwarded to you",
      icon: Inbox,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map(({ label, value, hint, icon: Icon }) => (
        <Card key={label} className="border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="text-2xl font-semibold tabular-nums leading-tight">
                {value}
              </p>
              <p className="truncate text-xs text-muted-foreground">{hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
