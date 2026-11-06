"use client";

import React, { useMemo } from "react";
import {
  Users,
  Award,
  ArrowRight,
  UserCheck,
  TrendingUp,
  Target,
  FileCheck2,
  Filter,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import {
  REGIONAL_PALETTE,
  hexToRgba,
  getPerformanceBadgeDetails,
} from "../RegionalDashboardAppearance";
import type { RegionalPlanDashboardState } from "../types";

interface RegionalAssigneesTabProps {
  state: RegionalPlanDashboardState;
}

export function RegionalAssigneesTab({ state }: RegionalAssigneesTabProps) {
  const { filteredUsers, regionId, updateFilter, setActiveSection } = state;

  const handleFilterByUser = (userId: string) => {
    updateFilter("userId", userId);
    setActiveSection("hierarchy");
  };

  // Staff summary calculations
  const staffSummary = useMemo(() => {
    const users = filteredUsers;
    if (users.length === 0) {
      return {
        topUser: null,
        avgScore: 0,
        totalTarget: 0,
        totalActual: 0,
        remainingTarget: 0,
        avgCoverage: 0,
      };
    }

    const evaluable = users.filter((u) => u.achievementPercent !== null);
    const sorted = [...evaluable].sort((a, b) => (b.achievementPercent ?? 0) - (a.achievementPercent ?? 0));
    const topUser = sorted[0] || null;

    const avgScore =
      evaluable.length > 0
        ? Math.round(evaluable.reduce((s, u) => s + (u.achievementPercent ?? 0), 0) / evaluable.length)
        : 0;

    const totalTarget = users.reduce((s, u) => s + (u.total_target ?? 0), 0);
    const totalActual = users.reduce((s, u) => s + (u.total_actual ?? 0), 0);
    const remainingTarget = Math.max(0, totalTarget - totalActual);

    const totalCov = users.reduce((s, u) => s + (u.reporting_completion ?? 0), 0);
    const avgCoverage = Math.round(totalCov / users.length);

    return {
      topUser,
      avgScore,
      totalTarget,
      totalActual,
      remainingTarget,
      avgCoverage,
    };
  }, [filteredUsers]);

  // Top 4 performers for leaderboard cards
  const topPerformers = useMemo(() => {
    return [...filteredUsers]
      .filter((u) => u.achievementPercent !== null)
      .sort((a, b) => (b.achievementPercent ?? 0) - (a.achievementPercent ?? 0))
      .slice(0, 4);
  }, [filteredUsers]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Regional Staff & Assignee Performance
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct accountability metrics, individual milestone allocations, and validated delivery rates against 100%.
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

      {/* 2. Staff Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Top Performer */}
        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Top Assignee
            </span>
            <Award className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-foreground truncate mt-1">
            {staffSummary.topUser?.name || "—"}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {staffSummary.topUser ? `${staffSummary.topUser.achievementPercent}% of 100%` : "—"}
          </p>
        </div>

        {/* Avg Achievement */}
        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Average Score
            </span>
            <TrendingUp className="h-4 w-4 text-teal-700" />
          </div>
          <div className="text-xl font-bold text-teal-800 dark:text-teal-300 mt-1">
            {staffSummary.avgScore}% of 100%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Across {filteredUsers.length} staff members
          </p>
        </div>

        {/* Target vs Actual */}
        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Targets Delivered
            </span>
            <Target className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">
            {staffSummary.totalActual.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            / {staffSummary.totalTarget.toLocaleString()} planned
          </p>
        </div>

        {/* Reporting Coverage */}
        <div className="p-4 rounded-2xl border border-border/80 bg-white dark:bg-card shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Reporting Rate
            </span>
            <FileCheck2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-800 dark:text-indigo-300 mt-1">
            {staffSummary.avgCoverage}% of 100%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Submission compliance
          </p>
        </div>
      </div>

      {/* 3. Top Performers Leaderboard Cards */}
      {topPerformers.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
          <div className="pb-3 border-b border-border/60">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Leading Assignee Scorecard</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top registered regional personnel delivering assigned strategic targets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
            {topPerformers.map((u, idx) => {
              const perfDetails = getPerformanceBadgeDetails(u.performance);
              return (
                <div
                  key={u.id}
                  className="p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="h-6 w-6 rounded-full bg-emerald-500/15 text-emerald-800 text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: perfDetails.bgColor,
                        color: perfDetails.textColor,
                      }}
                    >
                      {u.achievementPercent}% of 100%
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground truncate">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.departmentName}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex justify-between pt-1 border-t border-border/50">
                    <span>Assigned: {u.assignedNodeCount}</span>
                    <span className="font-semibold text-emerald-700">{u.reportedNodeCount} reported</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Staff User Performance Table */}
      <div className="rounded-2xl border border-border/80 bg-white dark:bg-card p-5 shadow-xs">
        <div className="pb-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              Personnel Achievement Registry
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirmed progress ratings across all registered regional staff members.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredUsers.length} Assignees
          </Badge>
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
                    <th className="py-3 px-4">Allocated Target / Actual</th>
                    <th className="py-3 px-4">Assigned Depth</th>
                    <th className="py-3 px-4">Reporting Coverage</th>
                    <th className="py-3 px-4">Achievement Score</th>
                    <th className="py-3 px-4">Performance Tier</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((u) => {
                    const perfDetails = getPerformanceBadgeDetails(u.performance);
                    const deliveryRate =
                      u.reporting_completion ??
                      (u.assignedNodeCount > 0 ? Math.round((u.reportedNodeCount / u.assignedNodeCount) * 100) : 0);
                    const target = u.total_target ?? 0;
                    const actual = u.total_actual ?? 0;

                    return (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {u.name?.charAt(0) || "U"}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{u.name}</div>
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
                        <td className="py-3 px-4 whitespace-nowrap">
                          {target > 0 || actual > 0 ? (
                            <div className="space-y-0.5">
                              <span className="text-foreground font-semibold">{actual.toLocaleString()}</span>
                              <span className="mx-1 text-muted-foreground">/</span>
                              <span className="text-muted-foreground">{target.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[10px] text-muted-foreground">
                            {u.assigned_sfs || 0} SF · {u.assigned_goals || 0} Goals · {u.assigned_kpis || 0} KPIs · {u.assigned_tasks || 0} Tasks
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-muted-foreground">{deliveryRate}% of 100%</span>
                        </td>
                        <td className="py-3 px-4 min-w-[130px]">
                          {u.achievementPercent !== null ? (
                            <div className="space-y-1">
                              <span className="font-semibold text-foreground">
                                {u.achievementPercent}% of 100%
                              </span>
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
                        <td className="py-3 px-4 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleFilterByUser(u.id)}
                            className="h-7 text-[11px] gap-1"
                          >
                            <Filter className="h-3 w-3" />
                            <span>Filter</span>
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
