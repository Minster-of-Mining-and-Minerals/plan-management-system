import { format, parseISO } from "date-fns";
import type { PlanVersion } from "@/redux/types/plan";

export function toDateOnlyString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function computePlanningEndDate(
  startDateStr: string,
  durationYears: number
): string {
  const start = parseISO(startDateStr);
  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  const day = start.getDate();
  const endYear = year + durationYears - 1;
  const endDay = Math.min(day, daysInMonth(endYear, month));
  return `${endYear}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
}

/** @deprecated Use computePlanningEndDate */
export function computeEndYear(startYear: number, durationYears: number): number {
  return startYear + durationYears - 1;
}

function formatDateLabel(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function formatPlanningPeriod(
  version: Pick<
    PlanVersion,
    | "planning_start_date"
    | "planning_end_date"
    | "start_year"
    | "end_year"
    | "start_month"
    | "end_month"
  >
): string {
  if (version.planning_start_date && version.planning_end_date) {
    return `${formatDateLabel(version.planning_start_date)} – ${formatDateLabel(version.planning_end_date)}`;
  }

  if (version.start_month && version.end_month) {
    const startMonth = format(new Date(2000, version.start_month - 1, 1), "MMM");
    const endMonth = format(new Date(2000, version.end_month - 1, 1), "MMM");
    return `${startMonth} ${version.start_year} – ${endMonth} ${version.end_year}`;
  }

  return `${version.start_year} – ${version.end_year}`;
}

export function formatDurationYears(years: number): string {
  return years === 1 ? "1 Year" : `${years} Years`;
}

export function buildDurationOptions(min: number, max: number): number[] {
  const options: number[] = [];
  for (let i = min; i <= max; i += 1) {
    options.push(i);
  }
  return options;
}

export function getPlanDraftDisplayName(version: PlanVersion): string {
  if (version.draft_name) return version.draft_name;
  if (version.planning_start_date) {
    return `Plan ${format(parseISO(version.planning_start_date), "yyyy")}`;
  }
  return `Plan ${version.start_year ?? version.year}`;
}

export function getDefaultPlanningStartDate(): string {
  const now = new Date();
  return toDateOnlyString(new Date(now.getFullYear(), now.getMonth(), 1));
}
