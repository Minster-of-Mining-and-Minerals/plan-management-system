"use client";

import { Building2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { StatusBadge, PerformanceBadge } from "../components/StatusBadge";
import { AnalyticsPanel, DashboardSectionHeader } from "../components/AnalyticsPanel";
import { RankedLeaderboard } from "../components/RankedLeaderboard";
import { CircularProgress } from "../../components/CircularProgress";
import { DashboardPerformanceBar } from "../components/DashboardPerformanceBar";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

interface DepartmentTabProps {
  state: PlanDashboardFiltersState;
}

export function DepartmentTab({ state }: DepartmentTabProps) {
  const { performanceColor, textPrimary } = useDashboardAppearance();

  if (state.data.deptUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        Loading department analytics…
      </div>
    );
  }

  if (state.data.deptUserError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-sm text-destructive">
        <p>{state.data.deptUserError}</p>
        {state.refetchDeptUser && (
          <Button variant="outline" size="sm" onClick={() => state.refetchDeptUser?.()}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  const grouped = state.data.structures
    .filter(
      (s) =>
        state.filters.structureId === "all" || s.id === state.filters.structureId
    )
    .map((structure) => ({
      structure,
      departments: state.filteredDepartments.filter(
        (d) => d.structureId === structure.id
      ),
    }))
    .filter((g) => g.departments.length > 0);

  const allDepts = state.filteredDepartments;
  const reportingDepts = allDepts.filter((d) => d.has_progress);
  const topDepts = [...reportingDepts]
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  const avgDeptProgress =
    reportingDepts.length > 0
      ? Math.round(
          reportingDepts.reduce((sum, d) => sum + d.progress, 0) / reportingDepts.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Department Analytics"
        description="Achievement from assigned nodes in each structure's focused execution period."
        badge={`${reportingDepts.length} reporting`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnalyticsPanel title="Departments Tracked" icon={Users} variant="accent" tone="accent">
          <p className="text-3xl font-bold tabular-nums" style={{ color: textPrimary }}>
            {allDepts.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {reportingDepts.length} with recorded achievement
          </p>
        </AnalyticsPanel>
        <AnalyticsPanel
          title="Avg Department Score"
          icon={Building2}
          variant="gradient"
          tone="primary"
          className="lg:col-span-2"
        >
          <div className="flex items-center gap-6">
            <CircularProgress
              value={avgDeptProgress}
              color={performanceColor(avgDeptProgress)}
              size={100}
            />
            <div className="flex-1">
              <DashboardPerformanceBar
                value={avgDeptProgress}
                label="Mean achievement across reporting departments"
                performancePercent={avgDeptProgress}
              />
            </div>
          </div>
        </AnalyticsPanel>
      </div>

      {topDepts.length > 0 && (
        <RankedLeaderboard
          title="Top Departments"
          description="Highest achievement on assigned nodes"
          entries={topDepts.map((dept) => ({
            id: dept.id,
            title: dept.name,
            subtitle: `${dept.planCount} plan${dept.planCount !== 1 ? "s" : ""} · ${dept.reportedNodeCount}/${dept.assignedNodeCount} reported`,
            value: dept.progress,
          }))}
        />
      )}

      {grouped.map(({ structure, departments }) => (
        <section key={structure.id} className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" style={{ color: textPrimary }} />
            <h3 className="font-semibold" style={{ color: textPrimary }}>
              {structure.name}
            </h3>
            <PerformanceBadge
              level={structure.performance}
              percent={structure.completionPercent}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {departments.map((dept, index) => (
              <AnalyticsPanel
                key={dept.id}
                title={dept.name}
                description={`${dept.planCount} plan${dept.planCount !== 1 ? "s" : ""} · ${dept.assignedNodeCount} nodes`}
                variant={index % 3 === 0 ? "gradient" : index % 3 === 1 ? "accent" : "default"}
                tone={index % 3 === 0 ? "info" : index % 3 === 1 ? "accent" : "secondary"}
                headerAction={<StatusBadge status={dept.status} />}
              >
                {dept.has_progress ? (
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <span
                        className="text-3xl font-bold tabular-nums"
                        style={{ color: performanceColor(dept.progress) }}
                      >
                        {dept.progress}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dept.reportedNodeCount} reported
                      </span>
                    </div>
                    <DashboardPerformanceBar
                      value={dept.progress}
                      showValue={false}
                      performancePercent={dept.progress}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No achievement recorded on assigned nodes yet.
                  </p>
                )}
              </AnalyticsPanel>
            ))}
          </div>
        </section>
      ))}

      {grouped.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          No departments match the current filters.
        </div>
      )}
    </div>
  );
}
