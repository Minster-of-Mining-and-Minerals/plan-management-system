"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PerformanceLevel, PlanStatus } from "../types";

const STATUS_STYLES: Record<Exclude<PlanStatus, "all">, string> = {
  active: "bg-blue-50 text-blue-700 border-blue-100",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  delayed: "bg-amber-50 text-amber-700 border-amber-100",
};

const PERFORMANCE_STYLES: Record<PerformanceLevel, string> = {
  excellent: "bg-emerald-50 text-emerald-700 border-emerald-100",
  good: "bg-blue-50 text-blue-700 border-blue-100",
  average: "bg-amber-50 text-amber-700 border-amber-100",
  "at-risk": "bg-red-50 text-red-700 border-red-100",
};

interface StatusBadgeProps {
  status: Exclude<PlanStatus, "all">;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_STYLES[status], className)}>
      {status}
    </Badge>
  );
}

interface PerformanceBadgeProps {
  level: PerformanceLevel;
  className?: string;
}

export function PerformanceBadge({ level, className }: PerformanceBadgeProps) {
  const label = level === "at-risk" ? "At Risk" : level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <Badge variant="outline" className={cn(PERFORMANCE_STYLES[level], className)}>
      {label}
    </Badge>
  );
}

interface SharingBadgeProps {
  mode: "shared" | "exclusive";
  className?: string;
}

export function SharingBadge({ mode, className }: SharingBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        mode === "shared"
          ? "bg-violet-50 text-violet-700 border-violet-100"
          : "bg-slate-50 text-slate-700 border-slate-200",
        "capitalize",
        className
      )}
    >
      {mode}
    </Badge>
  );
}
