"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  DashboardAvailablePeriod,
  DashboardPeriodPhase,
} from "../types";

const PHASE_STYLES: Record<
  DashboardPeriodPhase,
  { dot: string; badge: string; label: string }
> = {
  active: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    label: "Active",
  },
  past: {
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    label: "Past",
  },
  upcoming: {
    dot: "bg-sky-400",
    badge: "bg-sky-50 text-sky-800 border-sky-200",
    label: "Upcoming",
  },
};

function formatPeriodOptionLabel(period: DashboardAvailablePeriod) {
  const name = period.period_label || `Period ${period.sequence_index ?? ""}`;
  if (period.planning_year != null) {
    return `${name} · ${period.planning_year}`;
  }
  return name;
}

interface PeriodPhaseSelectProps {
  label?: string;
  value: string;
  periods: DashboardAvailablePeriod[];
  onChange: (periodVersionId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PeriodPhaseSelect({
  label = "Execution period",
  value,
  periods,
  onChange,
  disabled,
  className,
}: PeriodPhaseSelectProps) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled || periods.length === 0}
      >
        <SelectTrigger className="h-9 w-full min-w-0 bg-white">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent className="max-h-[min(18rem,50vh)]">
          {periods.map((period) => {
            const phase = period.phase;
            const styles = PHASE_STYLES[phase];
            return (
              <SelectItem
                key={period.plan_version_id}
                value={period.plan_version_id}
                className="py-2"
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", styles.dot)} />
                    <span className="truncate">{formatPeriodOptionLabel(period)}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                      styles.badge
                    )}
                  >
                    {styles.label}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2 pt-0.5">
        {(Object.keys(PHASE_STYLES) as DashboardPeriodPhase[]).map((phase) => (
          <span
            key={phase}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            <span className={cn("size-1.5 rounded-full", PHASE_STYLES[phase].dot)} />
            {PHASE_STYLES[phase].label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PeriodPhaseBadge({
  phase,
  className,
}: {
  phase: DashboardPeriodPhase | null | undefined;
  className?: string;
}) {
  if (!phase) return null;
  const styles = PHASE_STYLES[phase];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        styles.badge,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", styles.dot)} />
      {styles.label}
    </span>
  );
}
