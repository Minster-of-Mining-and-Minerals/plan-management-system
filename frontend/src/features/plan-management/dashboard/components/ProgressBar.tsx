"use client";

import { cn } from "@/lib/utils";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  /** When set, bar and value use performance threshold coloring for this percent. */
  performancePercent?: number | null;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showValue = true,
  size = "md",
  performancePercent,
  className,
}: ProgressBarProps) {
  const { performanceColor, color } = useDashboardAppearance();
  const clamped = Math.max(0, Math.min(100, value));
  const barColor =
    performancePercent != null
      ? performanceColor(performancePercent)
      : color("primary");

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="font-semibold tabular-nums" style={{ color: barColor }}>
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
            backgroundColor: barColor,
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
