"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PerformanceColorBadgeProps {
  color: string;
  label: string;
  variant?: "solid" | "tint" | "outline";
  className?: string;
}

export function PerformanceColorBadge({
  color,
  label,
  variant = "tint",
  className,
}: PerformanceColorBadgeProps) {
  if (variant === "solid") {
    return (
      <Badge
        className={cn("text-white border-transparent shrink-0", className)}
        style={{ backgroundColor: color }}
      >
        {label}
      </Badge>
    );
  }

  if (variant === "outline") {
    return (
      <Badge
        variant="outline"
        className={cn("shrink-0 gap-1", className)}
        style={{ color, borderColor: `${color}55` }}
      >
        {label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn("border-0 shrink-0", className)}
      style={{ backgroundColor: `${color}18`, color }}
    >
      {label}
    </Badge>
  );
}
