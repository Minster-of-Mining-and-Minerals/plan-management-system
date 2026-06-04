"use client";

import { BarChart3, LineChart, PieChart, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

type ChartVariant = "line" | "bar" | "pie" | "heatmap";

const VARIANT_META: Record<
  ChartVariant,
  { icon: typeof LineChart; label: string; bars: number }
> = {
  line: { icon: LineChart, label: "Line Chart", bars: 8 },
  bar: { icon: BarChart3, label: "Bar Chart", bars: 6 },
  pie: { icon: PieChart, label: "Pie Chart", bars: 0 },
  heatmap: { icon: Grid3X3, label: "Heatmap", bars: 12 },
};

interface ChartPlaceholderProps {
  title: string;
  description?: string;
  variant?: ChartVariant;
  className?: string;
  height?: number;
}

export function ChartPlaceholder({
  title,
  description,
  variant = "bar",
  className,
  height = 220,
}: ChartPlaceholderProps) {
  const meta = VARIANT_META[variant];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-golden-dark">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div
        className="relative flex items-end justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/80 to-white px-4 pb-4"
        style={{ height }}
      >
        {variant === "pie" ? (
          <div className="flex h-full items-center justify-center">
            <div className="relative h-28 w-28 rounded-full border-[10px] border-golden-dark/20 border-t-golden-dark border-r-emerald-400/60" />
          </div>
        ) : variant === "heatmap" ? (
          <div className="grid w-full grid-cols-6 gap-1 pt-6">
            {Array.from({ length: meta.bars }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-sm"
                style={{
                  backgroundColor: `rgba(7, 57, 84, ${0.15 + (i % 4) * 0.15})`,
                }}
              />
            ))}
          </div>
        ) : (
          <>
            {Array.from({ length: meta.bars }).map((_, i) => (
              <div
                key={i}
                className="w-full max-w-[28px] rounded-t-sm bg-primary/70"
                style={{ height: `${30 + ((i * 17) % 60)}%` }}
              />
            ))}
          </>
        )}
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-muted-foreground">
          {meta.label} — connect data source
        </span>
      </div>
    </div>
  );
}
