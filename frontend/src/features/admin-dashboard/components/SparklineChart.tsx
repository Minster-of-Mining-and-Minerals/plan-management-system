import React from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";

interface SparklineChartProps {
  data: Array<{ day?: string; value: number }>;
  color?: string;
  height?: number;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color = "#3b82f6",
  height = 32,
}) => {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart;
