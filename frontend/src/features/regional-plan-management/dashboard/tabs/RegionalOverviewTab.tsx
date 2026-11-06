"use client";

import React, { useMemo } from "react";
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
  Target,
  FileCheck2,
  CheckCheck,
  ShieldCheck,
  Compass,
  ListChecks,
  Activity,
  FileText,
  Sliders,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  REGIONAL_PALETTE,
  hexToRgba,
  getStatusBadgeDetails,
  getPerformanceTier,
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
    aggregate_metrics,
    plans,
    treeNodes,
    annualTimeline,
    performanceDistribution,
    statusDistribution,
    regionId,
    currentPeriodLabel,
    currentPlanningYear,
    setActiveSection,
    updateFilter,
  } = state;

  const agg = useMemo(() => {
    return (
      aggregate_metrics || {
        total_sf: 0,
        total_goals: 0,
        total_kpis: 0,
        total_tasks: 0,
        total_nodes: 0,
        total_target: 0,
        total_actual: 0,
        remaining_target: 0,
        achievement_percent: kpi.averageProgress ?? 0,
        completed_nodes: 0,
        incomplete_nodes: 0,
        reported_kpis: 0,
        unreported_kpis: 0,
        reporting_completion_percent: 0,
        pending_approval_count: 0,
        pending_validation_count: 0,
        approved_count: 0,
        rejected_count: 0,
        draft_count: 0,
        variance: 0,
        variance_percent: 0,
      }
    );
  }, [aggregate_metrics, kpi]);

  const achievementTier = getPerformanceTier(agg.achievement_percent);
  const tierColor =
    achievementTier === "excellent"
      ? REGIONAL_PALETTE.emerald.DEFAULT
      : achievementTier === "good"
      ? REGIONAL_PALETTE.teal.DEFAULT
      : achievementTier === "average"
      ? REGIONAL_PALETTE.amber.DEFAULT
      : REGIONAL_PALETTE.rose.DEFAULT;

  return (
    <div className="space-y-6">
      {/* 1. Overview Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Overall Plan Progress against 100% */}
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div
            className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full blur-2xl pointer-events-none"
            style={{ backgroundColor: hexToRgba(tierColor, 0.2) }}
          />
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Overall Plan Progress
              </span>
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center font-bold"
                style={{ backgroundColor: hexToRgba(tierColor, 0.12), color: tierColor }}
              >
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {agg.achievement_percent}%
              </span>
              <span className="text-xs font-medium text-muted-foreground">of 100%</span>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, agg.achievement_percent))}%`,
                    backgroundColor: tierColor,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {agg.completed_nodes} completed
                </span>
                <span className="font-medium text-slate-500">
                  {agg.incomplete_nodes} in progress
                </span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between mt-2">
            <span>Authoritative Rollup</span>
            <Badge
              variant="outline"
              className="text-[10px] h-5 capitalize"
              style={{ borderColor: tierColor, color: tierColor }}
            >
              {achievementTier} Tier
            </Badge>
          </div>
        </div>

        {/* Card 2: Target vs Actual Delivery */}
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div
            className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full blur-2xl pointer-events-none"
            style={{ backgroundColor: hexToRgba(REGIONAL_PALETTE.teal.DEFAULT, 0.15) }}
          />
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Target vs Actual Delivery
              </span>
              <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  {agg.total_actual.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {agg.total_target.toLocaleString()} planned
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Remaining target: <strong className="text-foreground">{agg.remaining_target.toLocaleString()}</strong>
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-border/50 text-[11px] flex items-center justify-between mt-2">
            <span className="text-muted-foreground">Delivery Variance</span>
            <span
              className={`font-semibold ${
                agg.variance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {agg.variance >= 0 ? "+" : ""}
              {agg.variance.toLocaleString()} ({agg.variance_percent >= 0 ? "+" : ""}
              {agg.variance_percent}%)
            </span>
          </div>
        </div>

        {/* Card 3: Milestone / KPI Reporting Delivery */}
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div
            className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full blur-2xl pointer-events-none"
            style={{ backgroundColor: hexToRgba(REGIONAL_PALETTE.amber.DEFAULT, 0.15) }}
          />
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Reporting Completion
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                <FileCheck2 className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-foreground">
                {agg.reporting_completion_percent}%
              </span>
              <span className="text-xs font-medium text-muted-foreground">of 100%</span>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, agg.reporting_completion_percent))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {agg.reported_kpis} Reported
                </span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {agg.unreported_kpis} Unreported
                </span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between mt-2">
            <span>Period Scope</span>
            <span className="font-medium text-foreground">
              {currentPeriodLabel || `Year ${currentPlanningYear || "Active"}`}
            </span>
          </div>
        </div>

        {/* Card 4: Workflow Validation & Approval Gates */}
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div
            className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full blur-2xl pointer-events-none"
            style={{ backgroundColor: hexToRgba(REGIONAL_PALETTE.indigo.DEFAULT, 0.15) }}
          />
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Workflow Gates
              </span>
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300">
                  Pending Appr.
                </span>
                <div className="text-lg font-bold text-amber-900 dark:text-amber-200 mt-0.5">
                  {agg.pending_approval_count}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
                <span className="text-[10px] uppercase font-semibold text-indigo-800 dark:text-indigo-300">
                  Pending Valid.
                </span>
                <div className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mt-0.5">
                  {agg.pending_validation_count}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300">
                  Approved
                </span>
                <div className="text-lg font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
                  {agg.approved_count}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                <span className="text-[10px] uppercase font-semibold text-rose-800 dark:text-rose-300">
                  Rejected
                </span>
                <div className="text-lg font-bold text-rose-900 dark:text-rose-200 mt-0.5">
                  {agg.rejected_count}
                </div>
              </div>
            </div>
          </div>
          <div className="pt-2 text-[10px] text-muted-foreground flex items-center justify-between mt-2">
            <span>Bypass Gate Status</span>
            <span className="font-medium text-emerald-700">Enforced</span>
          </div>
        </div>
      </div>

      {/* 2. Hierarchy Depth Summary Cards (SF -> Goal -> KPI -> Task) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tier 1: Strategic Focuses */}
        <div
          onClick={() => {
            updateFilter("selectedHierarchyLevel", 1);
            setActiveSection("hierarchy");
          }}
          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all p-4 cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              Strategic Focus (L1)
            </span>
            <Compass className="h-4 w-4 text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {agg.total_sf}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span>Explore Pillars</span>
            <ArrowRight className="h-3 w-3" />
          </p>
        </div>

        {/* Tier 2: Goals */}
        <div
          onClick={() => {
            updateFilter("selectedHierarchyLevel", 2);
            setActiveSection("hierarchy");
          }}
          className="rounded-2xl border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 transition-all p-4 cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-teal-900 dark:text-teal-200">
              Strategic Goals (L2)
            </span>
            <Layers className="h-4 w-4 text-teal-700 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {agg.total_goals}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span>Explore Goals</span>
            <ArrowRight className="h-3 w-3" />
          </p>
        </div>

        {/* Tier 3: KPIs */}
        <div
          onClick={() => {
            updateFilter("selectedHierarchyLevel", 3);
            setActiveSection("hierarchy");
          }}
          className="rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all p-4 cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Key Indicators (L3)
            </span>
            <Target className="h-4 w-4 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {agg.total_kpis}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span>{agg.reported_kpis} reported</span>
            <ArrowRight className="h-3 w-3" />
          </p>
        </div>

        {/* Tier 4: Tasks / Milestones */}
        <div
          onClick={() => {
            updateFilter("selectedHierarchyLevel", 4);
            setActiveSection("hierarchy");
          }}
          className="rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all p-4 cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              Tasks & Milestones (L4+)
            </span>
            <ListChecks className="h-4 w-4 text-blue-700 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {agg.total_tasks}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span>Operational leaves</span>
            <ArrowRight className="h-3 w-3" />
          </p>
        </div>
      </div>

      {/* 3. Visual Charts Row 1: Target Achievement & Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Planned vs Actual Bar Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <span>Target Achievement (Planned vs Actual)</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                  Key Milestones
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

      {/* 4. Visual Charts Row 2: Annual Trend & Status Distribution */}
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

      {/* 5. Strategic Plan Versions Leaderboard */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              Regional Strategic Plan Documents
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active and drafted regional frameworks with execution scores against 100%.
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
                      <div className="w-36 space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="text-muted-foreground">Achievement</span>
                          <span className="text-foreground">{progress}% of 100%</span>
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
