"use client";

import Link from "next/link";
import { ListTree, Loader2 } from "lucide-react";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { TreeNodeRow } from "../components/TreeNodeRow";
import { FilterDropdown } from "../components/FilterDropdown";
import {
  PeriodPhaseBadge,
  PeriodPhaseSelect,
} from "../components/PeriodPhaseSelect";
import type { DashboardPlanRow } from "../types";
import { AnalyticsPanel, DashboardSectionHeader } from "../components/AnalyticsPanel";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

interface ProgressTabProps {
  state: PlanDashboardFiltersState;
}

function formatPlanLabel(plan: DashboardPlanRow) {
  const years =
    plan.end_year >= plan.start_year
      ? `${plan.start_year}–${plan.end_year}`
      : String(plan.start_year);
  return plan.draft_name?.trim() ? `${plan.draft_name} (${years})` : years;
}

export function ProgressTab({ state }: ProgressTabProps) {
  const { data, executionPlanOptions, filters, updateFilter } = state;
  const { textPrimary, color } = useDashboardAppearance();
  const isRefreshing = data.isFetching || data.isLoading;

  const focusId =
    filters.masterPlanVersionId !== "auto"
      ? filters.masterPlanVersionId
      : data.progressMeta.focus_master_plan_version_id;

  const availablePeriods = data.progressMeta.available_periods ?? [];
  const selectedPeriodId =
    filters.periodVersionId !== "auto"
      ? filters.periodVersionId
      : data.progressMeta.period_version_id ?? "";

  const planOptions = [
    { value: "auto", label: "Auto (first in execution)" },
    ...executionPlanOptions.map((plan) => ({
      value: plan.plan_version_id,
      label: formatPlanLabel(plan),
    })),
  ];

  const focusPlan = data.plans.find((p) => p.plan_version_id === focusId);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Plan Progress"
        description="Live hierarchy for the selected execution period with rolled-up achievement. Defaults to the active period; switch to past or upcoming periods anytime."
        badge={data.progressMeta.period_label ?? "No period"}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AnalyticsPanel
          title="Focus Plan"
          icon={ListTree}
          variant="gradient"
          tone="primary"
          className="min-w-0 lg:col-span-2"
        >
          <div className="flex min-w-0 flex-col gap-4">
            <div className="min-w-0">
              <p
                className="truncate text-lg font-semibold"
                style={{ color: textPrimary }}
                title={focusPlan?.draft_name ?? undefined}
              >
                {focusPlan?.draft_name ?? "No plan selected"}
              </p>
              {data.progressMeta.planning_year != null && (
                <p className="text-sm text-muted-foreground">
                  Year {data.progressMeta.planning_year}
                  {focusPlan?.execution_progress_percent != null &&
                    ` · ${focusPlan.execution_progress_percent}% achievement`}
                </p>
              )}
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <FilterDropdown
                label="Focus Plan"
                value={filters.masterPlanVersionId}
                options={planOptions}
                onChange={(value) => updateFilter("masterPlanVersionId", value)}
                className="min-w-0 w-full"
              />
              <PeriodPhaseSelect
                label="Execution period"
                value={selectedPeriodId}
                periods={availablePeriods}
                onChange={(value) => updateFilter("periodVersionId", value)}
                disabled={availablePeriods.length === 0 || isRefreshing}
                className="min-w-0 w-full"
              />
            </div>
          </div>
        </AnalyticsPanel>

        {data.progressMeta.period_label && (
          <AnalyticsPanel title="Selected Period" variant="accent" tone="info">
            <div className="flex items-start justify-between gap-2">
              <p className="text-2xl font-bold" style={{ color: textPrimary }}>
                {data.progressMeta.period_label}
              </p>
              <PeriodPhaseBadge phase={data.progressMeta.period_phase} />
            </div>
            {data.progressMeta.planning_year != null && (
              <p className="mt-1 text-sm text-muted-foreground">
                Planning year {data.progressMeta.planning_year}
              </p>
            )}
            {focusId && (
              <Link
                href={`/plans/${focusId}`}
                className="mt-2 inline-block text-sm underline"
                style={{ color: color("primary") }}
              >
                Open plan hierarchy
              </Link>
            )}
          </AnalyticsPanel>
        )}
      </div>

      <AnalyticsPanel title="Execution Hierarchy" variant="inset" tone="secondary">
        {isRefreshing ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading hierarchy for the selected plan and period…
          </div>
        ) : data.planTree.length > 0 ? (
          <div className="space-y-1">
            {data.planTree.map((node) => (
              <TreeNodeRow key={node.id} node={node} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No execution hierarchy available for this period. Start process on a plan and
            record achievements, or pick another period.
          </p>
        )}
      </AnalyticsPanel>
    </div>
  );
}
