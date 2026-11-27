"use strict";

const { Kenat, toGC, toEC, monthNames } = require("kenat");

const VALID_CALENDAR_SYSTEMS = ["GC", "EC"];
const DEFAULT_CALENDAR_SYSTEM = "GC";

const ETHIOPIAN_MONTH_NAMES_EN = monthNames?.english || [
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

const ETHIOPIAN_MONTH_NAMES_AM = monthNames?.amharic || [
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

const GREGORIAN_MONTH_NAMES_SHORT = [
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function pad4(n) {
  return String(n).padStart(4, "0");
}

function formatDateOnly(year, month, day) {
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
}

function isValidCalendarSystem(value) {
  return VALID_CALENDAR_SYSTEMS.includes(String(value || "").toUpperCase());
}

function normalizeCalendarSystem(value, fallback = DEFAULT_CALENDAR_SYSTEM) {
  if (!value) return fallback;
  const upper = String(value).trim().toUpperCase();
  if (upper === "GC" || upper === "GREGORIAN") return "GC";
  if (upper === "EC" || upper === "ETHIOPIAN") return "EC";
  return fallback;
}

function parseDateOnlyString(dateStr) {
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

function isEthiopianLeapYear(ethYear) {
  return Number(ethYear) % 4 === 3;
}

function getEthiopianDaysInMonth(ethYear, ethMonth) {
  const m = Number(ethMonth);
  if (m >= 1 && m <= 12) return 30;
  if (m === 13) return isEthiopianLeapYear(ethYear) ? 6 : 5;
  return 0;
}

function getGregorianDaysInMonth(gYear, gMonth) {
  if (gMonth < 1 || gMonth > 12) return 0;
  return new Date(Date.UTC(gYear, gMonth, 0)).getUTCDate();
}

function validateGregorianDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return { valid: false, message: "Gregorian date parts must be integers." };
  }
  if (y < 1900 || y > 2200) {
    return { valid: false, message: "Gregorian year must be between 1900 and 2200." };
  }
  if (m < 1 || m > 12) {
    return { valid: false, message: `Invalid Gregorian month: ${m}.` };
  }
  const maxDay = getGregorianDaysInMonth(y, m);
  if (d < 1 || d > maxDay) {
    return { valid: false, message: `Invalid Gregorian day ${d} for ${y}-${pad2(m)} (max ${maxDay}).` };
  }
  return { valid: true, normalized: { year: y, month: m, day: d, dateStr: formatDateOnly(y, m, d) } };
}

function validateEthiopianDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return { valid: false, message: "Ethiopian date parts must be integers." };
  }
  if (y < 1900 || y > 2200) {
    return { valid: false, message: "Ethiopian year must be between 1900 and 2200." };
  }
  if (m < 1 || m > 13) {
    return { valid: false, message: `Invalid Ethiopian month: ${m}. Must be 1–13.` };
  }
  const maxDay = getEthiopianDaysInMonth(y, m);
  if (d < 1 || d > maxDay) {
    const monthName = ETHIOPIAN_MONTH_NAMES_EN[m - 1] || `Month ${m}`;
    return {
      valid: false,
      message: `Invalid Ethiopian day ${d} for ${monthName} ${y} (valid: 1–${maxDay}).`,
    };
  }
  return { valid: true, normalized: { year: y, month: m, day: d, dateStr: formatDateOnly(y, m, d) } };
}

function validateDateForCalendar(dateStr, calendarSystem = "GC") {
  const cal = normalizeCalendarSystem(calendarSystem);
  const parts = parseDateOnlyString(dateStr);
  if (!parts) {
    return { valid: false, message: "Date must be in YYYY-MM-DD format." };
  }
  return cal === "EC"
    ? validateEthiopianDate(parts.year, parts.month, parts.day)
    : validateGregorianDate(parts.year, parts.month, parts.day);
}

function convertEthiopianToGregorian(ethYear, ethMonth, ethDay) {
  const check = validateEthiopianDate(ethYear, ethMonth, ethDay);
  if (!check.valid) {
    throw new Error(check.message);
  }
  const gc = toGC(Number(ethYear), Number(ethMonth), Number(ethDay));
  return {
    year: gc.year,
    month: gc.month,
    day: gc.day,
    dateStr: formatDateOnly(gc.year, gc.month, gc.day),
  };
}

