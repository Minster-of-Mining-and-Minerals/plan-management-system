"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  Target,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Building2,
  GitBranch,
  CornerDownRight,
  ChevronLeft,
  RotateCcw,
  Compass,
  ListChecks,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  REGIONAL_PALETTE,
  hexToRgba,
  getStatusBadgeDetails,
  getPerformanceTier,
} from "../RegionalDashboardAppearance";
import { RegionalPlannedVsActualBarChart } from "../components/charts/RegionalPlannedVsActualBarChart";
import type { RegionalPlanDashboardState } from "../types";
import type { RegionalDashboardProgressNode } from "@/redux/types/regionalPlan";

interface RegionalHierarchyTabProps {
  state: RegionalPlanDashboardState;
}

interface BreadcrumbNode {
  id: string;
  title: string;
  level: number;
}

export function RegionalHierarchyTab({ state }: RegionalHierarchyTabProps) {
  const {
    treeNodes,
    filteredTreeNodes,
    hierarchyConfig,
    filters,
    updateFilter,
  } = state;

  // Active drilldown breadcrumb path
  const [drilldownPath, setDrilldownPath] = useState<BreadcrumbNode[]>([]);
  const [viewMode, setViewMode] = useState<"drilldown" | "flat">("drilldown");

  // Step label lookup
  const stepLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of hierarchyConfig) {
      map.set(s.level, s.name);
    }
    return map;
  }, [hierarchyConfig]);

  // Find a node by ID in the tree
  const nodeLookupMap = useMemo(() => {
    const map = new Map<string, RegionalDashboardProgressNode>();
    function indexNodes(nodes: RegionalDashboardProgressNode[]) {
      for (const n of nodes) {
        map.set(n.id, n);
        if (n.children && n.children.length > 0) {
          indexNodes(n.children);
        }
      }
    }
    indexNodes(treeNodes);
    return map;
  }, [treeNodes]);

  // Current active parent node in drilldown
  const currentParentNode = useMemo(() => {
    if (drilldownPath.length === 0) return null;
    const last = drilldownPath[drilldownPath.length - 1];
    return nodeLookupMap.get(last.id) || null;
  }, [drilldownPath, nodeLookupMap]);

  // Nodes to display in drilldown mode
  const displayedDrilldownNodes = useMemo(() => {
    if (!currentParentNode) {
      // Top-level roots (Strategic Focuses)
      return filteredTreeNodes.length > 0 ? filteredTreeNodes : treeNodes;
    }
    return currentParentNode.children || [];
  }, [currentParentNode, filteredTreeNodes, treeNodes]);

  // Flatten nodes for the flat table breakdown
  const flattenedNodes = useMemo(() => {
    const list: RegionalDashboardProgressNode[] = [];
    function flatten(nodes: RegionalDashboardProgressNode[]) {
      for (const n of nodes) {
        if (
          filters.selectedHierarchyLevel === "all" ||
          n.level === filters.selectedHierarchyLevel
        ) {
          list.push(n);
        }
        if (n.children && n.children.length > 0) {
          flatten(n.children);
        }
      }
    }
    flatten(filteredTreeNodes);
    return list;
  }, [filteredTreeNodes, filters.selectedHierarchyLevel]);

  // Handle drill into child node
  const handleDrillInto = (node: RegionalDashboardProgressNode) => {
    if (node.children && node.children.length > 0) {
      setDrilldownPath((prev) => [
        ...prev,
        { id: node.id, title: node.title, level: node.level || 1 },
      ]);
    }
  };

  // Handle navigate back to a breadcrumb index
  const handleNavigateBreadcrumb = (index: number) => {
    if (index < 0) {
      setDrilldownPath([]);
    } else {
      setDrilldownPath((prev) => prev.slice(0, index + 1));
    }
  };

  // Active level number in drilldown
  const currentLevelNumber = currentParentNode ? (currentParentNode.level || 1) + 1 : 1;
  const currentLevelName = stepLabelMap.get(currentLevelNumber) || `Level ${currentLevelNumber}`;

  // Metrics for active drilldown scope
  const scopeMetrics = useMemo(() => {
    const nodes = displayedDrilldownNodes;
    let targetSum = 0;
    let actualSum = 0;
    let completed = 0;
    let reported = 0;

    for (const n of nodes) {
      const tgt = Number(n.computed_target ?? n.period_target ?? n.annual_target ?? 0);
      const act = Number(n.computed_actual ?? n.period_actual ?? n.annual_actual ?? 0);
      targetSum += tgt;
      actualSum += act;
      if (n.progress >= 100) completed++;
      if (n.reporting_status === "reported" || n.period_actual != null || n.annual_actual != null) {
        reported++;
      }
    }

    const avgProg =
      nodes.length > 0
        ? Math.round(nodes.reduce((sum, n) => sum + (n.progress || 0), 0) / nodes.length)
        : 0;
    const remaining = Math.max(0, targetSum - actualSum);

    return {
      count: nodes.length,
      targetSum,
      actualSum,
      remaining,
      avgProg,
      completed,
      reported,
    };
  }, [displayedDrilldownNodes]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Drilldown Breadcrumbs Banner */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-emerald-700" />
              <h2 className="text-base font-bold text-foreground">
                Hierarchical Milestone Performance & Drilldown
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Explore dynamic multi-tier execution (Strategic Focus → Goal → KPI → Task) with confirmed achievement percentages against 100%.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-border/70 p-1 bg-white dark:bg-card text-xs">
              <button
                type="button"
                onClick={() => setViewMode("drilldown")}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === "drilldown"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Interactive Drilldown
              </button>
              <button
                type="button"
                onClick={() => setViewMode("flat")}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === "flat"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Flat Level Table
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb Trail */}
        {viewMode === "drilldown" && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/15 text-xs">
            <button
              type="button"
              onClick={() => handleNavigateBreadcrumb(-1)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                drilldownPath.length === 0
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-white dark:bg-card border border-border/80 text-foreground hover:bg-emerald-50 text-muted-foreground"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>All Strategic Focuses</span>
            </button>

            {drilldownPath.map((item, idx) => {
              const isLast = idx === drilldownPath.length - 1;
              const stepName = stepLabelMap.get(item.level) || `Level ${item.level}`;
              return (
                <React.Fragment key={item.id}>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <button
                    type="button"
                    onClick={() => handleNavigateBreadcrumb(idx)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-colors truncate max-w-[220px] ${
                      isLast
                        ? "bg-emerald-700 text-white shadow-2xs"
                        : "bg-white dark:bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-emerald-50"
                    }`}
                    title={item.title}
                  >
                    <span className="text-[10px] opacity-80 uppercase tracking-wider">{stepName}:</span>
                    <span className="truncate">{item.title}</span>
                  </button>
                </React.Fragment>
              );
            })}

            {drilldownPath.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleNavigateBreadcrumb(-1)}
                className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground ml-auto"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset to Top</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 2. Active Scope Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Active Scope Level
          </span>
          <div className="text-xl font-bold text-foreground mt-1">
            {viewMode === "drilldown" ? currentLevelName : "All Filtered Levels"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {viewMode === "drilldown" ? scopeMetrics.count : flattenedNodes.length} nodes in scope
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Scope Achievement
          </span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {scopeMetrics.avgProg}% of 100%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {scopeMetrics.completed} fully delivered
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Scope Target Allocation
          </span>
          <div className="text-xl font-bold text-foreground mt-1">
            {scopeMetrics.targetSum.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Actual: <strong className="text-emerald-700">{scopeMetrics.actualSum.toLocaleString()}</strong>
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Remaining Target
          </span>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {scopeMetrics.remaining.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {scopeMetrics.reported} reported milestones
          </p>
        </div>
      </div>

      {/* 3. Target Achievement Chart for Active Scope */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="pb-4 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" />
            <span>Target Allocations vs Actual Delivery (Current Scope)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quantified delivery metrics for nodes at the currently active drilldown level.
          </p>
        </div>
        <div className="pt-4">
          <RegionalPlannedVsActualBarChart
            nodes={viewMode === "drilldown" ? displayedDrilldownNodes : filteredTreeNodes}
          />
        </div>
      </div>

      {/* 4. Interactive Node Breakdown (Drilldown / Flat Table) */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              {viewMode === "drilldown"
                ? `${currentLevelName} Milestones (${displayedDrilldownNodes.length})`
                : `Plan Hierarchy Inventory (${flattenedNodes.length})`}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {viewMode === "drilldown"
                ? "Click any milestone with sub-items to drill down into the next level."
                : "Full list of plan milestones at your active depth tier filter."}
            </p>
          </div>

          {/* Quick Level Filter Pills for flat mode */}
          {viewMode === "flat" && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Button
                type="button"
                variant={filters.selectedHierarchyLevel === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilter("selectedHierarchyLevel", "all")}
                className="h-7 text-xs"
              >
                All
              </Button>
              {hierarchyConfig.map((step) => (
                <Button
                  key={step.level}
                  type="button"
                  variant={filters.selectedHierarchyLevel === step.level ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("selectedHierarchyLevel", step.level)}
                  className="h-7 text-xs"
                >
                  L{step.level}: {step.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4">
          {(viewMode === "drilldown" ? displayedDrilldownNodes : flattenedNodes).length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No hierarchy nodes match your active drilldown scope or filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Level & Step</th>
                    <th className="py-3 px-4">Milestone Title</th>
                    <th className="py-3 px-4">Target Unit</th>
                    <th className="py-3 px-4">Target / Actual</th>
                    <th className="py-3 px-4">Remaining</th>
                    <th className="py-3 px-4">Achievement Progress</th>
                    <th className="py-3 px-4">Workflow Status</th>
                    <th className="py-3 px-4 text-right">Drilldown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(viewMode === "drilldown" ? displayedDrilldownNodes : flattenedNodes).map((node) => {
                    const stepName = stepLabelMap.get(node.level || 1) || `Level ${node.level}`;
                    const statusDetails = getStatusBadgeDetails(node.status);
                    const progress = node.progress ?? 0;
                    const hasChildren = node.children && node.children.length > 0;
                    const target = Number(node.computed_target ?? node.period_target ?? node.annual_target ?? 0);
                    const actual = Number(node.computed_actual ?? node.period_actual ?? node.annual_actual ?? 0);
                    const remaining = Math.max(0, target - actual);
                    const isReported =
                      node.reporting_status === "reported" ||
                      node.period_actual != null ||
                      node.annual_actual != null;
                    const workflowStatus = node.workflow_status || (isReported ? "Submitted" : "Unreported");

                    return (
                      <tr key={node.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            L{node.level}: {stepName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground min-w-[220px]">
                          <div>{node.title}</div>
                          {node.parent_title && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Parent: {node.parent_title}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                          {node.target_unit ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                              {node.target_unit}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {target > 0 || actual > 0 ? (
                            <div className="space-y-0.5">
                              <span className="text-foreground font-semibold">{actual.toLocaleString()}</span>
                              <span className="mx-1 text-muted-foreground">/</span>
                              <span className="text-muted-foreground font-medium">{target.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-amber-700">
                          {target > 0 ? remaining.toLocaleString() : "—"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap min-w-[140px]">
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
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                            style={{
                              backgroundColor:
                                workflowStatus.toLowerCase() === "validated" || workflowStatus.toLowerCase() === "approved"
                                  ? hexToRgba(REGIONAL_PALETTE.emerald.DEFAULT, 0.15)
                                  : workflowStatus.toLowerCase() === "submitted"
                                  ? hexToRgba(REGIONAL_PALETTE.amber.DEFAULT, 0.15)
                                  : hexToRgba(REGIONAL_PALETTE.slate.DEFAULT, 0.15),
                              color:
                                workflowStatus.toLowerCase() === "validated" || workflowStatus.toLowerCase() === "approved"
                                  ? REGIONAL_PALETTE.emerald.DEFAULT
                                  : workflowStatus.toLowerCase() === "submitted"
                                  ? REGIONAL_PALETTE.amber.DEFAULT
                                  : REGIONAL_PALETTE.slate.DEFAULT,
                            }}
                          >
                            {workflowStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          {hasChildren ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleDrillInto(node)}
                              className="h-7 text-[11px] gap-1 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                            >
                              <span>View Children ({node.children?.length})</span>
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              Leaf Milestone
                            </span>
                          )}
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
    </div>
  );
}
