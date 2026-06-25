"use client";

import Link from "next/link";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { TreeNodeRow } from "../components/TreeNodeRow";
import { FilterDropdown } from "../components/FilterDropdown";
import type { DashboardPlanRow } from "../types";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-golden-dark">Plan Progress</h2>
          <p className="text-sm text-muted-foreground">
            Live hierarchy from the focused open execution period with rolled-up achievement.
          </p>
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

      {data.progressMeta.period_label && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Showing{" "}
          <span className="font-medium">
            {data.progressMeta.period_label}
            {data.progressMeta.planning_year != null
              ? ` · Year ${data.progressMeta.planning_year}`
              : ""}
          </span>
          {focusId && (
            <>
              {" "}
              —{" "}
              <Link href={`/plans/${focusId}`} className="underline font-medium">
                Open plan
              </Link>
            </>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-gray-50/30 p-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1 mb-3">
          Execution Hierarchy
        </p>
        {data.isLoading ? (
          <p className="text-sm text-muted-foreground px-1">Loading hierarchy…</p>
        ) : data.planTree.length > 0 ? (
          data.planTree.map((node) => <TreeNodeRow key={node.id} node={node} />)
        ) : (
          <p className="text-sm text-muted-foreground px-1">
            No execution hierarchy available. Start process on a plan and record achievements in
            the open period.
          </p>
        )}
      </div>
    </div>
  );
}
