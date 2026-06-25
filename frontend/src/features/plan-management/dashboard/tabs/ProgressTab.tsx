"use client";

import Link from "next/link";
import { ListTree } from "lucide-react";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { TreeNodeRow } from "../components/TreeNodeRow";
import { FilterDropdown } from "../components/FilterDropdown";
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
  const focusId =
    filters.masterPlanVersionId !== "auto"
      ? filters.masterPlanVersionId
      : data.progressMeta.focus_master_plan_version_id;

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
        description="Live hierarchy from the focused open execution period with rolled-up achievement."
        badge={data.progressMeta.period_label ?? "No period"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnalyticsPanel
          title="Focus Plan"
          icon={ListTree}
          variant="gradient"
          tone="primary"
          className="lg:col-span-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
            <div>
              <p className="text-lg font-semibold" style={{ color: textPrimary }}>
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
            <div className="min-w-[240px]">
              <FilterDropdown
                label="Focus Plan"
                value={filters.masterPlanVersionId}
                options={planOptions}
                onChange={(value) => updateFilter("masterPlanVersionId", value)}
              />
            </div>
          </div>
        </AnalyticsPanel>

        {data.progressMeta.period_label && (
          <AnalyticsPanel title="Active Period" variant="accent" tone="info">
            <p className="text-2xl font-bold" style={{ color: textPrimary }}>
              {data.progressMeta.period_label}
            </p>
            {focusId && (
              <Link
                href={`/plans/${focusId}`}
                className="text-sm underline mt-2 inline-block"
                style={{ color: color("primary") }}
              >
                Open plan hierarchy
              </Link>
            )}
          </AnalyticsPanel>
        )}
      </div>

      <AnalyticsPanel title="Execution Hierarchy" variant="inset" tone="secondary">
        {data.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading hierarchy…</p>
        ) : data.planTree.length > 0 ? (
          <div className="space-y-1">
            {data.planTree.map((node) => (
              <TreeNodeRow key={node.id} node={node} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No execution hierarchy available. Start process on a plan and record achievements in
            the open period.
          </p>
        )}
      </AnalyticsPanel>
    </div>
  );
}
