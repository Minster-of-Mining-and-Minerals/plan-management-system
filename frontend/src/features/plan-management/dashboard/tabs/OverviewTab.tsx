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
import { DonutStatCard } from "../components/DonutStatCard";
import { RankedLeaderboard } from "../components/RankedLeaderboard";
import { AnalyticsPanel, DashboardSectionHeader } from "../components/AnalyticsPanel";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { CircularProgress } from "../../components/CircularProgress";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, X } from "lucide-react";

interface OverviewTabProps {
  state: PlanDashboardFiltersState;
}

export function OverviewTab({ state }: OverviewTabProps) {
  const { data, activeHierarchyScope, clearHierarchyFilter } = state;
  const kpi = data.kpi;
  const { performanceColor, chartPalette } = useDashboardAppearance();

  if (data.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading execution dashboard…</div>;
  }

  const topPlans = [...data.plans]
    .filter((plan) => plan.execution_progress_percent != null)
    .sort((a, b) => (b.execution_progress_percent ?? 0) - (a.execution_progress_percent ?? 0))
    .slice(0, 5);

  const delayedCount = data.plans.filter((p) => p.dashboard_status === "delayed").length;
  const avgPercent = kpi.averageProgress ?? 0;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Overview Dashboard"
        description="Live execution metrics from strategic plans in your access scope."
        badge={
          activeHierarchyScope.isSubtree
            ? `Subtree Focus: ${activeHierarchyScope.level.toUpperCase()}`
            : data.generatedAt
            ? `Updated ${new Date(data.generatedAt).toLocaleString()}`
            : "Live"
        }
      />

      {activeHierarchyScope.isSubtree && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Target className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                Active Hierarchy Scope: [{activeHierarchyScope.level.toUpperCase()}] {activeHierarchyScope.title}
              </p>
              <p className="text-xs opacity-85">
                {activeHierarchyScope.node?.progress != null
                  ? `Node progress: ${activeHierarchyScope.node.progress}% · Contributing execution status: ${activeHierarchyScope.node.status}`
                  : "No achievement recorded for this node yet."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearHierarchyFilter}
            className="h-8 text-xs gap-1 border-amber-500/30 hover:bg-amber-500/20"
          >
            <X className="h-3.5 w-3.5" />
            Clear Subtree Focus
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Plans"
          value={kpi.totalPlans}
          subtitle={`${kpi.inExecutionPlans} in execution`}
          icon={Layers}
          variant="gradient"
          accent="primary"
        />
        <KpiCard
          title="Avg Achievement"
          value={kpi.averageProgress != null ? `${kpi.averageProgress}%` : "—"}
          subtitle="Across reporting plans"
          icon={TrendingUp}
          variant="solid"
          accent="success"
        />
        <KpiCard
          title="Completed"
          value={kpi.completedPlans}
          subtitle={`${delayedCount} delayed`}
          icon={CheckCircle2}
          variant="gradient"
          accent="accent"
        />
        <KpiCard
          title="Sharing Split"
          value={`${kpi.sharedPlans}/${kpi.exclusivePlans}`}
          subtitle="Shared vs exclusive roots"
          icon={GitBranch}
          variant="gradient"
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="In Execution" value={kpi.inExecutionPlans} icon={Activity} variant="outline" accent="info" />
        <KpiCard title="Active Plans" value={kpi.activePlans} icon={ListChecks} variant="outline" accent="primary" />
        <KpiCard title="Shared Roots" value={kpi.sharedPlans} icon={GitBranch} variant="outline" accent="accent" />
        <KpiCard title="Exclusive Roots" value={kpi.exclusivePlans} icon={Layers} variant="outline" accent="secondary" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <AnalyticsPanel
          title="Execution Pulse"
          description="Portfolio-wide average achievement"
          variant="gradient"
          tone="primary"
          className="xl:col-span-4"
        >
          <div className="flex flex-col items-center justify-center py-2">
            <CircularProgress
              value={avgPercent}
              color={performanceColor(avgPercent)}
              size={160}
              label="Average"
            />
            <p className="mt-3 text-sm text-muted-foreground text-center">
              {kpi.inExecutionPlans} plan{kpi.inExecutionPlans !== 1 ? "s" : ""} actively reporting
            </p>
          </div>
        </AnalyticsPanel>

        <div className="xl:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DonutStatCard
            title="Sharing Mode Mix"
            description="Strategic root distribution"
            centerValue={kpi.sharedPlans + kpi.exclusivePlans}
            centerLabel="Roots"
            segments={[
              { label: "Shared", value: kpi.sharedPlans, color: chartPalette[1] },
              { label: "Exclusive", value: kpi.exclusivePlans, color: chartPalette[3] },
            ]}
          />
          <RankedLeaderboard
            title="Top Plans"
            description="Highest achievement in execution"
            entries={topPlans.map((plan) => ({
              id: plan.plan_version_id,
              title: plan.draft_name,
              subtitle: plan.government_structure_name ?? undefined,
              value: plan.execution_progress_percent ?? 0,
            }))}
          />
        </div>
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
          colorMode="performance"
        />
        <SimpleBarChart
          title="Structure Comparison"
          description="Average execution progress by government structure"
          items={data.structures.map((structure) => ({
            label: structure.name,
            value: structure.completionPercent,
            subtitle: `${structure.totalPlans} plans`,
            color: performanceColor(structure.completionPercent),
          }))}
          colorMode="item"
        />
      </div>
    </div>
  );
}
