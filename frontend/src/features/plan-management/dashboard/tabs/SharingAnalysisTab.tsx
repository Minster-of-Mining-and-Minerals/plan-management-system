"use client";

import { GitBranch, Lock } from "lucide-react";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { SimpleBarChart } from "../components/SimpleBarChart";
import { SharingBadge, StatusBadge } from "../components/StatusBadge";
import { DonutStatCard } from "../components/DonutStatCard";
import { AnalyticsPanel, DashboardSectionHeader } from "../components/AnalyticsPanel";
import { DashboardPerformanceBar } from "../components/DashboardPerformanceBar";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";
import { hexToRgba } from "../utils/dashboardAppearanceUtils";

interface SharingAnalysisTabProps {
  state: PlanDashboardFiltersState;
}

export function SharingAnalysisTab({ state }: SharingAnalysisTabProps) {
  const { sharing, kpi } = state.data;
  const { color, textPrimary } = useDashboardAppearance();
  const sharedColor = color("accent");
  const exclusiveColor = color("secondary");

  const sharedAvg =
    sharing.shared.length > 0
      ? Math.round(
          sharing.shared.reduce((sum, item) => sum + item.progress, 0) /
            sharing.shared.length
        )
      : 0;

  const exclusiveAvg =
    sharing.exclusive.length > 0
      ? Math.round(
          sharing.exclusive.reduce((sum, item) => sum + item.progress, 0) /
            sharing.exclusive.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Shared vs Exclusive Analysis"
        description="Strategic root nodes grouped by assignment sharing mode with live execution progress."
        badge="Assignment modes"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutStatCard
          title="Root Distribution"
          description="Shared vs exclusive strategic roots"
          centerValue={kpi.sharedPlans + kpi.exclusivePlans}
          centerLabel="Total"
          segments={[
            { label: "Shared", value: kpi.sharedPlans, color: sharedColor },
            { label: "Exclusive", value: kpi.exclusivePlans, color: exclusiveColor },
          ]}
          className="lg:col-span-1"
        />
        <AnalyticsPanel
          title="Mode Comparison"
          description="Average achievement by sharing mode"
          variant="gradient"
          tone="primary"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{
                borderColor: hexToRgba(sharedColor, 0.2),
                backgroundColor: hexToRgba(sharedColor, 0.06),
              }}
            >
              <div className="flex items-center gap-2 font-semibold" style={{ color: sharedColor }}>
                <GitBranch className="h-4 w-4" />
                Shared · {sharedAvg}%
              </div>
              <DashboardPerformanceBar
                value={sharedAvg}
                showValue={false}
                performancePercent={sharedAvg}
              />
              <p className="text-xs text-muted-foreground">{sharing.shared.length} roots</p>
            </div>
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{
                borderColor: hexToRgba(exclusiveColor, 0.2),
                backgroundColor: hexToRgba(exclusiveColor, 0.06),
              }}
            >
              <div
                className="flex items-center gap-2 font-semibold"
                style={{ color: exclusiveColor }}
              >
                <Lock className="h-4 w-4" />
                Exclusive · {exclusiveAvg}%
              </div>
              <DashboardPerformanceBar
                value={exclusiveAvg}
                showValue={false}
                performancePercent={exclusiveAvg}
              />
              <p className="text-xs text-muted-foreground">{sharing.exclusive.length} roots</p>
            </div>
          </div>
        </AnalyticsPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsPanel
          title="Shared Roots"
          icon={GitBranch}
          variant="accent"
          tone="accent"
        >
          <div className="space-y-3">
            {sharing.shared.length > 0 ? (
              sharing.shared.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border p-4 space-y-3"
                  style={{
                    borderColor: hexToRgba(sharedColor, 0.18),
                    background: `linear-gradient(90deg, #ffffff, ${hexToRgba(sharedColor, 0.05)})`,
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium" style={{ color: textPrimary }}>
                      {plan.title}
                    </span>
                    <SharingBadge mode="shared" />
                    <StatusBadge status={plan.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {plan.structure_name ?? "Structure"}
                  </p>
                  <DashboardPerformanceBar
                    value={plan.progress}
                    size="sm"
                    performancePercent={plan.progress}
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No shared strategic roots in scope.</p>
            )}
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel title="Exclusive Roots" icon={Lock} variant="default" tone="secondary">
          <div className="space-y-3">
            {sharing.exclusive.length > 0 ? (
              sharing.exclusive.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border p-4 space-y-3"
                  style={{
                    borderColor: hexToRgba(exclusiveColor, 0.18),
                    background: `linear-gradient(90deg, #ffffff, ${hexToRgba(exclusiveColor, 0.05)})`,
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium" style={{ color: textPrimary }}>
                      {plan.title}
                    </span>
                    <SharingBadge mode="exclusive" />
                    <StatusBadge status={plan.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: {plan.target ?? "—"}
                  </p>
                  <DashboardPerformanceBar
                    value={plan.progress}
                    size="sm"
                    performancePercent={plan.progress}
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No exclusive strategic roots in scope.</p>
            )}
          </div>
        </AnalyticsPanel>
      </div>

      <SimpleBarChart
        title="Average Progress by Mode"
        description="Mean achievement across roots in each mode"
        items={[
          {
            label: "Shared",
            value: sharedAvg,
            subtitle: `${sharing.shared.length} roots`,
            color: sharedColor,
          },
          {
            label: "Exclusive",
            value: exclusiveAvg,
            subtitle: `${sharing.exclusive.length} roots`,
            color: exclusiveColor,
          },
        ]}
        colorMode="item"
      />
    </div>
  );
}
