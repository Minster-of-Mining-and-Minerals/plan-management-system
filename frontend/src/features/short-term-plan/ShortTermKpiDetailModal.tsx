"use client";

import React, { useEffect, useState } from "react";
import {
  useUpdateShortTermKpiMutation,
  useUpdateShortTermAssignmentMutation,
  useSubmitShortTermReportMutation,
} from "@/redux/api/shortTermPlanApi";
import type {
  ShortTermKpi,
  ShortTermKpiAssignment,
  ShortTermDivision,
  ShortTermFrequency,
  ShortTermEvaluationMode,
  ShortTermSubmissionType,
} from "@/redux/types/shortTermPlan";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  MessageSquareText,
  FileText,
  Sliders,
  Save,
  Building2,
  Lock,
  Unlock,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface ShortTermKpiDetailModalProps {
  kpi: ShortTermKpi | null;
  planId: string;
  onClose: () => void;
}

export function ShortTermKpiDetailModal({ kpi, planId, onClose }: ShortTermKpiDetailModalProps) {
  const [updateKpi, { isLoading: isSavingKpi }] = useUpdateShortTermKpiMutation();
  const [updateAssignment, { isLoading: isSavingAssignment }] = useUpdateShortTermAssignmentMutation();
  const [submitReport, { isLoading: isSubmitting }] = useSubmitShortTermReportMutation();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState<ShortTermDivision | null>(null);

  // KPI configuration state (Target, Frequency, Evaluation Mode)
  const [kpiConfig, setKpiConfig] = useState({
    total_target: "",
    evaluation_mode: "number" as ShortTermEvaluationMode,
    reporting_frequency: "weekly" as ShortTermFrequency,
  });

  // Assignment configuration state (Allocated Target & Overrides)
  const [assignConfig, setAssignConfig] = useState({
    allocated_target: "",
    evaluation_mode_override: "" as "" | ShortTermEvaluationMode,
    reporting_frequency_override: "" as "" | ShortTermFrequency,
  });

  // Inline reporting form state
  const [reportForm, setReportForm] = useState({
    submission_type: "actual_and_narrative" as ShortTermSubmissionType,
    reported_actual: "",
    narrative: "",
  });

  const assignments = kpi?.assignments || [];
  const activeAssignment: ShortTermKpiAssignment | undefined =
    assignments.find((a) => a.assignment_id === selectedAssignmentId) || assignments[0];

  useEffect(() => {
    if (!kpi) return;
    setKpiConfig({
      total_target: kpi.total_target !== null && kpi.total_target !== undefined ? String(kpi.total_target) : "",
      evaluation_mode: kpi.evaluation_mode || "number",
      reporting_frequency: kpi.reporting_frequency || "weekly",
    });
    const first = kpi.assignments?.[0];
    setSelectedAssignmentId(first?.assignment_id || "");
    setSelectedDivision(null);
  }, [kpi]);

  useEffect(() => {
    if (!activeAssignment) return;
    setAssignConfig({
      allocated_target:
        activeAssignment.allocated_target !== null && activeAssignment.allocated_target !== undefined
          ? String(activeAssignment.allocated_target)
          : "",
      evaluation_mode_override: activeAssignment.evaluation_mode_override || "",
      reporting_frequency_override: activeAssignment.reporting_frequency_override || "",
    });
    const openDiv = (activeAssignment.divisions || []).find((d) => d.lock_status === "open") || null;
    if (openDiv) {
      setSelectedDivision(openDiv);
      setReportForm({
        submission_type: openDiv.report?.submission_type || openDiv.recommended_submission_type,
        reported_actual:
          openDiv.report?.reported_actual !== null && openDiv.report?.reported_actual !== undefined
            ? String(openDiv.report.reported_actual)
            : "",
        narrative: openDiv.report?.narrative || "",
      });
    }
  }, [activeAssignment]);

  if (!kpi) return null;

  const handleSaveKpiConfig = async () => {
    try {
      await updateKpi({
        kpiId: kpi.short_term_kpi_id,
        planId,
        total_target: kpiConfig.total_target !== "" ? Number(kpiConfig.total_target) : null,
        evaluation_mode: kpiConfig.evaluation_mode,
        reporting_frequency: kpiConfig.reporting_frequency,
      }).unwrap();
      toast.success("KPI target, evaluation mode & frequency updated");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update KPI settings");
    }
  };

  const handleSaveAssignmentConfig = async () => {
    if (!activeAssignment) return;
    try {
      await updateAssignment({
        assignmentId: activeAssignment.assignment_id,
        planId,
        allocated_target: assignConfig.allocated_target !== "" ? Number(assignConfig.allocated_target) : null,
        evaluation_mode_override: assignConfig.evaluation_mode_override || null,
        reporting_frequency_override: assignConfig.reporting_frequency_override || null,
      }).unwrap();
      toast.success("Assignment target & evaluation mode updated");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update assignment");
    }
  };

  const handleSelectDivision = (div: ShortTermDivision) => {
    setSelectedDivision(div);
    setReportForm({
      submission_type: div.report?.submission_type || div.recommended_submission_type,
      reported_actual:
        div.report?.reported_actual !== null && div.report?.reported_actual !== undefined
          ? String(div.report.reported_actual)
          : "",
      narrative: div.report?.narrative || "",
    });
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment || !selectedDivision) return;
    try {
      await submitReport({
        assignmentId: activeAssignment.assignment_id,
        planId,
        period_label: selectedDivision.period_label,
        period_index: selectedDivision.period_index,
        submission_type: reportForm.submission_type,
        reported_actual:
          reportForm.submission_type === "narrative_only"
            ? null
            : reportForm.reported_actual !== ""
            ? Number(reportForm.reported_actual)
            : null,
        narrative: reportForm.narrative,
      }).unwrap();
      toast.success(`Report submitted for ${selectedDivision.period_label}`);
      setSelectedDivision(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to submit report");
    }
  };

  const effectiveEvalMode =
    activeAssignment?.progress_summary?.effective_evaluation_mode ||
    activeAssignment?.evaluation_mode_override ||
    kpi.evaluation_mode ||
    "number";

  return (
    <Dialog open={!!kpi} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[920px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono text-xs">{kpi.code}</Badge>
            <Badge variant="secondary" className="capitalize text-xs">
              Frequency: {activeAssignment?.effective_frequency || kpi.reporting_frequency}
            </Badge>
            <Badge variant="outline" className="capitalize text-xs">
              Eval Mode: {effectiveEvalMode}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Unit: {kpi.unit}
            </Badge>
          </div>
          <DialogTitle className="text-base leading-snug">{kpi.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Section 1: KPI Target, Evaluation Mode & Frequency Configuration */}
          <div className="rounded-lg border bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
                KPI Target &amp; Evaluation Mode Configuration
              </h3>
              <Button size="sm" variant="outline" onClick={handleSaveKpiConfig} disabled={isSavingKpi} className="h-7 text-xs gap-1">
                <Save className="h-3 w-3" />
                Save KPI Config
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Total Target ({kpi.unit})</Label>
                <Input
                  type="number"
                  step="any"
                  className="h-8 text-xs mt-1 bg-white"
                  value={kpiConfig.total_target}
                  onChange={(e) => setKpiConfig({ ...kpiConfig, total_target: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Target Evaluation Mode</Label>
                <Select
                  value={kpiConfig.evaluation_mode}
                  onValueChange={(v) => setKpiConfig({ ...kpiConfig, evaluation_mode: v as ShortTermEvaluationMode })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number (Numeric Quantity)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="frequency">Frequency (Occurrences / Months)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Reporting Frequency</Label>
                <Select
                  value={kpiConfig.reporting_frequency}
                  onValueChange={(v) => setKpiConfig({ ...kpiConfig, reporting_frequency: v as ShortTermFrequency })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Assignment Selector & Target Allocation */}
          {assignments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-slate-500">
              This KPI has not been assigned to any department or user yet. Use &ldquo;Assign&rdquo; in the KPI table first.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <Label className="text-xs font-semibold">Assigned Department / User:</Label>
                    <Select value={activeAssignment?.assignment_id || ""} onValueChange={(v) => { setSelectedAssignmentId(v); setSelectedDivision(null); }}>
                      <SelectTrigger className="h-8 text-xs w-[280px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {assignments.map((a) => (
                          <SelectItem key={a.assignment_id} value={a.assignment_id}>
                            {a.department?.name || a.assignedUser?.full_name || a.assignee_label || a.sector?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleSaveAssignmentConfig} disabled={isSavingAssignment} className="h-7 text-xs gap-1">
                    <Save className="h-3 w-3" />
                    Update Assignment Target
                  </Button>
                </div>

                {activeAssignment && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <Label className="text-xs">Allocated Target</Label>
                      <Input
                        type="number"
                        step="any"
                        className="h-8 text-xs mt-1"
                        value={assignConfig.allocated_target}
                        onChange={(e) => setAssignConfig({ ...assignConfig, allocated_target: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Eval Mode Override</Label>
                      <Select
                        value={assignConfig.evaluation_mode_override || "__inherit__"}
                        onValueChange={(v) =>
                          setAssignConfig({
                            ...assignConfig,
                            evaluation_mode_override: v === "__inherit__" ? "" : (v as ShortTermEvaluationMode),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__inherit__">Inherit KPI ({kpi.evaluation_mode})</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="frequency">Frequency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Frequency Override</Label>
                      <Select
                        value={assignConfig.reporting_frequency_override || "__inherit__"}
                        onValueChange={(v) =>
                          setAssignConfig({
                            ...assignConfig,
                            reporting_frequency_override: v === "__inherit__" ? "" : (v as ShortTermFrequency),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__inherit__">Inherit KPI ({kpi.reporting_frequency})</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Reporting Divisions & Submission Inside Detail */}
              {activeAssignment && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                        Reporting Schedule ({activeAssignment.effective_frequency})
                      </h4>
                      {activeAssignment.progress_summary?.today_ec && (
                        <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Today (EC): {activeAssignment.progress_summary.today_ec}
                        </Badge>
                      )}
                    </div>
                    {activeAssignment.progress_summary && (
                      <div className="flex items-center gap-2 text-xs">
                        <span>
                          Achieved:{" "}
                          <strong>{activeAssignment.progress_summary.overall_actual ?? "—"}</strong> /{" "}
                          {activeAssignment.progress_summary.allocated_target ?? "—"}
                        </span>
                        {activeAssignment.progress_summary.overall_achievement_percent !== null && (
                          <Badge className="bg-emerald-600 text-white">
                            {activeAssignment.progress_summary.overall_achievement_percent}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {activeAssignment.can_report === false && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>{activeAssignment.access_reason || "You do not have reporting access for this assignment."}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[240px] overflow-y-auto p-1">
                    {(activeAssignment.divisions || []).map((div) => {
                      const rep = div.report;
                      const isNarrativeOnly = rep?.submission_type === "narrative_only";
                      const isNumeric = rep && !isNarrativeOnly;
                      const isSelected = selectedDivision?.period_label === div.period_label;
                      const isLocked = Boolean(div.is_locked);
                      const isOpen = div.lock_status === "open";
                      return (
                        <button
                          key={div.period_label}
                          type="button"
                          onClick={() => handleSelectDivision(div)}
                          className={`text-left rounded-md border p-2.5 transition-all ${
                            isSelected
                              ? "ring-2 ring-primary border-primary"
                              : isLocked
                              ? "bg-slate-50 border-slate-200 opacity-80 hover:border-slate-300"
                              : isNumeric
                              ? "bg-emerald-50 border-emerald-300"
                              : isNarrativeOnly
                              ? "bg-amber-50 border-amber-300"
                              : "bg-white border-emerald-200 hover:border-emerald-400"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {div.period_label}
                            </span>
                            {isLocked ? (
                              <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            ) : isNumeric ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : isNarrativeOnly ? (
                              <MessageSquareText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                            {div.display_start_date} → {div.display_end_date} ({div.calendar_system})
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-1">
                            <span className="text-[11px] text-slate-600">
                              Target: {div.planned_target !== null ? div.planned_target : "Narrative"}
                            </span>
                            <Badge
                              variant={isOpen ? "default" : "outline"}
                              className={`text-[9px] px-1 py-0 ${
                                isOpen
                                  ? "bg-emerald-600 text-white"
                                  : div.lock_status === "upcoming"
                                  ? "text-blue-600 border-blue-200"
                                  : "text-slate-500 border-slate-300"
                              }`}
                            >
                              {isOpen ? "Open" : div.lock_status === "upcoming" ? "Upcoming" : "Closed"}
                            </Badge>
                          </div>
                          {rep && (
                            <div className="text-[11px] font-medium mt-0.5 truncate text-slate-700">
                              {isNumeric ? `Actual: ${rep.reported_actual ?? 0}` : "Narrative logged"}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline Reporting Form inside KPI Detail */}
                  {selectedDivision && (
                    <form onSubmit={handleSubmitReport} className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Report for {selectedDivision.period_label}
                          </span>
                          {selectedDivision.is_locked ? (
                            <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-300 bg-rose-50 flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              {selectedDivision.lock_reason || "Locked"}
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-emerald-600 text-white flex items-center gap-1">
                              <Unlock className="h-3 w-3" />
                              Open for Today
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          Target:{" "}
                          <strong>
                            {selectedDivision.planned_target !== null
                              ? `${selectedDivision.planned_target} (${effectiveEvalMode})`
                              : "Narrative progress update"}
                          </strong>
                        </span>
                      </div>

                      {selectedDivision.is_locked || activeAssignment.can_report === false ? (
                        <div className="rounded-md border border-slate-200 bg-white/80 p-3 text-xs text-slate-600">
                          {activeAssignment.can_report === false
                            ? activeAssignment.access_reason
                            : selectedDivision.lock_reason || "This reporting period is locked based on the Ethiopian Calendar date."}
                        </div>
                      ) : (
                        <>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Submission Mode</Label>
                          <Select
                            value={reportForm.submission_type}
                            onValueChange={(v) => setReportForm({ ...reportForm, submission_type: v as ShortTermSubmissionType })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="narrative_only">Narrative Progress Update Only</SelectItem>
                              <SelectItem value="actual_and_narrative">Actual Target + Narrative</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {reportForm.submission_type === "actual_and_narrative" && (
                          <div>
                            <Label className="text-xs">
                              Reported Actual ({effectiveEvalMode === "percentage" ? "%" : kpi.unit}) *
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              required
                              className="h-8 text-xs mt-1 bg-white"
                              value={reportForm.reported_actual}
                              onChange={(e) => setReportForm({ ...reportForm, reported_actual: e.target.value })}
                              placeholder="Enter achieved value"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs">
                          Activities Performed / Narrative {reportForm.submission_type === "narrative_only" ? "*" : "(Optional)"}
                        </Label>
                        <Textarea
                          rows={3}
                          required={reportForm.submission_type === "narrative_only"}
                          className="text-xs mt-1 bg-white"
                          value={reportForm.narrative}
                          onChange={(e) => setReportForm({ ...reportForm, narrative: e.target.value })}
                          placeholder="Describe activities performed, milestones, or narrative progress..."
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedDivision(null)}>
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                          Submit Period Report
                        </Button>
                      </div>
                        </>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
