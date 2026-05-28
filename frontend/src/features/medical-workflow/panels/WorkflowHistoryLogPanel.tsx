"use client";

import { ArrowRight, Clock } from "lucide-react";
import { AppointmentSidePanelShell } from "../components/AppointmentSidePanelShell";
import type { MedicalHistoryLog } from "@/redux/api/medicalWorkflowApi";
const ACTION_LABELS: Record<string, string> = {
  submit: "Report submitted",
  forward: "Forwarded",
  return: "Forwarded",
  prescribe: "Prescription",
  complete: "Workflow completed",
};

function routeLabel(entry: MedicalHistoryLog) {
  const from = entry.sender?.full_name || "Staff";
  const to = entry.receiver?.full_name;
  if (to && (entry.action_type === "forward" || entry.action_type === "return")) {
    return { from, to };
  }
  return { from, to: null };
}

type Props = {
  entries: MedicalHistoryLog[];
  onClose?: () => void;
};

export function WorkflowHistoryLogPanel({ entries, onClose }: Props) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <AppointmentSidePanelShell
      title="Workflow history log"
      subtitle="Staff routing steps — from user to user"
      onClose={onClose}
    >
      {sorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Clock className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
          <p>No workflow history yet</p>
        </div>
      ) : (
        <div className="relative px-1 pb-4">
          <div className="absolute bottom-2 left-5 top-2 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200" />
          <div className="space-y-4">
            {sorted.map((entry, index) => {
              const route = routeLabel(entry);
              const actionLabel =
                ACTION_LABELS[entry.action_type] || entry.header_title;

              return (
                <div key={entry.log_id} className="relative flex gap-3">
                  <div className="relative h-6 w-6 shrink-0">
                    <div className="absolute -left-2 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#094C81] text-[10px] font-semibold text-white">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 -ml-2 rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {entry.header_title}
                      </span>
                      <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                        {entry.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{actionLabel}</p>
                    {route.to ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1 rounded border border-purple-100 bg-purple-50 p-1.5 text-[11px] text-purple-800 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200">
                        <span className="font-medium">{route.from}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span className="font-medium">{route.to}</span>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        By {route.from}
                        {entry.sender?.internalProfile?.departmentRef?.name
                          ? ` · ${entry.sender.internalProfile.departmentRef.name}`
                          : ""}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppointmentSidePanelShell>
  );
}
