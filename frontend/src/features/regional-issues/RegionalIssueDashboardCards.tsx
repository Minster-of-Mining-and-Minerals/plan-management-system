"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Archive,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { RegionalIssueDashboardStats, RegionalIssueStatus } from "@/redux/types/regionalIssue";
import { cn } from "@/lib/utils";

interface RegionalIssueDashboardCardsProps {
  stats?: RegionalIssueDashboardStats;
  isLoading?: boolean;
  activeStatus?: string;
  onStatusClick?: (status: string) => void;
}

export function RegionalIssueDashboardCards({
  stats,
  isLoading,
  activeStatus = "all",
  onStatusClick,
}: RegionalIssueDashboardCardsProps) {
  const cards = [
    {
      id: "all",
      label: "Total Regional Issues",
      count: stats?.total ?? 0,
      icon: FileText,
      color: "text-slate-700 dark:text-slate-200",
      bg: "bg-slate-50 dark:bg-slate-900/50",
      border: "border-slate-200 dark:border-slate-800",
      activeRing: "ring-2 ring-slate-400",
    },
    {
      id: "submitted",
      label: "Submitted",
      count: stats?.submitted ?? 0,
      icon: Clock,
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50/70 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      activeRing: "ring-2 ring-amber-500",
    },
    {
      id: "under_review",
      label: "Under Review",
      count: stats?.under_review ?? 0,
      icon: AlertCircle,
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50/70 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      activeRing: "ring-2 ring-blue-500",
    },
    {
      id: "accepted",
      label: "Accepted",
      count: stats?.accepted ?? 0,
      icon: TrendingUp,
      color: "text-teal-700 dark:text-teal-400",
      bg: "bg-teal-50/70 dark:bg-teal-950/30",
      border: "border-teal-200 dark:border-teal-800",
      activeRing: "ring-2 ring-teal-500",
    },
    {
      id: "resolved",
      label: "Resolved",
      count: stats?.resolved ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50/70 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      activeRing: "ring-2 ring-emerald-500",
    },
    {
      id: "rejected",
      label: "Rejected",
      count: stats?.rejected ?? 0,
      icon: XCircle,
      color: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-50/70 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-800",
      activeRing: "ring-2 ring-rose-500",
    },
    {
      id: "closed",
      label: "Closed",
      count: stats?.closed ?? 0,
      icon: Archive,
      color: "text-zinc-600 dark:text-zinc-400",
      bg: "bg-zinc-50 dark:bg-zinc-900/50",
      border: "border-zinc-200 dark:border-zinc-800",
      activeRing: "ring-2 ring-zinc-400",
    },
    {
      id: "escalated",
      label: "Escalated to Federal",
      count: stats?.escalated_count ?? 0,
      icon: ArrowUpRight,
      color: "text-purple-700 dark:text-purple-400",
      bg: "bg-purple-50/80 dark:bg-purple-950/40",
      border: "border-purple-200 dark:border-purple-800",
      activeRing: "ring-2 ring-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const isActive = activeStatus === c.id;
        return (
          <Card
            key={c.id}
            onClick={() => onStatusClick?.(c.id)}
            className={cn(
              "cursor-pointer transition-all duration-150 hover:shadow-sm border",
              c.bg,
              c.border,
              isActive ? c.activeRing : "hover:border-slate-300"
            )}
          >
            <CardContent className="p-3 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground truncate">
                  {c.label}
                </span>
                <Icon className={cn("h-4 w-4 shrink-0", c.color)} />
              </div>
              <div className="text-xl font-bold tracking-tight">
                {isLoading ? (
                  <div className="h-6 w-8 bg-muted animate-pulse rounded" />
                ) : (
                  c.count
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

