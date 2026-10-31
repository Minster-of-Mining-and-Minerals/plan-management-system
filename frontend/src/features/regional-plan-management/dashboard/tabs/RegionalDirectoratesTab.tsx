"use client";

import React from "react";
import { Building2, ArrowRight, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { REGIONAL_PALETTE, getStatusBadgeDetails } from "../RegionalDashboardAppearance";
import { RegionalDirectorateComparisonBarChart } from "../components/charts/RegionalDirectorateComparisonBarChart";
import type { RegionalPlanDashboardState } from "../types";

interface RegionalDirectoratesTabProps {
  state: RegionalPlanDashboardState;
}

export function RegionalDirectoratesTab({ state }: RegionalDirectoratesTabProps) {
  const { filteredDepartments, regionId } = state;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Regional Directorates & Performance Scorecards
            </h2>
            <p className="text-xs text-muted-foreground">
              Organizational unit delivery, assigned milestone coverage, and confirmed achievement metrics.
            </p>
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0">
          <Link href={`/regions/${regionId}/departments`}>
            <span>Manage Departments</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Directorate Comparison Chart */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="pb-4 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">
            Directorate Performance Comparison
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Confirmed progress score across all regional bureaus and directorates.
          </p>
        </div>
        <div className="pt-4">
          <RegionalDirectorateComparisonBarChart departments={filteredDepartments} />
        </div>
      </div>

      {/* Directorate Table */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="pb-4 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">
            Directorate Scorecard Table
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detailed breakdown of assigned targets, reported milestones, and achievement percentages.
          </p>
        </div>

        <div className="pt-4">
          {filteredDepartments.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No regional directorates found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Directorate / Unit</th>
                    <th className="py-3 px-4">Hierarchy Level</th>
                    <th className="py-3 px-4">Assigned Milestones</th>
                    <th className="py-3 px-4">Reported Milestones</th>
                    <th className="py-3 px-4">Coverage</th>
                    <th className="py-3 px-4">Achievement Progress</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDepartments.map((dept) => {
                    const assigned = dept.assignedNodeCount ?? dept.assigned_nodes_count ?? 0;
                    const reported = dept.reportedNodeCount ?? dept.reported_nodes_count ?? 0;
                    const coverage = assigned > 0 ? Math.round((reported / assigned) * 100) : 0;
                    const progress = dept.progress ?? dept.avg_progress ?? 0;
                    const statusDetails = getStatusBadgeDetails(dept.status);

                    return (
                      <tr key={dept.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          {dept.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            Level {dept.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-foreground font-semibold">
                          {assigned}
                        </td>
                        <td className="py-3 px-4 text-foreground font-semibold">
                          {reported}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-muted-foreground">{coverage}%</span>
                        </td>
                        <td className="py-3 px-4 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-medium">
                              <span className="text-foreground">{progress}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(0, progress))}%`,
                                  backgroundColor: REGIONAL_PALETTE.emerald.DEFAULT,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: statusDetails.bg,
                              color: statusDetails.text,
                            }}
                          >
                            {statusDetails.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] gap-1">
                            <Link href={`/regions/${regionId}/departments/${dept.id}`}>
                              <span>Details</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

