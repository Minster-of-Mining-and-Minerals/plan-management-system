"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetShortTermKpiDetailQuery,
  useSubmitShortTermReportMutation,
} from "@/redux/api/shortTermPlanApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetInternalStructuresQuery } from "@/redux/api/internalStructureApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { usePermissions } from "@/hooks/usePermissions";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import {
  LOCKED_STATUS_COLOR,
  resolveThresholdForPercentage,
} from "@/utils/performanceColorUtils";
import { PerformanceColorBadge } from "@/features/plan-management/components/PerformanceColorBadge";
import type {
  ShortTermDivision,
  ShortTermKpiAssignment,
  ShortTermMonthlyGroup,
  ShortTermSubmissionType,
} from "@/redux/types/shortTermPlan";
import { AssignShortTermKpiModal } from "./AssignShortTermKpiModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LabeledAttachmentInput,
  type LabeledAttachmentItem,
} from "@/components/ui/labeled-attachment-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  GitBranch,
  Layers,
  Lock,
  MessageSquareText,
  Target,
  TrendingUp,
  Unlock,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface ShortTermKpiDetailViewProps {
  kpiId: string;
}

function getLockBadge(lockStatus?: "open" | "upcoming" | "closed") {
  if (lockStatus === "open") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 gap-1 text-[10px]">
        <Unlock className="h-3 w-3" />
        Open
      </Badge>
    );
  }
  if (lockStatus === "upcoming") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 gap-1 text-[10px]">
        <Clock className="h-3 w-3" />
        Upcoming (Locked)
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 gap-1 text-[10px]">
      <Lock className="h-3 w-3" />
      Closed (Locked)
    </Badge>
  );
}

