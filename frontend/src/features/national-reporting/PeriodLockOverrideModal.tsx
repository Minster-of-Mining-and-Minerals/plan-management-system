"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Lock,
  Unlock,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import {
  NationalReportingAssignment,
  ReportingPeriod,
} from "@/redux/types/nationalReporting";
import { useTogglePeriodLockOverrideMutation } from "@/redux/api/nationalReportingApi";
import { toast } from "sonner";

interface PeriodLockOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: NationalReportingAssignment | null;
}

export function PeriodLockOverrideModal({
  isOpen,
  onClose,
  assignment,
}: PeriodLockOverrideModalProps) {
  const [toggleLock, { isLoading: isToggling }] = useTogglePeriodLockOverrideMutation();

  const [activePeriod, setActivePeriod] = useState<ReportingPeriod | null>(null);
  const [targetAction, setTargetAction] = useState<"unlock" | "lock" | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [unlockedUntilDraft, setUnlockedUntilDraft] = useState("");

  if (!assignment) return null;

  const periods = assignment.recurringPeriods || [];
  const lockOverrides = assignment.lock_overrides || {};

  const handleOpenAction = (period: ReportingPeriod, action: "unlock" | "lock") => {
    setActivePeriod(period);
    setTargetAction(action);
    setReasonDraft(
      action === "unlock"
        ? "Administrative extension granted for regional reporting."
        : "Administrative lock applied."
    );
    // Default unlock duration: 14 days from today
    if (action === "unlock") {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setUnlockedUntilDraft(d.toISOString().slice(0, 10));
    } else {
      setUnlockedUntilDraft("");
    }
  };

  const handleCancelAction = () => {
    setActivePeriod(null);
    setTargetAction(null);
    setReasonDraft("");
    setUnlockedUntilDraft("");
  };

  const handleApplyOverride = async () => {
    if (!activePeriod || !targetAction) return;
    try {
      await toggleLock({
        assignmentId: assignment.assignment_id,
        periodLabel: activePeriod.period_label,
        isUnlocked: targetAction === "unlock",
        reason: reasonDraft.trim() || undefined,
        unlockedUntil: targetAction === "unlock" && unlockedUntilDraft ? unlockedUntilDraft : undefined,
      }).unwrap();

      toast.success(
        targetAction === "unlock"
          ? `Period ${activePeriod.period_label} unlocked on demand.`
          : `Period ${activePeriod.period_label} administratively locked.`
      );
      handleCancelAction();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update period lock status");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Reporting Window & Period Lock Management
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Manage timeframe deadlines and grant on-demand unlock overrides for regional submissions.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Assignment Metadata Banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-slate-500 font-medium">Regional State: </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {assignment.region?.name} ({assignment.region?.code})
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Reporting Cycle: </span>
              <span className="font-semibold capitalize text-slate-900 dark:text-slate-100">
                {assignment.frequency_override || assignment.requirement?.frequency || "Quarterly"}
              </span>
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Requirement: </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {assignment.requirement?.title} ({assignment.requirement?.code})
            </span>
          </div>
          {assignment.annualRange && (
            <div className="text-slate-500 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Annual Framework: {assignment.annualRange.startDate} to {assignment.annualRange.endDate}
              </span>
            </div>
          )}
        </div>

        {/* Period Lock Rows */}
        <div className="space-y-3 mt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Reporting Periods Schedule & Timeframe Locks
          </h4>

          {periods.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-lg">
              No recurring periods found for this annual framework.
            </div>
          ) : (
            <div className="space-y-2">
              {periods.map((p) => {
                const override = lockOverrides[p.period_label];
                const isManuallyUnlocked = Boolean(override?.is_unlocked);
                const isManuallyLocked = Boolean(override && override.is_unlocked === false);
                const isCurrentlyLocked = p.is_locked;

                return (
                  <div
                    key={p.period_label}
                    className="p-3 border rounded-lg bg-card hover:bg-accent/10 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {p.period_label}
                        </span>
                        <span className="text-slate-500 text-xs">
                          ({p.start_date} to {p.end_date})
                        </span>

                        {/* Status Badges */}
                        {isManuallyUnlocked ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 flex items-center gap-1">
                            <Unlock className="h-3 w-3" />
                            Admin Override (Open)
                          </Badge>
                        ) : isManuallyLocked ? (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Admin Locked
                          </Badge>
                        ) : isCurrentlyLocked ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {p.lock_state === "upcoming" ? "Upcoming (Locked)" : "Locked (Closed)"}
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Open (Active Window)
                          </Badge>
                        )}

                        {p.status === "published" && (
                          <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-[10px]">
                            Report Submitted
                          </Badge>
                        )}
                      </div>

                      <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap">
                        <span>Deadline: {p.deadline_date || "Standard Window"}</span>
                        {p.lock_reason && (
                          <span className="text-slate-600 dark:text-slate-400 italic">
                            • {p.lock_reason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCurrentlyLocked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAction(p, "unlock")}
                          className="h-7 text-xs border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950 flex items-center gap-1"
                        >
                          <Unlock className="h-3 w-3" />
                          Open on Demand
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAction(p, "lock")}
                          className="h-7 text-xs border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950 flex items-center gap-1"
                        >
                          <Lock className="h-3 w-3" />
                          Lock Window
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Confirmation Panel */}
        {activePeriod && targetAction && (
          <div className="mt-4 p-4 rounded-lg border-2 border-primary/20 bg-primary/5 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-sm text-primary">
              {targetAction === "unlock" ? (
                <>
                  <Unlock className="h-4 w-4" />
                  Grant On-Demand Unlock: Period {activePeriod.period_label}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Apply Administrative Lock: Period {activePeriod.period_label}
                </>
              )}
            </div>

            <p className="text-slate-600 dark:text-slate-300">
              {targetAction === "unlock"
                ? `Enabling on-demand unlock allows ${assignment.region?.name} to submit or revise reports for ${activePeriod.period_label} even if the natural deadline has elapsed.`
                : `Applying administrative lock prevents ${assignment.region?.name} from submitting further reports for ${activePeriod.period_label}.`}
            </p>

            <div className="space-y-1">
              <Label htmlFor="lock-reason" className="text-xs">
                Administrative Justification / Reason:
              </Label>
              <Textarea
                id="lock-reason"
                rows={2}
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                placeholder="Enter justification for administrative audit trail..."
                className="text-xs bg-card"
              />
            </div>

            {targetAction === "unlock" && (
              <div className="space-y-1">
                <Label htmlFor="unlock-until" className="text-xs">
                  Unlock Extension Deadline (Optional):
                </Label>
                <Input
                  id="unlock-until"
                  type="date"
                  value={unlockedUntilDraft}
                  onChange={(e) => setUnlockedUntilDraft(e.target.value)}
                  className="text-xs bg-card w-48"
                />
                <span className="text-[10px] text-slate-500">
                  Leave empty for an indefinite unlock until manually locked.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAction}
                disabled={isToggling}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyOverride}
                disabled={isToggling}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                {isToggling ? "Updating..." : "Save Lock Setting"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

