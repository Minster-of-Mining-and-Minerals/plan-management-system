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
import type { RegionalDashboardDepartment } from "@/redux/types/regionalPlan";

interface RegionalDirectorateComparisonBarChartProps {
  departments: RegionalDashboardDepartment[];
}

export function RegionalDirectorateComparisonBarChart({
  departments,
}: RegionalDirectorateComparisonBarChartProps) {
  const chartData = useMemo(() => {
    return departments.map((d) => {
      const truncatedName = d.name.length > 20 ? d.name.slice(0, 18) + "…" : d.name;
      return {
        id: d.id,
        name: truncatedName,
        fullName: d.name,
        progress: d.progress ?? d.avg_progress ?? 0,
        assignedCount: d.assignedNodeCount ?? d.assigned_nodes_count ?? 0,
        reportedCount: d.reportedNodeCount ?? d.reported_nodes_count ?? 0,
      };
    });
  }, [departments]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border/80 bg-muted/10 p-6 text-center text-xs text-muted-foreground">
        No directorate metrics available.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 16, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl border border-border bg-white p-3 shadow-md text-xs space-y-1">
                    <p className="font-semibold text-foreground">{item.fullName}</p>
                    <p className="text-emerald-700 font-medium">
                      Achievement Score: {item.progress}%
                    </p>
                    <p className="text-slate-600 font-medium">
                      Assigned Milestones: {item.assignedCount}
                    </p>
                    <p className="text-teal-700 font-medium">
                      Reported Milestones: {item.reportedCount}
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
            name="Achievement Score (%)"
            dataKey="progress"
            fill={REGIONAL_PALETTE.emerald.DEFAULT}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

