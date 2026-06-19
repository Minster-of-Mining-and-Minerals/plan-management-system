"use client";

import { Clock } from "lucide-react";
import type { IssueHistoryEntry } from "@/redux/types/issue";
import { ISSUE_STATUS_LABELS, type IssueStatus } from "@/redux/types/issue";
import { IssueSidePanelShell } from "../components/IssueSidePanelShell";

const ACTION_LABELS: Record<string, string> = {
  status_change: "Status updated",
  field_change: "Field updated",
  created: "Issue created",
  assigned: "Issue assigned",
  review_started: "Review started",
};

function getStatusColor(status: string) {
  const normalized = status?.toLowerCase().replace(/_/g, " ");
  if (normalized.includes("resolved")) return "bg-green-100 text-green-800 border-green-200";
  if (normalized.includes("review")) return "bg-blue-100 text-blue-800 border-blue-200";
  if (normalized.includes("submitted")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (normalized.includes("reject")) return "bg-red-100 text-red-800 border-red-200";
  if (normalized.includes("accept")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (normalized.includes("closed")) return "bg-gray-100 text-gray-800 border-gray-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) return "";
  const key = value as IssueStatus;
  return ISSUE_STATUS_LABELS[key] || value.replace(/_/g, " ");
}

function getActionColor(entry: IssueHistoryEntry) {
  const status = entry.new_value || entry.old_value || "";
  if (status.includes("resolved")) return "bg-green-50 border-green-200";
  if (status.includes("reject")) return "bg-red-50 border-red-200";
  if (status.includes("accept")) return "bg-emerald-50 border-emerald-200";
  if (status.includes("review")) return "bg-blue-50 border-blue-200";
  return "bg-gray-50 border-gray-200";
}

interface IssueHistoryLogPanelProps {
  history?: IssueHistoryEntry[];
  onClose?: () => void;
}

export function IssueHistoryLogPanel({ history = [], onClose }: IssueHistoryLogPanelProps) {
  const sortedLogs = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <IssueSidePanelShell
      title="Issue timeline"
      subtitle="View the history of this issue"
      onClose={onClose}
    >
      {sortedLogs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Clock className="mx-auto mb-2 h-10 w-10 text-gray-300" />
          <p>No history available</p>
        </div>
      ) : (
        <div className="relative my-2 px-1 pb-6">
          <div className="absolute bottom-2 left-5 top-2 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200" />
          <div className="space-y-4">
            {sortedLogs.map((entry, index) => {
              const statusLabel =
                entry.field_name === "status" ? entry.new_value || entry.old_value : "";
              const actionLabel =
                ACTION_LABELS[entry.action_type] ||
                entry.action_type.replace(/_/g, " ");

              return (
                <div key={entry.issue_history_id} className="relative flex gap-3">
                  <div className="relative h-6 w-6 shrink-0">
                    <div className="absolute -left-2 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#094C81] text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                  </div>
                  <div
                    className={`-ml-2 flex-1 rounded-lg border p-2 text-sm ${getActionColor(entry)}`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-700">
                        {entry.performer?.full_name || "System"}
                      </span>
                      {statusLabel ? (
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${getStatusColor(statusLabel)}`}
                        >
                          {formatStatusLabel(statusLabel)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs capitalize text-gray-800">{actionLabel}</p>
                    {(entry.old_value || entry.new_value) && entry.field_name === "status" ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatStatusLabel(entry.old_value)} → {formatStatusLabel(entry.new_value)}
                      </p>
                    ) : null}
                    {entry.field_name && entry.field_name !== "status" && entry.new_value ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {entry.field_name}: {entry.new_value}
                      </p>
                    ) : null}
                    {entry.notes ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{entry.notes}</p>
                    ) : null}
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
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
    </IssueSidePanelShell>
  );
}
