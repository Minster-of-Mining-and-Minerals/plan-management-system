"use client";

import React, { useState, useMemo } from "react";
import {
  useSubmitDirectFormReportMutation,
  useGetPeriodConfigsQuery,
} from "@/redux/api/nationalReportingApi";
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
  FileText,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  CalendarRange,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronRight,
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
  selectedPeriod?: ReportingPeriod | null;
  isFederalOverride?: boolean;
}

const DIVISION_BOUNDARIES_DEF = [
  { index: 1, label: "Division 1", monthLabel: "Month 1", ethiopianMonth: "Hamle (ሐምሌ)", startDate: "2026-07-08", endDate: "2026-08-07" },
  { index: 2, label: "Division 2", monthLabel: "Month 2", ethiopianMonth: "Nehase (ነሐሴ)", startDate: "2026-08-08", endDate: "2026-09-07" },
  { index: 3, label: "Division 3", monthLabel: "Month 3", ethiopianMonth: "Meskerem (መስከረም)", startDate: "2026-09-08", endDate: "2026-10-07" },
  { index: 4, label: "Division 4", monthLabel: "Month 4", ethiopianMonth: "Tikimt (ጥቅምት)", startDate: "2026-10-08", endDate: "2026-11-07" },
  { index: 5, label: "Division 5", monthLabel: "Month 5", ethiopianMonth: "Hidar (ኅዳር)", startDate: "2026-11-08", endDate: "2026-12-07" },
  { index: 6, label: "Division 6", monthLabel: "Month 6", ethiopianMonth: "Tahsas (ታኅሣሥ)", startDate: "2026-12-08", endDate: "2027-01-07" },
  { index: 7, label: "Division 7", monthLabel: "Month 7", ethiopianMonth: "Tir (ጥር)", startDate: "2027-01-08", endDate: "2027-02-07" },
  { index: 8, label: "Division 8", monthLabel: "Month 8", ethiopianMonth: "Yakatit (የካቲት)", startDate: "2027-02-08", endDate: "2027-03-07" },
  { index: 9, label: "Division 9", monthLabel: "Month 9", ethiopianMonth: "Magabit (መጋቢት)", startDate: "2027-03-08", endDate: "2027-04-07" },
  { index: 10, label: "Division 10", monthLabel: "Month 10", ethiopianMonth: "Miyazia (ሚያዝያ)", startDate: "2027-04-08", endDate: "2027-05-07" },
  { index: 11, label: "Division 11", monthLabel: "Month 11", ethiopianMonth: "Ginbot (ግንቦት)", startDate: "2027-05-08", endDate: "2027-06-07" },
  { index: 12, label: "Division 12", monthLabel: "Month 12", ethiopianMonth: "Sene (ሰኔ)", startDate: "2027-06-08", endDate: "2027-07-07" },
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function RegionalDirectFormModal({
  isOpen,
  onClose,
  assignment,
  regionId,
  initialPeriodLabel,
  selectedPeriod,
  isFederalOverride = false,
}: Props) {
  const req = assignment.requirement;
  const latestPub = assignment.latestPublishedRecord;

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const now = useMemo(() => new Date(), []);

  // Fetch administrator period custom communication names
  const { data: periodConfigs = [] } = useGetPeriodConfigsQuery();

  const customNamesMap = useMemo(() => {
    const activeFreq = req?.frequency || "monthly";
    const matchingConfig =
      periodConfigs.find((c) => c.frequency.toLowerCase() === activeFreq.toLowerCase()) ||
      periodConfigs.find((c) => c.frequency === "monthly");

    const map: Record<string, string> = {};
    if (matchingConfig?.divisions) {
      matchingConfig.divisions.forEach((d) => {
        if (d.custom_name) {
          map[d.division_key] = d.custom_name;
          map[d.default_name] = d.custom_name;
          map[String(d.index)] = d.custom_name;
        }
      });
    }
    return map;
  }, [periodConfigs, req]);

  // Standardized federal unit (strictly display-only)
  const expectedFederalUnit = req?.expected_unit || "count";

  // Pre-defined federal year derived from assignment start date or existing period
  const assignedYear = useMemo(() => {
    if ((selectedPeriod as any)?.planning_year) return Number((selectedPeriod as any).planning_year);
    if (req?.effective_start_date) {
      const parsed = new Date(req.effective_start_date).getFullYear();
      if (!isNaN(parsed) && parsed > 2000) return parsed;
    }
    if (latestPub?.reporting_year) return latestPub.reporting_year;
    return new Date().getFullYear();
  }, [selectedPeriod, req, latestPub]);

  // Determine periods list with detailed window, lock, target, and achievement statuses
  const periodsWithStatus = useMemo(() => {
    const rawList: ReportingPeriod[] =
      assignment.recurringPeriods && assignment.recurringPeriods.length > 0
        ? assignment.recurringPeriods
        : req?.effective_start_date && req?.effective_end_date && req?.frequency !== "monthly"
        ? generateReportingPeriods(req.effective_start_date, req.effective_end_date, req.frequency || "quarterly")
        : DIVISION_BOUNDARIES_DEF.map((div) => ({
            period_index: div.index,
            period_label: div.monthLabel,
            name: `${div.monthLabel} / ${div.ethiopianMonth}`,
            start_date: div.startDate,
            end_date: div.endDate,
          }));

    const periodTargets = assignment.period_targets || {};
    const lockOverrides = assignment.lock_overrides || {};

    return rawList.map((p, idx) => {
      const label = p.period_label || `Month ${idx + 1}`;
      const divMatch = DIVISION_BOUNDARIES_DEF[idx] || null;
      const sDate = p.start_date || divMatch?.startDate || "";
      const eDate = p.end_date || divMatch?.endDate || "";
      const ethMonth = divMatch?.ethiopianMonth || "";
      const customCommunicationName = customNamesMap[label] || customNamesMap[String(idx + 1)] || ethMonth || "";

      // 1. Resolve Target
      let targetValue: number | null = null;
      if (p.monthly_target != null && !isNaN(Number(p.monthly_target))) {
        targetValue = Number(p.monthly_target);
      } else if (p.planned_target != null && !isNaN(Number(p.planned_target))) {
        targetValue = Number(p.planned_target);
      } else if (periodTargets[label] != null && !isNaN(Number(periodTargets[label]))) {
        targetValue = Number(periodTargets[label]);
      } else if (divMatch && periodTargets[divMatch.monthLabel] != null && !isNaN(Number(periodTargets[divMatch.monthLabel]))) {
        targetValue = Number(periodTargets[divMatch.monthLabel]);
      } else if (divMatch && periodTargets[divMatch.label] != null && !isNaN(Number(periodTargets[divMatch.label]))) {
        targetValue = Number(periodTargets[divMatch.label]);
      }

      // 2. Resolve Reported Actual / Achievement
      let reportedActualVal: number | null = null;
      let isPublished = false;
      let existingNarrative = p.narrative || "";
      if (p.reported_actual != null && !isNaN(Number(p.reported_actual))) {
        reportedActualVal = Number(p.reported_actual);
        isPublished = p.status === "published" || p.submission_status === "published";
      } else if (latestPub && latestPub.reporting_period_label === label && latestPub.reported_actual != null) {
        reportedActualVal = Number(latestPub.reported_actual);
        isPublished = latestPub.status === "published";
        if (latestPub.narrative) existingNarrative = latestPub.narrative;
      }

      // 3. Resolve Lock & Timeline Window Status
      const override =
        lockOverrides[label] ||
        lockOverrides[label.toUpperCase()] ||
        (divMatch ? lockOverrides[divMatch.monthLabel] : null) ||
        null;

      let lockState: "active_open" | "unlocked_on_demand" | "deadline_passed" | "future" | "manually_locked" = "active_open";
      let statusBadgeLabel = "Active Window";
      let statusColor = "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";

      if (override && typeof override.is_unlocked === "boolean") {
        if (override.is_unlocked) {
          if (override.unlocked_until) {
            const until = new Date(override.unlocked_until);
            if (String(override.unlocked_until).length === 10) {
              until.setHours(23, 59, 59, 999);
            }
            if (until < now) {
              lockState = "deadline_passed";
              statusBadgeLabel = "Deadline Passed (Unlock Expired)";
              statusColor = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
            } else {
              lockState = "unlocked_on_demand";
              statusBadgeLabel = `Unlocked on Demand (Open until ${override.unlocked_until})`;
              statusColor = "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300";
            }
          } else {
            lockState = "unlocked_on_demand";
            statusBadgeLabel = "Unlocked Administratively";
            statusColor = "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300";
          }
        } else {
          lockState = "manually_locked";
          statusBadgeLabel = "Locked by Admin";
          statusColor = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
        }
      } else {
        if (sDate && todayStr < sDate) {
          lockState = "future";
          statusBadgeLabel = `Future Period (Opens ${sDate})`;
          statusColor = "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
        } else if (eDate && todayStr > eDate) {
          lockState = "deadline_passed";
          statusBadgeLabel = `Deadline Passed (Closed ${eDate})`;
          statusColor = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
        } else {
          lockState = "active_open";
          statusBadgeLabel = `Active Window (Open until ${eDate || "end"})`;
          statusColor = "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
        }
      }

      return {
        ...p,
        period_index: p.period_index || idx + 1,
        period_label: label,
        ethiopianMonth: customCommunicationName || ethMonth,
        custom_name: customCommunicationName,
        start_date: sDate,
        end_date: eDate,
        targetValue,
        reportedActualVal,
        hasAchievement: reportedActualVal != null,
        isPublished,
        lockState,
        statusBadgeLabel,
        statusColor,
        narrative: existingNarrative,
      };
    });
  }, [assignment, req, todayStr, now, latestPub]);

  // Selected period state: do not default to first month if opened from tabular action
  const [reportingPeriodLabel, setReportingPeriodLabel] = useState<string>("");
  const [reportingYear, setReportingYear] = useState<number>(assignedYear);
  const [reportedActual, setReportedActual] = useState<string>("");
  const [narrative, setNarrative] = useState<string>("");

  // Confirmation view state
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [amharicValidationError, setAmharicValidationError] = useState<string | null>(null);

  // Sync state whenever modal opens or explicit selectedPeriod prop is passed
  React.useEffect(() => {
    if (isOpen) {
      setIsConfirming(false);
      setAmharicValidationError(null);
      setReportingYear(assignedYear);

      // Only default if explicitly passed via selectedPeriod or initialPeriodLabel
      const explicitLabel = selectedPeriod?.period_label || initialPeriodLabel || "";
      setReportingPeriodLabel(explicitLabel);

      if (explicitLabel) {
        const match = periodsWithStatus.find(
          (p) => String(p.period_label).toUpperCase() === String(explicitLabel).toUpperCase()
        );
        if (match) {
          setReportedActual(match.reportedActualVal != null ? String(match.reportedActualVal) : "");
          setNarrative(match.narrative || "");
        } else {
          setReportedActual("");
          setNarrative("");
        }
      } else {
        setReportedActual("");
        setNarrative("");
      }
    }
  }, [isOpen, initialPeriodLabel, selectedPeriod, assignedYear, periodsWithStatus]);

  // Handler when user selects/switches a period from selector
  const handleSelectPeriod = (periodLabel: string) => {
    setReportingPeriodLabel(periodLabel);
    const match = periodsWithStatus.find(
      (p) => String(p.period_label).toUpperCase() === String(periodLabel).toUpperCase()
    );
    if (match) {
      setReportedActual(match.reportedActualVal != null ? String(match.reportedActualVal) : "");
      setNarrative(match.narrative || "");
    } else {
      setReportedActual("");
      setNarrative("");
    }
  };

  const [submitReport, { isLoading: isSubmitting }] =
    useSubmitDirectFormReportMutation();

  const presetAnnualTarget =
    assignment.annual_target != null && !isNaN(Number(assignment.annual_target))
      ? Number(assignment.annual_target)
      : null;

  // Selected period data
  const selectedPeriodData = useMemo(() => {
    if (!reportingPeriodLabel) return null;
    return periodsWithStatus.find(
      (p) => String(p.period_label).toUpperCase() === String(reportingPeriodLabel).toUpperCase()
    ) || null;
  }, [periodsWithStatus, reportingPeriodLabel]);

  // Target is strictly read-only and derived from configuration
  const effectivePeriodTargetNum = selectedPeriodData?.targetValue ?? null;
  const monthlyTarget = effectivePeriodTargetNum;
  const numTarget = effectivePeriodTargetNum != null ? effectivePeriodTargetNum : (presetAnnualTarget != null ? presetAnnualTarget : NaN);
  const numActual = parseFloat(reportedActual);

  // Performance variance & analytics (100% cap on target achievement, explicit over/under status)
  const performanceAnalytics = useMemo(() => {
    const target = effectivePeriodTargetNum ?? presetAnnualTarget;
    if (target == null || isNaN(numActual)) {
      return null;
    }

    const diff = numActual - target;
    const isOver = numActual > target;
    const isUnder = numActual < target;
    const isExact = numActual === target;

    let rawPercent = 0;
    let cappedPercent = 0;
    let diffPercent = 0;

    if (target > 0) {
      rawPercent = (numActual / target) * 100;
      cappedPercent = Math.min(rawPercent, 100);
      diffPercent = ((numActual - target) / target) * 100;
    } else {
      // When target is 0: achievement is calculated against zero, so keep it 0%
      rawPercent = 0;
      cappedPercent = 0;
      diffPercent = 0;
    }

    const surplusOrDeficitValue = Math.abs(diff);
    const formattedDiff = isOver
      ? `+${surplusOrDeficitValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${expectedFederalUnit}`
      : isUnder
      ? `-${surplusOrDeficitValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${expectedFederalUnit}`
      : `0 ${expectedFederalUnit}`;

    const formattedDiffPercent = isOver
      ? (target > 0 ? `+${diffPercent.toFixed(1)}%` : `+${surplusOrDeficitValue.toLocaleString()} Surplus`)
      : isUnder
      ? `-${Math.abs(diffPercent).toFixed(1)}%`
      : `0.0%`;

    return {
      rawPercent: Math.round(rawPercent * 10) / 10,
      cappedPercent: Math.round(cappedPercent * 10) / 10,
      diff,
      diffPercent: Math.round(diffPercent * 10) / 10,
      isOver,
      isUnder,
      isExact,
      target,
      formattedDiff,
      formattedDiffPercent,
    };
  }, [effectivePeriodTargetNum, presetAnnualTarget, numActual, expectedFederalUnit]);

  // Annual Target Contribution Rate (against full annual preset target)
  const annualContributionRate = useMemo(() => {
    if (isNaN(numActual)) return null;
    if (presetAnnualTarget != null && presetAnnualTarget > 0) {
      return Math.round((numActual / presetAnnualTarget) * 1000) / 10;
    }
    if (presetAnnualTarget === 0) {
      return 0;
    }
    return null;
  }, [presetAnnualTarget, numActual]);

  // Validation function
  const validateForm = (): boolean => {
    setAmharicValidationError(null);

    if (!reportingYear) {
      toast.error("Please enter a valid reporting year");
      return false;
    }

    if (!reportingPeriodLabel.trim()) {
      toast.error("Please select a reporting period / month before submitting");
      return false;
    }

    if (isNaN(numActual) || numActual < 0) {
      toast.error("Please enter a valid non-negative reported actual achievement number");
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
          plannedTarget: effectivePeriodTargetNum != null ? effectivePeriodTargetNum : (!isNaN(numTarget) ? numTarget : null),
          reportedActual: numActual,
          localUnit: expectedFederalUnit, // Federal defined unit strictly enforced
          narrative: narrative.trim(),
          isFederalOverride: Boolean(isFederalOverride),
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
      <DialogContent className="w-full max-w-4xl sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">
                {isConfirming
                  ? "Confirm National KPI Submission"
                  : isFederalOverride
                  ? "Federal Direct KPI Report Submission & Regional Override"
                  : "Form-Based National Reporting"}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {isConfirming
                  ? "Please review all values and Amharic justification before final publication."
                  : isFederalOverride
                  ? "Federal administrative override: Record or update regional monthly execution under the National Reporting Framework."
                  : "Submit KPI achievement directly via form. Pre-set targets and federal unit definitions are strictly preserved."}
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
                You are about to publish an official regional execution report for <strong>{reportingPeriodLabel}</strong>. This will be registered as an immutable version in the National Reporting Framework and notify Federal Ministry administrators.
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
                    {reportingYear} {reportingPeriodLabel} {selectedPeriodData?.ethiopianMonth ? `(${selectedPeriodData.ethiopianMonth})` : ""}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Standardized Unit:</span>
                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {expectedFederalUnit} ({req?.unit_category})
                  </div>
                </div>
              </div>

              {/* Target & Actual Comparison (Pre-Set Target is Read-Only) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                    This Month&apos;s Target ({reportingPeriodLabel})
                  </span>
                  <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {monthlyTarget != null ? `${monthlyTarget.toLocaleString()} ${expectedFederalUnit}` : "—"}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Pre-configured (Read-only)</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                    Federal Preset Annual Target
                  </span>
                  <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {presetAnnualTarget != null ? `${presetAnnualTarget.toLocaleString()} ${expectedFederalUnit}` : "—"}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Full Year Regional Target</span>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-300 dark:border-emerald-800">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold block">
                    Reported Actual Achievement
                  </span>
                  <div className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-200 mt-0.5">
                    {numActual.toLocaleString()} {expectedFederalUnit}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">To be recorded</span>
                </div>
              </div>

              {/* Dual Analytics: Capped Rate, Over/Under Achievement, Annual Contribution */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <span className="font-sans font-medium text-emerald-900 dark:text-emerald-200 block">
                    Target Achievement Rate:
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold font-mono text-lg text-emerald-600 dark:text-emerald-400">
                      {performanceAnalytics?.cappedPercent ?? 0}%
                    </span>
                    {performanceAnalytics?.isOver && (
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        {effectivePeriodTargetNum === 0 ? "Target = 0 (0%)" : "100% Capped"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border text-xs ${
                    performanceAnalytics?.isOver
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-200"
                      : performanceAnalytics?.isUnder
                      ? "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200"
                      : "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-200"
                  }`}
                >
                  <span className="font-sans font-medium block">
                    {performanceAnalytics?.isOver
                      ? "Over-achievement Status:"
                      : performanceAnalytics?.isUnder
                      ? "Under-achievement Status:"
                      : "Performance Status:"}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold font-mono text-base">
                      {performanceAnalytics?.formattedDiff}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs font-bold">
                      {performanceAnalytics?.formattedDiffPercent}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-sans font-medium text-slate-700 dark:text-slate-300 block">
                    Annual Target Contribution:
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold font-mono text-lg text-blue-600 dark:text-blue-400">
                      {annualContributionRate !== null ? `${annualContributionRate}%` : "—"}
                    </span>
                    <span className="text-[10px] text-slate-400">Full Year</span>
                  </div>
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
                {isFederalOverride && (
                  <>
                    <span>•</span>
                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px]">
                      Federal Authority Override Mode
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* ================= PERIOD SELECTION SECTION ================= */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    Select Reporting Month / Division *
                  </Label>
                  <p className="text-xs text-slate-500">
                    Choose which sequential division to feed the achievement for. Status reflects active window, deadlines, and prior submissions.
                  </p>
                </div>

                {/* Quick Select Dropdown */}
                <div className="w-full sm:w-64">
                  <select
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={reportingPeriodLabel}
                    onChange={(e) => handleSelectPeriod(e.target.value)}
                  >
                    <option value="" disabled>
                      -- Choose a Reporting Month --
                    </option>
                    {periodsWithStatus.map((p) => {
                      const achievementTag = p.hasAchievement
                        ? ` [Reported: ${p.reportedActualVal} ${expectedFederalUnit}]`
                        : "";
                      const statusTag = ` (${p.statusBadgeLabel})`;
                      return (
                        <option key={p.period_label} value={p.period_label}>
                          {p.period_label} {p.ethiopianMonth ? `- ${p.ethiopianMonth}` : ""}
                          {achievementTag}
                          {statusTag}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* 12-Month Sequential Period Grid with Status Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                {periodsWithStatus.map((p) => {
                  const isSelected =
                    String(p.period_label).toUpperCase() === String(reportingPeriodLabel).toUpperCase();

                  return (
                    <button
                      key={p.period_label}
                      type="button"
                      onClick={() => handleSelectPeriod(p.period_label)}
                      className={`p-2.5 rounded-lg border text-left transition-all relative ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 ring-2 ring-emerald-500/30"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {p.period_label}
                        </span>
                        {isSelected && (
                          <span className="h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>

                      {p.ethiopianMonth && (
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                          {p.ethiopianMonth}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 mt-1">
                        {p.start_date && p.end_date ? `${p.start_date} ~ ${p.end_date}` : ""}
                      </div>

                      {/* Configured Target display */}
                      <div className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                        Target: {p.targetValue != null ? `${p.targetValue.toLocaleString()} ${expectedFederalUnit}` : "—"}
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.hasAchievement ? (
                          <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 leading-tight">
                            Reported: {p.reportedActualVal} {expectedFederalUnit}
                          </Badge>
                        ) : p.lockState === "active_open" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0 leading-tight">
                            Active Window
                          </Badge>
                        ) : p.lockState === "unlocked_on_demand" ? (
                          <Badge className="bg-cyan-100 text-cyan-800 text-[9px] px-1.5 py-0 leading-tight flex items-center gap-0.5">
                            <Unlock className="h-2 w-2" />
                            Unlocked
                          </Badge>
                        ) : p.lockState === "deadline_passed" ? (
                          <Badge className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0 leading-tight">
                            Deadline Passed
                          </Badge>
                        ) : p.lockState === "future" ? (
                          <Badge className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0 leading-tight">
                            Future
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0 leading-tight">
                            Locked
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Period Alert or Selection Prompt */}
            {!reportingPeriodLabel ? (
              <div className="p-6 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-2">
                <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto" />
                <h5 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                  Please Select a Reporting Month / Division
                </h5>
                <p className="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto">
                  Click on one of the 12 month cards above or use the dropdown to feed or override the regional achievement.
                </p>
              </div>
            ) : (
              <>
                {/* Active Period Details Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Federal Reporting Year
                    </span>
                    <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      {reportingYear}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Synchronized with National Reporting Mandate
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Selected Reporting Division
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${selectedPeriodData?.statusColor || ""}`}>
                        {selectedPeriodData?.statusBadgeLabel}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      {selectedPeriodData?.period_label}
                      {selectedPeriodData?.ethiopianMonth && (
                        <span className="text-sm font-normal text-slate-500">
                          - {selectedPeriodData.ethiopianMonth}
                        </span>
                      )}
                    </div>
                    {/* Progress bar countdown */}
                    {selectedPeriodData?.start_date && selectedPeriodData?.end_date && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <PeriodCountdownProgressBar
                          startDate={selectedPeriodData.start_date}
                          endDate={selectedPeriodData.end_date}
                          status={selectedPeriodData.isPublished ? "published" : undefined}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Target & Unit Display (STRICTLY READ-ONLY) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pre-Configured Target: NOT EDITABLE */}
                  <div>
                    <Label htmlFor="plan-target-readonly" className="text-xs font-semibold">
                      This Month&apos;s Target ({reportingPeriodLabel}) (Read-Only)
                    </Label>
                    <div
                      id="plan-target-readonly"
                      className="mt-1 h-9 px-3 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-between font-mono font-bold text-emerald-900 dark:text-emerald-200 text-sm select-none"
                    >
                      <span>
                        {effectivePeriodTargetNum != null
                          ? effectivePeriodTargetNum.toLocaleString()
                          : "Not Pre-set"}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-sans font-normal border-emerald-400 text-emerald-700 dark:text-emerald-400">
                        Pre-Configured Target
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Target is non-editable. Configured by Federal / Regional baseline.
                    </p>
                  </div>

                  {/* Reported Actual Achievement (Editable) */}
                  <div>
                    <Label htmlFor="rep-actual" className="text-xs font-semibold">
                      Reported Actual Achievement *
                    </Label>
                    <Input
                      id="rep-actual"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 950"
                      value={reportedActual}
                      onChange={(e) => setReportedActual(e.target.value)}
                      required
                      className="mt-1 font-mono font-bold border-emerald-400 focus-visible:ring-emerald-500"
                    />
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                      Enter regional achievement for {reportingPeriodLabel}
                    </p>
                  </div>

                  {/* Federal Unit: Display Only */}
                  <div>
                    <Label htmlFor="unit-display" className="text-xs font-semibold">
                      Defined National Unit (Read-Only)
                    </Label>
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

                {/* ================= ACHIEVEMENT ANALYTICS & OVER/UNDER ACHIEVEMENT ================= */}
                {!isNaN(numActual) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 1. Target Achievement (100% Cap) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Achievement vs Target:
                        </span>
                        {performanceAnalytics?.isOver && (
                          <Badge className="bg-emerald-600 text-white text-[10px] h-5">
                            {effectivePeriodTargetNum === 0 ? "Target = 0 (0%)" : "100% Cap Met"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                          {performanceAnalytics?.cappedPercent ?? 0}%
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {effectivePeriodTargetNum === 0 ? "(Calculated against 0: 0%)" : "(Cap: 100%)"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(performanceAnalytics?.cappedPercent ?? 0, 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {numActual.toLocaleString()} of {effectivePeriodTargetNum != null ? effectivePeriodTargetNum.toLocaleString() : "—"} {expectedFederalUnit}
                        {effectivePeriodTargetNum === 0 && " (Assigned target: 0)"}
                      </p>
                    </div>

                    {/* 2. Over-achievement / Under-achievement Status & Surplus/Deficit */}
                    <div
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        performanceAnalytics?.isOver
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                          : performanceAnalytics?.isUnder
                          ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                          : "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold flex items-center gap-1.5">
                          {performanceAnalytics?.isOver ? (
                            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : performanceAnalytics?.isUnder ? (
                            <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                          {performanceAnalytics?.isOver
                            ? "Over-achievement"
                            : performanceAnalytics?.isUnder
                            ? "Under-achievement"
                            : "Target Met Exactly"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs font-bold ${
                            performanceAnalytics?.isOver
                              ? "border-emerald-400 text-emerald-700 dark:text-emerald-300"
                              : performanceAnalytics?.isUnder
                              ? "border-amber-400 text-amber-700 dark:text-amber-300"
                              : "border-blue-400 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {performanceAnalytics?.formattedDiffPercent}
                        </Badge>
                      </div>

                      <div className="text-xl font-bold font-mono">
                        {performanceAnalytics?.formattedDiff}
                      </div>

                      <p className="text-[11px] leading-tight">
                        {performanceAnalytics?.isOver
                          ? effectivePeriodTargetNum === 0
                            ? `Surplus of ${performanceAnalytics.formattedDiff} achieved beyond the zero-target allocation.`
                            : `Surplus of ${performanceAnalytics.formattedDiff} produced above the ${reportingPeriodLabel} assigned target.`
                          : performanceAnalytics?.isUnder
                          ? `Deficit of ${Math.abs(performanceAnalytics.diff).toLocaleString()} ${expectedFederalUnit} remaining to satisfy this month's target.`
                          : "Target met with zero variance."}
                      </p>
                    </div>

                    {/* 3. Contribution to Annual Target */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Contribution to Annual Target:
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          Annual Quota
                        </Badge>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono font-bold text-2xl text-blue-600 dark:text-blue-400">
                          {annualContributionRate !== null ? `${annualContributionRate}%` : "—"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {numActual.toLocaleString()} of {presetAnnualTarget != null ? presetAnnualTarget.toLocaleString() : "—"} {expectedFederalUnit} full-year allocation
                      </p>
                    </div>
                  </div>
                )}

                {/* Executive Summary in Amharic (Ethiopic Script Required) */}
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
                    placeholder="ስለ አፈጻጸሙ ዝርዝር ማብራሪያና ምክንያቶች በአማርኛ ፊደላት እዚህ ይፃፉ... (e.g. በወሩ የታቀደው ግብ...)"
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
              </>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!reportingPeriodLabel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
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
