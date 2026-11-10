"use client";

import React, { useMemo } from "react";
import { Clock, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";

interface Props {
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  compact?: boolean;
}

export function PeriodCountdownProgressBar({
  startDate,
  endDate,
  status,
  compact = false,
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
      };
    }

    if (!startDate || !endDate) {
      return {
        progressPercent: 0,
        statusText: "Standard Reporting Window",
        colorVariant: "neutral",
        isUrgent: false,
        isOverdue: false,
        daysLeft: null,
        totalDays: null,
      };
    }

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();

    const totalDuration = end - start;
    if (totalDuration <= 0) {
      return {
        progressPercent: 100,
        statusText: "Window ended",
        colorVariant: "overdue",
        isUrgent: true,
        isOverdue: true,
        daysLeft: 0,
        totalDays: 1,
      };
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDaysCount = Math.ceil(totalDuration / msPerDay);

    if (now < start) {
      const daysUntilOpen = Math.ceil((start - now) / msPerDay);
      return {
        progressPercent: 0,
        statusText: `Opens in ${daysUntilOpen} ${daysUntilOpen === 1 ? "day" : "days"}`,
        colorVariant: "upcoming",
        isUrgent: false,
        isOverdue: false,
        daysLeft: totalDaysCount,
        totalDays: totalDaysCount,
      };
    }

    if (now > end) {
      const daysOverdue = Math.ceil((now - end) / msPerDay);
      return {
        progressPercent: 100,
        statusText: `Deadline passed (${daysOverdue}d ago)`,
        colorVariant: "overdue",
        isUrgent: true,
        isOverdue: true,
        daysLeft: 0,
        totalDays: totalDaysCount,
      };
    }

    // Active window
    const elapsed = now - start;
    const remaining = end - now;
    const remainingDays = Math.ceil(remaining / msPerDay);
    const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    const percentTimeLeft = 100 - percentElapsed;

    let variant: "safe" | "warning" | "urgent" = "safe";
    if (percentTimeLeft < 20 || remainingDays <= 5) {
      variant = "urgent";
    } else if (percentTimeLeft <= 50) {
      variant = "warning";
    }

    return {
      progressPercent: percentElapsed,
      statusText: `${remainingDays} ${remainingDays === 1 ? "day" : "days"} left (${remainingDays}/${totalDaysCount}d)`,
      colorVariant: variant,
      isUrgent: variant === "urgent",
      isOverdue: false,
      daysLeft: remainingDays,
      totalDays: totalDaysCount,
    };
  }, [startDate, endDate, status, isPublished]);

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
    <div className={`space-y-1 ${compact ? "w-32" : "w-44"}`}>
      <div className="flex items-center justify-between text-[10px] leading-tight">
        <span className={`flex items-center gap-1 ${textColor}`}>
          {isPublished ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
          ) : isOverdue ? (
            <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
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

