import { toGC, toEC, monthNames } from "kenat";

export type CalendarSystem = "GC" | "EC";

export interface CalendarDateParts {
  calendarSystem: CalendarSystem;
  year: number;
  month: number;
  day: number;
  dateStr: string;
  monthName: string;
  monthNameAmharic?: string;
  canonicalDate: string;
}

export interface CalendarPeriod {
  period_index: number;
  period_label: string;
  division_label?: string;
  ethiopian_month?: number;
  ethiopian_month_name?: string;
  start_date: string;
  end_date: string;
  display_start_date: string;
  display_end_date: string;
  calendar_system: CalendarSystem;
  name: string;
}

export const ETHIOPIAN_MONTH_NAMES_EN: string[] = monthNames?.english || [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
];

export const ETHIOPIAN_MONTH_NAMES_AM: string[] = monthNames?.amharic || [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜን",
];

export const GREGORIAN_MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

export function formatDateOnly(year: number, month: number, day: number): string {
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
}

export function normalizeCalendarSystem(
  value?: string | null,
  fallback: CalendarSystem = "GC"
): CalendarSystem {
  if (!value) return fallback;
  const upper = String(value).trim().toUpperCase();
  if (upper === "EC" || upper === "ETHIOPIAN") return "EC";
  if (upper === "GC" || upper === "GREGORIAN") return "GC";
  return fallback;
}

export function parseDateOnlyString(
  dateStr?: string | null
): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function isEthiopianLeapYear(ethYear: number): boolean {
  return Number(ethYear) % 4 === 3;
}

export function getEthiopianDaysInMonth(ethYear: number, ethMonth: number): number {
  const m = Number(ethMonth);
  if (m >= 1 && m <= 12) return 30;
  if (m === 13) return isEthiopianLeapYear(ethYear) ? 6 : 5;
  return 0;
}

export function getGregorianDaysInMonth(gYear: number, gMonth: number): number {
  if (gMonth < 1 || gMonth > 12) return 0;
  return new Date(Date.UTC(gYear, gMonth, 0)).getUTCDate();
}

export function validateGregorianDate(year: number, month: number, day: number): {
  valid: boolean;
  message?: string;
  normalized?: { year: number; month: number; day: number; dateStr: string };
} {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { valid: false, message: "Gregorian date parts must be integers." };
  }
  if (year < 1900 || year > 2200) {
    return { valid: false, message: "Gregorian year must be between 1900 and 2200." };
  }
  if (month < 1 || month > 12) {
    return { valid: false, message: `Invalid Gregorian month: ${month}.` };
  }
  const maxDay = getGregorianDaysInMonth(year, month);
  if (day < 1 || day > maxDay) {
    return { valid: false, message: `Invalid Gregorian day ${day} (max ${maxDay}).` };
  }
  return {
    valid: true,
    normalized: { year, month, day, dateStr: formatDateOnly(year, month, day) },
  };
}

export function validateEthiopianDate(year: number, month: number, day: number): {
  valid: boolean;
  message?: string;
  normalized?: { year: number; month: number; day: number; dateStr: string };
} {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { valid: false, message: "Ethiopian date parts must be integers." };
  }
  if (year < 1900 || year > 2200) {
    return { valid: false, message: "Ethiopian year must be between 1900 and 2200." };
  }
  if (month < 1 || month > 13) {
    return { valid: false, message: `Invalid Ethiopian month: ${month}. Must be 1–13.` };
  }
  const maxDay = getEthiopianDaysInMonth(year, month);
  if (day < 1 || day > maxDay) {
    const monthName = ETHIOPIAN_MONTH_NAMES_EN[month - 1] || `Month ${month}`;
    return {
      valid: false,
      message: `Invalid Ethiopian day ${day} for ${monthName} ${year} (valid: 1–${maxDay}).`,
    };
  }
  return {
    valid: true,
    normalized: { year, month, day, dateStr: formatDateOnly(year, month, day) },
  };
}

