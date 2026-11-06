"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Table as TableIcon,
  Search,
  X,
  Target,
  Sparkles,
  BarChart3,
  Filter,
  ShieldCheck,
  FileCheck2,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  REGIONAL_PALETTE,
  hexToRgba,
  getStatusBadgeDetails,
  getPerformanceTier,
} from "../RegionalDashboardAppearance";
import { RegionalDirectorateComparisonBarChart } from "../components/charts/RegionalDirectorateComparisonBarChart";
import type { RegionalPlanDashboardState } from "../types";
import type { RegionalDashboardDepartment } from "@/redux/types/regionalPlan";

interface RegionalDirectoratesTabProps {
  state: RegionalPlanDashboardState;
}

interface DirectorateTreeNodeProps {
  dept: RegionalDashboardDepartment;
  childrenDepts: RegionalDashboardDepartment[];
  allDeptsByParent: Map<string, RegionalDashboardDepartment[]>;
  depth: number;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  onFilterDept: (id: string) => void;
  regionId: string;
}

function DirectorateTreeNode({
  dept,
  childrenDepts,
  allDeptsByParent,
  depth,
  collapsed,
  onToggle,
  onFilterDept,
  regionId,
}: DirectorateTreeNodeProps) {
  const isCollapsed = Boolean(collapsed[dept.id]);
  const hasKids = childrenDepts.length > 0;
  const assigned = dept.assignedNodeCount ?? dept.assigned_nodes_count ?? 0;
  const reported = dept.reportedNodeCount ?? dept.reported_nodes_count ?? 0;
  const coverage = dept.reporting_completion ?? (assigned > 0 ? Math.round((reported / assigned) * 100) : 0);
  const progress = dept.progress ?? dept.avg_progress ?? 0;
  const statusDetails = getStatusBadgeDetails(dept.status);
  const target = dept.total_target ?? 0;
  const actual = dept.total_actual ?? 0;
  const remaining = dept.remaining_target ?? Math.max(0, target - actual);

  return (
    <div className="space-y-1.5">
      <div
        className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all gap-4 shadow-2xs"
        style={{ marginLeft: `${Math.min(depth, 5) * 1.5}rem` }}
      >
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {hasKids ? (
            <button
              type="button"
              onClick={() => onToggle(dept.id)}
              className="h-6 w-6 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5 transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-emerald-700" />
              ) : (
                <ChevronDown className="h-4 w-4 text-emerald-700" />
              )}
            </button>
          ) : (
            <div className="h-6 w-6 shrink-0 flex items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-emerald-500/40" />
            </div>
          )}

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                Level {dept.level}: {dept.level === 1 ? "Bureau / Directorate" : dept.level === 2 ? "Division" : "Section"}
              </span>
              <span className="font-bold text-sm text-foreground truncate">
                {dept.name}
              </span>
              {hasKids && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground border-border/80">
                  {childrenDepts.length} sub-units
                </Badge>
              )}
            </div>

            {/* Target vs Actual & Assigned Node Breakdown */}
            <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Target: <strong className="text-foreground">{target.toLocaleString()}</strong>
              </span>
              <span>•</span>
              <span>
                Actual: <strong className="text-emerald-700">{actual.toLocaleString()}</strong>
              </span>
              <span>•</span>
              <span>
                Remaining: <strong className="text-amber-700">{remaining.toLocaleString()}</strong>
              </span>
              <span>•</span>
              <span>
                Reporting Coverage: <strong className="text-foreground">{coverage}% of 100%</strong>
              </span>
            </div>

            {/* Depth Level Breakdown Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                {dept.assigned_sfs || 0} SF
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                {dept.assigned_goals || 0} Goals
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                {dept.assigned_kpis || 0} KPIs
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                {dept.assigned_tasks || 0} Tasks
              </span>
              {(dept.pending_approval || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                  {dept.pending_approval} Pending Appr.
                </span>
              )}
              {(dept.pending_validation || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200">
                  {dept.pending_validation} Pending Valid.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
          {/* Progress Bar against 100% */}
          <div className="w-32 sm:w-36 space-y-1">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-muted-foreground text-[10px]">Achievement</span>
              <span className="text-foreground">{progress}% of 100%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor:
                    progress >= 85
                      ? REGIONAL_PALETTE.emerald.DEFAULT
                      : progress >= 70
                      ? REGIONAL_PALETTE.teal.DEFAULT
                      : progress >= 50
                      ? REGIONAL_PALETTE.amber.DEFAULT
                      : REGIONAL_PALETTE.rose.DEFAULT,
                }}
              />
            </div>
          </div>

          {/* Status Badge */}
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0"
            style={{
              backgroundColor: statusDetails.bg,
              color: statusDetails.text,
            }}
          >
            {statusDetails.label}
          </span>

          {/* Filter By Dept Button */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onFilterDept(dept.id)}
            className="h-8 text-xs gap-1 shrink-0"
            title="Filter dashboard hierarchy by this directorate"
          >
            <Filter className="h-3 w-3" />
            <span>Filter</span>
          </Button>

          {/* Details Action */}
          <Button asChild size="sm" variant="ghost" className="h-8 text-xs gap-1 shrink-0">
            <Link href={`/regions/${regionId}/departments/${dept.id}`}>
              <span>Details</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {!isCollapsed && hasKids && (
        <div className="space-y-1.5">
          {childrenDepts.map((child) => (
            <DirectorateTreeNode
              key={child.id}
              dept={child}
              childrenDepts={allDeptsByParent.get(child.id) || []}
              allDeptsByParent={allDeptsByParent}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              onFilterDept={onFilterDept}
              regionId={regionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RegionalDirectoratesTab({ state }: RegionalDirectoratesTabProps) {
  const { filteredDepartments, regionId, updateFilter, setActiveSection } = state;
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
  const [deptSearch, setDeptSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    setCollapsed({});
  };

  const collapseAll = () => {
    const allIds: Record<string, boolean> = {};
    for (const d of filteredDepartments) {
      allIds[d.id] = true;
    }
    setCollapsed(allIds);
  };

  const handleFilterByDept = (deptId: string) => {
    updateFilter("departmentId", deptId);
    setActiveSection("hierarchy");
  };

  // Filter departments by local search if entered
  const searchedDepartments = useMemo(() => {
    if (!deptSearch.trim()) return filteredDepartments;
    const q = deptSearch.toLowerCase().trim();
    return filteredDepartments.filter((d) => d.name.toLowerCase().includes(q));
  }, [filteredDepartments, deptSearch]);

  // Overall department statistics
  const deptSummary = useMemo(() => {
    const depts = filteredDepartments;
    if (depts.length === 0) {
      return {
        topDept: null,
        avgProgress: 0,
        totalTarget: 0,
        totalActual: 0,
        remainingTarget: 0,
        avgCoverage: 0,
      };
    }

    const sortedByProg = [...depts].sort(
      (a, b) => (b.progress ?? b.avg_progress ?? 0) - (a.progress ?? a.avg_progress ?? 0)
    );
    const topDept = sortedByProg[0];
    const totalProg = depts.reduce((s, d) => s + (d.progress ?? d.avg_progress ?? 0), 0);
    const avgProgress = Math.round(totalProg / depts.length);
    const totalTarget = depts.reduce((s, d) => s + (d.total_target ?? 0), 0);
    const totalActual = depts.reduce((s, d) => s + (d.total_actual ?? 0), 0);
    const remainingTarget = Math.max(0, totalTarget - totalActual);
    const totalCov = depts.reduce((s, d) => s + (d.reporting_completion ?? 0), 0);
    const avgCoverage = Math.round(totalCov / depts.length);

    return {
      topDept,
      avgProgress,
      totalTarget,
      totalActual,
      remainingTarget,
      avgCoverage,
    };
  }, [filteredDepartments]);

  // Build hierarchical structure from parent_id
  const { rootDepartments, deptsByParent } = useMemo(() => {
    const byParent = new Map<string, RegionalDashboardDepartment[]>();
    const roots: RegionalDashboardDepartment[] = [];
    const deptIdSet = new Set(searchedDepartments.map((d) => d.id));

    for (const d of searchedDepartments) {
      if (d.parent_id && deptIdSet.has(d.parent_id)) {
        if (!byParent.has(d.parent_id)) byParent.set(d.parent_id, []);
        byParent.get(d.parent_id)!.push(d);
      } else {
        roots.push(d);
      }
    }

    const sorter = (a: RegionalDashboardDepartment, b: RegionalDashboardDepartment) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name);
    };

    roots.sort(sorter);
    for (const list of byParent.values()) {
      list.sort(sorter);
    }

    return { rootDepartments: roots, deptsByParent: byParent };
  }, [searchedDepartments]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Regional Directorates & Performance Tree
              </h2>
              <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider bg-emerald-600">
                Default Tree View
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hierarchical organizational unit scorecard with milestone allocations, coverage rates, and confirmed achievement percentages against 100%.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-xl border border-border/80 p-0.5 bg-muted/30">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "tree" ? "default" : "ghost"}
              onClick={() => setViewMode("tree")}
              className={`h-7 text-xs gap-1.5 px-2.5 ${viewMode === "tree" ? "bg-emerald-600 text-white" : ""}`}
            >
              <FolderTree className="h-3.5 w-3.5" />
              <span>Hierarchical Tree</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              onClick={() => setViewMode("table")}
              className={`h-7 text-xs gap-1.5 px-2.5 ${viewMode === "table" ? "bg-emerald-600 text-white" : ""}`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Scorecard Table</span>
            </Button>
          </div>

          <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
            <Link href={`/regions/${regionId}/departments`}>
              <span>Manage Units</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Directorate Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Top Performer */}
        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Top Performing Directorate
            </span>
            <Award className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-foreground truncate mt-1">
            {deptSummary.topDept?.name || "—"}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {deptSummary.topDept ? `${deptSummary.topDept.progress ?? deptSummary.topDept.avg_progress ?? 0}% of 100%` : "—"}
          </p>
        </div>

        {/* Avg Achievement */}
        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Average Achievement
            </span>
            <TrendingUp className="h-4 w-4 text-teal-700" />
          </div>
          <div className="text-xl font-bold text-teal-800 dark:text-teal-300 mt-1">
            {deptSummary.avgProgress}% of 100%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Across {filteredDepartments.length} directorates
          </p>
        </div>

        {/* Target vs Actual */}
        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Target Allocations
            </span>
            <Target className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">
            {deptSummary.totalActual.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            / {deptSummary.totalTarget.toLocaleString()} planned
          </p>
        </div>

        {/* Reporting Coverage */}
        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Reporting Coverage
            </span>
            <FileCheck2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-800 dark:text-indigo-300 mt-1">
            {deptSummary.avgCoverage}% of 100%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Milestone submission rate
          </p>
        </div>
      </div>

      {/* 3. Directorate Comparison Chart */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="pb-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-700" />
              <span>Directorate Performance Comparison (against 100%)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirmed progress score across all regional bureaus and organizational development structures.
            </p>
          </div>
          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
            {filteredDepartments.length} Departments
          </Badge>
        </div>
        <div className="pt-4">
          <RegionalDirectorateComparisonBarChart departments={filteredDepartments} />
        </div>
      </div>

      {/* 4. Hierarchical Tree View or Table View */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs space-y-4">
        <div className="pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              {viewMode === "tree" ? (
                <>
                  <FolderTree className="h-4 w-4 text-emerald-700" />
                  <span>Directorate Organizational Hierarchy</span>
                </>
              ) : (
                <>
                  <TableIcon className="h-4 w-4 text-emerald-700" />
                  <span>Directorate Scorecard Inventory</span>
                </>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {viewMode === "tree"
                ? "Multi-tier internal structure tree with aggregated achievement and milestone execution stats."
                : "Tabular breakdown of assigned targets, reported milestones, and achievement percentages."}
            </p>
          </div>

          {/* Search and Tree Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search directorates…"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                className="h-8 pl-8 pr-8 text-xs rounded-xl"
              />
              {deptSearch && (
                <button
                  type="button"
                  onClick={() => setDeptSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {viewMode === "tree" && (
              <>
                <Button type="button" size="sm" variant="outline" onClick={expandAll} className="h-8 text-xs">
                  Expand All
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={collapseAll} className="h-8 text-xs">
                  Collapse All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* View Mode Content */}
        {searchedDepartments.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
            No regional directorates found matching your criteria.
          </div>
        ) : viewMode === "tree" ? (
          /* Tree View */
          <div className="space-y-2">
            {rootDepartments.map((root) => (
              <DirectorateTreeNode
                key={root.id}
                dept={root}
                childrenDepts={deptsByParent.get(root.id) || []}
                allDeptsByParent={deptsByParent}
                depth={0}
                collapsed={collapsed}
                onToggle={toggleCollapse}
                onFilterDept={handleFilterByDept}
                regionId={regionId}
              />
            ))}
          </div>
        ) : (
          /* Scorecard Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                <tr>
                  <th className="py-3 px-4">Directorate / Unit</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Allocated Target / Actual</th>
                  <th className="py-3 px-4">Remaining</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4">Achievement Progress</th>
                  <th className="py-3 px-4">Workflow Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {searchedDepartments.map((dept) => {
                  const assigned = dept.assignedNodeCount ?? dept.assigned_nodes_count ?? 0;
                  const reported = dept.reportedNodeCount ?? dept.reported_nodes_count ?? 0;
                  const coverage = dept.reporting_completion ?? (assigned > 0 ? Math.round((reported / assigned) * 100) : 0);
                  const progress = dept.progress ?? dept.avg_progress ?? 0;
                  const statusDetails = getStatusBadgeDetails(dept.status);
                  const target = dept.total_target ?? 0;
                  const actual = dept.total_actual ?? 0;
                  const remaining = dept.remaining_target ?? Math.max(0, target - actual);

                  return (
                    <tr key={dept.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div>{dept.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                          {dept.assigned_sfs || 0} SF · {dept.assigned_goals || 0} Goals · {dept.assigned_kpis || 0} KPIs · {dept.assigned_tasks || 0} Tasks
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          Level {dept.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="text-foreground font-semibold">{actual.toLocaleString()}</span>
                          <span className="mx-1 text-muted-foreground">/</span>
                          <span className="text-muted-foreground">{target.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-amber-700 font-medium">
                        {remaining.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">{coverage}% of 100%</span>
                      </td>
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold">
                            <span className="text-foreground">{progress}% of 100%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, progress))}%`,
                                backgroundColor:
                                  progress >= 85
                                    ? REGIONAL_PALETTE.emerald.DEFAULT
                                    : progress >= 70
                                    ? REGIONAL_PALETTE.teal.DEFAULT
                                    : progress >= 50
                                    ? REGIONAL_PALETTE.amber.DEFAULT
                                    : REGIONAL_PALETTE.rose.DEFAULT,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            backgroundColor: statusDetails.bg,
                            color: statusDetails.text,
                          }}
                        >
                          {statusDetails.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleFilterByDept(dept.id)}
                            className="h-7 text-[11px] gap-1"
                          >
                            <Filter className="h-3 w-3" />
                            <span>Filter</span>
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] gap-1">
                            <Link href={`/regions/${regionId}/departments/${dept.id}`}>
                              <span>Details</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
