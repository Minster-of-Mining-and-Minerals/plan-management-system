"use client";

import { GitBranch, Lock } from "lucide-react";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { SimpleBarChart } from "../components/SimpleBarChart";
import { ProgressBar } from "../components/ProgressBar";
import { SharingBadge, StatusBadge } from "../components/StatusBadge";

interface SharingAnalysisTabProps {
  state: PlanDashboardFiltersState;
}

export function SharingAnalysisTab({ state }: SharingAnalysisTabProps) {
  const { sharing, kpi } = state.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-golden-dark">Shared vs Exclusive Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Strategic root nodes grouped by assignment sharing mode with live execution progress.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-violet-700 font-semibold">
            <GitBranch className="h-4 w-4" />
            Shared Roots
          </div>
          <div className="space-y-3">
            {sharing.shared.length > 0 ? (
              sharing.shared.map((plan) => (
                <div key={plan.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-golden-dark">{plan.title}</span>
                    <SharingBadge mode="shared" />
                    <StatusBadge status={plan.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {plan.structure_name ?? "Structure"} · shared strategic root
                  </p>
                  <ProgressBar value={plan.progress} size="sm" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No shared strategic roots in scope.</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Lock className="h-4 w-4" />
            Exclusive Roots
          </div>
          <div className="space-y-3">
            {sharing.exclusive.length > 0 ? (
              sharing.exclusive.map((plan) => (
                <div key={plan.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-golden-dark">{plan.title}</span>
                    <SharingBadge mode="exclusive" />
                    <StatusBadge status={plan.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target structure: {plan.target ?? "—"}
                  </p>
                  <ProgressBar value={plan.progress} size="sm" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No exclusive strategic roots in scope.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SimpleBarChart
          title="Sharing Mode Distribution"
          description="Count of strategic root nodes"
          items={[
            { label: "Shared", value: kpi.sharedPlans },
            { label: "Exclusive", value: kpi.exclusivePlans },
          ]}
          valueSuffix=""
          color="#7c3aed"
        />
        <SimpleBarChart
          title="Average Progress by Mode"
          description="Mean achievement across roots in each mode"
          items={[
            {
              label: "Shared",
              value:
                sharing.shared.length > 0
                  ? Math.round(
                        sharing.shared.reduce((sum, item) => sum + item.progress, 0) /
                          sharing.shared.length
                    )
                  : 0,
            },
            {
              label: "Exclusive",
              value:
                sharing.exclusive.length > 0
                  ? Math.round(
                        sharing.exclusive.reduce((sum, item) => sum + item.progress, 0) /
                          sharing.exclusive.length
                    )
                  : 0,
            },
          ]}
          color="#2563eb"
        />
      </div>
    </div>
  );
}
