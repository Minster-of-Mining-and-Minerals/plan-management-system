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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { REGIONAL_PALETTE, hexToRgba, getStatusBadgeDetails } from "../RegionalDashboardAppearance";
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
  regionId: string;
}

function DirectorateTreeNode({
  dept,
  childrenDepts,
  allDeptsByParent,
  depth,
  collapsed,
  onToggle,
  regionId,
}: DirectorateTreeNodeProps) {
  const isCollapsed = Boolean(collapsed[dept.id]);
  const hasKids = childrenDepts.length > 0;
  const assigned = dept.assignedNodeCount ?? dept.assigned_nodes_count ?? 0;
  const reported = dept.reportedNodeCount ?? dept.reported_nodes_count ?? 0;
  const coverage = assigned > 0 ? Math.round((reported / assigned) * 100) : 0;
  const progress = dept.progress ?? dept.avg_progress ?? 0;
  const statusDetails = getStatusBadgeDetails(dept.status);

  return (
    <div className="space-y-1.5">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all gap-3 shadow-2xs"
        style={{ marginLeft: `${Math.min(depth, 5) * 1.5}rem` }}
      >
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          {hasKids ? (
            <button
              type="button"
              onClick={() => onToggle(dept.id)}
              className="h-6 w-6 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5 sm:mt-0 transition-colors"
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

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                Level {dept.level}: {dept.level === 1 ? "Bureau / Directorate" : dept.level === 2 ? "Division" : "Section"}
              </span>
              <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                {dept.name}
              </span>
              {hasKids && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground border-border/80">
                  {childrenDepts.length} sub-units
                </Badge>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Assigned: <strong className="text-foreground font-semibold">{assigned}</strong>
              </span>
              <span>•</span>
              <span>
                Reported: <strong className="text-emerald-700 font-semibold">{reported}</strong>
              </span>
              <span>•</span>
              <span>
                Reporting Coverage: <strong className="text-amber-700 font-semibold">{coverage}%</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
          {/* Progress Bar */}
          <div className="w-28 sm:w-36 space-y-1">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-muted-foreground text-[10px]">Achievement</span>
              <span className="text-foreground">{progress}%</span>
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
              regionId={regionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RegionalDirectoratesTab({ state }: RegionalDirectoratesTabProps) {
  const { filteredDepartments, regionId } = state;
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

  // Filter departments by local search if entered
  const searchedDepartments = useMemo(() => {
    if (!deptSearch.trim()) return filteredDepartments;
    const q = deptSearch.toLowerCase().trim();
    return filteredDepartments.filter((d) => d.name.toLowerCase().includes(q));
  }, [filteredDepartments, deptSearch]);

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

    // Sort roots and children by level ASC, name ASC
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
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
              Hierarchical organizational unit decomposition with milestone assignments, reporting coverage, and confirmed achievement metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View Toggle */}
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

      {/* Directorate Comparison Chart */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="pb-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-700" />
              <span>Directorate Performance Comparison</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirmed progress score across all regional bureaus and organizational units.
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

      {/* Hierarchical Tree View (DEFAULT) or Table View */}
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
                  <th className="py-3 px-4">Hierarchy Level</th>
                  <th className="py-3 px-4">Assigned Milestones</th>
                  <th className="py-3 px-4">Reported Milestones</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4">Achievement Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {searchedDepartments.map((dept) => {
                  const assigned = dept.assignedNodeCount ?? dept.assigned_nodes_count ?? 0;
                  const reported = dept.reportedNodeCount ?? dept.reported_nodes_count ?? 0;
                  const coverage = assigned > 0 ? Math.round((reported / assigned) * 100) : 0;
                  const progress = dept.progress ?? dept.avg_progress ?? 0;
                  const statusDetails = getStatusBadgeDetails(dept.status);

                  return (
                    <tr key={dept.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {dept.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          Level {dept.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-foreground font-semibold">
                        {assigned}
                      </td>
                      <td className="py-3 px-4 text-foreground font-semibold">
                        {reported}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">{coverage}%</span>
                      </td>
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-medium">
                            <span className="text-foreground">{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, progress))}%`,
                                backgroundColor: REGIONAL_PALETTE.emerald.DEFAULT,
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
                        <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] gap-1">
                          <Link href={`/regions/${regionId}/departments/${dept.id}`}>
                            <span>Details</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
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
