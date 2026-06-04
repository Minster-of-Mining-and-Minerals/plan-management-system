"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  colorClassName?: string;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showValue = true,
  size = "md",
  colorClassName = "bg-golden-dark",
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="font-semibold text-golden-dark tabular-nums">{clamped}%</span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-gray-100",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClassName)}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
