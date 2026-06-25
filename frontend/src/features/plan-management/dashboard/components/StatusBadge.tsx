"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PerformanceLevel, PlanStatus } from "../types";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";
import { hexToRgba } from "../utils/dashboardAppearanceUtils";
import { DashboardPerformanceBadge } from "./DashboardPerformanceBadge";

interface StatusBadgeProps {
  status: Exclude<PlanStatus, "all">;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { color } = useDashboardAppearance();
  const statusColor =
    status === "completed"
      ? color("success")
      : status === "delayed"
        ? color("warning")
        : color("info");

  return (
    <Badge
      variant="outline"
      className={cn("capitalize", className)}
      style={{
        color: statusColor,
        borderColor: hexToRgba(statusColor, 0.25),
        backgroundColor: hexToRgba(statusColor, 0.1),
      }}
    >
      {status}
    </Badge>
  );
}

interface PerformanceBadgeProps {
  level: PerformanceLevel;
  percent?: number | null;
  className?: string;
}

export function PerformanceBadge({ level, percent, className }: PerformanceBadgeProps) {
  return (
    <DashboardPerformanceBadge level={level} percent={percent} className={className} />
  );
}

interface SharingBadgeProps {
  mode: "shared" | "exclusive";
  className?: string;
}

export function SharingBadge({ mode, className }: SharingBadgeProps) {
  const { color } = useDashboardAppearance();
  const badgeColor = mode === "shared" ? color("accent") : color("secondary");

  return (
    <Badge
      variant="outline"
      className={cn("capitalize", className)}
      style={{
        color: badgeColor,
        borderColor: hexToRgba(badgeColor, 0.25),
        backgroundColor: hexToRgba(badgeColor, 0.1),
      }}
    >
      {mode}
    </Badge>
  );
}
