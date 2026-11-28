"use client";

import React, { useMemo, useState } from "react";
import { useGetShortTermAnalyticsQuery } from "@/redux/api/shortTermPlanApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Target,
  CheckCircle2,
  MessageSquareText,
  TrendingUp,
  Building2,
  Users,
  Search,
} from "lucide-react";

interface ShortTermDashboardTabProps {
  planId?: string;
  sectorId?: string;
  nameFilter?: string;
}

export function ShortTermDashboardTab({ planId, sectorId, nameFilter = "" }: ShortTermDashboardTabProps) {
  const { data: analytics, isLoading } = useGetShortTermAnalyticsQuery({
    planId: planId || undefined,
    government_structure_id: sectorId || undefined,
  });

  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [internalKpiSearch, setInternalKpiSearch] = useState("");

  const effectiveKpiSearch = (nameFilter || internalKpiSearch).trim().toLowerCase();

  const filteredAssignees = useMemo(() => {
    const list = analytics?.byAssignee || [];
    const q = (assigneeSearch || nameFilter).trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.assignee_name.toLowerCase().includes(q) ||
        a.sector_name.toLowerCase().includes(q) ||
        a.assignee_type.toLowerCase().includes(q)
    );
  }, [analytics?.byAssignee, assigneeSearch, nameFilter]);

  const filteredKpiProgress = useMemo(() => {
    const list = analytics?.kpiProgress || [];
    if (!effectiveKpiSearch) return list;
    return list.filter(
      (k) =>
        k.title.toLowerCase().includes(effectiveKpiSearch) ||
        k.code.toLowerCase().includes(effectiveKpiSearch) ||
        k.sector_name.toLowerCase().includes(effectiveKpiSearch)
    );
  }, [analytics?.kpiProgress, effectiveKpiSearch]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-slate-500">
          Loading short-term plan analytics...
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-slate-500">
          No analytics data available.
        </CardContent>
      </Card>
    );
  }

  const { overview, bySector, kpiProgress } = analytics;

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Short-Term KPIs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{overview.total_kpis}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {overview.total_assignments} cascading assignments
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Average Achievement</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {overview.avg_achievement_percent}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Against allocated targets</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Numeric Target Reports</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{overview.numeric_reports}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Out of {overview.total_reports} total submissions
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Narrative-Only Updates</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{overview.narrative_only_reports}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Modes: {overview.evaluation_mode_breakdown?.number ?? 0} Num /{" "}
                {overview.evaluation_mode_breakdown?.percentage ?? 0} % /{" "}
                {overview.evaluation_mode_breakdown?.frequency ?? 0} Freq
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <MessageSquareText className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sector Performance Chart + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Achievement &amp; Reporting by Sector
            </CardTitle>
            <CardDescription className="text-xs">
              Average target achievement (%) and total reports submitted per internal sector
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[290px] pt-2">
            {bySector.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No sector data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySector} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sector_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="avg_achievement_percent" name="Avg Achievement (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_reports" name="Total Reports" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sector Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Reporting breakdown across internal sectors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">KPIs</TableHead>
                  <TableHead className="text-right">Numeric</TableHead>
                  <TableHead className="text-right">Narrative</TableHead>
                  <TableHead className="text-right">Avg %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySector.map((s) => (
                  <TableRow key={s.government_structure_id}>
                    <TableCell className="font-medium text-xs">{s.sector_name}</TableCell>
                    <TableCell className="text-right text-xs">{s.kpi_count}</TableCell>
                    <TableCell className="text-right text-xs">{s.numeric_reports}</TableCell>
                    <TableCell className="text-right text-xs">{s.narrative_only_reports}</TableCell>
                    <TableCell className="text-right text-xs font-semibold text-emerald-700">
                      {s.avg_achievement_percent}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Department / User Performance Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Reporting by Assigned Department / User
              </CardTitle>
              <CardDescription className="text-xs">
                Tracks each department, desk, or user&apos;s submissions and achievement against allocated targets
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                placeholder="Filter department or user..."
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assigned Department / User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Assigned KPIs</TableHead>
                  <TableHead className="text-right">Numeric Reports</TableHead>
                  <TableHead className="text-right">Narrative Updates</TableHead>
                  <TableHead className="text-right">Achievement vs Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-slate-500 py-6">
                      No matching departments or users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignees.slice(0, 25).map((a) => (
                    <TableRow key={a.assignee_key}>
                      <TableCell className="font-medium text-xs">{a.assignee_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{a.assignee_type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{a.sector_name}</TableCell>
                      <TableCell className="text-right text-xs">{a.assigned_kpis}</TableCell>
                      <TableCell className="text-right text-xs">{a.numeric_reports}</TableCell>
                      <TableCell className="text-right text-xs">{a.narrative_only_reports}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${Math.min(100, a.avg_achievement_percent)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-800 w-10 text-right">
                            {a.avg_achievement_percent}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Per-KPI Achievement Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">KPI Achievement Against Target ({filteredKpiProgress.length} KPIs)</CardTitle>
              <CardDescription className="text-xs">
                Performance against target across quantitative and qualitative indicators
              </CardDescription>
            </div>
            {!nameFilter && (
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={internalKpiSearch}
                  onChange={(e) => setInternalKpiSearch(e.target.value)}
                  placeholder="Filter by KPI title, code, or sector..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>KPI Title</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Eval Mode</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Achieved</TableHead>
                  <TableHead className="text-right">Achievement %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKpiProgress.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                      No matching KPIs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKpiProgress.map((k) => (
                    <TableRow key={k.short_term_kpi_id}>
                      <TableCell className="font-mono text-xs">{k.code}</TableCell>
                      <TableCell className="text-xs max-w-md truncate" title={k.title}>{k.title}</TableCell>
                      <TableCell className="text-xs">{k.sector_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-[10px]">{k.evaluation_mode}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {k.total_target ?? "—"} ({k.unit})
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {k.achieved_actual !== null ? k.achieved_actual : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {k.achievement_percent !== null ? (
                          <span className="text-emerald-700 font-mono">{k.achievement_percent}%</span>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
