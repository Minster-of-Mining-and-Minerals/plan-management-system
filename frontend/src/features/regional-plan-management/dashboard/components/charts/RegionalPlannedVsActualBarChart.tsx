"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { REGIONAL_PALETTE } from "../../RegionalDashboardAppearance";
import type { RegionalDashboardProgressNode } from "@/redux/types/regionalPlan";

interface RegionalPlannedVsActualBarChartProps {
  nodes: RegionalDashboardProgressNode[];
  levelTitle?: string;
}

export function RegionalPlannedVsActualBarChart({
  nodes,
  levelTitle = "Milestones & Targets",
}: RegionalPlannedVsActualBarChartProps) {
  const chartData = useMemo(() => {
    // Collect leaf or target-bearing nodes from the tree
    const targetNodes: Array<{
      name: string;
      planned: number;
      actual: number;
      unit: string;
      progress: number;
    }> = [];

    function collect(list: RegionalDashboardProgressNode[]) {
      for (const n of list) {
        const planned = Number(n.period_target ?? n.annual_target ?? n.weight) || 0;
        const actual = Number(n.period_actual ?? n.annual_actual) || 0;
        if (planned > 0 || actual > 0) {
          const truncatedTitle = n.title.length > 22 ? n.title.slice(0, 20) + "…" : n.title;
          targetNodes.push({
            name: truncatedTitle,
            planned,
            actual,
            unit: n.target_unit || "Units",
            progress: n.progress,
          });
        }
        if (n.children && n.children.length > 0) {
          collect(n.children);
        }
      }
    }

    collect(nodes);
    return targetNodes.slice(0, 10); // top 10 for clean readable display
  }, [nodes]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border/80 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No target-bearing nodes at this selection</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a KPI level or a specific node with quantified target units.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 16, left: 0, bottom: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
            interval={0}
            angle={-18}
            textAnchor="end"
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl border border-border bg-white p-3 shadow-md text-xs space-y-1">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="text-amber-700 font-medium">
                      Planned: {item.planned} {item.unit}
                    </p>
                    <p className="text-emerald-700 font-medium">
                      Actual: {item.actual} {item.unit}
                    </p>
                    <p className="text-slate-600 font-medium">
                      Achievement: {item.progress}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
          />
          <Bar
            name="Planned Target"
            dataKey="planned"
            fill={REGIONAL_PALETTE.amber.DEFAULT}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            name="Actual Achieved"
            dataKey="actual"
            fill={REGIONAL_PALETTE.emerald.DEFAULT}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

