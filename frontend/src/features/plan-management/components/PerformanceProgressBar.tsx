"use client";

import { cn } from "@/lib/utils";

interface PerformanceProgressBarProps {
  value: number;
  color: string;
  className?: string;
}

export function PerformanceProgressBar({
  value,
  color,
  className,
}: PerformanceProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
