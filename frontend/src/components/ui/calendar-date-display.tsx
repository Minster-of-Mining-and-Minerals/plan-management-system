"use client";

import React from "react";
import {
  type CalendarSystem,
  formatDateByCalendar,
  formatDateRangeByCalendar,
} from "@/utils/calendarUtils";

interface CalendarDateDisplayProps {
  date?: string | null;
  endDate?: string | null;
  calendarSystem?: CalendarSystem;
  showEquivalent?: boolean;
  showSuffix?: boolean;
  className?: string;
}

export function CalendarDateDisplay({
  date,
  endDate,
  calendarSystem = "GC",
  showEquivalent = false,
  showSuffix = true,
  className,
}: CalendarDateDisplayProps) {
  if (!date) return null;

  const primary = endDate
    ? formatDateRangeByCalendar(date, endDate, calendarSystem, { showSuffix })
    : formatDateByCalendar(date, calendarSystem, { showSuffix });

  const otherCal: CalendarSystem = calendarSystem === "EC" ? "GC" : "EC";
  const secondary = showEquivalent
    ? endDate
      ? formatDateRangeByCalendar(date, endDate, otherCal, { showSuffix: true })
      : formatDateByCalendar(date, otherCal, { showSuffix: true })
    : null;

  return (
    <span className={className} title={secondary || undefined}>
      {primary}
      {secondary && <span className="ml-1.5 text-[11px] text-muted-foreground">({secondary})</span>}
    </span>
  );
}
