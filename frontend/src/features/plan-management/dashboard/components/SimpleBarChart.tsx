"use client";

import { cn } from "@/lib/utils";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

export interface SimpleBarChartItem {
  label: string;
  value: number;
  subtitle?: string;
  color?: string;
}

interface SimpleBarChartProps {
  title: string;
  description?: string;
  items: SimpleBarChartItem[];
  valueSuffix?: string;
  className?: string;
  height?: number;
  /** Color bars from performance thresholds when values represent achievement %. */
  colorMode?: "performance" | "branding" | "item";
  color?: string;
}

export function SimpleBarChart({
  title,
  description,
  items,
  valueSuffix = "%",
  className,
  height = 220,
  colorMode = "performance",
  color,
}: SimpleBarChartProps) {
  const { performanceColor, chartPalette, color: brandingColor, textPrimary } =
    useDashboardAppearance();
  const maxValue = Math.max(100, ...items.map((item) => item.value));
  const fallbackColor = color ?? brandingColor("primary");

  return (
    <div className={cn("rounded-xl border bg-white p-5 shadow-sm overflow-hidden", className)}>
      <div className="mb-4">
        <h3 className="font-semibold" style={{ color: textPrimary }}>
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      {items.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground"
          style={{ height }}
        >
          No execution data yet
        </div>
      ) : (
        <div className="space-y-3" style={{ minHeight: height }}>
          {items.map((item, index) => {
            const barColor =
              item.color ??
              (colorMode === "performance" && valueSuffix === "%"
                ? performanceColor(item.value)
                : colorMode === "branding"
                  ? chartPalette[index % chartPalette.length]
                  : fallbackColor);

            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium truncate" style={{ color: textPrimary }}>
                    {item.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    {item.value}
                    {valueSuffix}
                    {item.subtitle ? ` · ${item.subtitle}` : ""}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted/80 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(0, Math.min(100, (item.value / maxValue) * 100))}%`,
                      background: `linear-gradient(90deg, ${barColor}dd, ${barColor})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
