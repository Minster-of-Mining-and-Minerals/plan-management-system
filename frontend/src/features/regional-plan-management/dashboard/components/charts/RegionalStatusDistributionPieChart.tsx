"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { REGIONAL_PALETTE } from "../../RegionalDashboardAppearance";

interface RegionalStatusDistributionPieChartProps {
  distribution: {
    active: number;
    completed: number;
    delayed: number;
    draft: number;
  };
}

export function RegionalStatusDistributionPieChart({
  distribution,
}: RegionalStatusDistributionPieChartProps) {
  const chartData = useMemo(() => {
    const raw = [
      { name: "Active Execution", value: distribution.active || 0, color: REGIONAL_PALETTE.teal.DEFAULT },
      { name: "Completed", value: distribution.completed || 0, color: REGIONAL_PALETTE.emerald.DEFAULT },
      { name: "Delayed", value: distribution.delayed || 0, color: REGIONAL_PALETTE.rose.DEFAULT },
      { name: "Draft / In Prep", value: distribution.draft || 0, color: REGIONAL_PALETTE.slate.DEFAULT },
    ];
    return raw.filter((d) => d.value > 0);
  }, [distribution]);

  const total = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-xs text-muted-foreground border border-dashed rounded-xl">
        No active status records found.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full h-64">
      <div className="relative w-48 h-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  const percent = total > 0 ? Math.round(((Number(data.value) || 0) / total) * 100) : 0;
                  return (
                    <div className="rounded-lg border border-border bg-white px-3 py-1.5 shadow-md text-xs">
                      <span className="font-semibold">{data.name}:</span> {data.value} ({percent}%)
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={chartData}
              innerRadius={52}
              outerRadius={74}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Cycles</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full pr-2 text-xs">
        {chartData.map((item) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-semibold text-foreground">
                {item.value} <span className="text-[10px] text-muted-foreground">({percent}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

