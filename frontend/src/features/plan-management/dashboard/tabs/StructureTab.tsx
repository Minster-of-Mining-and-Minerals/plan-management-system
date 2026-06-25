"use client";

import { useState } from "react";
import { Building2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { PerformanceBadge } from "../components/StatusBadge";
import { DashboardPerformanceBar } from "../components/DashboardPerformanceBar";
import { CircularProgress } from "../../components/CircularProgress";
import { AnalyticsPanel, DashboardSectionHeader } from "../components/AnalyticsPanel";
import { RankedLeaderboard } from "../components/RankedLeaderboard";
import { SimpleBarChart } from "../components/SimpleBarChart";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

interface StructureTabProps {
  state: PlanDashboardFiltersState;
}

export function StructureTab({ state }: StructureTabProps) {
  const { performanceColor } = useDashboardAppearance();
  const structures =
    state.filters.structureId === "all"
      ? state.data.structures
      : state.data.structures.filter((s) => s.id === state.filters.structureId);

  const ranked = [...structures].sort(
    (a, b) => b.completionPercent - a.completionPercent
  );

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Structure Performance"
        description="Sector-level plan metrics from live execution rollups."
        badge={`${structures.length} structures`}
      />

      <RankedLeaderboard
        title="Structure Rankings"
        description="Sorted by average execution achievement"
        entries={ranked.slice(0, 6).map((s) => ({
          id: s.id,
          title: s.name,
          subtitle: `${s.totalPlans} plans · ${s.activeDepartments} departments`,
          value: s.completionPercent,
        }))}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {structures.map((structure, index) => (
          <StructureCard
            key={structure.id}
            structure={structure}
            state={state}
            variant={index % 3}
          />
        ))}
      </div>

      <SimpleBarChart
        title="Structure Achievement Comparison"
        description="Side-by-side completion across sectors"
        items={structures.map((structure) => ({
          label: structure.code || structure.name,
          value: structure.completionPercent,
          subtitle: structure.name,
          color: performanceColor(structure.completionPercent),
        }))}
        colorMode="item"
        height={Math.max(180, structures.length * 36)}
      />
    </div>
  );
}

function StructureCard({
  structure,
  state,
  variant,
}: {
  structure: (typeof state.data.structures)[0];
  state: PlanDashboardFiltersState;
  variant: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const { performanceColor, textPrimary } = useDashboardAppearance();
  const depts = state.data.departments.filter((d) => d.structureId === structure.id);
  const panelVariant = variant === 0 ? "gradient" : variant === 1 ? "accent" : "default";
  const tone = variant === 0 ? "primary" : variant === 1 ? "info" : "secondary";

  return (
    <AnalyticsPanel
      title={structure.name}
      description={structure.code}
      icon={Building2}
      variant={panelVariant}
      tone={tone}
      headerAction={
        <PerformanceBadge level={structure.performance} percent={structure.completionPercent} />
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <CircularProgress
            value={structure.completionPercent}
            color={performanceColor(structure.completionPercent)}
            size={84}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-1">
            <div>
              <p className="text-muted-foreground text-xs">Plans</p>
              <p className="font-bold" style={{ color: textPrimary }}>
                {structure.totalPlans}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Departments</p>
              <p className="font-bold" style={{ color: textPrimary }}>
                {structure.activeDepartments}
              </p>
            </div>
          </div>
        </div>

        <DashboardPerformanceBar
          value={structure.completionPercent}
          label="Completion"
          performancePercent={structure.completionPercent}
        />

        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5"
          style={{ color: textPrimary }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" /> Hide departments
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> View departments ({depts.length})
            </>
          )}
        </Button>

        {expanded && (
          <div className="space-y-2 border-t pt-3">
            {depts.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-white/80 px-3 py-2 text-sm"
              >
                <span>{dept.name}</span>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="tabular-nums font-medium" style={{ color: textPrimary }}>
                    {dept.has_progress ? `${dept.progress}%` : "Not started"}
                  </p>
                  <p>{dept.planCount} plans</p>
                </div>
              </div>
            ))}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Users className="h-3.5 w-3.5" />
              {state.data.users.filter((user) => user.structureId === structure.id).length}{" "}
              assignees tracked
            </p>
          </div>
        )}
      </div>
    </AnalyticsPanel>
  );
}
