"use client";

import { useMemo, useState } from "react";
import { Building2, Loader2, Users, Search, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { StatusBadge, PerformanceBadge } from "../components/StatusBadge";
import { AnalyticsPanel, DashboardSectionHeader } from "../components/AnalyticsPanel";
import { RankedLeaderboard } from "../components/RankedLeaderboard";
import { CircularProgress } from "../../components/CircularProgress";
import { DashboardPerformanceBar } from "../components/DashboardPerformanceBar";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";
import type { PerformanceLevel } from "../types";

interface DepartmentTabProps {
  state: PlanDashboardFiltersState;
}

export function DepartmentTab({ state }: DepartmentTabProps) {
  const { performanceColor, textPrimary } = useDashboardAppearance();
  const [deptSearch, setDeptSearch] = useState("");

  const structureById = useMemo(() => {
    const map = new Map<string, (typeof state.data.structures)[0]>();
    for (const s of state.data.structures) {
      map.set(s.id, s);
    }
    return map;
  }, [state.data.structures]);

  const displayedDepts = useMemo(() => {
    if (!deptSearch.trim()) return state.filteredDepartments;
    const q = deptSearch.toLowerCase().trim();
    return state.filteredDepartments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.structureName && d.structureName.toLowerCase().includes(q))
    );
  }, [state.filteredDepartments, deptSearch]);

  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      {
        structure: {
          id: string;
          name: string;
          code?: string;
          completionPercent: number;
          performance?: PerformanceLevel;
        };
        departments: typeof displayedDepts;
      }
    >();

    for (const dept of displayedDepts) {
      const sId = dept.structureId || "unassigned";
      if (!groups.has(sId)) {
        const found = structureById.get(sId);
        groups.set(sId, {
          structure: found || {
            id: sId,
            name: dept.structureName || "Department Sector",
            code: "",
            completionPercent: dept.progress,
            performance: (dept.performance as PerformanceLevel) || "average",
          },
          departments: [],
        });
      }
      groups.get(sId)!.departments.push(dept);
    }

    return Array.from(groups.values());
  }, [displayedDepts, structureById]);

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

  const allDepts = state.filteredDepartments;
  const reportingDepts = allDepts.filter((d) => d.has_progress);
  const totalAssignedNodes = allDepts.reduce((sum, d) => sum + d.assignedNodeCount, 0);
  const totalReportedNodes = allDepts.reduce((sum, d) => sum + d.reportedNodeCount, 0);
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
        description="Achievement from assigned nodes across organizational units in the active execution scope."
        badge={`${reportingDepts.length} of ${allDepts.length} reporting`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsPanel title="Departments Tracked" icon={Building2} variant="gradient" tone="info">
          <p className="text-3xl font-bold tabular-nums" style={{ color: textPrimary }}>
            {allDepts.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {reportingDepts.length} with recorded achievement
          </p>
        </AnalyticsPanel>

        <AnalyticsPanel title="Avg Department Score" icon={CheckCircle2} variant="gradient" tone="primary">
          <div className="flex items-center gap-4">
            <CircularProgress
              value={avgDeptProgress}
              color={performanceColor(avgDeptProgress)}
              size={64}
            />
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: performanceColor(avgDeptProgress) }}>
                {avgDeptProgress}%
              </p>
              <p className="text-xs text-muted-foreground">Mean score</p>
            </div>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel title="Assigned Nodes" icon={Target} variant="accent" tone="accent">
          <p className="text-3xl font-bold tabular-nums" style={{ color: textPrimary }}>
            {totalAssignedNodes}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Across {allDepts.length} department{allDepts.length !== 1 ? "s" : ""}
          </p>
        </AnalyticsPanel>

        <AnalyticsPanel title="Reporting Coverage" icon={Users} variant="default" tone="success">
          <p className="text-3xl font-bold tabular-nums" style={{ color: textPrimary }}>
            {totalAssignedNodes > 0
              ? `${Math.round((totalReportedNodes / totalAssignedNodes) * 100)}%`
              : "0%"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {totalReportedNodes} of {totalAssignedNodes} nodes reported
          </p>
        </AnalyticsPanel>
      </div>

      {topDepts.length > 0 && (
        <RankedLeaderboard
          title="Top Performing Departments"
          description="Highest execution achievement on assigned plan nodes"
          entries={topDepts.map((dept) => ({
            id: dept.id,
            title: dept.name,
            subtitle: `${dept.structureName ? `${dept.structureName} · ` : ""}${dept.planCount} plan${dept.planCount !== 1 ? "s" : ""} · ${dept.reportedNodeCount}/${dept.assignedNodeCount} reported`,
            value: dept.progress,
          }))}
        />
      )}

      {/* Local Department Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments or sectors..."
            value={deptSearch}
            onChange={(e) => setDeptSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>
        <span className="text-xs text-muted-foreground self-center">
          Showing {displayedDepts.length} of {allDepts.length} departments
        </span>
      </div>

      {grouped.map(({ structure, departments }) => (
        <section key={structure.id} className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">
                {structure.name}
              </h3>
              {structure.code && (
                <span className="text-xs text-muted-foreground font-mono">({structure.code})</span>
              )}
            </div>
            {structure.completionPercent != null && (
              <PerformanceBadge
                level={structure.performance || "average"}
                percent={structure.completionPercent}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {departments.map((dept, index) => {
              const coverage =
                dept.assignedNodeCount > 0
                  ? Math.round((dept.reportedNodeCount / dept.assignedNodeCount) * 100)
                  : 0;

              return (
                <AnalyticsPanel
                  key={dept.id}
                  title={dept.name}
                  description={dept.structureName || undefined}
                  variant={index % 3 === 0 ? "gradient" : index % 3 === 1 ? "accent" : "default"}
                  tone={index % 3 === 0 ? "info" : index % 3 === 1 ? "accent" : "secondary"}
                  headerAction={<StatusBadge status={dept.status === "not_started" ? "delayed" : dept.status} />}
                >
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <span
                          className="text-2xl font-bold tabular-nums"
                          style={{ color: dept.has_progress ? performanceColor(dept.progress) : undefined }}
                        >
                          {dept.has_progress ? `${dept.progress}%` : "Not started"}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {dept.planCount} plan{dept.planCount !== 1 ? "s" : ""} · {dept.userIds?.length || 0} user{dept.userIds?.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          {dept.reportedNodeCount}/{dept.assignedNodeCount}
                        </span>
                        <p className="text-[10px] text-muted-foreground">{coverage}% reported</p>
                      </div>
                    </div>

                    <DashboardPerformanceBar
                      value={dept.progress}
                      showValue={false}
                      size="sm"
                      performancePercent={dept.progress}
                    />
                  </div>
                </AnalyticsPanel>
              );
            })}
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