export function convertEthiopianToGregorian(ethYear: number, ethMonth: number, ethDay: number) {
  const check = validateEthiopianDate(ethYear, ethMonth, ethDay);
  if (!check.valid) {
    throw new Error(check.message);
  }
  const gc = toGC(ethYear, ethMonth, ethDay);
  return {
    year: gc.year,
    month: gc.month,
    day: gc.day,
    dateStr: formatDateOnly(gc.year, gc.month, gc.day),
  };
}

export function convertGregorianToEthiopian(
  gYearOrStr: number | string | Date,
  gMonth?: number,
  gDay?: number
) {
  let y: number;
  let m: number;
  let d: number;

  if (typeof gYearOrStr === "string") {
    const parsed = parseDateOnlyString(gYearOrStr);
    if (!parsed) throw new Error(`Invalid Gregorian date string: ${gYearOrStr}`);
    ({ year: y, month: m, day: d } = parsed);
  } else if (gYearOrStr instanceof Date) {
    y = gYearOrStr.getFullYear();
    m = gYearOrStr.getMonth() + 1;
    d = gYearOrStr.getDate();
  } else {
    y = Number(gYearOrStr);
    m = Number(gMonth);
    d = Number(gDay);
  }

  const check = validateGregorianDate(y, m, d);
  if (!check.valid) {
    throw new Error(check.message);
  }
  const ec = toEC(y, m, d);
  return {
    year: ec.year,
    month: ec.month,
    day: ec.day,
    dateStr: formatDateOnly(ec.year, ec.month, ec.day),
    monthName: ETHIOPIAN_MONTH_NAMES_EN[ec.month - 1] || "",
    monthNameAmharic: ETHIOPIAN_MONTH_NAMES_AM[ec.month - 1] || "",
  };
}

export function getCalendarDateParts(
  canonicalDateStr?: string | null,
  calendarSystem: CalendarSystem = "GC"
): CalendarDateParts | null {
  const cal = normalizeCalendarSystem(calendarSystem);
  const parsed = parseDateOnlyString(canonicalDateStr);
  if (!parsed) return null;

  if (cal === "EC") {
    const ec = convertGregorianToEthiopian(parsed.year, parsed.month, parsed.day);
    return {
      calendarSystem: "EC",
      year: ec.year,
      month: ec.month,
      day: ec.day,
      dateStr: ec.dateStr,
      monthName: ec.monthName,
      monthNameAmharic: ec.monthNameAmharic,
      canonicalDate: formatDateOnly(parsed.year, parsed.month, parsed.day),
    };
  }

  return {
    calendarSystem: "GC",
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
    dateStr: formatDateOnly(parsed.year, parsed.month, parsed.day),
    monthName: GREGORIAN_MONTH_NAMES_SHORT[parsed.month - 1] || "",
    canonicalDate: formatDateOnly(parsed.year, parsed.month, parsed.day),
  };
}

export function formatDateByCalendar(
  canonicalDateStr?: string | null,
  calendarSystem: CalendarSystem = "GC",
  options: { format?: "human" | "iso"; showSuffix?: boolean; includeAmharic?: boolean } = {}
): string {
  if (!canonicalDateStr) return "";
  const parts = getCalendarDateParts(canonicalDateStr, calendarSystem);
  if (!parts) return String(canonicalDateStr);

  if (options.format === "iso") {
    return parts.dateStr;
  }
  if (options.includeAmharic && parts.calendarSystem === "EC") {
    return `${parts.monthName} (${parts.monthNameAmharic}) ${parts.day}, ${parts.year}`;
  }
  const suffix = options.showSuffix ? ` (${parts.calendarSystem})` : "";
  return `${parts.monthName} ${parts.day}, ${parts.year}${suffix}`;
}

export function formatDateRangeByCalendar(
  startCanonical?: string | null,
  endCanonical?: string | null,
  calendarSystem: CalendarSystem = "GC",
  options: { showSuffix?: boolean } = {}
): string {
  if (!startCanonical || !endCanonical) return "";
  const s = formatDateByCalendar(startCanonical, calendarSystem, { showSuffix: false });
  const e = formatDateByCalendar(endCanonical, calendarSystem, { showSuffix: options.showSuffix });
  return `${s} – ${e}`;
}