export function ShortTermKpiDetailView({ kpiId }: ShortTermKpiDetailViewProps) {
  const router = useRouter();
  const { check } = usePermissions();
  const thresholds = usePerformanceColorThresholds();

  const canAssign = check({ anyPermissions: ["SHORT_TERM_PLAN:ASSIGN"] });
  const canReportPerm = check({ anyPermissions: ["SHORT_TERM_PLAN:REPORT", "SHORT_TERM_PLAN:CREATE"] });

  const { data: kpi, isLoading, isError, refetch } = useGetShortTermKpiDetailQuery(kpiId);
  const [submitReport, { isLoading: isSubmitting }] = useSubmitShortTermReportMutation();

  const { data: sectors = [] } = useGetGovernmentStructuresQuery({ is_active: true });
  const { data: internalDepts = [] } = useGetInternalStructuresQuery({ is_active: true });
  const { data: users = [] } = useGetUsersQuery({ limit: 200 });

  const [activeTab, setActiveTab] = useState<"status" | "report">("status");
  const [selectedAssignmentIdx, setSelectedAssignmentIdx] = useState(0);
  const [selectedMonthLabel, setSelectedMonthLabel] = useState<string | null>(null);
  const [reportingDivision, setReportingDivision] = useState<ShortTermDivision | null>(null);
  const [submissionType, setSubmissionType] = useState<ShortTermSubmissionType>("actual_and_narrative");
  const [reportedActual, setReportedActual] = useState<string>("");
  const [narrative, setNarrative] = useState<string>("");
  const [evidenceAttachments, setEvidenceAttachments] = useState<LabeledAttachmentItem[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const assignments = kpi?.assignments || [];
  const activeAssignment: ShortTermKpiAssignment | null =
    assignments[selectedAssignmentIdx] || assignments[0] || null;

  const monthlyGroups: ShortTermMonthlyGroup[] = useMemo(
    () => activeAssignment?.monthly_groups || [],
    [activeAssignment]
  );

  const selectedMonth: ShortTermMonthlyGroup | null = useMemo(() => {
    if (!selectedMonthLabel) return null;
    return monthlyGroups.find((m) => m.period_label === selectedMonthLabel) || null;
  }, [monthlyGroups, selectedMonthLabel]);

  const monthlyChartData = useMemo(
    () =>
      monthlyGroups.map((m) => ({
        name: m.period_label,
        Target: m.month_target ?? 0,
        Actual: m.month_actual ?? 0,
        Achievement: m.achievement_percent ?? 0,
      })),
    [monthlyGroups]
  );

  const innerChartData = useMemo(() => {
    const source = selectedMonth ? selectedMonth.divisions : activeAssignment?.divisions || [];
    return source.map((d) => ({
      name: d.period_label,
      Target: d.planned_target ?? 0,
      Actual: d.report?.reported_actual ?? 0,
    }));
  }, [selectedMonth, activeAssignment]);

  const submittedDivisions = useMemo(() => {
    return (activeAssignment?.divisions || []).filter((d) => Boolean(d.report));
  }, [activeAssignment]);

  const getColorAppearance = (pct: number | null | undefined, hasData: boolean, isLocked?: boolean) => {
    if (hasData && pct !== null && pct !== undefined) {
      const th = resolveThresholdForPercentage(thresholds, pct);
      return {
        color: th?.color_hex || "#10B981",
        label: th?.label || `${pct}%`,
        hasBadge: true,
      };
    }
    if (isLocked) {
      return { color: LOCKED_STATUS_COLOR, label: "Locked", hasBadge: false };
    }
    return { color: "#10B981", label: "Open", hasBadge: false };
  };

  const openReportForm = (div: ShortTermDivision) => {
    setReportingDivision(div);
    setSubmissionType(div.report?.submission_type || div.recommended_submission_type || "actual_and_narrative");
    setReportedActual(
      div.report?.reported_actual !== null && div.report?.reported_actual !== undefined
        ? String(div.report.reported_actual)
        : ""
    );
    setNarrative(div.report?.narrative || "");
    setEvidenceAttachments(div.report?.evidence_attachments || []);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpi || !activeAssignment || !reportingDivision) return;

    if (submissionType === "actual_and_narrative" && reportedActual === "") {
      toast.error("Please enter the reported actual value");
      return;
    }

    if (evidenceAttachments.some((a) => !a.label.trim() || !a.description.trim())) {
      toast.error("Each attachment must include a display label and a description of its relation to the KPI.");
      return;
    }

    try {
      await submitReport({
        assignmentId: activeAssignment.assignment_id,
        planId: kpi.short_term_plan_id,
        period_label: reportingDivision.period_label,
        period_index: reportingDivision.period_index,
        submission_type: submissionType,
        reported_actual: submissionType === "actual_and_narrative" ? Number(reportedActual) : null,
        narrative,
        evidence_attachments: evidenceAttachments,
      }).unwrap();
      toast.success(`Report submitted for ${reportingDivision.period_label}`);
      setReportingDivision(null);
      refetch();
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || "Failed to submit report";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 w-full">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !kpi) {
    return (
      <div className="p-6 w-full">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-red-600 font-medium">Failed to load Short-Term KPI details.</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => router.push("/short-term-plan")}>
                Back to KPI List
              </Button>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = activeAssignment?.progress_summary;
  const effectiveTarget = summary?.allocated_target ?? kpi.total_target;
  const overallActual = summary?.overall_actual ?? 0;
  const overallAchievement = summary?.overall_achievement_percent ?? 0;
  const overallApp = getColorAppearance(
    summary?.overall_achievement_percent,
    (summary?.reported_count ?? 0) > 0,
    false
  );

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 -ml-2 text-slate-600"
              onClick={() => router.push("/short-term-plan")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to KPI List
            </Button>
            <Badge variant="outline" className="font-mono text-xs">
              {kpi.code}
            </Badge>
            <Badge className="capitalize bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
              {activeAssignment?.effective_frequency || kpi.reporting_frequency}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {summary?.effective_evaluation_mode || kpi.evaluation_mode}
            </Badge>
            {overallApp.hasBadge && (
              <PerformanceColorBadge color={overallApp.color} label={overallApp.label} variant="tint" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{kpi.title}</h1>
          {kpi.plan && (
            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>Plan: <strong className="text-slate-700">{kpi.plan.title}</strong></span>
              <span>•</span>
              <span>Calendar: <strong className="text-slate-700">{kpi.plan.calendar_system}</strong></span>
              {summary?.today_ec && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    Today (EC): {summary.today_ec}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {assignments.length > 1 && (
            <Select
              value={String(selectedAssignmentIdx)}
              onValueChange={(v) => {
                setSelectedAssignmentIdx(Number(v));
                setSelectedMonthLabel(null);
                setReportingDivision(null);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select Assignment" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a, idx) => (
                  <SelectItem key={a.assignment_id} value={String(idx)}>
                    {a.assignedUser?.full_name || a.department?.name || a.sector?.name || `Assignment ${idx + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {canAssign && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setIsAssignModalOpen(true)}
            >
              <GitBranch className="h-4 w-4 text-emerald-600" />
              {assignments.length > 0 ? "Update Assignment" : "Assign KPI"}
            </Button>
          )}
        </div>
      </div>

      {/* Two-Tab Navigation: Status & Report */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "status" | "report")} className="w-full space-y-5">
        <TabsList>
          <TabsTrigger value="status">
            <BarChart3 className="h-4 w-4" />
            Status &amp; Analytics
          </TabsTrigger>
          <TabsTrigger value="report">
            <FileText className="h-4 w-4" />
            Report (Cascaded Periods)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STATUS — Statistical Analysis, Assignment Hierarchy, Reporter Audit */}
        <TabsContent value="status" className="space-y-6">
          {/* Top KPI Summary & Assignment Hierarchy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Target className="h-3.5 w-3.5 text-blue-600" />
                  Target &amp; Unit
                </CardDescription>
                <CardTitle className="text-2xl font-mono">
                  {effectiveTarget !== null && effectiveTarget !== undefined ? effectiveTarget.toLocaleString() : "—"}
                  <span className="text-sm font-sans font-normal text-slate-500 ml-1.5">{kpi.unit}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                Target Mode: <span className="capitalize font-medium text-slate-700">{kpi.target_mode}</span>
              </CardContent>
            </Card>

            <Card
              style={{
                borderColor: `${overallApp.color}44`,
                backgroundColor: `${overallApp.color}08`,
              }}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: overallApp.color }} />
                    Reported Actual &amp; Achievement
                  </span>
                  {overallApp.hasBadge && (
                    <PerformanceColorBadge color={overallApp.color} label={overallApp.label} variant="tint" />
                  )}
                </CardDescription>
                <CardTitle className="text-2xl font-mono">
                  {overallActual !== null && overallActual !== undefined ? overallActual.toLocaleString() : "0"}
                  <span className="text-sm font-semibold ml-2" style={{ color: overallApp.color }}>
                    ({overallAchievement}%)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, overallAchievement))}%`,
                      backgroundColor: overallApp.color,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                  Reporting Progress
                </CardDescription>
                <CardTitle className="text-2xl font-mono">
                  {summary?.reported_count ?? 0} / {summary?.total_divisions ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 flex items-center gap-3">
                <span>Numeric: {summary?.numeric_reports_count ?? 0}</span>
                <span className="flex items-center gap-1">
                  <MessageSquareText className="h-3 w-3" />
                  Narrative: {summary?.narrative_only_count ?? 0}
                </span>
              </CardContent>
            </Card>

            <Card className="border-emerald-200/80 bg-emerald-50/30">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                    <Building2 className="h-3.5 w-3.5" />
                    Assigned Hierarchy
                  </span>
                  {activeAssignment && (
                    <Badge
                      variant="outline"
                      className={
                        activeAssignment.can_report
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]"
                          : "bg-slate-100 text-slate-600 border-slate-200 text-[10px]"
                      }
                    >
                      {activeAssignment.can_report ? "Reporter Access" : "View Only"}
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {activeAssignment ? (
                  <>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">
                        Sector: {activeAssignment.sector?.name || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Users className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        Dept: {activeAssignment.department?.name || "All / Sector-level"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <UserCheck className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        User: {activeAssignment.assignedUser?.full_name || "Any user in department"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-amber-700">Not assigned yet. Assign to a sector/department/user.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          {activeAssignment && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Monthly Target vs Actual</CardTitle>
                  <CardDescription>Aggregated planned targets and reported actuals per Ethiopian month</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  {monthlyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No monthly data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">All Reporting Periods Breakdown</CardTitle>
                  <CardDescription>Target vs actual across all reporting divisions</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  {innerChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={innerChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Target" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Actual" fill="#059669" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No period breakdown available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Submitted Reports & Reporter Audit Table */}
          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Submitted Reports &amp; Reporter History</CardTitle>
                  <CardDescription>
                    Detailed breakdown of who submitted each report, achievement rate, and narrative notes
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {submittedDivisions.length} Submission(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {submittedDivisions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No reports have been submitted for this assignment yet. Switch to the <strong>Report</strong> tab to submit data for open periods.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-semibold border-b">
                    <tr>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Reported Actual</th>
                      <th className="px-4 py-3">Achievement</th>
                      <th className="px-4 py-3">Submitted By</th>
                      <th className="px-4 py-3">Submitted At</th>
                      <th className="px-4 py-3">Narrative</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {submittedDivisions.map((div) => {
                      const rep = div.report!;
                      const app = getColorAppearance(rep.achievement_percent, true, false);
                      return (
                        <tr key={div.period_label} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {div.period_label}
                            <span className="block text-[10px] font-normal text-slate-400">
                              {div.display_start_date} → {div.display_end_date}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">{div.planned_target ?? "—"}</td>
                          <td className="px-4 py-3 font-mono font-bold" style={{ color: app.color }}>
                            {rep.reported_actual !== null && rep.reported_actual !== undefined
                              ? `${rep.reported_actual} ${kpi.unit}`
                              : "Narrative Only"}
                          </td>
                          <td className="px-4 py-3">
                            {rep.achievement_percent !== null && rep.achievement_percent !== undefined ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold" style={{ color: app.color }}>
                                  {rep.achievement_percent}%
                                </span>
                                <PerformanceColorBadge color={app.color} label={app.label} variant="tint" />
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-800 block">
                              {rep.submittedByUser?.full_name || "Unknown User"}
                            </span>
                            {rep.submittedByUser?.email && (
                              <span className="text-[10px] text-slate-400">{rep.submittedByUser.email}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                            {rep.submitted_at ? new Date(rep.submitted_at).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3 max-w-xs text-slate-600">
                            <div>{rep.narrative || "—"}</div>
                            {rep.evidence_attachments && rep.evidence_attachments.length > 0 && (
                              <div className="mt-1.5 space-y-1">
                                {rep.evidence_attachments.map((att, aIdx) => (
                                  <div
                                    key={aIdx}
                                    className="text-[10px] bg-slate-50 border rounded px-2 py-1"
                                  >
                                    <span className="font-semibold text-blue-700">{att.label}</span>
                                    <span className="text-slate-500 block">{att.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: REPORT — Plan-Draft-Style Cascaded Period Classification Cards (Unwrapped) */}
        <TabsContent value="report" className="space-y-4">
          {!activeAssignment ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-amber-700">
                This KPI has not been assigned to a sector/department/user yet.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    Reporting Period Divisions
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Colored by Plan Rule thresholds. Select a month division to drill down into weekly/daily reporting periods.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Button
                    variant={selectedMonth ? "ghost" : "secondary"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      setSelectedMonthLabel(null);
                      setReportingDivision(null);
                    }}
                  >
                    All Months ({monthlyGroups.length})
                  </Button>
                  {selectedMonth && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      <Badge variant="default" className="h-7 px-2.5">
                        {selectedMonth.period_label}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Top Overall Target & Selected Month Target Strip */}
              <Card
                className="border"
                style={{
                  borderColor: `${overallApp.color}44`,
                  backgroundColor: `${overallApp.color}0A`,
                }}
              >
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {kpi.plan?.title || "Short-Term Plan"} — Overall Target &amp; Achievement
                      </p>
                      <div className="flex items-baseline gap-3 mt-0.5">
                        <p className="text-2xl font-bold font-mono" style={{ color: overallApp.color }}>
                          {overallAchievement}%
                        </p>
                        <span className="text-xs font-mono text-slate-700">
                          Target: <strong>{effectiveTarget != null ? `${effectiveTarget.toLocaleString()} ${kpi.unit}` : "—"}</strong>
                          {" • "}
                          Reported: <strong>{overallActual.toLocaleString()} {kpi.unit}</strong>
                        </span>
                      </div>
                      {overallApp.hasBadge && (
                        <PerformanceColorBadge
                          color={overallApp.color}
                          label={overallApp.label}
                          className="mt-1.5 text-[10px] py-0 h-5"
                        />
                      )}
                    </div>

                    {selectedMonth && (
                      <div className="rounded-lg border bg-white/90 px-3.5 py-2 text-xs font-mono">
                        <span className="text-[10px] font-sans text-muted-foreground block">
                          Selected Month ({selectedMonth.period_label})
                        </span>
                        <span className="font-bold text-slate-900">
                          Target: {selectedMonth.month_target != null ? `${selectedMonth.month_target.toLocaleString()} ${kpi.unit}` : "—"}
                          {" • "}
                          Reported: {selectedMonth.month_actual != null ? `${selectedMonth.month_actual.toLocaleString()} ${kpi.unit}` : "0"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {!selectedMonth ? (
                /* Level 1: Month Division Cards (Plan-Draft Style, Unwrapped) */
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {monthlyGroups.map((month, idx) => {
                    const monthApp = getColorAppearance(
                      month.achievement_percent,
                      month.reported_count > 0 && month.month_actual !== null,
                      month.is_locked
                    );
                    const showProgress = month.reported_count > 0 && month.month_actual !== null;
                    return (
                      <Card
                        key={month.period_label}
                        onClick={() => setSelectedMonthLabel(month.period_label)}
                        className="relative flex flex-col overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
                        style={
                          month.is_locked && !showProgress
                            ? { borderColor: LOCKED_STATUS_COLOR }
                            : { borderColor: `${monthApp.color}55` }
                        }
                      >
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{
                            background: `linear-gradient(90deg, ${monthApp.color}, ${monthApp.color}55)`,
                          }}
                        />
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4 shrink-0" style={{ color: monthApp.color }} />
                                <span className="truncate">{month.period_label}</span>
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {month.display_start_date} → {month.display_end_date}
                              </CardDescription>
                            </div>
                            <PerformanceColorBadge
                              color={monthApp.color}
                              label={monthApp.hasBadge ? monthApp.label : month.lock_status === "open" ? "Open" : month.lock_status === "upcoming" ? "Upcoming" : "Closed"}
                              variant="solid"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground pt-1">
                            Month {idx + 1} of {monthlyGroups.length}
                          </p>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50/80 rounded-lg border p-2">
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Target</span>
                              <span className="font-semibold font-mono">
                                {month.month_target !== null ? month.month_target.toLocaleString() : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Actual</span>
                              <span className="font-semibold font-mono" style={{ color: monthApp.color }}>
                                {month.month_actual !== null ? month.month_actual.toLocaleString() : "0"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Achieved</span>
                              <span className="font-semibold font-mono" style={{ color: monthApp.color }}>
                                {month.achievement_percent !== null ? `${month.achievement_percent}%` : "—"}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(0, month.achievement_percent ?? 0))}%`,
                                  backgroundColor: monthApp.color,
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {month.reported_count} / {month.total_children} period(s)
                              </span>
                              <span className="text-emerald-700 font-medium inline-flex items-center gap-0.5">
                                Open <ChevronRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                /* Level 2: Inner Depth — Weeks / Days (Plan-Draft Style, Unwrapped) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{selectedMonth.period_label}</h3>
                      {getLockBadge(selectedMonth.lock_status)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMonthLabel(null);
                        setReportingDivision(null);
                      }}
                    >
                      <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                      Back to Months
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {selectedMonth.divisions.map((div, idx) => {
                      const isOpen = div.lock_status === "open";
                      const canUserSubmit = isOpen && Boolean(activeAssignment.can_report) && canReportPerm;
                      const divApp = getColorAppearance(
                        div.report?.achievement_percent,
                        Boolean(div.report && div.report.reported_actual !== null),
                        div.is_locked
                      );

                      return (
                        <Card
                          key={div.period_label}
                          className="relative flex flex-col overflow-hidden transition-shadow hover:shadow-md"
                          style={
                            div.is_locked
                              ? { borderColor: LOCKED_STATUS_COLOR }
                              : { borderColor: `${divApp.color}55` }
                          }
                        >
                          <div
                            className="absolute top-0 left-0 right-0 h-1"
                            style={{
                              background: `linear-gradient(90deg, ${divApp.color}, ${divApp.color}55)`,
                            }}
                          />
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Clock className="h-4 w-4 shrink-0" style={{ color: divApp.color }} />
                                  <span className="truncate">{div.period_label}</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {div.display_start_date} → {div.display_end_date}
                                </CardDescription>
                              </div>
                              <PerformanceColorBadge
                                color={divApp.color}
                                label={divApp.hasBadge ? divApp.label : div.lock_status === "open" ? "Open" : div.lock_status === "upcoming" ? "Upcoming" : "Closed"}
                                variant="solid"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground pt-1">
                              Period {idx + 1} of {selectedMonth.divisions.length}
                            </p>
                          </CardHeader>

                          <CardContent className="flex-1 space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50/80 rounded-lg border p-2">
                              <div>
                                <span className="text-muted-foreground block text-[10px]">Target</span>
                                <span className="font-semibold font-mono">{div.planned_target ?? "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px]">Actual</span>
                                <span className="font-semibold font-mono" style={{ color: divApp.color }}>
                                  {div.report?.reported_actual ?? "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px]">Achieved</span>
                                <span className="font-semibold font-mono" style={{ color: divApp.color }}>
                                  {div.report?.achievement_percent !== null && div.report?.achievement_percent !== undefined
                                    ? `${div.report.achievement_percent}%`
                                    : "—"}
                                </span>
                              </div>
                            </div>

                            {div.report?.narrative && (
                              <div className="text-xs bg-white rounded-md border p-2 text-slate-700">
                                <span className="font-medium text-slate-500 block text-[10px] mb-0.5">
                                  Narrative Update
                                </span>
                                {div.report.narrative}
                              </div>
                            )}

                            {div.is_locked && div.lock_reason && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                <Lock className="h-3 w-3 shrink-0" />
                                <span>{div.lock_reason}</span>
                              </div>
                            )}

                            {!div.is_locked && !activeAssignment.can_report && activeAssignment.access_reason && (
                              <div className="text-[11px] text-amber-700">{activeAssignment.access_reason}</div>
                            )}

                            {canUserSubmit && (
                              <Button
                                size="sm"
                                variant={div.report ? "outline" : "default"}
                                className="w-full mt-2"
                                onClick={() => openReportForm(div)}
                              >
                                {div.report ? "Update Report" : "Submit Report"}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Short Term KPI Reporting Modal */}
      <Dialog
        open={Boolean(reportingDivision)}
        onOpenChange={(open) => {
          if (!open) setReportingDivision(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Submit Report: {reportingDivision?.period_label}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {kpi.title} ({kpi.code}) • {activeAssignment?.assignee_label || "Assigned Entity"}
            </DialogDescription>
          </DialogHeader>

          {reportingDivision && (
            <form onSubmit={handleReportSubmit} className="space-y-4 pt-2">
              {/* Period Target Banner */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Planned Target
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {reportingDivision.planned_target != null
                      ? reportingDivision.planned_target.toLocaleString()
                      : "—"}{" "}
                    {kpi.unit}
                  </span>
                </div>
                {reportingDivision.report?.reported_actual != null && (
                  <div className="text-right border-l border-border pl-4">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Current Actual
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-600">
                      {Number(reportingDivision.report.reported_actual).toLocaleString()} {kpi.unit} (
                      {reportingDivision.report.achievement_percent}%)
                    </span>
                  </div>
                )}
              </div>

              {kpi.allow_narrative_only_updates && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Submission Type</Label>
                  <Select
                    value={submissionType}
                    onValueChange={(v) => setSubmissionType(v as ShortTermSubmissionType)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actual_and_narrative">Actual Value + Narrative</SelectItem>
                      <SelectItem value="narrative_only">Narrative Update Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {submissionType === "actual_and_narrative" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Reported Actual ({kpi.unit}) *</Label>
                    {reportedActual !== "" && !isNaN(Number(reportedActual)) && reportingDivision.planned_target && (
                      <span className="text-xs font-mono font-semibold text-primary">
                        Achievement: {Math.round((Number(reportedActual) / reportingDivision.planned_target) * 1000) / 10}%
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="any"
                    className="h-9 text-sm bg-white dark:bg-slate-900"
                    placeholder={`e.g. ${reportingDivision.planned_target ?? 0}`}
                    value={reportedActual}
                    onChange={(e) => setReportedActual(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Progress Narrative / Executive Justification</Label>
                <Textarea
                  rows={3}
                  className="text-xs bg-white dark:bg-slate-900 resize-none"
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  placeholder="Describe progress, field achievements, or operational blockers..."
                />
              </div>

              <LabeledAttachmentInput
                attachments={evidenceAttachments}
                onChange={setEvidenceAttachments}
                title="Supporting Attachments & Verification Documents (Optional)"
              />

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReportingDivision(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Submit Report"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Enlarged Update / Assign Modal */}
      {isAssignModalOpen && (
        <AssignShortTermKpiModal
          kpi={kpi}
          planId={kpi.short_term_plan_id}
          defaultSectorId={kpi.plan?.government_structure_id || ""}
          sectors={sectors}
          departments={internalDepts}
          users={users}
          onClose={() => {
            setIsAssignModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
