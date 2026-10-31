"use client";

import React from "react";
import { Users, Award, ArrowRight, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import {
  REGIONAL_PALETTE,
  getPerformanceBadgeDetails,
} from "../RegionalDashboardAppearance";
import type { RegionalPlanDashboardState } from "../types";

interface RegionalAssigneesTabProps {
  state: RegionalPlanDashboardState;
}

export function RegionalAssigneesTab({ state }: RegionalAssigneesTabProps) {
  const { filteredUsers, regionId } = state;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Regional Staff & Assignee Performance
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct accountability metrics, individual task allocations, and milestone delivery rates.
            </p>
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0">
          <Link href={`/regions/${regionId}/users`}>
            <span>Manage Staff</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Staff User Performance Table */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="pb-4 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">
            Personnel Achievement Registry
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Confirmed progress ratings across all registered regional staff members.
          </p>
        </div>

        <div className="pt-4">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No staff members found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role & Directorate</th>
                    <th className="py-3 px-4">Assigned Milestones</th>
                    <th className="py-3 px-4">Reported Milestones</th>
                    <th className="py-3 px-4">Delivery Rate</th>
                    <th className="py-3 px-4">Achievement Score</th>
                    <th className="py-3 px-4">Performance Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((u) => {
                    const perfDetails = getPerformanceBadgeDetails(u.performance);
                    const deliveryRate =
                      u.assignedNodeCount > 0
                        ? Math.round((u.reportedNodeCount / u.assignedNodeCount) * 100)
                        : 0;

                    return (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {u.name?.charAt(0) || "U"}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{u.name}</div>
                              <div className="text-[10px] text-muted-foreground">{u.email || "No email"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{u.role}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {u.departmentName || "Unassigned"}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {u.assignedNodeCount}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {u.reportedNodeCount}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-muted-foreground">{deliveryRate}%</span>
                        </td>
                        <td className="py-3 px-4 min-w-[120px]">
                          {u.achievementPercent !== null ? (
                            <div className="space-y-1">
                              <span className="font-semibold text-foreground">{u.achievementPercent}%</span>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, u.achievementPercent))}%`,
                                    backgroundColor: perfDetails.color,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: perfDetails.bgColor,
                              color: perfDetails.textColor,
                              borderColor: perfDetails.borderColor,
                            }}
                          >
                            {perfDetails.label}
                          </span>
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

