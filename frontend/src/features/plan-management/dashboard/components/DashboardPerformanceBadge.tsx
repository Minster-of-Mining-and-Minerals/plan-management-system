"use client";

import { PerformanceColorBadge } from "@/features/plan-management/components/PerformanceColorBadge";
import type { PerformanceLevel } from "../types";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

interface DashboardPerformanceBadgeProps {
  level: PerformanceLevel;
  percent?: number | null;
  variant?: "solid" | "tint" | "outline";
  className?: string;
}

export function DashboardPerformanceBadge({
  level,
  percent,
  variant = "tint",
  className,
}: DashboardPerformanceBadgeProps) {
  const { performanceLevelColor, performanceLevelLabel } = useDashboardAppearance();
  const color = performanceLevelColor(level, percent);
  const label = performanceLevelLabel(level, percent);

  return (
    <PerformanceColorBadge
      color={color}
      label={label}
      variant={variant}
      className={className}
    />
  );
}