export function calculateCalendarAnnualEndDate(
  canonicalStartDateStr: string,
  calendarSystem: CalendarSystem = "GC"
): string {
  const cal = normalizeCalendarSystem(calendarSystem);
  const parsed = parseDateOnlyString(canonicalStartDateStr);
  if (!parsed) return "";

  if (cal === "EC") {
    const ecStart = convertGregorianToEthiopian(parsed.year, parsed.month, parsed.day);
    let targetEcYear = ecStart.year;
    let targetEcMonth = ecStart.month;
    let targetEcDay = ecStart.day - 1;

    if (targetEcDay >= 1) {
      targetEcYear = ecStart.year + 1;
      targetEcDay = Math.min(targetEcDay, getEthiopianDaysInMonth(targetEcYear, targetEcMonth));
    } else if (ecStart.month === 1) {
      targetEcYear = ecStart.year;
      targetEcMonth = 13;
      targetEcDay = getEthiopianDaysInMonth(targetEcYear, 13);
    } else {
      targetEcYear = ecStart.year + 1;
      targetEcMonth = ecStart.month - 1;
      targetEcDay = getEthiopianDaysInMonth(targetEcYear, targetEcMonth);
    }
    return convertEthiopianToGregorian(targetEcYear, targetEcMonth, targetEcDay).dateStr;
  }

  const dt = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  dt.setUTCFullYear(dt.getUTCFullYear() + 1);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return formatDateOnly(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function computeCalendarPlanningEndDate(
  canonicalStartDateStr: string,
  durationYears: number,
  calendarSystem: CalendarSystem = "GC"
): string {
  const cal = normalizeCalendarSystem(calendarSystem);
  const parsed = parseDateOnlyString(canonicalStartDateStr);
  if (!parsed || durationYears < 1) return "";

  if (cal === "EC") {
    const ecStart = convertGregorianToEthiopian(parsed.year, parsed.month, parsed.day);
    let endEcYear: number;
    let endEcMonth: number;
    let endEcDay: number;
    if (ecStart.month === 1 && ecStart.day === 1) {
      endEcYear = ecStart.year + durationYears - 1;
      endEcMonth = 13;
      endEcDay = getEthiopianDaysInMonth(endEcYear, 13);
    } else if (ecStart.day === 1) {
      endEcYear = ecStart.year + durationYears;
      endEcMonth = ecStart.month - 1;
      endEcDay = getEthiopianDaysInMonth(endEcYear, endEcMonth);
    } else {
      endEcYear = ecStart.year + durationYears;
      endEcMonth = ecStart.month;
      endEcDay = Math.min(ecStart.day - 1, getEthiopianDaysInMonth(endEcYear, endEcMonth));
    }
    return convertEthiopianToGregorian(endEcYear, endEcMonth, endEcDay).dateStr;
  }

  const endYear = parsed.year + durationYears - 1;
  const endDay = Math.min(parsed.day, getGregorianDaysInMonth(endYear, parsed.month));
  return formatDateOnly(endYear, parsed.month, endDay);
}

function addEthiopianMonths(ecYear: number, ecMonth: number, deltaMonths: number) {
  let y = ecYear;
  let m = ecMonth + deltaMonths;
  while (m > 13) {
    m -= 13;
    y += 1;
  }
  while (m < 1) {
    m += 13;
    y -= 1;
  }
  return { year: y, month: m };
}

export function generateCalendarPeriods(
  startDateStr: string,
  endDateStr: string,
  frequencyOrMode: string,
  calendarSystem: CalendarSystem = "GC"
): CalendarPeriod[] {
  const cal = normalizeCalendarSystem(calendarSystem);
  const startParsed = parseDateOnlyString(startDateStr);
  const endParsed = parseDateOnlyString(endDateStr);
  if (!startParsed || !endParsed) return [];

  const startDt = new Date(Date.UTC(startParsed.year, startParsed.month - 1, startParsed.day));
  const endDt = new Date(Date.UTC(endParsed.year, endParsed.month - 1, endParsed.day));
  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || startDt > endDt) return [];

  const freq = String(frequencyOrMode || "quarterly").toLowerCase().replace(/[\s\-]/g, "_");

  if (freq === "daily" || freq === "day") {
    const periods: CalendarPeriod[] = [];
    let idx = 1;
    let curr = new Date(startDt.getTime());
    while (curr <= endDt && idx <= 400) {
      const iso = formatDateOnly(curr.getUTCFullYear(), curr.getUTCMonth() + 1, curr.getUTCDate());
      const parts = getCalendarDateParts(iso, cal)!;
      const label = cal === "EC" ? `Day ${idx} (${parts.monthName} ${parts.day})` : `Day ${idx}`;
      periods.push({
        period_index: idx,
        period_label: label,
        division_label: `Day ${idx}`,
        start_date: iso,
        end_date: iso,
        display_start_date: parts.dateStr,
        display_end_date: parts.dateStr,
        calendar_system: cal,
        name: `${label} — ${formatDateByCalendar(iso, cal)}`,
      });
      curr = new Date(curr.getTime() + 86400000);
      idx += 1;
    }
    return periods;
  }

  if (freq === "weekly" || freq === "week") {
    const periods: CalendarPeriod[] = [];
    let idx = 1;
    let curr = new Date(startDt.getTime());
    while (curr <= endDt && idx <= 60) {
      const pEndDt = new Date(Math.min(curr.getTime() + 6 * 86400000, endDt.getTime()));
      const pStartStr = formatDateOnly(curr.getUTCFullYear(), curr.getUTCMonth() + 1, curr.getUTCDate());
      const pEndStr = formatDateOnly(pEndDt.getUTCFullYear(), pEndDt.getUTCMonth() + 1, pEndDt.getUTCDate());
      const sParts = getCalendarDateParts(pStartStr, cal)!;
      const eParts = getCalendarDateParts(pEndStr, cal)!;
      const label = `Week ${idx}`;
      periods.push({
        period_index: idx,
        period_label: label,
        division_label: `Week ${idx}`,
        start_date: pStartStr,
        end_date: pEndStr,
        display_start_date: sParts.dateStr,
        display_end_date: eParts.dateStr,
        calendar_system: cal,
        name: `${label} (${formatDateRangeByCalendar(pStartStr, pEndStr, cal)})`,
      });
      curr = new Date(pEndDt.getTime() + 86400000);
      idx += 1;
    }
    return periods;
  }

  if (cal === "EC") {
    const ecStart = convertGregorianToEthiopian(startParsed.year, startParsed.month, startParsed.day);
    const ecEnd = convertGregorianToEthiopian(endParsed.year, endParsed.month, endParsed.day);

    if (freq === "annually" || freq === "annual") {
      return [
        {
          period_index: 1,
          period_label: "Annual",
          division_label: "Division 1",
          start_date: startDateStr,
          end_date: endDateStr,
          display_start_date: ecStart.dateStr,
          display_end_date: ecEnd.dateStr,
          calendar_system: "EC",
          name: `Annual (${formatDateRangeByCalendar(startDateStr, endDateStr, "EC")})`,
        },
      ];
    }

    if (freq === "monthly" || freq === "month") {
      const periods: CalendarPeriod[] = [];
      let currYear = ecStart.year;
      let currMonth = ecStart.month;
      let currDay = ecStart.day;
      let idx = 1;

      while (idx <= 15) {
        const pStartGc = convertEthiopianToGregorian(currYear, currMonth, currDay).dateStr;
        if (new Date(pStartGc + "T00:00:00Z") > endDt) break;

        let pEndYear = currYear;
        let pEndMonth = currMonth;
        let pEndDay: number;
        if (currDay === 1) {
          pEndDay = getEthiopianDaysInMonth(currYear, currMonth);
        } else {
          const next = addEthiopianMonths(currYear, currMonth, 1);
          pEndYear = next.year;
          pEndMonth = next.month;
          pEndDay = Math.min(currDay - 1, getEthiopianDaysInMonth(pEndYear, pEndMonth));
        }

        let pEndGc = convertEthiopianToGregorian(pEndYear, pEndMonth, pEndDay).dateStr;
        if (new Date(pEndGc + "T00:00:00Z") > endDt) {
          pEndGc = endDateStr;
        }

        const sParts = getCalendarDateParts(pStartGc, "EC")!;
        const eParts = getCalendarDateParts(pEndGc, "EC")!;
        const monthLabel = ETHIOPIAN_MONTH_NAMES_EN[currMonth - 1] || `Month ${idx}`;
        const label = currMonth === 13 ? `Pagume (${currYear})` : `${monthLabel} (${currYear})`;

        periods.push({
          period_index: idx,
          period_label: label,
          division_label: `Month ${idx}`,
          ethiopian_month: currMonth,
          ethiopian_month_name: monthLabel,
          start_date: pStartGc,
          end_date: pEndGc,
          display_start_date: sParts.dateStr,
          display_end_date: eParts.dateStr,
          calendar_system: "EC",
          name: `${label} (${formatDateRangeByCalendar(pStartGc, pEndGc, "EC")})`,
        });

        if (pEndGc === endDateStr) break;

        const nextStartDt = new Date(pEndGc + "T00:00:00Z");
        nextStartDt.setUTCDate(nextStartDt.getUTCDate() + 1);
        if (nextStartDt > endDt) break;
        const nextEc = convertGregorianToEthiopian(
          nextStartDt.getUTCFullYear(),
          nextStartDt.getUTCMonth() + 1,
          nextStartDt.getUTCDate()
        );
        currYear = nextEc.year;
        currMonth = nextEc.month;
        currDay = nextEc.day;
        idx += 1;
      }

      return periods;
    }

    const count = freq === "semi_annually" || freq === "semiannual" || freq === "semi_annual" ? 2 : 4;
    const prefix = count === 2 ? "Semester" : "Q";
    const stepMonths = count === 2 ? 6 : 3;
    const periods: CalendarPeriod[] = [];
    let currEc = { year: ecStart.year, month: ecStart.month, day: ecStart.day };

    for (let i = 0; i < count; i += 1) {
      const pStartGc = convertEthiopianToGregorian(currEc.year, currEc.month, currEc.day).dateStr;
      let pEndGc: string;
      if (i === count - 1) {
        pEndGc = endDateStr;
      } else {
        let mRemaining = stepMonths;
        let y = currEc.year;
        let m = currEc.month;
        while (mRemaining > 0) {
          if (m !== 13) mRemaining -= 1;
          if (mRemaining > 0) {
            const nxt = addEthiopianMonths(y, m, 1);
            y = nxt.year;
            m = nxt.month;
          }
        }
        let endDay =
          currEc.day === 1
            ? getEthiopianDaysInMonth(y, m)
            : Math.min(currEc.day - 1, getEthiopianDaysInMonth(y, m));
        if (currEc.day === 1 && m === 12) {
          m = 13;
          endDay = getEthiopianDaysInMonth(y, 13);
        }
        pEndGc = convertEthiopianToGregorian(y, m, endDay).dateStr;
        if (new Date(pEndGc + "T00:00:00Z") > endDt) {
          pEndGc = endDateStr;
        }
      }

      const sParts = getCalendarDateParts(pStartGc, "EC")!;
      const eParts = getCalendarDateParts(pEndGc, "EC")!;
      const label = prefix === "Q" ? `Q${i + 1}` : `${prefix} ${i + 1}`;
      periods.push({
        period_index: i + 1,
        period_label: label,
        division_label: `Division ${i + 1}`,
        start_date: pStartGc,
        end_date: pEndGc,
        display_start_date: sParts.dateStr,
        display_end_date: eParts.dateStr,
        calendar_system: "EC",
        name: `${label} (${formatDateRangeByCalendar(pStartGc, pEndGc, "EC")})`,
      });

      const nextDt = new Date(pEndGc + "T00:00:00Z");
      nextDt.setUTCDate(nextDt.getUTCDate() + 1);
      if (nextDt <= endDt) {
        const nextEc = convertGregorianToEthiopian(
          nextDt.getUTCFullYear(),
          nextDt.getUTCMonth() + 1,
          nextDt.getUTCDate()
        );
        currEc = { year: nextEc.year, month: nextEc.month, day: nextEc.day };
      }
    }
    return periods;
  }

  // GC fallback
  const count =
    freq === "monthly" || freq === "month"
      ? 12
      : freq === "semi_annually" || freq === "semiannual" || freq === "semi_annual"
      ? 2
      : freq === "annually" || freq === "annual"
      ? 1
      : 4;

  const prefix = count === 12 ? "Month" : count === 2 ? "Semester" : count === 1 ? "Annual" : "Q";
  const stepMonths = count === 12 ? 1 : count === 2 ? 6 : count === 1 ? 12 : 3;
  const isFirstOfMonth = startDt.getUTCDate() === 1;
  const isMonthlyAlignedCycle =
    count === 12 &&
    (isFirstOfMonth ||
      (startDt.getUTCDate() === 8 && endDt.getUTCDate() === 7) ||
      Math.abs(startDt.getUTCDate() - (endDt.getUTCDate() + 1)) <= 1);

  const periods: CalendarPeriod[] = [];

  if ((isFirstOfMonth && count > 1) || isMonthlyAlignedCycle) {
    let currStart = new Date(startDt.getTime());
    for (let i = 0; i < count; i += 1) {
      const pStart = new Date(currStart.getTime());
      let pEnd: Date;
      if (i === count - 1) {
        pEnd = new Date(endDt.getTime());
      } else {
        const next = new Date(currStart.getTime());
        next.setUTCMonth(next.getUTCMonth() + stepMonths);
        next.setUTCDate(next.getUTCDate() - 1);
        pEnd = next > endDt ? new Date(endDt.getTime()) : next;

        const nextStart = new Date(pEnd.getTime());
        nextStart.setUTCDate(nextStart.getUTCDate() + 1);
        currStart = nextStart;
      }

      const label = prefix === "Annual" ? "Annual" : prefix === "Q" ? `Q${i + 1}` : `${prefix} ${i + 1}`;
      const pStartStr = formatDateOnly(pStart.getUTCFullYear(), pStart.getUTCMonth() + 1, pStart.getUTCDate());
      const pEndStr = formatDateOnly(pEnd.getUTCFullYear(), pEnd.getUTCMonth() + 1, pEnd.getUTCDate());

      periods.push({
        period_index: i + 1,
        period_label: label,
        division_label: `Division ${i + 1}`,
        start_date: pStartStr,
        end_date: pEndStr,
        display_start_date: pStartStr,
        display_end_date: pEndStr,
        calendar_system: "GC",
        name: `${label} (${pStartStr} to ${pEndStr})`,
      });
    }
  } else {
    const totalMs = endDt.getTime() - startDt.getTime() + 86400000;
    const totalDays = Math.round(totalMs / 86400000);
    for (let i = 0; i < count; i += 1) {
      const startDayOffset = Math.round((i * totalDays) / count);
      const endDayOffset = i === count - 1 ? totalDays - 1 : Math.round(((i + 1) * totalDays) / count) - 1;
      const pStart = new Date(startDt.getTime() + startDayOffset * 86400000);
      const pEnd = new Date(startDt.getTime() + endDayOffset * 86400000);
      const label = prefix === "Annual" ? "Annual" : prefix === "Q" ? `Q${i + 1}` : `${prefix} ${i + 1}`;
      const pStartStr = formatDateOnly(pStart.getUTCFullYear(), pStart.getUTCMonth() + 1, pStart.getUTCDate());
      const pEndStr = formatDateOnly(pEnd.getUTCFullYear(), pEnd.getUTCMonth() + 1, pEnd.getUTCDate());

      periods.push({
        period_index: i + 1,
        period_label: label,
        division_label: `Division ${i + 1}`,
        start_date: pStartStr,
        end_date: pEndStr,
        display_start_date: pStartStr,
        display_end_date: pEndStr,
        calendar_system: "GC",
        name: `${label} (${pStartStr} to ${pEndStr})`,
      });
    }
  }

  return periods;
}
