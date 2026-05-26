"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {subtext ? (
            <p
              className={cn(
                "mt-1 text-xs",
                trend === "up" && "text-emerald-600",
                trend === "down" && "text-amber-600",
                !trend && "text-muted-foreground"
              )}
            >
              {subtext}
            </p>
          ) : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-section-accent-subtle-20 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
