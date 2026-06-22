"use client";

import { IssueDashboardStats } from "@/redux/types/issue";
import { ISSUE_STATUS_LABELS, IssueStatus } from "@/redux/types/issue";
import { cn } from "@/lib/utils";

const STAT_CARDS: Array<{
  key: keyof IssueDashboardStats;
  status?: IssueStatus;
  color: string;
}> = [
  { key: "total", color: "border-l-slate-500" },
  { key: "submitted", status: "submitted", color: "border-l-slate-400" },
  { key: "under_review", status: "under_review", color: "border-l-blue-500" },
  { key: "accepted", status: "accepted", color: "border-l-emerald-500" },
  { key: "rejected", status: "rejected", color: "border-l-red-500" },
  { key: "resolved", status: "resolved", color: "border-l-violet-500" },
  { key: "closed", status: "closed", color: "border-l-gray-400" },
];

interface IssueDashboardStatsCardsProps {
  stats?: IssueDashboardStats;
  isLoading?: boolean;
  activeStatus?: IssueStatus | "all";
  onStatusClick?: (status: IssueStatus | "all") => void;
}

export function IssueDashboardStatsCards({
  stats,
  isLoading,
  activeStatus = "all",
  onStatusClick,
}: IssueDashboardStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {STAT_CARDS.map(({ key, status, color }) => {
        const label =
          key === "total" ? "Total" : ISSUE_STATUS_LABELS[status as IssueStatus];
        const value = isLoading ? "—" : (stats?.[key] ?? 0);
        const isActive =
          key === "total" ? activeStatus === "all" : activeStatus === status;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onStatusClick?.(status ?? "all")}
            className={cn(
              "rounded-lg border bg-white p-4 text-left shadow-sm border-l-4 transition hover:shadow-md",
              color,
              isActive && "ring-2 ring-primary/20"
            )}
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
          </button>
        );
      })}
    </div>
  );
}
