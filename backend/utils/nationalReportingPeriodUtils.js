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
 * Compute the lock status of a reporting period based on date window, reporting phase rules, deadline days, and administrative overrides.
 *
 * Reporting Phase Architecture:
 * - Operating Phase: Period operating range (start_date to end_date). Data generation in progress.
 * - Reporting Phase Window:
 *     Opens: end_date - open_days_before (e.g. Day 25 for a 30-day monthly period)
 *     Closes: end_date + close_days_after (e.g. Day 30 + 5 days grace period = Day 35)
 * - Before Phase: Locked as 'upcoming_phase' (Operating ongoing, reporting opens on phase start)
 * - During Phase: Open as 'reporting_open' (active period) or 'grace_period' (grace buffer)
 * - After Phase: Locked as 'closed_deadline_passed' (Reporting window expired)
 * - Administrative Override: Grants on-demand temporary unlock.
 *
 * @param {Object} params
 * @param {Object} params.period - Period object with { period_label, start_date, end_date }
 * @param {Object} [params.lockOverride] - Optional admin override object for this period { is_unlocked, reason, unlocked_until, unlocked_by, unlocked_at }
 * @param {number} [params.deadlineDays=0] - Deadline days (fallback buffer)
 * @param {Object} [params.phaseConfig] - Optional reporting phase configuration { open_days_before, close_days_after, allow_grace_period }
 * @returns {Object} { is_locked, lock_state, lock_reason, deadline_date, reporting_phase_start, reporting_phase_end, is_in_grace_period, is_manually_unlocked, lock_override }
 */
function computePeriodLockStatus({ period, lockOverride, deadlineDays = 0, phaseConfig = null }) {
  const todayStr = formatDate(new Date());
  const now = new Date();

  // 1. Resolve phase parameters
  let openDaysBefore = 5;
  let closeDaysAfter = 5;
  let allowGrace = true;

  if (phaseConfig) {
    if (phaseConfig.open_days_before !== undefined && phaseConfig.open_days_before !== null) {
      openDaysBefore = Math.max(0, parseInt(phaseConfig.open_days_before, 10));
    }
    if (phaseConfig.close_days_after !== undefined && phaseConfig.close_days_after !== null) {
      closeDaysAfter = Math.max(0, parseInt(phaseConfig.close_days_after, 10));
    } else if (deadlineDays > 0) {
      closeDaysAfter = deadlineDays;
    }
    if (phaseConfig.allow_grace_period !== undefined) {
      allowGrace = Boolean(phaseConfig.allow_grace_period);
    }
  } else if (deadlineDays > 0) {
    closeDaysAfter = deadlineDays;
    openDaysBefore = 0;
  }

  // Calculate reporting phase boundaries
  const endDt = new Date(period.end_date);
  const startDt = new Date(period.start_date);

  let phaseStartDt = new Date(endDt.getTime() - openDaysBefore * 86400000);
  if (phaseStartDt < startDt) {
    phaseStartDt = startDt;
  }
  const phaseStartStr = formatDate(phaseStartDt);

  const phaseEndDt = new Date(endDt.getTime() + (allowGrace ? closeDaysAfter : 0) * 86400000);
  const phaseEndStr = formatDate(phaseEndDt);

  // 2. Check administrative overrides first
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
            reporting_phase_start: phaseStartStr,
            reporting_phase_end: formatDate(unlockedUntilDate),
            is_in_grace_period: false,
            is_manually_unlocked: false,
            lock_override: lockOverride,
          };
        }

        return {
          is_locked: false,
          lock_state: "unlocked_override",
          lock_reason: lockOverride.reason || `Open on demand: administratively unlocked until ${formatDate(unlockedUntilDate)}`,
          deadline_date: formatDate(unlockedUntilDate),
          reporting_phase_start: phaseStartStr,
          reporting_phase_end: formatDate(unlockedUntilDate),
          is_in_grace_period: false,
          is_manually_unlocked: true,
          lock_override: lockOverride,
        };
      }

      return {
        is_locked: false,
        lock_state: "unlocked_override",
        lock_reason: lockOverride.reason || "Administratively unlocked on demand by Federal Administrator",
        deadline_date: phaseEndStr,
        reporting_phase_start: phaseStartStr,
        reporting_phase_end: phaseEndStr,
        is_in_grace_period: false,
        is_manually_unlocked: true,
        lock_override: lockOverride,
      };
    } else {
      return {
        is_locked: true,
        lock_state: "manually_locked",
        lock_reason: lockOverride.reason || "Administratively locked by Federal Administrator",
        deadline_date: phaseEndStr,
        reporting_phase_start: phaseStartStr,
        reporting_phase_end: phaseEndStr,
        is_in_grace_period: false,
        is_manually_unlocked: false,
        lock_override: lockOverride,
      };
    }
  }

  // 3. Natural reporting phase timeline evaluation:
  // State A: Operating ongoing, reporting phase has not yet opened
  if (todayStr < phaseStartStr) {
    return {
      is_locked: true,
      lock_state: "upcoming_phase",
      lock_reason: `Operating period ongoing. Reporting window opens on ${phaseStartStr}.`,
      deadline_date: phaseEndStr,
      reporting_phase_start: phaseStartStr,
      reporting_phase_end: phaseEndStr,
      is_in_grace_period: false,
      is_manually_unlocked: false,
      lock_override: null,
    };
  }

  // State B: Active reporting window before operating period ends
  if (todayStr <= period.end_date) {
    return {
      is_locked: false,
      lock_state: "reporting_open",
      lock_reason: `Active reporting window: Open until ${phaseEndStr}.`,
      deadline_date: phaseEndStr,
      reporting_phase_start: phaseStartStr,
      reporting_phase_end: phaseEndStr,
      is_in_grace_period: false,
      is_manually_unlocked: false,
      lock_override: null,
    };
  }

  // State C: Operating period concluded, but active in Grace Submission buffer
  if (todayStr <= phaseEndStr) {
    return {
      is_locked: false,
      lock_state: "grace_period",
      lock_reason: `Period concluded. Grace submission window active until ${phaseEndStr}.`,
      deadline_date: phaseEndStr,
      reporting_phase_start: phaseStartStr,
      reporting_phase_end: phaseEndStr,
      is_in_grace_period: true,
      is_manually_unlocked: false,
      lock_override: null,
    };
  }

  // State D: Grace deadline passed -> Locked
  return {
    is_locked: true,
    lock_state: "closed_deadline_passed",
    lock_reason: `Reporting window closed on ${phaseEndStr}. Request administrative unlock to submit.`,
    deadline_date: phaseEndStr,
    reporting_phase_start: phaseStartStr,
    reporting_phase_end: phaseEndStr,
    is_in_grace_period: false,
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

