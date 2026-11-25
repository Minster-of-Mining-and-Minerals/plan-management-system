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
import { cn } from "@/lib/utils";
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

const clampPct = (v: number) => Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));

/**
 * One layout for every headline card: title + icon, big value, bar,
 * two small figures, and a footer line. Same slots in the same order
 * keeps all cards in a row the same height.
 */
function MetricCard({
  label,
  icon: Icon,
  color,
  value,
  suffix,
  bar,
  left,
  right,
  footerLabel,
  footerValue,
}: {
  label: string;
  icon: React.ElementType;
  color: string;
  value: React.ReactNode;
  suffix?: string;
  bar: Array<{ value: number; color: string }>;
  left: React.ReactNode;
  right: React.ReactNode;
  footerLabel: string;
  footerValue: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <span className="truncate text-sm font-medium text-muted-foreground">{label}</span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: hexToRgba(color, 0.12), color }}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-2 flex min-w-0 items-baseline gap-1.5">
        <span className="text-3xl font-bold leading-none tracking-tight tabular-nums text-foreground">{value}</span>
        {suffix && <span className="truncate text-xs text-muted-foreground">{suffix}</span>}
      </div>
      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        {bar.map((seg, i) =>
          seg.value > 0 ? (
            <div
              key={i}
              className="h-full transition-all duration-700 motion-reduce:transition-none"
              style={{ width: `${clampPct(seg.value)}%`, backgroundColor: seg.color }}
            />
          ) : null
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {left}
        {right}
      </div>
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>{footerLabel}</span>
          {footerValue}
        </div>
      </div>
    </div>
  );
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

  const workflowTotal =
    agg.approved_count + agg.pending_approval_count + agg.pending_validation_count + agg.rejected_count;

  return (
    <div className="space-y-6">
      {/* 1. Headline cards: one shared layout so every card lines up */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Overall plan progress"
          icon={TrendingUp}
          color={tierColor}
          value={`${agg.achievement_percent}%`}
          suffix="of target"
          bar={[{ value: clampPct(agg.achievement_percent), color: tierColor }]}
          left={<span className="font-medium text-emerald-700 dark:text-emerald-400">{agg.completed_nodes} completed</span>}
          right={<span>{agg.incomplete_nodes} in progress</span>}
          footerLabel="Performance tier"
          footerValue={
            <Badge
              variant="outline"
              className="h-5 text-[11px] capitalize"
              style={{ borderColor: tierColor, color: tierColor }}
            >
              {achievementTier.replace("-", " ")}
            </Badge>
          }
        />

        <MetricCard
          label="Target vs actual"
          icon={Target}
          color={REGIONAL_PALETTE.teal.DEFAULT}
          value={agg.total_actual.toLocaleString()}
          suffix={`/ ${agg.total_target.toLocaleString()} planned`}
          bar={[
            {
              value: agg.total_target > 0 ? clampPct((agg.total_actual / agg.total_target) * 100) : 0,
              color: REGIONAL_PALETTE.teal.DEFAULT,
            },
          ]}
          left={<span>Remaining {agg.remaining_target.toLocaleString()}</span>}
          right={
            <span>
              {agg.total_target > 0 ? Math.round((agg.total_actual / agg.total_target) * 100) : 0}% delivered
            </span>
          }
          footerLabel="Variance"
          footerValue={
            <span
              className={cn(
                "font-semibold tabular-nums",
                agg.variance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
              )}
            >
              {agg.variance >= 0 ? "+" : ""}
              {agg.variance.toLocaleString()} ({agg.variance_percent >= 0 ? "+" : ""}
              {agg.variance_percent}%)
            </span>
          }
        />

        <MetricCard
          label="Reporting completion"
          icon={FileCheck2}
          color={REGIONAL_PALETTE.amber.DEFAULT}
          value={`${agg.reporting_completion_percent}%`}
          suffix="of KPIs"
          bar={[{ value: clampPct(agg.reporting_completion_percent), color: REGIONAL_PALETTE.amber.DEFAULT }]}
          left={<span className="font-medium text-emerald-700 dark:text-emerald-400">{agg.reported_kpis} reported</span>}
          right={<span className="font-medium text-amber-700 dark:text-amber-400">{agg.unreported_kpis} not reported</span>}
          footerLabel="Period"
          footerValue={
            <span className="font-medium text-foreground">
              {currentPeriodLabel || `Year ${currentPlanningYear || "active"}`}
            </span>
          }
        />

        <MetricCard
          label="Awaiting review"
          icon={ShieldCheck}
          color={REGIONAL_PALETTE.indigo.DEFAULT}
          value={(agg.pending_approval_count + agg.pending_validation_count).toLocaleString()}
          suffix="achievement reports"
          bar={
            workflowTotal > 0
              ? [
                  { value: (agg.approved_count / workflowTotal) * 100, color: REGIONAL_PALETTE.emerald.DEFAULT },
                  { value: (agg.pending_approval_count / workflowTotal) * 100, color: REGIONAL_PALETTE.amber.DEFAULT },
                  { value: (agg.pending_validation_count / workflowTotal) * 100, color: REGIONAL_PALETTE.indigo.DEFAULT },
                  { value: (agg.rejected_count / workflowTotal) * 100, color: REGIONAL_PALETTE.rose.DEFAULT },
                ]
              : []
          }
          left={<span>{agg.pending_approval_count} need approval</span>}
          right={<span>{agg.pending_validation_count} need validation</span>}
          footerLabel="Decided"
          footerValue={
            <span className="tabular-nums">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{agg.approved_count} approved</span>
              {" · "}
              <span className="font-semibold text-rose-700 dark:text-rose-400">{agg.rejected_count} rejected</span>
            </span>
          }
        />
      </div>

      {/* 2. Plan structure by level (click to open that level in Hierarchy & Targets) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { level: 1, label: "Strategic focus", code: "L1", count: agg.total_sf, hint: "View pillars", icon: Compass, color: REGIONAL_PALETTE.emerald.DEFAULT },
          { level: 2, label: "Goals", code: "L2", count: agg.total_goals, hint: "View goals", icon: Layers, color: REGIONAL_PALETTE.teal.DEFAULT },
          { level: 3, label: "KPIs", code: "L3", count: agg.total_kpis, hint: `${agg.reported_kpis} reported`, icon: Target, color: REGIONAL_PALETTE.amber.DEFAULT },
          { level: 4, label: "Tasks & milestones", code: "L4+", count: agg.total_tasks, hint: "View tasks", icon: ListChecks, color: REGIONAL_PALETTE.indigo.DEFAULT },
        ].map((lvl) => {
          const Icon = lvl.icon;
          return (
            <button
              key={lvl.level}
              type="button"
              onClick={() => {
                updateFilter("selectedHierarchyLevel", lvl.level);
                setActiveSection("hierarchy");
              }}
              className="group flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-2xs transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: hexToRgba(lvl.color, 0.12), color: lvl.color }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">{lvl.label}</span>
                </span>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {lvl.code}
                </span>
              </span>
              <span className="text-2xl font-bold tabular-nums text-foreground">{lvl.count}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
                {lvl.hint}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </span>
            </button>
          );
        })}
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
