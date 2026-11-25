"use client";

import React, { useId, useState } from "react";
import {
  LayoutDashboard,
  Layers,
  Building2,
  Users,
  ListTree,
  GitBranch,
  FileSpreadsheet,
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RegionalPlanDashboardState, RegionalDashboardSectionId } from "../types";

interface RegionalPlanDashboardFiltersBarProps {
  state: RegionalPlanDashboardState;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses", dot: null },
  { value: "active", label: "Active", dot: "bg-sky-500" },
  { value: "completed", label: "Completed", dot: "bg-emerald-500" },
  { value: "delayed", label: "Delayed", dot: "bg-rose-500" },
  { value: "draft", label: "Draft", dot: "bg-slate-400" },
] as const;

/** Shared trigger style; highlighted when the filter differs from its default. */
function triggerClass(isActive: boolean) {
  return cn(
    "h-10 w-full text-sm rounded-xl border-border/80 bg-background",
    isActive && "border-emerald-500 bg-emerald-50/60 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
  );
}

function FilterField({
  label,
  labelId,
  children,
}: {
  label: string;
  labelId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={labelId} className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export function RegionalPlanDashboardFiltersBar({
  state,
}: RegionalPlanDashboardFiltersBarProps) {
  const {
    filters,
    updateFilter,
    resetFilters,
    activeSection,
    setActiveSection,
    plans,
    departments,
    users,
    availablePeriods,
  } = state;

  const idBase = useId();
  const ids = {
    plan: `${idBase}-plan`,
    period: `${idBase}-period`,
    dept: `${idBase}-dept`,
    user: `${idBase}-user`,
    status: `${idBase}-status`,
    panel: `${idBase}-panel`,
  };

  // The filter dropdowns stay tucked away until the user opens them.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const tabs: Array<{ id: RegionalDashboardSectionId; label: string; icon: React.ElementType }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "hierarchy", label: "Hierarchy & Targets", icon: Layers },
    { id: "directorates", label: "Directorates", icon: Building2 },
    { id: "assignees", label: "Assignees", icon: Users },
    { id: "tree", label: "Execution Tree", icon: ListTree },
    { id: "sharing", label: "Sharing Analysis", icon: GitBranch },
    { id: "reports", label: "Reports & Export", icon: FileSpreadsheet },
  ];

  const isPlanActive = filters.masterPlanVersionId !== "auto";
  const isPeriodActive = filters.periodVersionId !== "auto";
  const isDeptActive = filters.departmentId !== "all";
  const isUserActive = filters.userId !== "all";
  const isStatusActive = filters.status !== "all";

  const planName = isPlanActive
    ? plans.find((p) => p.plan_version_id === filters.masterPlanVersionId)?.draft_name || "Selected plan"
    : null;
  const periodName = isPeriodActive
    ? availablePeriods.find((p) => p.plan_version_id === filters.periodVersionId)?.period_label || "Selected period"
    : null;
  const deptName = isDeptActive
    ? departments.find((d) => d.id === filters.departmentId)?.name || "Selected directorate"
    : null;
  const userName = isUserActive
    ? users.find((u) => u.id === filters.userId)?.name || "Selected staff member"
    : null;
  const statusName = isStatusActive
    ? STATUS_OPTIONS.find((s) => s.value === filters.status)?.label || filters.status
    : null;

  // One chip per applied filter, shown while the panel is closed.
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (planName) chips.push({ key: "plan", label: `Plan: ${planName}`, onRemove: () => updateFilter("masterPlanVersionId", "auto") });
  if (periodName) chips.push({ key: "period", label: `Period: ${periodName}`, onRemove: () => updateFilter("periodVersionId", "auto") });
  if (deptName) chips.push({ key: "dept", label: `Directorate: ${deptName}`, onRemove: () => updateFilter("departmentId", "all") });
  if (userName) chips.push({ key: "user", label: `Assignee: ${userName}`, onRemove: () => updateFilter("userId", "all") });
  if (statusName) chips.push({ key: "status", label: `Status: ${statusName}`, onRemove: () => updateFilter("status", "all") });

  const activeCount = chips.length;

  return (
    <div className="space-y-3">
      {/* Section navigation, with the Filters button on the right of the same row */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-1">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls={ids.panel}
          className={cn(
            "h-9 shrink-0 gap-2 rounded-xl px-3 text-xs font-semibold",
            (filtersOpen || activeCount > 0) &&
              "border-emerald-500 bg-emerald-50/60 text-emerald-900 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-200"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
              filtersOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        </Button>
      </div>

      {/* Filter panel, opened from the Filters button */}
      {filtersOpen && (
        <section
          id={ids.panel}
          aria-label="Filters"
          className="rounded-2xl border border-border/70 bg-card p-3 shadow-2xs sm:p-4 animate-in fade-in-0 slide-in-from-top-1 duration-150 motion-reduce:animate-none"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <FilterField label="Plan" labelId={ids.plan}>
              <Select value={filters.masterPlanVersionId} onValueChange={(val) => updateFilter("masterPlanVersionId", val)}>
                <SelectTrigger aria-labelledby={ids.plan} className={triggerClass(isPlanActive)}>
                  <SelectValue placeholder="Latest active plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Latest active plan</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.plan_version_id} value={p.plan_version_id}>
                      {p.draft_name} ({p.start_year}–{p.end_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            {availablePeriods.length > 0 && (
              <FilterField label="Period" labelId={ids.period}>
                <Select value={filters.periodVersionId} onValueChange={(val) => updateFilter("periodVersionId", val)}>
                  <SelectTrigger aria-labelledby={ids.period} className={triggerClass(isPeriodActive)}>
                    <SelectValue placeholder="Current period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Current period</SelectItem>
                    {availablePeriods.map((period) => (
                      <SelectItem key={period.plan_version_id} value={period.plan_version_id}>
                        {period.period_label} ({period.phase})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            )}

            <FilterField label="Directorate" labelId={ids.dept}>
              <Select value={filters.departmentId} onValueChange={(val) => updateFilter("departmentId", val)}>
                <SelectTrigger aria-labelledby={ids.dept} className={triggerClass(isDeptActive)}>
                  <SelectValue placeholder="All directorates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All directorates</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Assignee" labelId={ids.user}>
              <Select value={filters.userId} onValueChange={(val) => updateFilter("userId", val)}>
                <SelectTrigger aria-labelledby={ids.user} className={triggerClass(isUserActive)}>
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Status" labelId={ids.status}>
              <Select value={filters.status} onValueChange={(val) => updateFilter("status", val)}>
                <SelectTrigger aria-labelledby={ids.status} className={triggerClass(isStatusActive)}>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        {s.dot && <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden="true" />}
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          {activeCount > 0 && (
            <div className="mt-3 flex justify-end border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 gap-1.5 rounded-xl px-3 text-sm text-muted-foreground hover:text-rose-600"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Clear all filters
              </Button>
            </div>
          )}
        </section>
      )}

      {/* While the panel is closed, show what is applied so no filter is hidden */}
      {!filtersOpen && activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 py-1 pl-3 pr-1 text-xs font-medium text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
            >
              <span className="max-w-[240px] truncate">{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-rose-600"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
