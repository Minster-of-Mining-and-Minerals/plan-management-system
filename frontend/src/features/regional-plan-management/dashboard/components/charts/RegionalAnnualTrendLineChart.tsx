"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { REGIONAL_PALETTE } from "../../RegionalDashboardAppearance";

interface RegionalAnnualTrendLineChartProps {
  timeline: Array<{
    label: string;
    average_percent: number;
    plan_count: number;
  }>;
}

export function RegionalAnnualTrendLineChart({
  timeline,
}: RegionalAnnualTrendLineChartProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border/80 bg-muted/10 p-6 text-center text-xs text-muted-foreground">
        No annual timeline data available.
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={timeline}
          margin={{ top: 12, right: 16, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="regionalEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={REGIONAL_PALETTE.emerald.DEFAULT} stopOpacity={0.35} />
              <stop offset="95%" stopColor={REGIONAL_PALETTE.emerald.DEFAULT} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
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
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl border border-border bg-white p-2.5 shadow-md text-xs space-y-0.5">
                    <p className="font-semibold text-foreground">Year {label}</p>
                    <p className="text-emerald-700 font-medium">
                      Avg Execution: {item.average_percent}%
                    </p>
                    <p className="text-muted-foreground">
                      Active Cycles: {item.plan_count}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="average_percent"
            name="Execution Progress"
            stroke={REGIONAL_PALETTE.emerald.DEFAULT}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#regionalEmeraldGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

