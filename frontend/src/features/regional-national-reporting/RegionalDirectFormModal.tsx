"use client";

import React, { useState } from "react";
import { useSubmitDirectFormReportMutation } from "@/redux/api/nationalReportingApi";
import {
  NationalReportingAssignment,
  ReportingPeriod,
} from "@/redux/types/nationalReporting";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  FileText,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { generateReportingPeriods } from "@/utils/nationalReportingPeriodUtils";
import { PeriodCountdownProgressBar } from "./PeriodCountdownProgressBar";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assignment: NationalReportingAssignment;
  regionId: string;
  initialPeriodLabel?: string;
}

export function RegionalDirectFormModal({
  isOpen,
  onClose,
  assignment,
  regionId,
  initialPeriodLabel,
}: Props) {
  const req = assignment.requirement;
  const latestPub = assignment.latestPublishedRecord;

  // Determine recurring periods list
  const recurringPeriods: ReportingPeriod[] = React.useMemo(() => {
    if (assignment.recurringPeriods && assignment.recurringPeriods.length > 0) {
      return assignment.recurringPeriods;
    }
    if (req?.effective_start_date && req?.effective_end_date) {
      return generateReportingPeriods(
        req.effective_start_date,
        req.effective_end_date,
        req.frequency || "quarterly"
      );
    }
    return [
      { period_index: 1, period_label: "Q1", name: "Quarter 1", start_date: "", end_date: "" },
      { period_index: 2, period_label: "Q2", name: "Quarter 2", start_date: "", end_date: "" },
      { period_index: 3, period_label: "Q3", name: "Quarter 3", start_date: "", end_date: "" },
      { period_index: 4, period_label: "Q4", name: "Quarter 4", start_date: "", end_date: "" },
    ];
  }, [assignment.recurringPeriods, req]);

  const defaultPeriodLabel =
    initialPeriodLabel ||
    recurringPeriods[0]?.period_label ||
    latestPub?.reporting_period_label ||
    "Q1";

  const currentYear = new Date().getFullYear();
  const [reportingYear, setReportingYear] = useState<number>(
    latestPub?.reporting_year || currentYear
  );
  const [reportingPeriodLabel, setReportingPeriodLabel] = useState<string>(
    defaultPeriodLabel
  );

  // Look up existing submission for the selected period
  const existingPeriodData = React.useMemo(() => {
    return recurringPeriods.find(
      (p) => String(p.period_label).toUpperCase() === String(reportingPeriodLabel).toUpperCase()
    );
  }, [recurringPeriods, reportingPeriodLabel]);

  const [plannedTarget, setPlannedTarget] = useState<string>("");
  const [reportedActual, setReportedActual] = useState<string>("");
  const [narrative, setNarrative] = useState<string>("");

  // Confirmation view state
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [amharicValidationError, setAmharicValidationError] = useState<string | null>(null);

  // Expected Federal Unit (Display-Only: cannot be edited)
  const expectedFederalUnit = req?.expected_unit || "count";

  // Sync state whenever modal opens or period changes
  React.useEffect(() => {
    if (isOpen) {
      setIsConfirming(false);
      setAmharicValidationError(null);
      const activeLabel = initialPeriodLabel || defaultPeriodLabel;
      setReportingPeriodLabel(activeLabel);

      const periodMatch = recurringPeriods.find(
        (p) => String(p.period_label).toUpperCase() === String(activeLabel).toUpperCase()
      );

      if (periodMatch && periodMatch.planned_target !== null && periodMatch.planned_target !== undefined) {
        setPlannedTarget(String(periodMatch.planned_target));
      } else if (latestPub && latestPub.reporting_period_label === activeLabel && latestPub.planned_target !== null) {
        setPlannedTarget(String(latestPub.planned_target));
      } else {
        setPlannedTarget("");
      }

      if (periodMatch && periodMatch.reported_actual !== null && periodMatch.reported_actual !== undefined) {
        setReportedActual(String(periodMatch.reported_actual));
      } else if (latestPub && latestPub.reporting_period_label === activeLabel && latestPub.reported_actual !== null) {
        setReportedActual(String(latestPub.reported_actual));
      } else {
        setReportedActual("");
      }

      setNarrative(periodMatch?.narrative || latestPub?.narrative || "");
    }
  }, [isOpen, initialPeriodLabel, recurringPeriods]);

  const handlePeriodChange = (label: string) => {
    setReportingPeriodLabel(label);
    const periodMatch = recurringPeriods.find(
      (p) => String(p.period_label).toUpperCase() === String(label).toUpperCase()
    );

    if (periodMatch && periodMatch.planned_target !== null && periodMatch.planned_target !== undefined) {
      setPlannedTarget(String(periodMatch.planned_target));
    } else {
      setPlannedTarget("");
    }

    if (periodMatch && periodMatch.reported_actual !== null && periodMatch.reported_actual !== undefined) {
      setReportedActual(String(periodMatch.reported_actual));
    } else {
      setReportedActual("");
    }

    setNarrative(periodMatch?.narrative || "");
    setAmharicValidationError(null);
  };

  const [submitReport, { isLoading: isSubmitting }] =
    useSubmitDirectFormReportMutation();

  const numTarget = parseFloat(plannedTarget);
  const numActual = parseFloat(reportedActual);
  const achievementRate =
    !isNaN(numTarget) && numTarget > 0 && !isNaN(numActual)
      ? Math.round((numActual / numTarget) * 1000) / 10
      : null;

  const isOverAchieved = achievementRate !== null && achievementRate > 100;
  const overAchievementAmount = isOverAchieved && !isNaN(numTarget) ? numActual - numTarget : 0;

  // Validation function
  const validateForm = (): boolean => {
    setAmharicValidationError(null);

    if (!reportingYear || !reportingPeriodLabel.trim()) {
      toast.error("Please enter a valid reporting year and period");
      return false;
    }

    if (isNaN(numActual) || numActual < 0) {
      toast.error("Please enter a valid non-negative reported actual achievement number");
      return false;
    }

    if (!isNaN(numTarget) && numTarget < 0) {
      toast.error("Planned target cannot be negative");
      return false;
    }

    // Required Amharic character validation for narrative
    const cleanNarrative = narrative.trim();
    if (!cleanNarrative) {
      setAmharicValidationError("የሪፖርት ማብራሪያ በአማርኛ ፊደላት መፃፍ ግዴታ ነው / Reporting narrative in Amharic is required.");
      toast.error("Please provide an executive summary/narrative in Amharic.");
      return false;
    }

    // Check for Ethiopic Unicode characters (range \u1200-\u137F)
    const hasAmharicScript = /[\u1200-\u137F]/.test(cleanNarrative);
    if (!hasAmharicScript) {
      setAmharicValidationError(
        "ማብራሪያው ቢያንስ ጥቂት የአማርኛ ፊደላት ሊኖሩት ይገባል / Narrative must contain Amharic (Ethiopic) characters."
      );
      toast.error("Reporting narrative must include Amharic characters.");
      return false;
    }

    return true;
  };

  // Step 1: Review & Proceed to Confirmation
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsConfirming(true);
    }
  };

  // Step 2: Final Publish Submission
  const handleFinalSubmit = async () => {
    if (!validateForm()) {
      setIsConfirming(false);
      return;
    }

    try {
      const res = await submitReport({
        regionId,
        data: {
          assignmentId: assignment.assignment_id,
          requirementId: req?.requirement_id,
          reportingYear: Number(reportingYear),
          reportingPeriodLabel: reportingPeriodLabel.trim(),
          plannedTarget: !isNaN(numTarget) ? numTarget : null,
          reportedActual: numActual,
          localUnit: expectedFederalUnit, // Federal defined unit strictly enforced
          narrative: narrative.trim(),
        },
      }).unwrap();

      toast.success(
        res.receipt?.message ||
          "Direct KPI Form Report published successfully to National Framework"
      );
      setIsConfirming(false);
      onClose();
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to submit direct form report"
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">
                {isConfirming
                  ? "Confirm National KPI Submission"
                  : "Form-Based National Reporting"}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {isConfirming
                  ? "Please review all values and Amharic justification before final publication."
                  : "Submit KPI target and achievement directly via form. Federal unit definition is strictly preserved."}
              </p>
            </div>
          </div>
        </DialogHeader>

        {isConfirming ? (
          /* ================= STEP 2: CONFIRMATION VIEW ================= */
          <div className="space-y-5 pt-2">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Official National Gateway Verification</span>
                You are about to publish an official regional execution report. This will be registered as a permanent version in the National Reporting Framework and notify Federal Ministry administrators.
              </div>
            </div>

            {/* Confirmation Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {req?.code}
                </span>
                <Badge variant="outline" className="text-xs capitalize font-medium">
                  {req?.category?.replace(/_/g, " ")}
                </Badge>
              </div>

              <div>
                <div className="text-xs text-slate-400">National Indicator:</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{req?.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400">Monitoring Window:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {reportingYear} {reportingPeriodLabel}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Standardized Unit:</span>
                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {expectedFederalUnit} ({req?.unit_category})
                  </div>
                </div>
              </div>

              {/* Target & Actual Comparison */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Planned Target
                  </span>
                  <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {!isNaN(numTarget) ? `${numTarget.toLocaleString()} ${expectedFederalUnit}` : "—"}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-300 dark:border-emerald-800">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                    Reported Actual
                  </span>
                  <div className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-200 mt-0.5">
                    {numActual.toLocaleString()} {expectedFederalUnit}
                  </div>
                </div>
              </div>

              {/* Achievement & Over-Achievement highlight */}
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 flex items-center justify-between text-xs font-mono">
                <span className="font-sans font-medium text-slate-600 dark:text-slate-300">
                  Achievement Rate:
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold text-sm ${
                      achievementRate && achievementRate >= 100
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {achievementRate !== null ? `${achievementRate}%` : "—"}
                  </span>
                  {isOverAchieved && (
                    <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                      +{Math.round((achievementRate - 100) * 10) / 10}% Over-Achievement (+{overAchievementAmount.toLocaleString()} {expectedFederalUnit})
                    </Badge>
                  )}
                </div>
              </div>

              {/* Amharic Narrative Review */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Verified Narrative in Amharic / የተረጋገጠ ማብራሪያ:
                </span>
                <p className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                  {narrative}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Go Back & Edit
              </Button>
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                {isSubmitting ? "Publishing to National Gateway..." : "Confirm & Publish Report"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ================= STEP 1: DATA INPUT FORM ================= */
          <form onSubmit={handleProceedToConfirmation} className="space-y-5 pt-3">
            {/* Requirement Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {req?.code}
                </span>
                <Badge variant="outline" className="text-xs capitalize">
                  {req?.category?.replace(/_/g, " ")}
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {req?.title}
              </h4>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span>
                  Frequency:{" "}
                  <strong className="capitalize text-slate-800 dark:text-slate-200">
                    {req?.frequency}
                  </strong>
                </span>
                {assignment.is_mandatory && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Mandatory National Indicator
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Reporting Period & Year + Window Countdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rep-year">Reporting Year *</Label>
                <Input
                  id="rep-year"
                  type="number"
                  min={2000}
                  max={2050}
                  value={reportingYear}
                  onChange={(e) => setReportingYear(parseInt(e.target.value, 10))}
                  required
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="rep-period">Reporting Period *</Label>
                  {existingPeriodData?.status === "published" && (
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                      Revision Mode (v{(existingPeriodData as any).revision_number ? (existingPeriodData as any).revision_number + 1 : 2})
                    </Badge>
                  )}
                </div>

                <Select
                  value={reportingPeriodLabel}
                  onValueChange={handlePeriodChange}
                >
                  <SelectTrigger id="rep-period" className="mt-1">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringPeriods.map((p) => (
                      <SelectItem key={p.period_label} value={p.period_label}>
                        {p.name || p.period_label}{" "}
                        {p.start_date && p.end_date
                          ? `(${p.start_date} ~ ${p.end_date})`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Progress bar countdown for selected period window */}
                {existingPeriodData?.start_date && existingPeriodData?.end_date && (
                  <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <PeriodCountdownProgressBar
                      startDate={existingPeriodData.start_date}
                      endDate={existingPeriodData.end_date}
                      status={existingPeriodData.status}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Target, Actual, and Federal Display-Only Unit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="plan-target">Planned Target Value</Label>
                <Input
                  id="plan-target"
                  type="number"
                  step="any"
                  placeholder="e.g. 1000"
                  value={plannedTarget}
                  onChange={(e) => setPlannedTarget(e.target.value)}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label htmlFor="rep-actual">Reported Actual Achievement *</Label>
                <Input
                  id="rep-actual"
                  type="number"
                  step="any"
                  placeholder="e.g. 950"
                  value={reportedActual}
                  onChange={(e) => setReportedActual(e.target.value)}
                  required
                  className="mt-1 font-mono font-bold"
                />
              </div>

              {/* Requirement 1: Federal Unit is display-only and cannot be edited */}
              <div>
                <Label htmlFor="unit-display">Defined National Unit (Display-Only)</Label>
                <div
                  id="unit-display"
                  className="mt-1 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-between font-mono font-bold text-slate-800 dark:text-slate-200 text-sm select-none"
                >
                  <span>{expectedFederalUnit}</span>
                  <Badge variant="outline" className="text-[10px] font-sans font-normal">
                    {req?.unit_category}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Enforced by Federal Definition
                </p>
              </div>
            </div>

            {/* Achievement Rate & Over-Achievement Preview */}
            {achievementRate !== null && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Calculated Achievement Rate:
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono font-bold text-sm ${
                      achievementRate >= 100
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {achievementRate}%
                  </span>
                  {isOverAchieved && (
                    <Badge className="bg-emerald-600 text-white font-mono text-[10px] px-2 py-0.5">
                      +{Math.round((achievementRate - 100) * 10) / 10}% Over-Achievement (+{overAchievementAmount.toLocaleString()} {expectedFederalUnit})
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Requirement 9: Executive Summary in Amharic (Ethiopic Script Required) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="rep-narrative" className="font-semibold">
                  Executive Summary & Justification / ሪፖርት ማጠቃለያና ማብራሪያ (በአማርኛ) *
                </Label>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                  Amharic Script Required
                </Badge>
              </div>
              <Textarea
                id="rep-narrative"
                rows={3}
                placeholder="ስለ አፈጻጸሙ ዝርዝር ማብራሪያና ምክንያቶች በአማርኛ ፊደላት እዚህ ይፃፉ... (e.g. በሩብ ዓመቱ የታቀደው ግብ...)"
                value={narrative}
                onChange={(e) => {
                  setNarrative(e.target.value);
                  if (amharicValidationError) setAmharicValidationError(null);
                }}
                required
                className="font-sans text-sm resize-none"
              />
              {amharicValidationError ? (
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {amharicValidationError}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  ማስታወሻ፦ ይፋዊ የፌዴራል ሪፖርት ግዴታ ስላለበት ጽሑፉ የአማርኛ ፊደላት ማካተት አለበት።
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <span>Review & Confirm Submission</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
