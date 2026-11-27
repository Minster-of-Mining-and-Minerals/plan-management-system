"use client";

import React, { useMemo, useState } from "react";
import {
  useGetShortTermPlansQuery,
  useGetShortTermPlanDetailQuery,
  useCreateShortTermPlanMutation,
  useAddShortTermKpiMutation,
  useAssignShortTermKpiMutation,
  useSubmitShortTermReportMutation,
} from "@/redux/api/shortTermPlanApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetInternalStructuresQuery } from "@/redux/api/internalStructureApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import type {
  ShortTermKpi,
  ShortTermKpiAssignment,
  ShortTermDivision,
  ShortTermFrequency,
  ShortTermSubmissionType,
} from "@/redux/types/shortTermPlan";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarSystemSelector } from "@/components/ui/calendar-system-selector";
import { DualCalendarDatePicker } from "@/components/ui/dual-calendar-date-picker";
import { CalendarDateDisplay } from "@/components/ui/calendar-date-display";
import type { CalendarSystem } from "@/utils/calendarUtils";
import {
  Plus,
  Share2,
  FileText,
  CheckCircle2,
  MessageSquareText,
  Layers,
  CalendarRange,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

export function ShortTermPlanView() {
  const { data: plans = [], isLoading: isLoadingPlans } = useGetShortTermPlansQuery();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const activePlanId = selectedPlanId || plans[0]?.short_term_plan_id || "";
  const { data: planDetail, isLoading: isLoadingDetail } = useGetShortTermPlanDetailQuery(
    { planId: activePlanId },
    { skip: !activePlanId }
  );

  const { data: sectors = [] } = useGetGovernmentStructuresQuery({ is_active: true });
  const { data: internalDepts = [] } = useGetInternalStructuresQuery({ is_active: true });
  const { data: users = [] } = useGetUsersQuery({ limit: 200 });

  const [createPlan, { isLoading: isCreatingPlan }] = useCreateShortTermPlanMutation();
  const [addKpi, { isLoading: isAddingKpi }] = useAddShortTermKpiMutation();
  const [assignKpi, { isLoading: isAssigning }] = useAssignShortTermKpiMutation();
  const [submitReport, { isLoading: isSubmitting }] = useSubmitShortTermReportMutation();

  // Create Plan Dialog
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    government_structure_id: "",
    calendar_system: "EC" as CalendarSystem,
    start_date: "2026-11-10",
    end_date: "2027-02-07",
    duration_months: 3,
    default_frequency: "weekly" as ShortTermFrequency,
  });

  // Add KPI Dialog
  const [isAddKpiOpen, setIsAddKpiOpen] = useState(false);
  const [kpiForm, setKpiForm] = useState({
    code: "",
    title: "",
    unit: "Number",
    total_target: "",
    target_mode: "cumulative" as "cumulative" | "milestone" | "continuous",
    reporting_frequency: "weekly" as ShortTermFrequency,
    allow_narrative_only_updates: true,
  });

  // Assign KPI Dialog (Cascading Sector -> Department / User + Period Distribution)
  const [assigningKpi, setAssigningKpi] = useState<ShortTermKpi | null>(null);
  const [assignForm, setAssignForm] = useState({
    government_structure_id: "",
    internal_structure_id: "",
    assigned_user_id: "",
    assignee_label: "",
    allocated_target: "",
    reporting_frequency_override: "" as "" | ShortTermFrequency,
  });

  // Report Submission Dialog (Narrative-only vs Actual + Narrative)
  const [reportingContext, setReportingContext] = useState<{
    kpi: ShortTermKpi;
    assignment: ShortTermKpiAssignment;
    division: ShortTermDivision;
  } | null>(null);
  const [reportForm, setReportForm] = useState({
    submission_type: "actual_and_narrative" as ShortTermSubmissionType,
    reported_actual: "",
    narrative: "",
  });

  const filteredDepts = useMemo(() => {
    const sectorId = assignForm.government_structure_id || planDetail?.government_structure_id;
    if (!sectorId) return internalDepts;
    return internalDepts.filter((d) => d.government_structure_id === sectorId);
  }, [internalDepts, assignForm.government_structure_id, planDetail?.government_structure_id]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createPlan({
        ...planForm,
        government_structure_id: planForm.government_structure_id || null,
      }).unwrap();
      toast.success("Short-term plan created");
      setSelectedPlanId(created.short_term_plan_id);
      setIsCreatePlanOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create short-term plan");
    }
  };

  const handleAddKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlanId) return;
    try {
      await addKpi({
        planId: activePlanId,
        code: kpiForm.code,
        title: kpiForm.title,
        unit: kpiForm.unit,
        total_target: kpiForm.total_target ? Number(kpiForm.total_target) : null,
        target_mode: kpiForm.target_mode,
        reporting_frequency: kpiForm.reporting_frequency,
        allow_narrative_only_updates: kpiForm.allow_narrative_only_updates,
      }).unwrap();
      toast.success("Short-term KPI added");
      setIsAddKpiOpen(false);
      setKpiForm({
        code: "",
        title: "",
        unit: "Number",
        total_target: "",
        target_mode: "cumulative",
        reporting_frequency: "weekly",
        allow_narrative_only_updates: true,
      });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add KPI");
    }
  };

  const handleAssignKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningKpi || !planDetail) return;
    const sectorId = assignForm.government_structure_id || planDetail.government_structure_id;
    if (!sectorId) {
      toast.error("Please select a Sector");
      return;
    }
    try {
      await assignKpi({
        kpiId: assigningKpi.short_term_kpi_id,
        planId: planDetail.short_term_plan_id,
        government_structure_id: sectorId,
        internal_structure_id: assignForm.internal_structure_id || null,
        assigned_user_id: assignForm.assigned_user_id || null,
        assignee_label: assignForm.assignee_label || undefined,
        allocated_target: assignForm.allocated_target ? Number(assignForm.allocated_target) : null,
        reporting_frequency_override: assignForm.reporting_frequency_override || null,
      }).unwrap();
      toast.success("KPI assigned successfully");
      setAssigningKpi(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to assign KPI");
    }
  };

  const openReportModal = (kpi: ShortTermKpi, assignment: ShortTermKpiAssignment, division: ShortTermDivision) => {
    setReportingContext({ kpi, assignment, division });
    setReportForm({
      submission_type: division.report?.submission_type || division.recommended_submission_type,
      reported_actual:
        division.report?.reported_actual !== null && division.report?.reported_actual !== undefined
          ? String(division.report.reported_actual)
          : "",
      narrative: division.report?.narrative || "",
    });
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingContext || !planDetail) return;
    try {
      await submitReport({
        assignmentId: reportingContext.assignment.assignment_id,
        planId: planDetail.short_term_plan_id,
        period_label: reportingContext.division.period_label,
        period_index: reportingContext.division.period_index,
        submission_type: reportForm.submission_type,
        reported_actual:
          reportForm.submission_type === "narrative_only"
            ? null
            : reportForm.reported_actual !== ""
            ? Number(reportForm.reported_actual)
            : null,
        narrative: reportForm.narrative,
      }).unwrap();
      toast.success("Period report submitted");
      setReportingContext(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to submit report");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Internal Short-Term Plan &amp; KPI Reporting
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            3-month / 5-month operational plans cascading from Sector to Department &amp; User with Monthly, Weekly, and Daily reporting (Narrative-only or Actual Target).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreatePlanOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Short-Term Plan
          </Button>
        </div>
      </div>

      {/* Plan Selector Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <CalendarRange className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 max-w-md">
              <Select value={activePlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingPlans ? "Loading plans..." : "Select a Short-Term Plan"} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.short_term_plan_id} value={p.short_term_plan_id}>
                      {p.title} ({p.calendar_system})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {planDetail && (
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600">
                <Badge variant="outline">{planDetail.calendar_system}</Badge>
                <Badge variant="secondary" className="capitalize">{planDetail.default_frequency}</Badge>
                <CalendarDateDisplay
                  date={planDetail.start_date}
                  endDate={planDetail.end_date}
                  calendarSystem={planDetail.calendar_system}
                />
              </div>
            )}
          </div>
          {planDetail && (
            <Button variant="outline" size="sm" onClick={() => setIsAddKpiOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add KPI
            </Button>
          )}
        </CardContent>
      </Card>

      {/* KPIs & Cascading Assignments */}
      {isLoadingDetail ? (
        <Card><CardContent className="p-8 text-center text-sm text-slate-500">Loading short-term plan details...</CardContent></Card>
      ) : !planDetail ? (
        <Card><CardContent className="p-8 text-center text-sm text-slate-500">No short-term plans found. Create one to get started.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {(planDetail.kpis || []).map((kpi) => (
            <Card key={kpi.short_term_kpi_id} className="overflow-hidden">
              <CardHeader className="bg-slate-50/70 border-b p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{kpi.code}</Badge>
                      <Badge variant="secondary" className="capitalize text-xs">{kpi.reporting_frequency}</Badge>
                      <Badge variant="outline" className="text-xs">Target: {kpi.total_target ?? "—"} ({kpi.unit})</Badge>
                    </div>
                    <CardTitle className="text-base mt-1.5">{kpi.title}</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 shrink-0"
                    onClick={() => {
                      setAssigningKpi(kpi);
                      setAssignForm({
                        government_structure_id: planDetail.government_structure_id || "",
                        internal_structure_id: "",
                        assigned_user_id: "",
                        assignee_label: "",
                        allocated_target: kpi.total_target ? String(kpi.total_target) : "",
                        reporting_frequency_override: "",
                      });
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Assign to Dept / User
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {(kpi.assignments || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No department or user assignments yet.</p>
                ) : (
                  (kpi.assignments || []).map((assignment) => {
                    const summary = assignment.progress_summary;
                    const assigneeName =
                      assignment.department?.name ||
                      assignment.assignedUser?.full_name ||
                      assignment.assignee_label ||
                      assignment.sector?.name ||
                      "Assigned Unit";

                    return (
                      <div key={assignment.assignment_id} className="rounded-lg border p-3 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            <span className="font-semibold text-sm text-slate-900">{assigneeName}</span>
                            <Badge variant="outline" className="text-[11px] capitalize">
                              {assignment.effective_frequency}
                            </Badge>
                          </div>
                          {summary && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500">
                                Numeric: <strong>{summary.numeric_reports_count}</strong> | Narrative-only: <strong>{summary.narrative_only_count}</strong>
                              </span>
                              {summary.overall_achievement_percent !== null && (
                                <Badge className="bg-emerald-600 text-white">
                                  {summary.overall_achievement_percent}% Achieved
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {(assignment.divisions || []).map((div) => {
                            const rep = div.report;
                            const isNarrativeOnly = rep?.submission_type === "narrative_only";
                            const isNumeric = rep && !isNarrativeOnly;
                            return (
                              <button
                                key={div.period_label}
                                type="button"
                                onClick={() => openReportModal(kpi, assignment, div)}
                                className={`text-left rounded-md border p-2 transition-all hover:shadow-sm ${
                                  isNumeric
                                    ? "bg-emerald-50 border-emerald-300"
                                    : isNarrativeOnly
                                    ? "bg-amber-50 border-amber-300"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-semibold text-slate-800 truncate">
                                    {div.period_label}
                                  </span>
                                  {isNumeric ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  ) : isNarrativeOnly ? (
                                    <MessageSquareText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Target: {div.planned_target !== null ? div.planned_target : "Narrative"}
                                </div>
                                {rep && (
                                  <div className="text-[10px] font-medium mt-1 truncate text-slate-700">
                                    {isNumeric
                                      ? `Actual: ${rep.reported_actual ?? 0}`
                                      : "Narrative logged"}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Short-Term Plan Dialog */}
      <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Create Short-Term Plan (3 / 5 Months)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div>
              <Label>Plan Title *</Label>
              <Input
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                placeholder="e.g. Mining Sector 100-Day Action Plan"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sector</Label>
                <Select
                  value={planForm.government_structure_id}
                  onValueChange={(v) => setPlanForm({ ...planForm, government_structure_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.government_structure_id} value={s.government_structure_id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default Frequency</Label>
                <Select
                  value={planForm.default_frequency}
                  onValueChange={(v) => setPlanForm({ ...planForm, default_frequency: v as ShortTermFrequency })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="block mb-1.5">Calendar System</Label>
              <CalendarSystemSelector
                value={planForm.calendar_system}
                onChange={(cal) => setPlanForm({ ...planForm, calendar_system: cal })}
                size="sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date ({planForm.calendar_system})</Label>
                <DualCalendarDatePicker
                  value={planForm.start_date}
                  calendarSystem={planForm.calendar_system}
                  onChange={(d) => setPlanForm({ ...planForm, start_date: d })}
                />
              </div>
              <div>
                <Label>End Date ({planForm.calendar_system})</Label>
                <DualCalendarDatePicker
                  value={planForm.end_date}
                  calendarSystem={planForm.calendar_system}
                  onChange={(d) => setPlanForm({ ...planForm, end_date: d })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreatePlanOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreatingPlan}>Create Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add KPI Dialog */}
      <Dialog open={isAddKpiOpen} onOpenChange={setIsAddKpiOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Add Short-Term KPI</DialogTitle></DialogHeader>
          <form onSubmit={handleAddKpi} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>KPI Code *</Label>
                <Input value={kpiForm.code} onChange={(e) => setKpiForm({ ...kpiForm, code: e.target.value })} placeholder="MOM-100D-01" required />
              </div>
              <div>
                <Label>Unit *</Label>
                <Input value={kpiForm.unit} onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })} placeholder="Number / %" required />
              </div>
            </div>
            <div>
              <Label>KPI Title *</Label>
              <Textarea value={kpiForm.title} onChange={(e) => setKpiForm({ ...kpiForm, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Target</Label>
                <Input type="number" step="any" value={kpiForm.total_target} onChange={(e) => setKpiForm({ ...kpiForm, total_target: e.target.value })} />
              </div>
              <div>
                <Label>Reporting Frequency</Label>
                <Select value={kpiForm.reporting_frequency} onValueChange={(v) => setKpiForm({ ...kpiForm, reporting_frequency: v as ShortTermFrequency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddKpiOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isAddingKpi}>Save KPI</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign KPI Dialog */}
      <Dialog open={!!assigningKpi} onOpenChange={(o) => !o && setAssigningKpi(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Assign KPI (Sector → Department / User)</DialogTitle></DialogHeader>
          <form onSubmit={handleAssignKpi} className="space-y-3">
            <div>
              <Label>Department / Desk (Internal Structure)</Label>
              <Select value={assignForm.internal_structure_id} onValueChange={(v) => setAssignForm({ ...assignForm, internal_structure_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select department (optional)" /></SelectTrigger>
                <SelectContent>
                  {filteredDepts.map((d) => (
                    <SelectItem key={d.internal_structure_id} value={d.internal_structure_id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned User (Optional)</Label>
              <Select value={assignForm.assigned_user_id} onValueChange={(v) => setAssignForm({ ...assignForm, assigned_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select user (optional)" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Allocated Target</Label>
                <Input type="number" step="any" value={assignForm.allocated_target} onChange={(e) => setAssignForm({ ...assignForm, allocated_target: e.target.value })} />
              </div>
              <div>
                <Label>Frequency Override</Label>
                <Select value={assignForm.reporting_frequency_override || "__default__"} onValueChange={(v) => setAssignForm({ ...assignForm, reporting_frequency_override: v === "__default__" ? "" : (v as ShortTermFrequency) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Use KPI Default</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssigningKpi(null)}>Cancel</Button>
              <Button type="submit" disabled={isAssigning}>Assign KPI</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Submission Dialog (Narrative-Only vs Actual + Narrative) */}
      <Dialog open={!!reportingContext} onOpenChange={(o) => !o && setReportingContext(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Submit Progress — {reportingContext?.division.period_label}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="rounded-md bg-slate-50 border p-3 text-xs space-y-1">
              <div className="font-semibold text-slate-800">{reportingContext?.kpi.title}</div>
              <div className="text-slate-500">
                Period Target:{" "}
                <strong>
                  {reportingContext?.division.planned_target !== null
                    ? `${reportingContext?.division.planned_target} ${reportingContext?.kpi.unit}`
                    : "No numeric target scheduled (Narrative progress update recommended)"}
                </strong>
              </div>
            </div>

            <div>
              <Label>Submission Mode</Label>
              <Select
                value={reportForm.submission_type}
                onValueChange={(v) => setReportForm({ ...reportForm, submission_type: v as ShortTermSubmissionType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrative_only">Narrative Progress Update Only (No Actual Target Yet)</SelectItem>
                  <SelectItem value="actual_and_narrative">Actual Numeric Achievement + Narrative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportForm.submission_type === "actual_and_narrative" && (
              <div>
                <Label>Reported Actual ({reportingContext?.kpi.unit}) *</Label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={reportForm.reported_actual}
                  onChange={(e) => setReportForm({ ...reportForm, reported_actual: e.target.value })}
                  placeholder="Enter achieved value"
                />
              </div>
            )}

            <div>
              <Label>
                Activities Performed / Narrative {reportForm.submission_type === "narrative_only" ? "*" : "(Optional)"}
              </Label>
              <Textarea
                rows={4}
                required={reportForm.submission_type === "narrative_only"}
                value={reportForm.narrative}
                onChange={(e) => setReportForm({ ...reportForm, narrative: e.target.value })}
                placeholder="Describe progress, milestones achieved, or ongoing preparatory work..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportingContext(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Submit Report</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
