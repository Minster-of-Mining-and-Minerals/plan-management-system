"use client";

import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardPerformanceBar } from "./DashboardPerformanceBar";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";
import { hexToRgba } from "../utils/dashboardAppearanceUtils";

export interface LeaderboardEntry {
  id: string;
  title: string;
  subtitle?: string;
  value: number;
  valueLabel?: string;
  hasProgress?: boolean;
}

interface RankedLeaderboardProps {
  title: string;
  description?: string;
  entries: LeaderboardEntry[];
  className?: string;
}

export function RankedLeaderboard({
  title,
  description,
  entries,
  className,
}: RankedLeaderboardProps) {
  const { textPrimary, color } = useDashboardAppearance();
  const rankColors = [color("accent"), color("secondary"), color("info")];

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

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
          No ranked data available
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => {
            const rankColor = rankColors[index] ?? color("primary");
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-white to-gray-50/80 p-3"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
                  style={{
                    color: rankColor,
                    borderColor: hexToRgba(rankColor, 0.25),
                    backgroundColor: hexToRgba(rankColor, 0.1),
                  }}
                >
                  {index < 3 ? <Medal className="h-4 w-4" /> : index + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate" style={{ color: textPrimary }}>
                        {entry.title}
                      </p>
                      {entry.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {entry.subtitle}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-sm font-bold tabular-nums shrink-0"
                      style={{ color: rankColor }}
                    >
                      {entry.valueLabel ?? `${entry.value}%`}
                    </span>
                  </div>
                  {entry.hasProgress !== false && (
                    <DashboardPerformanceBar
                      value={entry.value}
                      showValue={false}
                      size="sm"
                      performancePercent={entry.value}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