function convertGregorianToEthiopian(gYearOrStr, gMonth, gDay) {
  let y, m, d;
  if (typeof gYearOrStr === "string") {
    const parsed = parseDateOnlyString(gYearOrStr);
    if (!parsed) throw new Error(`Invalid Gregorian date string: ${gYearOrStr}`);
    ({ year: y, month: m, day: d } = parsed);
  } else if (gYearOrStr instanceof Date) {
    y = gYearOrStr.getUTCFullYear();
    m = gYearOrStr.getUTCMonth() + 1;
    d = gYearOrStr.getUTCDate();
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

/**
 * Resolve an incoming date string (expressed in `inputCalendarSystem`) to canonical GC YYYY-MM-DD.
 */
function resolveCanonicalDateInput(dateStr, inputCalendarSystem = "GC") {
  const cal = normalizeCalendarSystem(inputCalendarSystem);
  const validation = validateDateForCalendar(dateStr, cal);
  if (!validation.valid) {
    return { valid: false, message: validation.message };
  }
  const { year, month, day, dateStr: normalizedInputStr } = validation.normalized;
  if (cal === "EC") {
    const gc = convertEthiopianToGregorian(year, month, day);
    return {
      valid: true,
      calendarSystem: "EC",
      canonicalDate: gc.dateStr,
      calendarDate: normalizedInputStr,
      parts: { year, month, day, monthName: ETHIOPIAN_MONTH_NAMES_EN[month - 1] },
    };
  }
  return {
    valid: true,
    calendarSystem: "GC",
    canonicalDate: normalizedInputStr,
    calendarDate: normalizedInputStr,
    parts: { year, month, day, monthName: GREGORIAN_MONTH_NAMES_SHORT[month - 1] },
  };
}

/**
 * Given a canonical GC YYYY-MM-DD date string, return parts in the target calendar system.
 */
function getCalendarDateParts(canonicalDateStr, calendarSystem = "GC") {
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

function formatDateByCalendar(canonicalDateStr, calendarSystem = "GC", options = {}) {
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

function formatDateRangeByCalendar(startCanonical, endCanonical, calendarSystem = "GC", options = {}) {
  if (!startCanonical || !endCanonical) return "";
  const startLabel = formatDateByCalendar(startCanonical, calendarSystem, { ...options, showSuffix: false });
  const endLabel = formatDateByCalendar(endCanonical, calendarSystem, { ...options, showSuffix: options.showSuffix });
  return `${startLabel} – ${endLabel}`;
}

/**
 * Add 1 calendar year minus 1 day in the target calendar system, returning canonical GC YYYY-MM-DD.
 * - GC: 2026-07-01 -> 2027-06-30
 * - EC: 2019-01-01 EC -> 2019-13-05 EC (or 2019-13-06 if leap year)
 */
function calculateCalendarAnnualEndDate(canonicalStartDateStr, calendarSystem = "GC") {
  const cal = normalizeCalendarSystem(calendarSystem);
  const parsed = parseDateOnlyString(canonicalStartDateStr);
  if (!parsed) return "";

  if (cal === "EC") {
    const ecStart = convertGregorianToEthiopian(parsed.year, parsed.month, parsed.day);
    // If start is Meskerem 1 (1/1), full year ends on Pagume 5/6 of the SAME Ethiopian year
    let targetEcYear = ecStart.year;
    let targetEcMonth = ecStart.month;
    let targetEcDay = ecStart.day - 1;

    if (targetEcDay >= 1) {
      // Same month/day-1 in next Ethiopian year
      targetEcYear = ecStart.year + 1;
      const maxD = getEthiopianDaysInMonth(targetEcYear, targetEcMonth);
      targetEcDay = Math.min(targetEcDay, maxD);
    } else {
      // Day was 1 -> ends on last day of previous month in next Ethiopian year
      if (ecStart.month === 1) {
        targetEcYear = ecStart.year;
        targetEcMonth = 13;
        targetEcDay = getEthiopianDaysInMonth(targetEcYear, 13);
      } else {
        targetEcYear = ecStart.year + 1;
        targetEcMonth = ecStart.month - 1;
        targetEcDay = getEthiopianDaysInMonth(targetEcYear, targetEcMonth);
      }
    }
    return convertEthiopianToGregorian(targetEcYear, targetEcMonth, targetEcDay).dateStr;
  }

  // GC: add 1 year minus 1 day
  const dt = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  dt.setUTCFullYear(dt.getUTCFullYear() + 1);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return formatDateOnly(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Compute multi-year planning period boundaries in canonical GC and calendar-native years/months.
 */
function computeCalendarPlanningPeriodEnd(canonicalStartDateStr, durationYears, calendarSystem = "GC") {
  const cal = normalizeCalendarSystem(calendarSystem);
  const parsed = parseDateOnlyString(canonicalStartDateStr);
  if (!parsed || !Number.isInteger(durationYears) || durationYears < 1) return null;

  if (cal === "EC") {
    const ecStart = convertGregorianToEthiopian(parsed.year, parsed.month, parsed.day);
    // Each planning year spans 1 full EC year (e.g. Meskerem 1 2019 -> Pagume 5 2019 for 1 year,
    // or Meskerem 1 2019 -> Pagume 5/6 (2019 + duration - 1)).
    // If start is not Meskerem 1 (e.g. Hamle 1 2018 -> Sene 30 2019), end is (start + durationYears) - 1 day.
    let endEcYear, endEcMonth, endEcDay;
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
    const endGc = convertEthiopianToGregorian(endEcYear, endEcMonth, endEcDay);
    return {
      calendar_system: "EC",
      planning_start_date: formatDateOnly(parsed.year, parsed.month, parsed.day),
      planning_end_date: endGc.dateStr,
      start_year: ecStart.year,
      start_month: ecStart.month,
      end_year: endEcYear,
      end_month: endEcMonth,
      ec_start_date: ecStart.dateStr,
      ec_end_date: formatDateOnly(endEcYear, endEcMonth, endEcDay),
    };
  }

  // GC: match existing planningConfigurationService semantics
  const startDt = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  let endYear = parsed.year + durationYears - 1;
  let endMonth = parsed.month;
  let endDay = parsed.day;

  // If starting on Jan 1, standard GC calendar year ends Dec 31 of (startYear + durationYears - 1).
  // Wait: existing planningConfigurationService used (year + duration - 1, month, min(day, daysInMonth))
  // Keep exact compatibility with existing GC behavior!
  const maxD = getGregorianDaysInMonth(endYear, endMonth);
  endDay = Math.min(endDay, maxD);
  const endDateStr = formatDateOnly(endYear, endMonth, endDay);

  return {
    calendar_system: "GC",
    planning_start_date: formatDateOnly(startDt.getUTCFullYear(), startDt.getUTCMonth() + 1, startDt.getUTCDate()),
    planning_end_date: endDateStr,
    start_year: parsed.year,
    start_month: parsed.month,
    end_year: endYear,
    end_month: endMonth,
  };
}

/**
 * Enumerate annual slices for a Master Plan in either GC or EC.
 */
function enumerateCalendarAnnualSlices(master, calendarSystem = "GC") {
  const cal = normalizeCalendarSystem(calendarSystem || master.calendar_system);
  const duration = Number(master.planning_duration_years) || 1;
  const startParts = parseDateOnlyString(master.planning_start_date);
  const slices = [];

  if (cal === "EC" && startParts) {
    let currStartGc = formatDateOnly(startParts.year, startParts.month, startParts.day);
    const ecStart = convertGregorianToEthiopian(startParts.year, startParts.month, startParts.day);

    for (let i = 0; i < duration; i += 1) {
      const planningYear = ecStart.year + i;
      const annualEndGc = calculateCalendarAnnualEndDate(currStartGc, "EC");
      const currEcStart = getCalendarDateParts(currStartGc, "EC");
      const currEcEnd = getCalendarDateParts(annualEndGc, "EC");

      slices.push({
        sequence_index: i + 1,
        planning_year: planningYear,
        calendar_system: "EC",
        planning_start_date: currStartGc,
        planning_end_date: annualEndGc,
        start_year: currEcStart.year,
        start_month: currEcStart.month,
        end_year: currEcEnd.year,
        end_month: currEcEnd.month,
      });

      // Next annual slice starts the day after annualEndGc
      const endParsed = parseDateOnlyString(annualEndGc);
      const nextDt = new Date(Date.UTC(endParsed.year, endParsed.month - 1, endParsed.day + 1));
      currStartGc = formatDateOnly(nextDt.getUTCFullYear(), nextDt.getUTCMonth() + 1, nextDt.getUTCDate());
    }
    return slices;
  }

  // GC fallback matching existing planVersionLifecycleService
  for (let i = 0; i < duration; i += 1) {
    const planningYear = master.start_year + i;
    const monthStr = pad2(master.start_month || 1);
    const startStr = startParts && duration === 1
      ? master.planning_start_date
      : `${planningYear}-${monthStr}-01`;
    const endStr = startParts && duration === 1
      ? master.planning_end_date
      : `${planningYear}-${monthStr}-01`;

    slices.push({
      sequence_index: i + 1,
      planning_year: planningYear,
      calendar_system: "GC",
      planning_start_date: startStr,
      planning_end_date: endStr,
      start_year: planningYear,
      start_month: master.start_month || 1,
      end_year: planningYear,
      end_month: master.end_month || master.start_month || 1,
    });
  }
  return slices;
}

/**
 * Advance an Ethiopian {year, month, day} by N months cleanly (handling 13-month year wrap).
 */
function addEthiopianMonths(ecYear, ecMonth, deltaMonths) {
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

/**
 * Generate calendar-aware periods between canonical GC startDateStr and endDateStr.
 * Supports: annually, semi_annually (semi_annual), quarterly, monthly, weekly, daily.
 */
function generateCalendarPeriods(startDateStr, endDateStr, frequencyOrMode, calendarSystem = "GC") {
  const cal = normalizeCalendarSystem(calendarSystem);
  const startParsed = parseDateOnlyString(startDateStr);
  const endParsed = parseDateOnlyString(endDateStr);
  if (!startParsed || !endParsed) return [];

  const startDt = new Date(Date.UTC(startParsed.year, startParsed.month - 1, startParsed.day));
  const endDt = new Date(Date.UTC(endParsed.year, endParsed.month - 1, endParsed.day));
  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || startDt > endDt) return [];

  const freq = String(frequencyOrMode || "quarterly").toLowerCase().replace(/[\s\-]/g, "_");

  // 1. Daily periods (calendar-agnostic canonical day steps, labeled in GC or EC)
  if (freq === "daily" || freq === "day") {
    const periods = [];
    let idx = 1;
    let curr = new Date(startDt.getTime());
    // Cap at 400 days to avoid runaway loops on invalid ranges
    while (curr <= endDt && idx <= 400) {
      const iso = formatDateOnly(curr.getUTCFullYear(), curr.getUTCMonth() + 1, curr.getUTCDate());
      const parts = getCalendarDateParts(iso, cal);
      const displayDate = formatDateByCalendar(iso, cal);
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
        name: `${label} — ${displayDate}`,
      });
      curr = new Date(curr.getTime() + 86400000);
      idx += 1;
    }
    return periods;
  }

  // 2. Weekly periods
  if (freq === "weekly" || freq === "week") {
    const periods = [];
    let idx = 1;
    let curr = new Date(startDt.getTime());
    while (curr <= endDt && idx <= 60) {
      const pEndDt = new Date(Math.min(curr.getTime() + 6 * 86400000, endDt.getTime()));
      const pStartStr = formatDateOnly(curr.getUTCFullYear(), curr.getUTCMonth() + 1, curr.getUTCDate());
      const pEndStr = formatDateOnly(pEndDt.getUTCFullYear(), pEndDt.getUTCMonth() + 1, pEndDt.getUTCDate());
      const sParts = getCalendarDateParts(pStartStr, cal);
      const eParts = getCalendarDateParts(pEndStr, cal);
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

  // 3. Ethiopian Calendar (EC) Monthly / Quarterly / Semi-Annual / Annual
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
      const periods = [];
      let currYear = ecStart.year;
      let currMonth = ecStart.month;
      let currDay = ecStart.day;
      let idx = 1;

      while (idx <= 15) {
        const pStartGc = convertEthiopianToGregorian(currYear, currMonth, currDay).dateStr;
        const pStartDt = new Date(pStartGc + "T00:00:00Z");
        if (pStartDt > endDt) break;

        // End of this EC month (day 30 for 1..12, day 5/6 for Pagume 13)
        // Or if started mid-month (day > 1), step 1 EC month - 1 day
        let pEndYear = currYear;
        let pEndMonth = currMonth;
        let pEndDay;
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

        const sParts = getCalendarDateParts(pStartGc, "EC");
        const eParts = getCalendarDateParts(pEndGc, "EC");
        const monthLabel = ETHIOPIAN_MONTH_NAMES_EN[currMonth - 1] || `Month ${idx}`;
        const label = currMonth === 13 ? `Pagume (${ecStart.year})` : `${monthLabel} (${currYear})`;

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
        const nextEc = convertGregorianToEthiopian(nextStartDt);
        currYear = nextEc.year;
        currMonth = nextEc.month;
        currDay = nextEc.day;
        idx += 1;
      }

      return periods;
    }

    // Quarterly (4) or Semi-Annually (2) in EC:
    // Each quarter = 3 EC months (1..3, 4..6, 7..9, 10..13 including Pagume at year end)
    // Each semester = 6 EC months (1..6, 7..13 including Pagume at year end)
    const count = freq === "semi_annually" || freq === "semiannual" || freq === "semi_annual" ? 2 : 4;
    const prefix = count === 2 ? "Semester" : "Q";
    const stepMonths = count === 2 ? 6 : 3;
    const periods = [];

    let currEc = { year: ecStart.year, month: ecStart.month, day: ecStart.day };
    for (let i = 0; i < count; i += 1) {
      const pStartGc = convertEthiopianToGregorian(currEc.year, currEc.month, currEc.day).dateStr;
      let pEndGc;
      if (i === count - 1) {
        pEndGc = endDateStr;
      } else {
        // Walk `stepMonths` EC months; skip Pagume (13) as a separate month slot so Pagume is folded into the enclosing quarter/semester
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
        // If the month immediately following is Pagume (13) and the start was day 1 of Meskerem/Hamle, check if Pagume should be absorbed into this quarter/semester or the last one
        let endDay = currEc.day === 1 ? getEthiopianDaysInMonth(y, m) : Math.min(currEc.day - 1, getEthiopianDaysInMonth(y, m));
        if (currEc.day === 1 && m === 12) {
          // Include Pagume in the period containing Nehase so no 5-6 day orphan period is created
          m = 13;
          endDay = getEthiopianDaysInMonth(y, 13);
        }
        pEndGc = convertEthiopianToGregorian(y, m, endDay).dateStr;
        if (new Date(pEndGc + "T00:00:00Z") > endDt) {
          pEndGc = endDateStr;
        }
      }

      const sParts = getCalendarDateParts(pStartGc, "EC");
      const eParts = getCalendarDateParts(pEndGc, "EC");
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
        const nextEc = convertGregorianToEthiopian(nextDt);
        currEc = { year: nextEc.year, month: nextEc.month, day: nextEc.day };
      }
    }
    return periods;
  }

  // 4. Gregorian Calendar (GC) — preserve exact existing behavior
  const count =
    freq === "monthly" || freq === "month"
      ? 12
      : freq === "semi_annually" || freq === "semiannual" || freq === "semi_annual"
      ? 2
      : freq === "annually" || freq === "annual"
      ? 1
      : 4;

  let prefix = "Q";
  let stepMonths = 3;
  if (count === 12) {
    prefix = "Month";
    stepMonths = 1;
  } else if (count === 2) {
    prefix = "Semester";
    stepMonths = 6;
  } else if (count === 1) {
    prefix = "Annual";
    stepMonths = 12;
  }

  const isFirstOfMonth = startDt.getUTCDate() === 1;
  const isMonthlyAlignedCycle =
    count === 12 &&
    (isFirstOfMonth ||
      (startDt.getUTCDate() === 8 && endDt.getUTCDate() === 7) ||
      Math.abs(startDt.getUTCDate() - (endDt.getUTCDate() + 1)) <= 1);

  const periods = [];

  if ((isFirstOfMonth && count > 1) || isMonthlyAlignedCycle) {
    let currStart = new Date(startDt.getTime());
    for (let i = 0; i < count; i += 1) {
      const pStart = new Date(currStart.getTime());
      let pEnd;
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

function getPeriodBoundaries(startDateStr, endDateStr, frequencyOrMode, periodIndexOrLabel, calendarSystem = "GC") {
  const periods = generateCalendarPeriods(startDateStr, endDateStr, frequencyOrMode, calendarSystem);
  if (!periods.length) return null;
  if (typeof periodIndexOrLabel === "number") {
    return periods.find((p) => p.period_index === periodIndexOrLabel) || null;
  }
  const needle = String(periodIndexOrLabel || "").trim().toLowerCase();
  return periods.find((p) => p.period_label.toLowerCase() === needle) || null;
}

module.exports = {
  Kenat,
  VALID_CALENDAR_SYSTEMS,
  DEFAULT_CALENDAR_SYSTEM,
  ETHIOPIAN_MONTH_NAMES_EN,
  ETHIOPIAN_MONTH_NAMES_AM,
  GREGORIAN_MONTH_NAMES_SHORT,
  isValidCalendarSystem,
  normalizeCalendarSystem,
  parseDateOnlyString,
  formatDateOnly,
  isEthiopianLeapYear,
  getEthiopianDaysInMonth,
  getGregorianDaysInMonth,
  validateGregorianDate,
  validateEthiopianDate,
  validateDateForCalendar,
  convertEthiopianToGregorian,
  convertGregorianToEthiopian,
  resolveCanonicalDateInput,
  getCalendarDateParts,
  formatDateByCalendar,
  formatDateRangeByCalendar,
  calculateCalendarAnnualEndDate,
  computeCalendarPlanningPeriodEnd,
  enumerateCalendarAnnualSlices,
  generateCalendarPeriods,
  getPeriodBoundaries,
};
