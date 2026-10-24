"use client";

import { Layers, Target, CheckCircle2, ListTree, X, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { FilterDropdown } from "./FilterDropdown";
import type { HierarchyDepthFilter } from "../types";

interface PlanHierarchyFilterBarProps {
  state: PlanDashboardFiltersState;
  onPrimary?: boolean;
}

export function PlanHierarchyFilterBar({
  state,
  onPrimary = false,
}: PlanHierarchyFilterBarProps) {
  const {
    filters,
    updateFilter,
    clearHierarchyFilter,
    strategicFocusOptions,
    goalOptions,
    kpiOptions,
    activeHierarchyScope,
  } = state;

  const sfOpts = [
    { value: "all", label: "All Strategic Focuses" },
    ...strategicFocusOptions.map((sf) => ({
      value: sf.value,
      label: sf.progress != null ? `${sf.label} (${sf.progress}%)` : sf.label,
    })),
  ];

  const goalOpts = [
    { value: "all", label: "All Goals" },
    ...goalOptions.map((g) => ({
      value: g.value,
      label: g.progress != null ? `${g.label} (${g.progress}%)` : g.label,
    })),
  ];

  const kpiOpts = [
    { value: "all", label: "All KPIs" },
    ...kpiOptions.map((k) => ({
      value: k.value,
      label: k.progress != null ? `${k.label} (${k.progress}%)` : k.label,
    })),
  ];

  const levels: Array<{ id: HierarchyDepthFilter; label: string; icon: typeof Layers }> = [
    { id: "all", label: "All Levels", icon: Layers },
    { id: "strategic", label: "Strategic Focus", icon: Target },
    { id: "goal", label: "Goal Level", icon: ListTree },
    { id: "kpi", label: "KPI Level", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-3 pt-1">
      {/* Level Selector Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wider flex items-center gap-1 mr-1",
              onPrimary ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            <Filter className="h-3 w-3" /> Hierarchy Depth:
          </span>

          {levels.map((lvl) => {
            const Icon = lvl.icon;
            const isSelected = filters.hierarchyLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => updateFilter("hierarchyLevel", lvl.id)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all",
                  onPrimary
                    ? isSelected
                      ? "bg-white text-primary shadow-xs"
                      : "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
                    : isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="h-3 w-3" />
                {lvl.label}
              </button>
            );
          })}
        </div>

        {activeHierarchyScope.isSubtree && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHierarchyFilter}
            className={cn(
              "h-7 text-xs gap-1",
              onPrimary
                ? "text-primary-foreground/85 hover:bg-primary-foreground/15 hover:text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <X className="h-3 w-3" />
            Clear Subtree Filter
          </Button>
        )}
      </div>

      {/* Cascading SF / Goal / KPI Node Selectors */}
      <div className="flex flex-wrap gap-2.5">
        <FilterDropdown
          label="Strategic Focus (SF)"
          value={filters.selectedStrategicFocusId}
          options={sfOpts}
          onChange={(v) => updateFilter("selectedStrategicFocusId", v)}
          onPrimary={onPrimary}
          className="min-w-[170px] max-w-[260px] flex-1"
        />

        <FilterDropdown
          label="Goal"
          value={filters.selectedGoalId}
          options={goalOpts}
          onChange={(v) => updateFilter("selectedGoalId", v)}
          onPrimary={onPrimary}
          disabled={goalOpts.length <= 1}
          className="min-w-[170px] max-w-[260px] flex-1"
        />

        <FilterDropdown
          label="KPI"
          value={filters.selectedKpiId}
          options={kpiOpts}
          onChange={(v) => updateFilter("selectedKpiId", v)}
          onPrimary={onPrimary}
          disabled={kpiOpts.length <= 1}
          className="min-w-[170px] max-w-[260px] flex-1"
        />
      </div>

      {/* Scope Context Banner */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-xl p-2.5 text-xs transition-all",
          activeHierarchyScope.isSubtree
            ? onPrimary
              ? "bg-white/95 text-foreground border border-white/30 shadow-xs"
              : "bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200"
            : onPrimary
            ? "bg-primary-foreground/10 border border-primary-foreground/15 text-primary-foreground/90"
            : "bg-muted/50 border border-border text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant={activeHierarchyScope.isSubtree ? "default" : "outline"}
            className={cn(
              "text-[10px] uppercase font-bold shrink-0",
              activeHierarchyScope.isSubtree
                ? "bg-amber-600 text-white hover:bg-amber-600"
                : ""
            )}
          >
            {activeHierarchyScope.isSubtree ? "Subtree Scope" : "Whole Plan Scope"}
          </Badge>
          <span className="truncate font-semibold">
            {activeHierarchyScope.title}
          </span>
          {activeHierarchyScope.node?.progress != null && (
            <span className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400">
              · {activeHierarchyScope.node.progress}% achievement
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] shrink-0">
          <span>
            {activeHierarchyScope.isSubtree
              ? "Filtered to selected branch and its direct descendants."
              : "Viewing complete unconstrained plan portfolio."}
          </span>
          {activeHierarchyScope.isSubtree && (
            <button
              type="button"
              onClick={clearHierarchyFilter}
              className="font-bold underline hover:opacity-80"
            >
              Reset to whole plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
