"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CalendarRange,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { NationalReportingAssignment } from "@/redux/types/nationalReporting";
import { useUpdateNationalAssignmentMutation } from "@/redux/api/nationalReportingApi";

interface PeriodTargetsConfigModalProps {
  assignment: NationalReportingAssignment | null;
  isOpen: boolean;
  onClose: () => void;
}

const GREGORIAN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ETHIOPIAN_MONTH_NAMES = [
  "Hamle (ሐምሌ)",
  "Nehase (ነሐሴ)",
  "Meskerem (መስከረም)",
  "Tikimt (ጥቅምት)",
  "Hidar (ኅዳር)",
  "Tahsas (ታኅሣሥ)",
  "Tir (ጥር)",
  "Yakatit (የካቲት)",
  "Magabit (መጋቢት)",
  "Miyazia (ሚያዝያ)",
  "Ginbot (ግንቦት)",
  "Sene (ሰኔ)",
];

export function PeriodTargetsConfigModal({
  assignment,
  isOpen,
  onClose,
}: PeriodTargetsConfigModalProps) {
  const [updateAssignment, { isLoading: isUpdating }] =
    useUpdateNationalAssignmentMutation();

  const req = assignment?.requirement;
  const annualTarget =
    assignment?.annual_target != null && !isNaN(Number(assignment.annual_target))
      ? Number(assignment.annual_target)
      : null;

  const expectedUnit = req?.expected_unit || "";
  const frequency = (
    assignment?.frequency_override ||
    req?.frequency ||
    "monthly"
  ).toLowerCase();

  // Generate period keys (e.g. Month 1..12 or Q1..Q4)
  const periodKeys = useMemo(() => {
    if (frequency === "quarterly") {
      return ["Q1", "Q2", "Q3", "Q4"];
    }
    if (frequency === "semi_annually") {
      return ["Semester 1", "Semester 2"];
    }
    if (frequency === "annually") {
      return ["Annual"];
    }
    // Default: monthly (12 months)
    return Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`);
  }, [frequency]);

  const [targetsDraft, setTargetsDraft] = useState<Record<string, string>>({});

  const hasExistingTargets = useMemo(() => {
    if (!assignment?.period_targets) return false;
    return Object.values(assignment.period_targets).some(
      (v) => v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) > 0
    );
  }, [assignment]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen && assignment) {
      const existing = assignment.period_targets || {};
      const initial: Record<string, string> = {};
      periodKeys.forEach((key, idx) => {
        const gregMonth = GREGORIAN_MONTHS[idx];
        let val = existing[key];
        if ((val === undefined || val === null) && gregMonth && existing[gregMonth] !== undefined) {
          val = existing[gregMonth];
        }
        if ((val === undefined || val === null) && existing[String(idx + 1)] !== undefined) {
          val = existing[String(idx + 1)];
        }
        initial[key] = val !== undefined && val !== null ? String(val) : "";
      });
      setTargetsDraft(initial);
    }
  }, [isOpen, assignment, periodKeys]);

  // Calculate live sum
  const totalAllocated = useMemo(() => {
    let sum = 0;
    Object.values(targetsDraft).forEach((val) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        sum += num;
      }
    });
    return Math.round(sum * 100) / 100;
  }, [targetsDraft]);

  const roundedAnnualTarget =
    annualTarget != null ? Math.round(annualTarget * 100) / 100 : null;

  const difference =
    roundedAnnualTarget != null
      ? Math.round((totalAllocated - roundedAnnualTarget) * 100) / 100
      : 0;

  const isExactMatch =
    roundedAnnualTarget != null && Math.abs(difference) <= 0.01;

  // Auto-distribute evenly
  const handleDistributeEvenly = () => {
    if (roundedAnnualTarget == null || roundedAnnualTarget <= 0) {
      toast.error("Please configure an annual target first to distribute evenly.");
      return;
    }
    const count = periodKeys.length;
    const baseShare = Math.floor((roundedAnnualTarget / count) * 100) / 100;
    const remainder =
      Math.round((roundedAnnualTarget - baseShare * (count - 1)) * 100) / 100;

    const distributed: Record<string, string> = {};
    periodKeys.forEach((key, idx) => {
      if (idx === count - 1) {
        distributed[key] = String(remainder);
      } else {
        distributed[key] = String(baseShare);
      }
    });

    setTargetsDraft(distributed);
    toast.info(
      `Distributed ${roundedAnnualTarget.toLocaleString()} ${expectedUnit} evenly across ${count} periods.`
    );
  };

  // Clear all
  const handleClearAll = () => {
    const cleared: Record<string, string> = {};
    periodKeys.forEach((key) => {
      cleared[key] = "";
    });
    setTargetsDraft(cleared);
  };

  const handleSave = async () => {
    if (!assignment) return;

    if (roundedAnnualTarget != null && !isExactMatch) {
      toast.error(
        `Validation Failed: Sum of period targets (${totalAllocated.toLocaleString()} ${expectedUnit}) must equal the Annual Target (${roundedAnnualTarget.toLocaleString()} ${expectedUnit}). Difference: ${
          difference > 0 ? `+${difference}` : difference
        }`
      );
      return;
    }

    const payload: Record<string, number> = {};
    for (const [k, v] of Object.entries(targetsDraft)) {
      const num = parseFloat(v);
      if (!isNaN(num) && num >= 0) {
        payload[k] = num;
      }
    }

    try {
      await updateAssignment({
        assignmentId: assignment.assignment_id,
        data: {
          period_targets: payload,
        },
      }).unwrap();
      toast.success(
        hasExistingTargets
          ? `Monthly target breakdown updated successfully for ${assignment.region?.name}.`
          : `Monthly target breakdown configured successfully for ${assignment.region?.name}.`
      );
      onClose();
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to update period targets"
      );
    }
  };

  if (!assignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${hasExistingTargets ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600" : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600"}`}>
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {hasExistingTargets
                    ? "Update Monthly Division & Period Targets"
                    : "Configure Monthly Division & Period Targets"}
                </DialogTitle>
                {hasExistingTargets ? (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-blue-600" />
                    Update Mode
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                    New Configuration
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {hasExistingTargets
                  ? "Review and update existing monthly target breakdown with annual sum validation."
                  : "Break down the regional annual target into scheduled monthly targets with sum validation."}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Context Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Regional State
              </span>
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                <span>{assignment.region?.name}</span>
                {assignment.region?.code && (
                  <Badge variant="outline" className="font-mono text-[10px] py-0 px-1">
                    {assignment.region.code}
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                National Indicator / KPI
              </span>
              <div className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                {req?.title}
              </div>
              <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                {req?.code} • {expectedUnit}
              </div>
            </div>
          </div>

          {/* Preset Annual Target vs Total Allocated Balance Bar */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              isExactMatch
                ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700"
                : "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale
                  className={`h-4 w-4 ${
                    isExactMatch ? "text-emerald-600" : "text-amber-600"
                  }`}
                />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Target Balance & Validation
                </span>
              </div>

              {isExactMatch ? (
                <Badge className="bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1 w-fit">
                  <CheckCircle2 className="h-3 w-3" />
                  Exact Match (100% Allocated)
                </Badge>
              ) : (
                <Badge className="bg-amber-600 text-white text-[11px] font-semibold flex items-center gap-1 w-fit">
                  <AlertCircle className="h-3 w-3" />
                  Allocation Mismatch
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">
                  Preset Annual Target:
                </span>
                <strong className="text-slate-900 dark:text-slate-100 text-sm">
                  {roundedAnnualTarget != null
                    ? `${roundedAnnualTarget.toLocaleString()} ${expectedUnit}`
                    : "Not Set"}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block font-sans">
                  Total Monthly Sum:
                </span>
                <strong
                  className={`text-sm ${
                    isExactMatch
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {totalAllocated.toLocaleString()} {expectedUnit}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block font-sans">
                  Difference / Remaining:
                </span>
                <strong
                  className={`text-sm ${
                    isExactMatch
                      ? "text-emerald-600"
                      : difference > 0
                      ? "text-rose-600"
                      : "text-amber-600"
                  }`}
                >
                  {difference === 0
                    ? "0.00"
                    : `${difference > 0 ? `+${difference}` : difference} ${expectedUnit}`}
                </strong>
              </div>
            </div>

            {!isExactMatch && roundedAnnualTarget != null && (
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-2 font-sans">
                ⚠ The sum of the {periodKeys.length} period targets must equal the annual target of{" "}
                <strong>{roundedAnnualTarget.toLocaleString()} {expectedUnit}</strong>. Click{" "}
                <button
                  type="button"
                  onClick={handleDistributeEvenly}
                  className="underline font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
                >
                  Divide Evenly
                </button>{" "}
                to auto-balance.
              </p>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Period Target Values ({expectedUnit})
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDistributeEvenly}
                disabled={roundedAnnualTarget == null}
                className="h-7 px-2.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-1.5"
                title="Automatically divide the annual target evenly across all periods"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Divide Evenly
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                title="Reset all period targets"
              >
                <RotateCcw className="h-3 w-3" />
                Clear
              </Button>
            </div>
          </div>

          {/* Period Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
            {periodKeys.map((key, idx) => {
              const val = targetsDraft[key] || "";
              const numVal = parseFloat(val);
              const percentOfAnnual =
                roundedAnnualTarget != null && roundedAnnualTarget > 0 && !isNaN(numVal)
                  ? Math.round((numVal / roundedAnnualTarget) * 1000) / 10
                  : null;

              const monthLabel =
                frequency === "monthly" && ETHIOPIAN_MONTH_NAMES[idx]
                  ? `${key} • ${ETHIOPIAN_MONTH_NAMES[idx]}`
                  : key;

              return (
                <div
                  key={key}
                  className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`period-input-${key}`}
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate"
                    >
                      {monthLabel}
                    </Label>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {percentOfAnnual !== null ? `${percentOfAnnual}% of annual` : "—"}
                    </div>
                  </div>

                  <div className="w-32 flex-shrink-0">
                    <Input
                      id={`period-input-${key}`}
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={val}
                      onChange={(e) =>
                        setTargetsDraft({
                          ...targetsDraft,
                          [key]: e.target.value,
                        })
                      }
                      className="h-8 text-xs font-mono text-right font-semibold border-slate-300 dark:border-slate-700"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isUpdating}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isUpdating || (roundedAnnualTarget != null && !isExactMatch)}
            className={`${
              hasExistingTargets
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            } text-white font-semibold text-xs flex items-center gap-1.5`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isUpdating
              ? (hasExistingTargets ? "Updating Breakdown..." : "Saving Breakdown...")
              : (hasExistingTargets ? "Update Monthly Breakdown" : "Save Monthly Breakdown")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
