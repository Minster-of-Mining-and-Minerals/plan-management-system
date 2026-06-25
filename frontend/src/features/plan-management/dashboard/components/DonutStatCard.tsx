"use client";

import { cn } from "@/lib/utils";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutStatCardProps {
  title: string;
  description?: string;
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
  size?: number;
}

export function DonutStatCard({
  title,
  description,
  segments,
  centerLabel,
  centerValue,
  className,
  size = 140,
}: DonutStatCardProps) {
  const { textPrimary } = useDashboardAppearance();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const arcs = segments.reduce<Array<{ segment: DonutSegment; offset: number; length: number }>>(
    (acc, segment) => {
      const length = total > 0 ? (segment.value / total) * circumference : 0;
      const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
      acc.push({ segment, offset, length });
      return acc;
    },
    []
  );

  return (
    <div className={cn("rounded-xl border bg-white p-5 shadow-sm", className)}>
      <div className="mb-4">
        <h3 className="font-semibold" style={{ color: textPrimary }}>
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      {total <= 0 ? (
        <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No data yet
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                className="text-muted/60"
              />
              {arcs.map(({ segment, offset, length }) => (
                <circle
                  key={segment.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
              {centerValue != null && (
                <span className="text-2xl font-bold tabular-nums" style={{ color: textPrimary }}>
                  {centerValue}
                </span>
              )}
              {centerLabel && (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {centerLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-2.5 w-full">
            {segments.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="truncate" style={{ color: textPrimary }}>
                    {segment.label}
                  </span>
                </div>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {segment.value}
                  {total > 0 && (
                    <span className="text-xs ml-1">
                      ({Math.round((segment.value / total) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
