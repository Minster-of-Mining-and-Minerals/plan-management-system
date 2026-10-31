"use client";

import React, { useMemo } from "react";
import { GitBranch, Share2, Shield, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { REGIONAL_PALETTE, getStatusBadgeDetails } from "../RegionalDashboardAppearance";
import type { RegionalPlanDashboardState } from "../types";

interface RegionalSharingAnalysisTabProps {
  state: RegionalPlanDashboardState;
}

export function RegionalSharingAnalysisTab({ state }: RegionalSharingAnalysisTabProps) {
  const { sharing, kpi } = state;

  const chartData = useMemo(() => {
    return [
      {
        name: "Shared Initiatives",
        value: sharing.shared.length,
        color: REGIONAL_PALETTE.indigo.DEFAULT,
      },
      {
        name: "Exclusive Directorate Initiatives",
        value: sharing.exclusive.length,
        color: REGIONAL_PALETTE.emerald.DEFAULT,
      },
    ];
  }, [sharing]);

  const total = sharing.shared.length + sharing.exclusive.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center shrink-0">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Cross-Directorate Sharing & Collaborative Initiatives
            </h2>
            <p className="text-xs text-muted-foreground">
              Analysis of shared strategic pillars versus exclusive department programs across the region.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs self-start sm:self-auto">
          {kpi.sharedPlans} Shared / {kpi.exclusivePlans} Exclusive Plans
        </Badge>
      </div>

      {/* Two Column Grid: Distribution Donut + Summary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sharing Distribution Donut */}
        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
          <div className="pb-4 border-b border-border/60">
            <h3 className="font-semibold text-foreground text-sm">
              Sharing Mode Distribution
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Proportion of shared multi-directorate root goals.
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center justify-center">
            {total === 0 ? (
              <div className="py-12 text-xs text-muted-foreground">No initiatives found.</div>
            ) : (
              <>
                <div className="relative w-48 h-48">
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
                        innerRadius={52}
                        outerRadius={74}
                        paddingAngle={4}
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
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Roots</span>
                  </div>
                </div>

                <div className="w-full space-y-2 mt-4 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                    <div className="flex items-center gap-2 text-indigo-900 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                      <span>Shared Programs</span>
                    </div>
                    <span className="font-bold text-indigo-900">{sharing.shared.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-900 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      <span>Exclusive Departmental</span>
                    </div>
                    <span className="font-bold text-emerald-900">{sharing.exclusive.length}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detailed Initiatives List */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
          <div className="pb-4 border-b border-border/60">
            <h3 className="font-semibold text-foreground text-sm">
              Cross-Directorate Initiatives Breakdown
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Strategic pillars shared across multiple administrative units.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            {sharing.shared.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No cross-directorate shared programs configured for this selection.
              </div>
            ) : (
              sharing.shared.map((item) => {
                const statusDetails = getStatusBadgeDetails(item.status);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-border/70 hover:border-indigo-400/50 hover:bg-indigo-50/10 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span className="font-semibold text-xs text-foreground truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>Multi-directorate allocation</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-foreground">{item.progress}%</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: statusDetails.bg,
                          color: statusDetails.text,
                        }}
                      >
                        {statusDetails.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

