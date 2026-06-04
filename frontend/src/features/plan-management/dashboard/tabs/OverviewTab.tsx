"use client";

import {
  Activity,
  CheckCircle2,
  GitBranch,
  Layers,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import { MOCK_KPI_SUMMARY } from "../mockData";
import { KpiCard } from "../components/KpiCard";
import { ChartPlaceholder } from "../components/ChartPlaceholder";

export function OverviewTab() {
  const kpi = MOCK_KPI_SUMMARY;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-golden-dark">Overview Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          National-level plan KPIs — mock values for template preview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <KpiCard title="Total Plans" value={kpi.totalPlans} icon={Layers} />
        <KpiCard title="Active Plans" value={kpi.activePlans} icon={Activity} trend="+4 this month" />
        <KpiCard title="Completed Plans" value={kpi.completedPlans} icon={CheckCircle2} />
        <KpiCard title="Shared Plans" value={kpi.sharedPlans} icon={GitBranch} />
        <KpiCard title="Exclusive Plans" value={kpi.exclusivePlans} icon={ListChecks} />
        <KpiCard title="Avg Progress" value={`${kpi.averageProgress}%`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPlaceholder
          title="Progress Trend"
          description="Monthly completion trend across all structures"
          variant="line"
        />
        <ChartPlaceholder
          title="Shared vs Exclusive Distribution"
          description="Plan assignment mode breakdown"
          variant="pie"
        />
        <ChartPlaceholder
          title="Structure Comparison"
          description="Completion rate by structure (MIDI, GIE, MoM)"
          variant="bar"
        />
        <ChartPlaceholder
          title="Performance Heatmap"
          description="Structure × department performance grid"
          variant="heatmap"
          height={240}
        />
      </div>
    </div>
  );
}
