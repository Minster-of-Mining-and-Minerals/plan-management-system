"use client";

import React from "react";
import {
  Layers,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  GitBranch,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  REGIONAL_PALETTE,
  hexToRgba,
  getStatusBadgeDetails,
} from "../RegionalDashboardAppearance";
import { RegionalPlannedVsActualBarChart } from "../components/charts/RegionalPlannedVsActualBarChart";
import { RegionalStatusDistributionPieChart } from "../components/charts/RegionalStatusDistributionPieChart";
import { RegionalPerformanceClassificationChart } from "../components/charts/RegionalPerformanceClassificationChart";
import { RegionalAnnualTrendLineChart } from "../components/charts/RegionalAnnualTrendLineChart";
import type { RegionalPlanDashboardState } from "../types";

interface RegionalOverviewTabProps {
  state: RegionalPlanDashboardState;
}

export function RegionalOverviewTab({ state }: RegionalOverviewTabProps) {
  const {
    kpi,
    plans,
    treeNodes,
    annualTimeline,
    performanceDistribution,
    statusDistribution,
    regionId,
    setActiveSection,
  } = state;

  return (
    <div className="space-y-6">
      {/* 1. Regional KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Total Plans */}
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-4 shadow-xs relative overflow-hidden">
          <div
            className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full blur-xl"
            style={{ backgroundColor: hexToRgba(REGIONAL_PALETTE.emerald.DEFAULT, 0.15) }}
          />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Regional Plans</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{kpi.totalPlans}</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {kpi.inExecutionPlans} in active execution
          </p>
        </div>

        {/* Active Cycles */}
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-4 shadow-xs relative overflow-hidden">
          <div
            className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full blur-xl"
            style={{ backgroundColor: hexToRgba(REGIONAL_PALETTE.teal.DEFAULT, 0.15) }}
          />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Active Cycles</span>
            <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-800 dark:text-teal-300">
            {kpi.activePlans}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {kpi.completedPlans} completed cycles
          </p>
        </div>

        {/* Confirmed Execution Score */}
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-4 shadow-xs relative overflow-hidden">
          <div
            className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full blur-xl"
            style={{ backgroundColor: hexToRgba(REGIONAL_PALETTE.emerald.DEFAULT, 0.2) }}
          />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Portfolio Progress</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {kpi.averageProgress ?? 0}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Hierarchical rollup score
          </p>
        </div>

        {/* Active Milestones */}
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-4 shadow-xs relative overflow-hidden">
          <div
            className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full blur-xl"
            style={{ backgroundColor: hexToRgba(REGIONAL_PALETTE.amber.DEFAULT, 0.15) }}
          />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Active Milestones</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {kpi.activeMilestones ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Tracked targets & leaf KPIs
          </p>
        </div>

        {/* Delayed / At-Risk */}
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-4 shadow-xs relative overflow-hidden">
          <div
            className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full blur-xl"
            style={{ backgroundColor: hexToRgba(REGIONAL_PALETTE.rose.DEFAULT, 0.15) }}
          />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Delayed KPIs</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700">
            {kpi.delayedKpis ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Execution progress &lt; 50%
          </p>
        </div>
      </div>

      {/* 2. Visual Charts Row 1: Target Achievement & Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Planned vs Actual Bar Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <span>Target Achievement (Planned vs Actual)</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                  Top Milestones
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quantified comparison of planned target allocations against validated actual reports.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveSection("hierarchy")}
              className="text-xs h-8 gap-1.5"
            >
              <span>Explore All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="pt-4">
            <RegionalPlannedVsActualBarChart nodes={treeNodes} />
          </div>
        </div>

        {/* Performance Classification Donut */}
        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
          <div className="pb-4 border-b border-border/60">
            <h3 className="font-semibold text-foreground text-sm">
              Performance Distribution
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Breakdown across standard performance tiers (≥85%, 70-84%, 50-69%, &lt;50%).
            </p>
          </div>
          <div className="pt-4">
            <RegionalPerformanceClassificationChart distribution={performanceDistribution} />
          </div>
        </div>
      </div>

      {/* 3. Visual Charts Row 2: Annual Trend & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Multi-Year Execution Curve */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
          <div className="pb-4 border-b border-border/60">
            <h3 className="font-semibold text-foreground text-sm">
              Annual Execution Progress Trend
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Average portfolio execution score across planning years.
            </p>
          </div>
          <div className="pt-4">
            <RegionalAnnualTrendLineChart timeline={annualTimeline} />
          </div>
        </div>

        {/* Plan Status Distribution */}
        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
          <div className="pb-4 border-b border-border/60">
            <h3 className="font-semibold text-foreground text-sm">
              Plan Lifecycle Status
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribution of regional plan versions by active execution status.
            </p>
          </div>
          <div className="pt-4">
            <RegionalStatusDistributionPieChart distribution={statusDistribution} />
          </div>
        </div>
      </div>

      {/* 4. Top Regional Plans Leaderboard */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              Strategic Plan Versions
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active and drafted regional strategic frameworks.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link href={`/regions/${regionId}/plans`}>
              <span>All Plans</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="pt-4">
          {plans.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No regional strategic plans found for this filter.
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
              {plans.map((p) => {
                const statusDetails = getStatusBadgeDetails(p.dashboard_status || p.status);
                const progress = p.execution_progress_percent ?? 0;
                return (
                  <div
                    key={p.plan_version_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-muted/30 transition-colors gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {p.draft_name}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            backgroundColor: statusDetails.bg,
                            color: statusDetails.text,
                            borderColor: statusDetails.border,
                          }}
                        >
                          {statusDetails.label}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Duration: {p.start_year} - {p.end_year} • {p.target_count || 0} tracked targets
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-muted-foreground">Execution</span>
                          <span className="text-foreground">{progress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(0, progress))}%`,
                              backgroundColor: REGIONAL_PALETTE.emerald.DEFAULT,
                            }}
                          />
                        </div>
                      </div>

                      <Button asChild size="sm" variant="ghost" className="h-8 text-xs gap-1">
                        <Link href={`/regions/${regionId}/plans/${p.plan_version_id}`}>
                          <span>View Plan</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

