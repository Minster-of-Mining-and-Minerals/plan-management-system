"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { REGIONAL_PALETTE } from "../../RegionalDashboardAppearance";

interface RegionalPerformanceClassificationChartProps {
  distribution: {
    excellent: number;
    good: number;
    average: number;
    at_risk: number;
  };
}

export function RegionalPerformanceClassificationChart({
  distribution,
}: RegionalPerformanceClassificationChartProps) {
  const chartData = useMemo(() => {
    return [
      {
        name: "Excellent (≥85%)",
        shortName: "Excellent",
        value: distribution.excellent || 0,
        color: REGIONAL_PALETTE.emerald.DEFAULT,
        bgColor: REGIONAL_PALETTE.emerald.subtle,
      },
      {
        name: "Good (70-84%)",
        shortName: "Good",
        value: distribution.good || 0,
        color: REGIONAL_PALETTE.teal.DEFAULT,
        bgColor: REGIONAL_PALETTE.teal.subtle,
      },
      {
        name: "Average (50-69%)",
        shortName: "Average",
        value: distribution.average || 0,
        color: REGIONAL_PALETTE.amber.DEFAULT,
        bgColor: REGIONAL_PALETTE.amber.subtle,
      },
      {
        name: "At-Risk (<50%)",
        shortName: "At-Risk",
        value: distribution.at_risk || 0,
        color: REGIONAL_PALETTE.rose.DEFAULT,
        bgColor: REGIONAL_PALETTE.rose.subtle,
      },
    ];
  }, [distribution]);

  const total = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

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
              data={chartData.filter((d) => d.value > 0)}
              innerRadius={50}
              outerRadius={74}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData
                .filter((d) => d.value > 0)
                .map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Nodes</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 w-full pr-2 text-xs">
        {chartData.map((item) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div
              key={item.name}
              className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-foreground">{item.shortName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{item.value}</span>
                <span className="text-[10px] text-muted-foreground">({percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

