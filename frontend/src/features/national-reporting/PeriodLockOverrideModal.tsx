"use client";

import React, { useState, useMemo } from "react";
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
  Sparkles,
  Timer,
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

const DIVISION_BOUNDARIES_DEF = [
  { index: 1, label: "Division 1", monthLabel: "Month 1", startDate: "2026-07-08", endDate: "2026-08-07" },
  { index: 2, label: "Division 2", monthLabel: "Month 2", startDate: "2026-08-08", endDate: "2026-09-07" },
  { index: 3, label: "Division 3", monthLabel: "Month 3", startDate: "2026-09-08", endDate: "2026-10-07" },
  { index: 4, label: "Division 4", monthLabel: "Month 4", startDate: "2026-10-08", endDate: "2026-11-07" },
  { index: 5, label: "Division 5", monthLabel: "Month 5", startDate: "2026-11-08", endDate: "2026-12-07" },
  { index: 6, label: "Division 6", monthLabel: "Month 6", startDate: "2026-12-08", endDate: "2027-01-07" },
  { index: 7, label: "Division 7", monthLabel: "Month 7", startDate: "2027-01-08", endDate: "2027-02-07" },
  { index: 8, label: "Division 8", monthLabel: "Month 8", startDate: "2027-02-08", endDate: "2027-03-07" },
  { index: 9, label: "Division 9", monthLabel: "Month 9", startDate: "2027-03-08", endDate: "2027-04-07" },
  { index: 10, label: "Division 10", monthLabel: "Month 10", startDate: "2027-04-08", endDate: "2027-05-07" },
  { index: 11, label: "Division 11", monthLabel: "Month 11", startDate: "2027-05-08", endDate: "2027-06-07" },
  { index: 12, label: "Division 12", monthLabel: "Month 12", startDate: "2027-06-08", endDate: "2027-07-07" },
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function PeriodLockOverrideModal({
  isOpen,
  onClose,
  assignment,
}: PeriodLockOverrideModalProps) {
  const [toggleLock, { isLoading: isToggling }] = useTogglePeriodLockOverrideMutation();

  const [activePeriod, setActivePeriod] = useState<ReportingPeriod | null>(null);
  const [targetAction, setTargetAction] = useState<"unlock" | "lock" | null>(null);
  const [selectedDurationDays, setSelectedDurationDays] = useState<number | null>(5);
  const [reasonDraft, setReasonDraft] = useState("");
  const [unlockedUntilDraft, setUnlockedUntilDraft] = useState("");

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const now = useMemo(() => new Date(), []);

  // Guarantee that periods are always present even if assignment was fetched without recurringPeriods
  const resolvedPeriods = useMemo<ReportingPeriod[]>(() => {
    if (!assignment) return [];

    const existing = assignment.recurringPeriods;
    if (existing && existing.length > 0) {
      return existing;
    }

    // Fallback: Generate the 12 standard Ethiopian fiscal year divisions
    const lockOverrides = assignment.lock_overrides || {};
    return DIVISION_BOUNDARIES_DEF.map((div) => {
      const pLabel = div.monthLabel;
      const override =
        lockOverrides[pLabel] ||
        lockOverrides[pLabel.toUpperCase()] ||
        lockOverrides[div.label] ||
        null;

      let isLocked = false;
      let lockState = "open";
      let lockReason = `Current active reporting period: Open until ${div.endDate}`;

      if (override && typeof override.is_unlocked === "boolean") {
        if (override.is_unlocked) {
          if (override.unlocked_until) {
            const until = new Date(override.unlocked_until);
            if (String(override.unlocked_until).length === 10) {
              until.setHours(23, 59, 59, 999);
            }
            if (until < now) {
              isLocked = true;
              lockState = "closed_deadline_passed";
              lockReason = `Admin on-demand unlock expired on ${override.unlocked_until}`;
            } else {
              isLocked = false;
              lockState = "unlocked_override";
              lockReason = override.reason || `Open on demand until ${override.unlocked_until}`;
            }
          } else {
            isLocked = false;
            lockState = "unlocked_override";
            lockReason = override.reason || "Administratively unlocked on demand";
          }
        } else {
          isLocked = true;
          lockState = "manually_locked";
          lockReason = override.reason || "Administratively locked by Federal Administrator";
        }
      } else {
        if (todayStr < div.startDate) {
          isLocked = true;
          lockState = "upcoming";
          lockReason = `Future period: Reporting window opens on ${div.startDate}`;
        } else if (todayStr > div.endDate) {
          isLocked = true;
          lockState = "closed_deadline_passed";
          lockReason = `Past period: Reporting window closed on ${div.endDate}. Open on demand to report.`;
        }
      }

      return {
        period_index: div.index,
        period_label: pLabel,
        start_date: div.startDate,
        end_date: div.endDate,
        name: `${div.label} / ${pLabel} (${div.startDate} ~ ${div.endDate})`,
        is_locked: isLocked,
        lock_state: lockState,
        lock_reason: lockReason,
        deadline_date: div.endDate,
        is_manually_unlocked: Boolean(override?.is_unlocked),
        lock_override: override,
      };
    });
  }, [assignment, todayStr, now]);

  if (!assignment) return null;

  const lockOverrides = assignment.lock_overrides || {};

  const handleSelectDuration = (days: number) => {
    setSelectedDurationDays(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setUnlockedUntilDraft(formatDate(d));
  };

  const handleOpenAction = (period: ReportingPeriod, action: "unlock" | "lock") => {
    setActivePeriod(period);
    setTargetAction(action);
    if (action === "unlock") {
      setReasonDraft("On-demand reporting window opened for regional submission.");
      handleSelectDuration(5); // Default to 5 days on demand
    } else {
      setReasonDraft("Administrative lock applied.");
      setSelectedDurationDays(null);
      setUnlockedUntilDraft("");
    }
  };

  const handleCancelAction = () => {
    setActivePeriod(null);
    setTargetAction(null);
    setReasonDraft("");
    setUnlockedUntilDraft("");
    setSelectedDurationDays(null);
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
          ? `Period ${activePeriod.period_label} opened on demand until ${unlockedUntilDraft || "custom date"}. It will automatically lock itself after.`
          : `Period ${activePeriod.period_label} administratively locked.`
      );
      handleCancelAction();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update period lock status");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto">
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
                Any past and future periods are automatically locked. Open periods on demand for 5, 10, or custom days with automatic self-locking.
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
                {assignment.frequency_override || assignment.requirement?.frequency || "Monthly"}
              </span>
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Requirement: </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {assignment.requirement?.title} ({assignment.requirement?.code})
            </span>
          </div>
          <div className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Annual Cycle: {assignment.effective_start_date || "2026-07-08"} to {assignment.effective_end_date || "2027-07-07"} (12 Divisions)
            </span>
          </div>
        </div>

        {/* Action Panel When Action Selected */}
        {activePeriod && targetAction && (
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {targetAction === "unlock" ? (
                  <>
                    <Unlock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                      Open {activePeriod.period_label} on Demand
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span className="font-bold text-sm text-rose-900 dark:text-rose-200">
                      Apply Administrative Lock to {activePeriod.period_label}
                    </span>
                  </>
                )}
              </div>
              <Badge variant="outline" className="font-mono text-[11px]">
                {activePeriod.start_date} ~ {activePeriod.end_date}
              </Badge>
            </div>

            <p className="text-slate-600 dark:text-slate-300">
              {targetAction === "unlock"
                ? `Specify the range of time to open this period for ${assignment.region?.name}. The window will open immediately and automatically lock itself once the specified duration passes.`
                : `Applying an administrative lock immediately prevents ${assignment.region?.name} from submitting further reports for ${activePeriod.period_label}.`}
            </p>

            {targetAction === "unlock" && (
              <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-emerald-600" />
                  Select Open Duration (Auto-locks after time passes):
                </Label>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {[5, 10, 15, 30].map((days) => (
                    <Button
                      key={days}
                      type="button"
                      size="sm"
                      variant={selectedDurationDays === days ? "default" : "outline"}
                      onClick={() => handleSelectDuration(days)}
                      className={`text-xs h-7 px-3 ${
                        selectedDurationDays === days
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          : "border-slate-300 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      +{days} Days
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedDurationDays === null ? "default" : "outline"}
                    onClick={() => setSelectedDurationDays(null)}
                    className={`text-xs h-7 px-3 ${
                      selectedDurationDays === null
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        : "border-slate-300 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Custom Date
                  </Button>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div>
                    <Label htmlFor="unlock-until" className="text-[11px] text-slate-500 block mb-1">
                      Open Until Date (Inclusive):
                    </Label>
                    <Input
                      id="unlock-until"
                      type="date"
                      value={unlockedUntilDraft}
                      onChange={(e) => {
                        setSelectedDurationDays(null);
                        setUnlockedUntilDraft(e.target.value);
                      }}
                      className="text-xs bg-card w-44 h-8"
                    />
                  </div>
                  {unlockedUntilDraft && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded border border-emerald-200 dark:border-emerald-800 flex-1">
                      ✓ Period will remain <strong>OPEN</strong> until <strong>{unlockedUntilDraft} 23:59</strong>, then automatically lock itself.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="lock-reason" className="text-xs font-semibold">
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

            <div className="flex items-center justify-end gap-2 pt-1">
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
                className={`h-8 text-xs flex items-center gap-1.5 font-semibold text-white ${
                  targetAction === "unlock"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isToggling ? "Updating..." : targetAction === "unlock" ? "Confirm & Open Period" : "Confirm & Lock Period"}
              </Button>
            </div>
          </div>
        )}

        {/* Period Lock Rows */}
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned Periods & Window Locking Status ({resolvedPeriods.length} Periods)
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              Today: {todayStr}
            </span>
          </div>

          <div className="space-y-2">
            {resolvedPeriods.map((p) => {
              const override =
                lockOverrides[p.period_label] ||
                lockOverrides[p.period_label.toUpperCase()] ||
                null;

              let isManuallyUnlocked = false;
              let isManuallyLocked = false;
              let isCurrentlyLocked = true;
              let lockBadgeText = "Locked";
              let lockBadgeColor = "bg-amber-100 text-amber-800 border-amber-300";

              if (override && typeof override.is_unlocked === "boolean") {
                if (override.is_unlocked) {
                  if (override.unlocked_until) {
                    const until = new Date(override.unlocked_until);
                    if (String(override.unlocked_until).length === 10) {
                      until.setHours(23, 59, 59, 999);
                    }
                    if (until < now) {
                      isCurrentlyLocked = true;
                      lockBadgeText = `Unlock Expired (${override.unlocked_until})`;
                      lockBadgeColor = "bg-rose-100 text-rose-800 border-rose-300";
                    } else {
                      isManuallyUnlocked = true;
                      isCurrentlyLocked = false;
                      lockBadgeText = `Open on Demand (until ${override.unlocked_until})`;
                      lockBadgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
                    }
                  } else {
                    isManuallyUnlocked = true;
                    isCurrentlyLocked = false;
                    lockBadgeText = "Open on Demand (Indefinite)";
                    lockBadgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
                  }
                } else {
                  isManuallyLocked = true;
                  isCurrentlyLocked = true;
                  lockBadgeText = "Admin Locked";
                  lockBadgeColor = "bg-rose-100 text-rose-800 border-rose-300";
                }
              } else {
                // Natural timeline: strictly open ONLY if today is between start_date and end_date
                if (todayStr < p.start_date) {
                  isCurrentlyLocked = true;
                  lockBadgeText = "Future Period (Locked)";
                  lockBadgeColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300";
                } else if (todayStr > p.end_date) {
                  isCurrentlyLocked = true;
                  lockBadgeText = "Past Period (Closed)";
                  lockBadgeColor = "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300";
                } else {
                  isCurrentlyLocked = false;
                  lockBadgeText = "Active Window (Open)";
                  lockBadgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300";
                }
              }

              return (
                <div
                  key={p.period_label}
                  className={`p-3 border rounded-lg transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                    isManuallyUnlocked
                      ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                      : "bg-card hover:bg-accent/10"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {p.period_label}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        ({p.start_date} to {p.end_date})
                      </span>

                      {/* Status Badges */}
                      <Badge className={`${lockBadgeColor} flex items-center gap-1 font-mono text-[10px]`}>
                        {isCurrentlyLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        {lockBadgeText}
                      </Badge>

                      {p.status === "published" && (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-[10px]">
                          Report Submitted
                        </Badge>
                      )}
                    </div>

                    <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap">
                      {override?.unlocked_until ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Unlocked until {override.unlocked_until} (Auto-locks after)
                        </span>
                      ) : (
                        <span>Deadline: {p.end_date}</span>
                      )}
                      {(override?.reason || p.lock_reason) && (
                        <span className="text-slate-600 dark:text-slate-400 italic">
                          • {override?.reason || p.lock_reason}
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
                        className="h-7 text-xs border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950 flex items-center gap-1 font-semibold"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Open on Demand
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAction(p, "lock")}
                        className="h-7 text-xs border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950 flex items-center gap-1 font-semibold"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Lock Window
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
