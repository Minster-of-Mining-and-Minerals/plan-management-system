"use client";

import React, { useMemo } from "react";
import { Clock, CheckCircle2, AlertTriangle, Calendar, Hourglass, ShieldCheck, Lock } from "lucide-react";

interface Props {
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  compact?: boolean;
  phaseStartDate?: string | null;
  phaseEndDate?: string | null;
  isInGracePeriod?: boolean;
  lockState?: string | null;
}

export function PeriodCountdownProgressBar({
  startDate,
  endDate,
  status,
  compact = false,
  phaseStartDate,
  phaseEndDate,
  isInGracePeriod,
  lockState,
}: Props) {
  const isPublished = status === "published";

  const {
    progressPercent,
    statusText,
    colorVariant,
    isUrgent,
    isOverdue,
    daysLeft,
    totalDays,
    phaseBadgeText,
  } = useMemo(() => {
    if (isPublished) {
      return {
        progressPercent: 100,
        statusText: "Submitted on time",
        colorVariant: "completed",
        isUrgent: false,
        isOverdue: false,
        daysLeft: 0,
        totalDays: 0,
        phaseBadgeText: null,
      };
    }

    const effectiveOpenDate = phaseStartDate || startDate;
    const effectiveDeadlineDate = phaseEndDate || endDate;

    if (!effectiveOpenDate || !effectiveDeadlineDate) {
      return {
        progressPercent: 0,
        statusText: "Standard Reporting Window",
        colorVariant: "neutral",
        isUrgent: false,
        isOverdue: false,
        daysLeft: null,
        totalDays: null,
        phaseBadgeText: null,
      };
    }

    const openTime = new Date(effectiveOpenDate).getTime();
    const deadlineTime = new Date(effectiveDeadlineDate).getTime();
    const now = Date.now();

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDuration = deadlineTime - openTime;
    const totalDaysCount = Math.max(1, Math.ceil(totalDuration / msPerDay));

    // 1. Before phase opens: Period operating, reporting window upcoming
    if (now < openTime) {
      const daysUntilOpen = Math.ceil((openTime - now) / msPerDay);
      return {
        progressPercent: 0,
        statusText: `Reporting opens in ${daysUntilOpen}d (${effectiveOpenDate})`,
        colorVariant: "upcoming",
        isUrgent: false,
        isOverdue: false,
        daysLeft: totalDaysCount,
        totalDays: totalDaysCount,
        phaseBadgeText: "Upcoming Phase",
      };
    }

    // 2. Past final grace deadline: Closed / Deadline passed
    if (now > deadlineTime) {
      const daysOverdue = Math.ceil((now - deadlineTime) / msPerDay);
      return {
        progressPercent: 100,
        statusText: `Closed ${daysOverdue}d ago (Due: ${effectiveDeadlineDate})`,
        colorVariant: "overdue",
        isUrgent: true,
        isOverdue: true,
        daysLeft: 0,
        totalDays: totalDaysCount,
        phaseBadgeText: "Deadline Passed",
      };
    }

    // 3. Active Window: Check if in grace period vs normal phase
    const elapsed = now - openTime;
    const remaining = deadlineTime - now;
    const remainingDays = Math.ceil(remaining / msPerDay);
    const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsed / Math.max(1, totalDuration)) * 100)));

    if (isInGracePeriod || lockState === "grace_period") {
      return {
        progressPercent: percentElapsed,
        statusText: `Grace Window: ${remainingDays}d left (Due: ${effectiveDeadlineDate})`,
        colorVariant: "warning",
        isUrgent: remainingDays <= 2,
        isOverdue: false,
        daysLeft: remainingDays,
        totalDays: totalDaysCount,
        phaseBadgeText: "Grace Period",
      };
    }

    let variant: "safe" | "warning" | "urgent" = "safe";
    if (remainingDays <= 3) {
      variant = "urgent";
    } else if (remainingDays <= 7) {
      variant = "warning";
    }

    return {
      progressPercent: percentElapsed,
      statusText: `Reporting Open: ${remainingDays}d left (Due: ${effectiveDeadlineDate})`,
      colorVariant: variant,
      isUrgent: variant === "urgent",
      isOverdue: false,
      daysLeft: remainingDays,
      totalDays: totalDaysCount,
      phaseBadgeText: "Window Open",
    };
  }, [startDate, endDate, phaseStartDate, phaseEndDate, isInGracePeriod, lockState, status, isPublished]);

  // Styling maps
  const barColor =
    colorVariant === "completed"
      ? "bg-emerald-500"
      : colorVariant === "safe"
      ? "bg-emerald-500"
      : colorVariant === "warning"
      ? "bg-amber-500"
      : colorVariant === "urgent"
      ? "bg-rose-500 animate-pulse"
      : colorVariant === "overdue"
      ? "bg-red-600"
      : "bg-slate-400";

  const textColor =
    colorVariant === "completed"
      ? "text-emerald-700 dark:text-emerald-400"
      : colorVariant === "safe"
      ? "text-emerald-700 dark:text-emerald-400 font-semibold"
      : colorVariant === "warning"
      ? "text-amber-700 dark:text-amber-400 font-semibold"
      : colorVariant === "urgent"
      ? "text-rose-600 dark:text-rose-400 font-bold"
      : colorVariant === "overdue"
      ? "text-red-700 dark:text-red-400 font-bold"
      : "text-slate-500";

  return (
    <div className={`space-y-1 ${compact ? "w-36" : "w-48"}`}>
      <div className="flex items-center justify-between text-[10px] leading-tight">
        <span className={`flex items-center gap-1 ${textColor}`}>
          {isPublished ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
          ) : isOverdue ? (
            <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
          ) : colorVariant === "warning" ? (
            <Hourglass className="h-3 w-3 text-amber-600 shrink-0" />
          ) : colorVariant === "upcoming" ? (
            <Lock className="h-3 w-3 text-slate-400 shrink-0" />
          ) : (
            <Clock className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{statusText}</span>
        </span>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

