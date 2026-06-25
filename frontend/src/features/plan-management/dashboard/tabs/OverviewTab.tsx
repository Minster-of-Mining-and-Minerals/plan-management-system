"use client";

import {
  Activity,
  CheckCircle2,
  GitBranch,
  Layers,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import { KpiCard } from "../components/KpiCard";
import { SimpleBarChart } from "../components/SimpleBarChart";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";

interface OverviewTabProps {
  state: PlanDashboardFiltersState;
}

export function OverviewTab({ state }: OverviewTabProps) {
  const { data } = state;
  const kpi = data.kpi;

  if (data.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading execution dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-golden-dark">Overview Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Live execution metrics from strategic plans in your access scope.
          {data.generatedAt && (
            <span className="block mt-1 text-xs">
              Updated {new Date(data.generatedAt).toLocaleString()}
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <KpiCard title="Total Plans" value={kpi.totalPlans} icon={Layers} />
        <KpiCard
          title="In Execution"
          value={kpi.inExecutionPlans}
          icon={Activity}
        />
        <KpiCard title="Completed Plans" value={kpi.completedPlans} icon={CheckCircle2} />
        <KpiCard title="Shared Roots" value={kpi.sharedPlans} icon={GitBranch} />
        <KpiCard title="Exclusive Roots" value={kpi.exclusivePlans} icon={ListChecks} />
        <KpiCard
          title="Avg Progress"
          value={kpi.averageProgress != null ? `${kpi.averageProgress}%` : "—"}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SimpleBarChart
          title="Annual Progress Trend"
          description="Average master-plan achievement by planning year"
          items={data.annualTimeline.map((entry) => ({
            label: entry.label,
            value: entry.average_percent,
            subtitle: `${entry.plan_count} plan${entry.plan_count !== 1 ? "s" : ""}`,
          }))}
        />
        <SimpleBarChart
          title="Structure Comparison"
          description="Average execution progress by government structure"
          items={data.structures.map((structure) => ({
            label: structure.name,
            value: structure.completionPercent,
            subtitle: `${structure.totalPlans} plans`,
          }))}
          color="#2563eb"
        />
        <SimpleBarChart
          title="Sharing Mode Distribution"
          description="Strategic root nodes by assignment mode"
          items={[
            { label: "Shared", value: kpi.sharedPlans, subtitle: "roots" },
            { label: "Exclusive", value: kpi.exclusivePlans, subtitle: "roots" },
          ]}
          valueSuffix=""
          color="#7c3aed"
        />
        <SimpleBarChart
          title="Top Plans In Execution"
          description="Master plans with the highest recorded achievement"
          items={[...data.plans]
            .filter((plan) => plan.execution_progress_percent != null)
            .sort(
              (a, b) =>
                (b.execution_progress_percent ?? 0) - (a.execution_progress_percent ?? 0)
            )
            .slice(0, 6)
            .map((plan) => ({
              label: plan.draft_name,
              value: plan.execution_progress_percent ?? 0,
              subtitle: plan.government_structure_name ?? undefined,
            }))}
          color="#059669"
        />
      </div>
    </div>
  );
}
