/**
 * Frontend Utilities for National Reporting Annual Period and Recurring Period Generation
 */

import { ReportingPeriod } from "@/redux/types/nationalReporting";
import {
  type CalendarSystem,
  calculateCalendarAnnualEndDate,
  generateCalendarPeriods,
} from "./calendarUtils";

function pad(num: number): string {
  return String(num).padStart(2, "0");
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Calculate full-year end date given an annual start date (1 full year minus 1 day)
 */
export function calculateAnnualEndDate(
  startDateStr: string,
  calendarSystem: CalendarSystem = "GC"
): string {
  if (!startDateStr) return "";
  return calculateCalendarAnnualEndDate(startDateStr, calendarSystem);
}

/**
 * Validate that an annual date range is valid (start before end, duration ~1 year)
 */
export function validateAnnualDateRange(
  startDateStr: string,
  endDateStr: string
): { valid: boolean; message?: string; days?: number } {
  if (!startDateStr || !endDateStr) {
    return { valid: false, message: "Both annual start date and end date are required." };
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, message: "Invalid date format." };
  }

  if (start >= end) {
    return { valid: false, message: "Annual start date must be strictly before end date." };
  }

  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays < 350 || diffDays > 370) {
    return {
      valid: false,
      message: `Annual date range must span approximately one full year (365/366 days). Current range is ${diffDays} days.`,
    };
  }

  return { valid: true, days: diffDays };
}

/**
 * Get expected number of periods for a given frequency
 */
export function getExpectedPeriodCount(frequency: string): number {
  const f = String(frequency || "quarterly").toLowerCase().replace(/[\s\-]/g, "_");
  if (f === "monthly" || f === "month") return 12;
  if (f === "semi_annually" || f === "semiannual" || f === "semi_annual") return 2;
  if (f === "annually" || f === "annual") return 1;
  return 4; // default quarterly
}

/**
 * Generate recurring periods for a given annual date range and reporting frequency
 */
export function generateReportingPeriods(
  startDateStr: string,
  endDateStr: string,
  frequency: string,
  calendarSystem: CalendarSystem = "GC"
): ReportingPeriod[] {
  if (!startDateStr || !endDateStr) return [];
  return generateCalendarPeriods(startDateStr, endDateStr, frequency, calendarSystem) as ReportingPeriod[];
}

