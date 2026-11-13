"use strict";

/**
 * Utility functions for National Reporting Annual Period and Recurring Period Generation
 */

function pad(num) {
  return String(num).padStart(2, "0");
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Calculate full-year end date given an annual start date (1 full year minus 1 day)
 */
function calculateAnnualEndDate(startDateStr) {
  if (!startDateStr) return "";
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return "";

  // Add 1 full calendar year and subtract 1 day
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

/**
 * Validate that an annual date range is valid (start before end, duration ~1 year)
 */
function validateAnnualDateRange(startDateStr, endDateStr) {
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
function getExpectedPeriodCount(frequency) {
  const f = String(frequency || "quarterly").toLowerCase().replace(/[\s\-]/g, "_");
  if (f === "monthly" || f === "month") return 12;
  if (f === "semi_annually" || f === "semiannual" || f === "semi_annual") return 2;
  if (f === "annually" || f === "annual") return 1;
  return 4; // default quarterly
}

/**
 * Generate recurring periods for a given annual date range and reporting frequency
 */
function generateReportingPeriods(startDateStr, endDateStr, frequency) {
  if (!startDateStr || !endDateStr) return [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return [];
  }

  const freq = String(frequency || "quarterly").toLowerCase().replace(/[\s\-]/g, "_");
  const count = getExpectedPeriodCount(freq);

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

  // Check if start date is on the 1st of a month or aligned month cycle (e.g. 8th to 7th for Ethiopian fiscal year)
  const isFirstOfMonth = start.getDate() === 1;
  const isMonthlyAlignedCycle = count === 12 && (
    isFirstOfMonth ||
    (start.getDate() === 8 && end.getDate() === 7) ||
    Math.abs(start.getDate() - (end.getDate() + 1)) <= 1
  );

  const periods = [];

  if ((isFirstOfMonth && count > 1) || isMonthlyAlignedCycle) {
    let currStart = new Date(start.getTime());
    for (let i = 0; i < count; i++) {
      const pStart = new Date(currStart.getTime());
      let pEnd;

      if (i === count - 1) {
        pEnd = new Date(end.getTime());
      } else {
        const next = new Date(currStart.getTime());
        next.setMonth(next.getMonth() + stepMonths);
        next.setDate(next.getDate() - 1);
        pEnd = next > end ? new Date(end.getTime()) : next;

        const nextStart = new Date(pEnd.getTime());
        nextStart.setDate(nextStart.getDate() + 1);
        currStart = nextStart;
      }

      let label = prefix === "Q" ? `Q${i + 1}` : `${prefix} ${i + 1}`;
      if (prefix === "Annual") label = "Annual";

      const pStartStr = formatDate(pStart);
      const pEndStr = formatDate(pEnd);

      periods.push({
        period_index: i + 1,
        period_label: label,
        division_label: `Division ${i + 1}`,
        start_date: pStartStr,
        end_date: pEndStr,
        name: `${label} (${pStartStr} to ${pEndStr})`,
      });
    }
  } else {
    // Proportional calendar day division (ensures no overlaps or gaps for arbitrary start dates)
    const totalMs = end.getTime() - start.getTime() + 86400000; // inclusive
    const totalDays = Math.round(totalMs / 86400000);

    for (let i = 0; i < count; i++) {
      const startDayOffset = Math.round((i * totalDays) / count);
      const endDayOffset = i === count - 1 ? totalDays - 1 : Math.round(((i + 1) * totalDays) / count) - 1;

      const pStart = new Date(start.getTime() + startDayOffset * 86400000);
      const pEnd = new Date(start.getTime() + endDayOffset * 86400000);

      let label = prefix === "Q" ? `Q${i + 1}` : `${prefix} ${i + 1}`;
      if (prefix === "Annual") label = "Annual";

      const pStartStr = formatDate(pStart);
      const pEndStr = formatDate(pEnd);

      periods.push({
        period_index: i + 1,
        period_label: label,
        start_date: pStartStr,
        end_date: pEndStr,
        name: `${label} (${pStartStr} to ${pEndStr})`,
      });
    }
  }

  return periods;
}

/**
 * Compute the lock status of a reporting period based on date window, deadline days, and administrative overrides.
 *
 * Strict Rule: Any past period (today > period.end_date) and any future period (today < period.start_date)
 * is locked. A period is naturally open ONLY when today lies between start_date and end_date.
 * On-demand administrative overrides can open any period for a specified timeframe (e.g. 5, 10, 15 days),
 * after which it automatically locks itself.
 *
 * @param {Object} params
 * @param {Object} params.period - Period object with { period_label, start_date, end_date }
 * @param {Object} [params.lockOverride] - Optional admin override object for this period { is_unlocked, reason, unlocked_until, unlocked_by, unlocked_at }
 * @param {number} [params.deadlineDays=0] - Deadline days (if any)
 * @returns {Object} { is_locked, lock_state, lock_reason, deadline_date, is_manually_unlocked, lock_override }
 */
function computePeriodLockStatus({ period, lockOverride, deadlineDays = 0 }) {
  const todayStr = formatDate(new Date());
  const now = new Date();

  // 1. Check administrative overrides first
  if (lockOverride && typeof lockOverride.is_unlocked === "boolean") {
    if (lockOverride.is_unlocked) {
      // Check if temporary unlocked_until has expired
      if (lockOverride.unlocked_until) {
        const unlockedUntilDate = new Date(lockOverride.unlocked_until);
        // If YYYY-MM-DD, set to 23:59:59.999 local time
        if (String(lockOverride.unlocked_until).length === 10) {
          unlockedUntilDate.setHours(23, 59, 59, 999);
        }

        if (unlockedUntilDate < now) {
          return {
            is_locked: true,
            lock_state: "closed_deadline_passed",
            lock_reason: `Admin on-demand unlock window expired on ${formatDate(unlockedUntilDate)}`,
            deadline_date: formatDate(unlockedUntilDate),
            is_manually_unlocked: false,
            lock_override: lockOverride,
          };
        }

        return {
          is_locked: false,
          lock_state: "unlocked_override",
          lock_reason: lockOverride.reason || `Open on demand: administratively unlocked until ${formatDate(unlockedUntilDate)}`,
          deadline_date: formatDate(unlockedUntilDate),
          is_manually_unlocked: true,
          lock_override: lockOverride,
        };
      }

      return {
        is_locked: false,
        lock_state: "unlocked_override",
        lock_reason: lockOverride.reason || "Administratively unlocked on demand by Federal Administrator",
        deadline_date: period.end_date,
        is_manually_unlocked: true,
        lock_override: lockOverride,
      };
    } else {
      return {
        is_locked: true,
        lock_state: "manually_locked",
        lock_reason: lockOverride.reason || "Administratively locked by Federal Administrator",
        deadline_date: period.end_date,
        is_manually_unlocked: false,
        lock_override: lockOverride,
      };
    }
  }

  // 2. Natural timeline evaluation:
  // Strict rule: Any future period (today < start_date) is locked
  if (todayStr < period.start_date) {
    return {
      is_locked: true,
      lock_state: "upcoming",
      lock_reason: `Future period: Reporting window opens on ${period.start_date}`,
      deadline_date: period.end_date,
      is_manually_unlocked: false,
      lock_override: null,
    };
  }

  // Strict rule: Any past period (today > end_date) is locked
  if (todayStr > period.end_date) {
    return {
      is_locked: true,
      lock_state: "closed_deadline_passed",
      lock_reason: `Past period: Reporting window closed on ${period.end_date}. Request admin unlock to report.`,
      deadline_date: period.end_date,
      is_manually_unlocked: false,
      lock_override: null,
    };
  }

  // Today lies between start_date and end_date: Active Open!
  return {
    is_locked: false,
    lock_state: "open",
    lock_reason: `Current active reporting period: Open until ${period.end_date}`,
    deadline_date: period.end_date,
    is_manually_unlocked: false,
    lock_override: null,
  };
}

module.exports = {
  calculateAnnualEndDate,
  validateAnnualDateRange,
  getExpectedPeriodCount,
  generateReportingPeriods,
  computePeriodLockStatus,
};

