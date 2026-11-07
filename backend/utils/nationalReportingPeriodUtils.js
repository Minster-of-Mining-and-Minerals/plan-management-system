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

  // Check if start date is on the 1st of a month
  const isFirstOfMonth = start.getDate() === 1;

  const periods = [];

  if (isFirstOfMonth && count > 1) {
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

module.exports = {
  calculateAnnualEndDate,
  validateAnnualDateRange,
  getExpectedPeriodCount,
  generateReportingPeriods,
};

