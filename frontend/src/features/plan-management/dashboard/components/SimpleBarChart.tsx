"use client";

import { cn } from "@/lib/utils";

export interface SimpleBarChartItem {
  label: string;
  value: number;
  subtitle?: string;
}

interface SimpleBarChartProps {
  title: string;
  description?: string;
  items: SimpleBarChartItem[];
  valueSuffix?: string;
  className?: string;
  height?: number;
  color?: string;
}

export function SimpleBarChart({
  title,
  description,
  items,
  valueSuffix = "%",
  className,
  height = 220,
  color = "#073954",
}: SimpleBarChartProps) {
  const maxValue = Math.max(100, ...items.map((item) => item.value));

  return (
    <div className={cn("rounded-xl border bg-white p-5 shadow-sm", className)}>
      <div className="mb-4">
        <h3 className="font-semibold text-golden-dark">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      {items.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
          style={{ height }}
        >
          No execution data yet
        </div>
      ) : (
        <div className="space-y-3" style={{ minHeight: height }}>
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-golden-dark truncate">{item.label}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {item.value}
                  {valueSuffix}
                  {item.subtitle ? ` · ${item.subtitle}` : ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, (item.value / maxValue) * 100))}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
