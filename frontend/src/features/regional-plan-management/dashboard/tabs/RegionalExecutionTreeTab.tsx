"use client";

import React, { useState } from "react";
import {
  ListTree,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Target,
  Sparkles,
  Calendar,
  Clock,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  REGIONAL_PALETTE,
  getStatusBadgeDetails,
} from "../RegionalDashboardAppearance";
import type { RegionalPlanDashboardState } from "../types";
import type { RegionalDashboardProgressNode } from "@/redux/types/regionalPlan";

interface RegionalExecutionTreeTabProps {
  state: RegionalPlanDashboardState;
}

interface TreeNodeItemProps {
  node: RegionalDashboardProgressNode;
  level: number;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  stepNames: Map<number, string>;
}

function TreeNodeItem({
  node,
  level,
  collapsed,
  onToggle,
  stepNames,
}: TreeNodeItemProps) {
  const isCollapsed = Boolean(collapsed[node.id]);
  const hasKids = Boolean(node.children && node.children.length > 0);
  const statusDetails = getStatusBadgeDetails(node.status);
  const stepName = stepNames.get(node.level || level) || `Level ${node.level || level}`;
  const progress = node.progress ?? 0;

  return (
    <div className="space-y-1">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all gap-2"
        style={{ marginLeft: `${Math.min(level - 1, 6) * 1.5}rem` }}
      >
        <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
          {hasKids ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              className="h-6 w-6 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5 sm:mt-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="h-6 w-6 shrink-0 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            </div>
          )}

          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                L{node.level || level}: {stepName}
              </span>
              <span className="font-semibold text-xs text-foreground truncate">
                {node.title}
              </span>
              {node.target_unit && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700 font-medium shrink-0">
                  {node.target_unit}
                </span>
              )}
            </div>

            {(node.period_target != null || node.annual_target != null) && (
              <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                {node.period_target != null && (
                  <span>
                    Period: <strong className="text-amber-700">{node.period_target}</strong> (Act: <strong className="text-emerald-700">{node.period_actual ?? 0}</strong>)
                  </span>
                )}
                {node.annual_target != null && (
                  <span>
                    Annual: <strong className="text-amber-700">{node.annual_target}</strong> (Act: <strong className="text-emerald-700">{node.annual_actual ?? 0}</strong>)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {/* Progress Bar */}
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-[10px] font-medium">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor: REGIONAL_PALETTE.emerald.DEFAULT,
                }}
              />
            </div>
          </div>

          {/* Status Badge */}
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: statusDetails.bg,
              color: statusDetails.text,
            }}
          >
            {statusDetails.label}
          </span>
        </div>
      </div>

      {!isCollapsed && hasKids && (
        <div className="space-y-1">
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              stepNames={stepNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RegionalExecutionTreeTab({ state }: RegionalExecutionTreeTabProps) {
  const {
    filteredTreeNodes,
    currentPeriodLabel,
    currentPeriodPhase,
    currentPlanningYear,
    hierarchyConfig,
  } = state;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    setCollapsed({});
  };

  const collapseAll = () => {
    const allIds: Record<string, boolean> = {};
    function collect(nodes: RegionalDashboardProgressNode[]) {
      for (const n of nodes) {
        if (n.children && n.children.length > 0) {
          allIds[n.id] = true;
          collect(n.children);
        }
      }
    }
    collect(filteredTreeNodes);
    setCollapsed(allIds);
  };

  const stepNames = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const s of hierarchyConfig) {
      map.set(s.level, s.name);
    }
    return map;
  }, [hierarchyConfig]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
            <ListTree className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Hierarchical Execution Tree
              </h2>
              {currentPeriodLabel && (
                <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                  {currentPeriodLabel}
                </Badge>
              )}
              {currentPeriodPhase && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  {currentPeriodPhase} Phase
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live recursive rollup tree across all configured levels of the regional planning framework.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={expandAll} className="h-8 text-xs">
            Expand All
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={collapseAll} className="h-8 text-xs">
            Collapse All
          </Button>
        </div>
      </div>

      {/* Interactive Tree View */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        {filteredTreeNodes.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
            No execution tree nodes found for this plan version or period.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredTreeNodes.map((node) => (
              <TreeNodeItem
                key={node.id}
                node={node}
                level={1}
                collapsed={collapsed}
                onToggle={toggleCollapse}
                stepNames={stepNames}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

