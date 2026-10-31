"use client";

import React, { useMemo } from "react";
import {
  Layers,
  Target,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Building2,
  GitBranch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  REGIONAL_PALETTE,
  hexToRgba,
  getStatusBadgeDetails,
} from "../RegionalDashboardAppearance";
import { RegionalPlannedVsActualBarChart } from "../components/charts/RegionalPlannedVsActualBarChart";
import type { RegionalPlanDashboardState } from "../types";
import type { RegionalDashboardProgressNode } from "@/redux/types/regionalPlan";

interface RegionalHierarchyTabProps {
  state: RegionalPlanDashboardState;
}

export function RegionalHierarchyTab({ state }: RegionalHierarchyTabProps) {
  const {
    filteredTreeNodes,
    hierarchyConfig,
    filters,
    updateFilter,
  } = state;

  // Flatten nodes for the table breakdown
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

  // Step label lookup
  const stepLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of hierarchyConfig) {
      map.set(s.level, s.name);
    }
    return map;
  }, [hierarchyConfig]);

  return (
    <div className="space-y-6">
      {/* Header and Filter Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-700" />
            <h2 className="text-base font-bold text-foreground">
              Dynamic Hierarchy & Milestone Targets
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-level decomposition adapted dynamically to regional planning rules ({hierarchyConfig.length} configured depth tiers).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-white dark:bg-card border-border/80">
            {flattenedNodes.length} nodes displayed
          </Badge>
        </div>
      </div>

      {/* Target Achievement Chart for Current Scope */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="pb-4 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-600" />
            <span>Target Allocations vs Actual Delivery</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quantified delivery metrics for nodes at the currently selected depth scope.
          </p>
        </div>
        <div className="pt-4">
          <RegionalPlannedVsActualBarChart nodes={filteredTreeNodes} />
        </div>
      </div>

      {/* Tabular Node Breakdown */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="pb-4 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">
            Hierarchy Node Breakdown
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full inventory of hierarchical milestones, allocation weights, targets, and validated achievements.
          </p>
        </div>

        <div className="pt-4">
          {flattenedNodes.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No hierarchy nodes match your active filters or depth selection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Level & Step</th>
                    <th className="py-3 px-4">Milestone Title</th>
                    <th className="py-3 px-4">Target Unit</th>
                    <th className="py-3 px-4">Period Target / Actual</th>
                    <th className="py-3 px-4">Annual Target / Actual</th>
                    <th className="py-3 px-4">Achievement Progress</th>
                    <th className="py-3 px-4">Sharing</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {flattenedNodes.map((node) => {
                    const stepName = stepLabelMap.get(node.level || 1) || `Level ${node.level}`;
                    const statusDetails = getStatusBadgeDetails(node.status);
                    const progress = node.progress ?? 0;

                    return (
                      <tr key={node.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            L{node.level}: {stepName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground min-w-[200px]">
                          {node.title}
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
                          {node.period_target != null || node.period_actual != null ? (
                            <div className="space-y-0.5">
                              <span className="text-amber-700 font-medium">T: {node.period_target ?? "—"}</span>
                              <span className="mx-1 text-muted-foreground">/</span>
                              <span className="text-emerald-700 font-medium">A: {node.period_actual ?? "—"}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {node.annual_target != null || node.annual_actual != null ? (
                            <div className="space-y-0.5">
                              <span className="text-amber-700 font-medium">T: {node.annual_target ?? "—"}</span>
                              <span className="mx-1 text-muted-foreground">/</span>
                              <span className="text-emerald-700 font-medium">A: {node.annual_actual ?? "—"}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap min-w-[130px]">
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
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: node.sharingMode === "shared" ? REGIONAL_PALETTE.indigo.subtle : REGIONAL_PALETTE.slate.subtle,
                              color: node.sharingMode === "shared" ? REGIONAL_PALETTE.indigo.dark : REGIONAL_PALETTE.slate.dark,
                            }}
                          >
                            <GitBranch className="h-3 w-3" />
                            <span>{node.sharingMode === "shared" ? "Shared" : "Exclusive"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
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

