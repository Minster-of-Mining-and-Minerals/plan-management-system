"use client";

import { cn } from "@/lib/utils";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

interface DashboardPerformanceBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
  /** When omitted, uses `value` as the achievement percent for threshold coloring. */
  performancePercent?: number | null;
}

export function DashboardPerformanceBar({
  value,
  label,
  showValue = true,
  size = "md",
  className,
  performancePercent,
}: DashboardPerformanceBarProps) {
  const { performanceColor } = useDashboardAppearance();
  const clamped = Math.max(0, Math.min(100, value));
  const color = performanceColor(performancePercent ?? clamped);

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="font-semibold tabular-nums" style={{ color }}>
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted/80",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clamped}%`,
            backgroundColor: color,
          }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
