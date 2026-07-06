"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
  rescheduled: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  pending: "bg-amber-500/15 text-amber-700",
  processing: "bg-blue-500/15 text-blue-700",
  ready: "bg-emerald-500/15 text-emerald-700",
  reviewed: "bg-muted text-muted-foreground",
  active: "bg-primary/15 text-primary",
  refill_requested: "bg-violet-500/15 text-violet-700",
  paid: "bg-emerald-500/15 text-emerald-700",
  overdue: "bg-destructive/15 text-destructive",
  admitted: "bg-primary/15 text-primary",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge
      variant="secondary"
      className={cn(
        "capitalize font-medium",
        STATUS_STYLES[status] ?? "bg-muted",
        className
      )}
    >
      {label}
    </Badge>
  );
}
