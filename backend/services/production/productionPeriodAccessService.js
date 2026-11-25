"use strict";

const {
  CompanyProductionAssignment,
  CompanyProductionTarget,
  CompanyProductionReport,
  CompanyLicense,
  ProductionItem,
  ProductionReportingFrequency,
  GoldMeasurementUnit,
  User,
} = require("../../models");
const { Op } = require("sequelize");

/**
 * Standard Period Classifications
 */
const PERIOD_STATUS = {
  CURRENT: "CURRENT",
  AVAILABLE: "AVAILABLE",
  AVAILABLE_PAST: "AVAILABLE_PAST",
  COMPLETED: "COMPLETED",
  SUBMITTED: "SUBMITTED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  REJECTED: "REJECTED",
  LOCKED_PAST: "LOCKED_PAST",
  LOCKED_FUTURE: "LOCKED_FUTURE",
  OUTSIDE_LICENSE_PERIOD: "OUTSIDE_LICENSE_PERIOD",
  NO_APPROVED_TARGET: "NO_APPROVED_TARGET",
  INACTIVE_ASSIGNMENT: "INACTIVE_ASSIGNMENT",
};

/**
 * Helper to get current Date object in UTC / Business Date string YYYY-MM-DD
 */
function getBusinessToday(dateOverride = null) {
  const d = dateOverride ? new Date(dateOverride) : new Date();
  return d.toISOString().split("T")[0];
}

/**
 * Helper to compute quarter from month index (1-12)
 */
function getQuarterFromMonth(month) {
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

/**
 * Helper to format quarter string: 'Q1', 'Q2', 'Q3', 'Q4'
 */
function getQuarterLabel(q) {
  return `Q${q}`;
}

/**
 * Helper to get dates for a quarter in year
 */
function getQuarterDateRange(year, q) {
  const startMonths = { 1: "01-01", 2: "04-01", 3: "07-01", 4: "10-01" };
  const endMonths = { 1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31" };
  return {
    startDate: `${year}-${startMonths[q]}`,
    endDate: `${year}-${endMonths[q]}`,
  };
}

/**
 * Helper to get dates for a half year in year
 */
function getHalfYearDateRange(year, h) {
  if (h === 1) {
    return { startDate: `${year}-01-01`, endDate: `${year}-06-30` };
  }
  return { startDate: `${year}-07-01`, endDate: `${year}-12-31` };
}

/**
 * Helper to get dates for a month in year
 */
function getMonthDateRange(year, m) {
  const mStr = String(m).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return {
    startDate: `${year}-${mStr}-01`,
    endDate: `${year}-${mStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Helper to divide a date range [startDateStr, endDateStr] into N contiguous non-overlapping intervals
 */
function divideDateRange(startDateStr, endDateStr, count, prefix = "", periodType = "quarter") {
  const [sY, sM, sD] = startDateStr.split("-").map(Number);
  const [eY, eM, eD] = endDateStr.split("-").map(Number);
  const startUtc = Date.UTC(sY, sM - 1, sD);
  const endUtc = Date.UTC(eY, eM - 1, eD);
  const oneDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((endUtc - startUtc) / oneDay) + 1);
  const daysPerSlice = totalDays / count;

  const periods = [];
  let currentStartDay = 0;
  for (let i = 0; i < count; i++) {
    const nextStartDay = i === count - 1 ? totalDays : Math.round((i + 1) * daysPerSlice);
    const pStart = new Date(startUtc + currentStartDay * oneDay);
    const pEnd = new Date(startUtc + (nextStartDay - 1) * oneDay);
    currentStartDay = nextStartDay;

    const pStartStr = pStart.toISOString().slice(0, 10);
    const pEndStr = pEnd.toISOString().slice(0, 10);
    const label = count === 1 ? `Full Period (${pStartStr} ~ ${pEndStr})` : `${prefix}${i + 1} (${pStartStr} ~ ${pEndStr})`;

    periods.push({
      period_type: periodType,
      period_code: prefix ? `${prefix}${i + 1}` : `P${i + 1}`,
      period_label: label,
      period_start_date: pStartStr,
      period_end_date: pEndStr,
    });
  }
  return periods;
}

/**
 * Calculate the rolling past-reporting allowance access window
 */
function calculateAllowanceWindow(assignment, todayStr) {
  const allowPast = Boolean(assignment.allow_past_reporting);
  const duration = Number(assignment.past_reporting_duration) || 0;
  const unit = String(assignment.past_reporting_unit || "days").toLowerCase();

  const today = new Date(todayStr + "T00:00:00.000Z");

  if (!allowPast || duration <= 0) {
    return {
      allowPast: false,
      earliestAllowedDate: todayStr,
      earliestAllowedMonth: todayStr.slice(0, 7),
      earliestAllowedQuarter: `Q${getQuarterFromMonth(today.getUTCMonth() + 1)}`,
      earliestAllowedYear: today.getUTCFullYear(),
      explanation: "Past reporting is disabled. Reports can only be submitted for the current reporting period.",
    };
  }

  const earliestDate = new Date(today);

  if (unit === "days" || unit === "day") {
    earliestDate.setUTCDate(earliestDate.getUTCDate() - duration);
  } else if (unit === "months" || unit === "month") {
    earliestDate.setUTCMonth(earliestDate.getUTCMonth() - duration);
  } else if (unit === "quarters" || unit === "quarter") {
    earliestDate.setUTCMonth(earliestDate.getUTCMonth() - (duration * 3));
  } else if (unit === "semi_annual" || unit === "half_year") {
    earliestDate.setUTCMonth(earliestDate.getUTCMonth() - (duration * 6));
  } else if (unit === "years" || unit === "year") {
    earliestDate.setUTCFullYear(earliestDate.getUTCFullYear() - duration);
  } else {
    earliestDate.setUTCDate(earliestDate.getUTCDate() - duration);
  }

  const earliestStr = earliestDate.toISOString().split("T")[0];
  const earliestMonthStr = earliestStr.slice(0, 7);
  const earliestQuarterQ = getQuarterFromMonth(earliestDate.getUTCMonth() + 1);

  return {
    allowPast: true,
    duration,
    unit,
    earliestAllowedDate: earliestStr,
    earliestAllowedMonth: earliestMonthStr,
    earliestAllowedQuarter: `Q${earliestQuarterQ}`,
    earliestAllowedYear: earliestDate.getUTCFullYear(),
    explanation: `Past reporting is enabled for the previous ${duration} ${unit}.`,
  };
}

/**
 * Classify a specific reporting date against license, assignment, today, and past allowance
 */
function classifyReportingDate({
  dateStr,
  todayStr,
  allowanceWindow,
  license,
  assignment,
  existingReport = null,
  approvedTarget = null,
}) {
  if (!assignment.is_active) {
    return {
      status: PERIOD_STATUS.INACTIVE_ASSIGNMENT,
      isAccessible: false,
      reason: "Production assignment is inactive.",
    };
  }

  if (!approvedTarget) {
    return {
      status: PERIOD_STATUS.NO_APPROVED_TARGET,
      isAccessible: false,
      reason: "Production target has not been approved by the Federal Ministry.",
    };
  }

  // License dates validation
  if (license) {
    if (license.status !== "active") {
      return {
        status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
        isAccessible: false,
        reason: `Associated license '${license.license_number}' is not active (${license.status}).`,
      };
    }
    if (license.effective_start_date && dateStr < license.effective_start_date) {
      return {
        status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
        isAccessible: false,
        reason: `Date is earlier than license start date (${license.effective_start_date}).`,
      };
    }
    if (license.effective_end_date && dateStr > license.effective_end_date) {
      return {
        status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
        isAccessible: false,
        reason: `Date exceeds license expiration date (${license.effective_end_date}).`,
      };
    }
  }

  // Assignment effective dates
  if (assignment.effective_from && dateStr < assignment.effective_from) {
    return {
      status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
      isAccessible: false,
      reason: `Date is earlier than assignment start date (${assignment.effective_from}).`,
    };
  }
  if (assignment.effective_to && dateStr > assignment.effective_to) {
    return {
      status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
      isAccessible: false,
      reason: `Date exceeds assignment end date (${assignment.effective_to}).`,
    };
  }

  // Existing report check
  if (existingReport) {
    if (existingReport.status === "rejected") {
      return {
        status: PERIOD_STATUS.REJECTED,
        isAccessible: true,
        reason: `Report was rejected. Review comments: ${existingReport.review_comments || "Correction required."}`,
        report: existingReport,
      };
    }
    return {
      status: existingReport.status === "approved" ? PERIOD_STATUS.COMPLETED : PERIOD_STATUS.SUBMITTED,
      isAccessible: false,
      reason: `Report already submitted on this date (${existingReport.quantity_reported} ${existingReport.reportedUnit?.symbol || "units"}).`,
      report: existingReport,
    };
  }

  // Future check: strictly forbidden
  if (dateStr > todayStr) {
    return {
      status: PERIOD_STATUS.LOCKED_FUTURE,
      isAccessible: false,
      reason: "Future production reporting is not permitted.",
    };
  }

  // Today check
  if (dateStr === todayStr) {
    return {
      status: PERIOD_STATUS.CURRENT,
      isAccessible: true,
      reason: "Today's production reporting is open.",
    };
  }

  // Past date check: strictly locked (matching Plan Hierarchy KPI reporting rules)
  return {
    status: PERIOD_STATUS.LOCKED_PAST,
    isAccessible: false,
    reason: "Past date is locked. Only the current active date is open for reporting.",
  };
}

/**
 * Classify a period (month, quarter, half-year) based on its date range
 */
function classifyPeriodRange({
  startDate,
  endDate,
  todayStr,
  allowanceWindow,
  license,
  assignment,
  existingReportsCount = 0,
  approvedTarget = null,
}) {
  if (!assignment.is_active) {
    return { status: PERIOD_STATUS.INACTIVE_ASSIGNMENT, isAccessible: false, reason: "Assignment is inactive." };
  }
  if (!approvedTarget) {
    return { status: PERIOD_STATUS.NO_APPROVED_TARGET, isAccessible: false, reason: "No approved target baseline." };
  }

  if (license) {
    if (license.status !== "active") {
      return { status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD, isAccessible: false, reason: `License is ${license.status}.` };
    }
    if (license.effective_start_date && endDate < license.effective_start_date) {
      return { status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD, isAccessible: false, reason: "Period precedes license start." };
    }
    if (license.effective_end_date && startDate > license.effective_end_date) {
      return { status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD, isAccessible: false, reason: "Period exceeds license end." };
    }
  }

  if (startDate > todayStr) {
    return {
      status: PERIOD_STATUS.LOCKED_FUTURE,
      isAccessible: false,
      reason: `Upcoming period. Reporting window opens on ${startDate}.`,
    };
  }

  const isCurrent = todayStr >= startDate && todayStr <= endDate;
  if (isCurrent) {
    return {
      status: PERIOD_STATUS.CURRENT,
      isAccessible: true,
      reason: "Current active reporting period.",
    };
  }

  // Strictly lock past periods (matching Plan Hierarchy KPI reporting rules)
  return {
    status: PERIOD_STATUS.LOCKED_PAST,
    isAccessible: false,
    reason: `Past reporting window closed on ${endDate}.`,
  };
}

/**
 * Classify a report submission according to the assignment's reporting frequency
 * (daily, monthly, quarterly, semi_annual, annual) and optional period bounds.
 */
function classifyReportingPeriod({
  frequencyCode = "daily",
  dateStr,
  periodStartDate = null,
  periodEndDate = null,
  todayStr,
  allowanceWindow,
  license,
  assignment,
  existingReport = null,
  approvedTarget = null,
}) {
  const normFreq = String(frequencyCode || "daily").toLowerCase().trim();

  // If daily: delegate strictly to classifyReportingDate
  if (normFreq === "daily") {
    return classifyReportingDate({
      dateStr,
      todayStr,
      allowanceWindow,
      license,
      assignment,
      existingReport,
      approvedTarget,
    });
  }

  // Common license and assignment checks
  if (!assignment.is_active) {
    return {
      status: PERIOD_STATUS.INACTIVE_ASSIGNMENT,
      isAccessible: false,
      reason: "Production assignment is inactive.",
    };
  }

  if (!approvedTarget) {
    return {
      status: PERIOD_STATUS.NO_APPROVED_TARGET,
      isAccessible: false,
      reason: "Production target has not been approved by the Federal Ministry.",
    };
  }

  // Determine period start and end dates
  let startDate = periodStartDate;
  let endDate = periodEndDate;

  if (!startDate || !endDate) {
    const [yStr, mStr] = dateStr.split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);

    if (normFreq === "monthly") {
      const monthRange = getMonthDateRange(year, month);
      startDate = monthRange.startDate;
      endDate = monthRange.endDate;
    } else if (normFreq === "quarterly") {
      const q = getQuarterFromMonth(month);
      const qRange = getQuarterDateRange(year, q);
      startDate = qRange.startDate;
      endDate = qRange.endDate;
    } else if (normFreq === "semi_annual" || normFreq === "half_year") {
      const h = month <= 6 ? 1 : 2;
      const hRange = getHalfYearDateRange(year, h);
      startDate = hRange.startDate;
      endDate = hRange.endDate;
    } else if (normFreq === "annual" || normFreq === "yearly") {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else {
      startDate = dateStr;
      endDate = dateStr;
    }
  }

  // Check license effective bounds
  if (license) {
    if (license.status !== "active") {
      return {
        status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
        isAccessible: false,
        reason: `Associated license '${license.license_number}' is not active (${license.status}).`,
      };
    }
    if (license.effective_start_date && endDate < license.effective_start_date) {
      return {
        status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
        isAccessible: false,
        reason: `Date is earlier than license start date (${license.effective_start_date}).`,
      };
    }
    if (license.effective_end_date && startDate > license.effective_end_date) {
      return {
        status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
        isAccessible: false,
        reason: `Date exceeds license expiration date (${license.effective_end_date}).`,
      };
    }
  }

  // Check assignment effective bounds
  if (assignment.effective_from && endDate < assignment.effective_from) {
    return {
      status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
      isAccessible: false,
      reason: `Date is earlier than assignment start date (${assignment.effective_from}).`,
    };
  }
  if (assignment.effective_to && startDate > assignment.effective_to) {
    return {
      status: PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD,
      isAccessible: false,
      reason: `Date exceeds assignment end date (${assignment.effective_to}).`,
    };
  }

  // Existing report check
  if (existingReport) {
    if (existingReport.status === "rejected") {
      return {
        status: PERIOD_STATUS.REJECTED,
        isAccessible: true,
        reason: `Report was rejected. Review comments: ${existingReport.review_comments || "Correction required."}`,
        report: existingReport,
      };
    }
    return {
      status: existingReport.status === "approved" ? PERIOD_STATUS.COMPLETED : PERIOD_STATUS.SUBMITTED,
      isAccessible: false,
      reason: `Report already submitted for this period.`,
      report: existingReport,
    };
  }

  // Classify period range
  return classifyPeriodRange({
    startDate,
    endDate,
    todayStr,
    allowanceWindow,
    license,
    assignment,
    approvedTarget,
  });
}

/**
 * Build the full Target-Aligned Reporting Hierarchy for a specific production assignment and year
 */
async function buildTargetAlignedReportingHierarchy({ assignmentId, year = null, dateOverride = null }) {
  const todayStr = getBusinessToday(dateOverride);
  const currentYear = year ? Number(year) : Number(todayStr.slice(0, 4));

  const assignment = await CompanyProductionAssignment.findByPk(assignmentId, {
    include: [
      { model: CompanyLicense, as: "license" },
      { model: ProductionItem, as: "productionItem" },
      { model: ProductionReportingFrequency, as: "reportingFrequency" },
      { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
    ],
  });

  if (!assignment) {
    const err = new Error("Company production assignment not found.");
    err.status = 404;
    throw err;
  }

  const targetDepth = assignment.target_allocation_depth || "quarterly"; // 'annual', 'semi_annual', 'quarterly', 'monthly'
  const reportingFreq = assignment.reportingFrequency ? assignment.reportingFrequency.code : "daily"; // 'daily', 'monthly', 'quarterly', 'semi_annual', 'annual'
  const unitSymbol = assignment.defaultReportingUnit?.symbol || "units";
  const unitName = assignment.defaultReportingUnit?.name || "Standard Unit";

  // Determine effective schedule range from assignment or fallback to calendar year
  let effStart = assignment.effective_from || `${currentYear}-01-01`;
  let effEnd = assignment.effective_to;
  if (!effEnd) {
    if (assignment.effective_from) {
      const [sY, sM, sD] = assignment.effective_from.split("-").map(Number);
      const nextYear = new Date(Date.UTC(sY + 1, sM - 1, sD - 1));
      effEnd = nextYear.toISOString().slice(0, 10);
    } else {
      effEnd = `${currentYear}-12-31`;
    }
  }

  // Fetch approved root target for this assignment that overlaps with [effStart, effEnd]
  const approvedRootTarget = await CompanyProductionTarget.findOne({
    where: {
      assignment_id: assignmentId,
      status: ["approved", "published"],
      target_period_type: "year",
      period_start_date: { [Op.lte]: effEnd },
      period_end_date: { [Op.gte]: effStart },
    },
    order: [["version_number", "DESC"]],
  });

  if (!assignment.effective_from && approvedRootTarget) {
    if (approvedRootTarget.period_start_date) effStart = approvedRootTarget.period_start_date;
    if (approvedRootTarget.period_end_date) effEnd = approvedRootTarget.period_end_date;
  }

  // Fetch all child target allocations for this version
  let periodTargetAllocations = [];
  if (approvedRootTarget) {
    periodTargetAllocations = await CompanyProductionTarget.findAll({
      where: {
        assignment_id: assignmentId,
        version_number: approvedRootTarget.version_number,
        parent_target_id: approvedRootTarget.target_id,
      },
      order: [["period_start_date", "ASC"]],
    });
  }

  // Fetch all reports submitted for this assignment within this effective range
  const reports = await CompanyProductionReport.findAll({
    where: {
      assignment_id: assignmentId,
      report_date: {
        [Op.between]: [effStart, effEnd],
      },
    },
    include: [
      { model: GoldMeasurementUnit, as: "reportedUnit" },
      { model: User, as: "submitter", attributes: ["user_id", "full_name", "email"] },
    ],
    order: [["report_date", "ASC"]],
  });

  const allowanceWindow = calculateAllowanceWindow(assignment, todayStr);
  const license = assignment.license;

  // Calculate annual actual total
  let annualActualTotal = 0;
  for (const r of reports) {
    annualActualTotal += Number(r.quantity_reported) || 0;
  }

  const annualTargetQuantity = approvedRootTarget ? Number(approvedRootTarget.target_quantity) || 0 : 0;
  const annualAchievementPct = annualTargetQuantity > 0 ? (annualActualTotal / annualTargetQuantity) * 100 : 0;

  const rootLabel = approvedRootTarget?.period_label || `Schedule (${effStart} ~ ${effEnd})`;

  const rootNode = {
    id: approvedRootTarget ? approvedRootTarget.target_id : `annual-${effStart}`,
    level: "annual",
    label: rootLabel,
    year: currentYear,
    startDate: effStart,
    endDate: effEnd,
    targetQuantity: annualTargetQuantity,
    actualQuantity: Number(annualActualTotal.toFixed(4)),
    remainingTarget: Number(Math.max(0, annualTargetQuantity - annualActualTotal).toFixed(4)),
    achievementPct: Number(annualAchievementPct.toFixed(2)),
    unitSymbol,
    unitName,
    targetDepth,
    reportingFrequency: reportingFreq,
    classification: classifyPeriodRange({
      startDate: effStart,
      endDate: effEnd,
      todayStr,
      allowanceWindow,
      license,
      assignment,
      approvedTarget: approvedRootTarget,
    }),
    children: [],
  };

  // Determine Primary Child Periods
  let count = 4;
  let prefix = "Q";
  let periodType = "quarter";
  if (targetDepth === "semi_annual") {
    count = 2;
    prefix = "H";
    periodType = "half_year";
  } else if (targetDepth === "monthly") {
    count = 12;
    prefix = "M";
    periodType = "month";
  } else if (targetDepth === "annual") {
    count = 1;
    prefix = "";
    periodType = "year";
  }

  const configuredIntervals = divideDateRange(effStart, effEnd, count, prefix, periodType);

  let primaryPeriods = [];
  if (periodTargetAllocations.length > 0) {
    const targetsAlignWithConfig = periodTargetAllocations[0].period_start_date === effStart;

    if (targetsAlignWithConfig && periodTargetAllocations.length === count) {
      primaryPeriods = periodTargetAllocations.map((t) => ({
        id: t.target_id,
        targetId: t.target_id,
        periodCode: t.period_label,
        label: t.period_label || `${t.period_start_date} ~ ${t.period_end_date}`,
        startDate: t.period_start_date,
        endDate: t.period_end_date,
        targetQuantity: Number(t.target_quantity) || 0,
        level: t.target_period_type || (targetDepth === "semi_annual" ? "half_year" : targetDepth === "monthly" ? "month" : "quarter"),
      }));
    } else {
      // Re-align targets to the configured date intervals, mapping target quantities & IDs proportionally
      primaryPeriods = configuredIntervals.map((inv, idx) => {
        const matchingTarget = periodTargetAllocations[idx] || periodTargetAllocations.find((t) => t.period_label && t.period_label.startsWith(inv.period_code));
        return {
          id: matchingTarget ? matchingTarget.target_id : `period-${inv.period_start_date}-${inv.period_end_date}`,
          targetId: matchingTarget ? matchingTarget.target_id : (approvedRootTarget ? approvedRootTarget.target_id : null),
          periodCode: inv.period_code,
          label: inv.period_label,
          startDate: inv.period_start_date,
          endDate: inv.period_end_date,
          targetQuantity: matchingTarget ? Number(matchingTarget.target_quantity) || 0 : (annualTargetQuantity > 0 ? Number((annualTargetQuantity / count).toFixed(4)) : 0),
          level: inv.period_type,
        };
      });
    }
  } else {
    // Generate primary periods based on configured targetDepth across [effStart, effEnd]
    const sliceTarget = annualTargetQuantity > 0 ? Number((annualTargetQuantity / count).toFixed(4)) : 0;
    primaryPeriods = configuredIntervals.map((inv) => ({
      id: `period-${inv.period_start_date}-${inv.period_end_date}`,
      targetId: approvedRootTarget ? approvedRootTarget.target_id : null,
      periodCode: inv.period_code,
      label: inv.period_label,
      startDate: inv.period_start_date,
      endDate: inv.period_end_date,
      targetQuantity: sliceTarget,
      level: inv.period_type,
    }));
  }

  // Iterate over primary periods and build hierarchy nodes
  for (const p of primaryPeriods) {
    const periodReports = reports.filter((r) => r.report_date >= p.startDate && r.report_date <= p.endDate);
    const pActualQty = periodReports.reduce((sum, r) => sum + (Number(r.quantity_reported) || 0), 0);
    const pAchievement = p.targetQuantity > 0 ? (pActualQty / p.targetQuantity) * 100 : 0;

    const pClassification = classifyPeriodRange({
      startDate: p.startDate,
      endDate: p.endDate,
      todayStr,
      allowanceWindow,
      license,
      assignment,
      approvedTarget: approvedRootTarget,
    });

    const isDirectReportingLevel =
      (targetDepth === "quarterly" && reportingFreq === "quarterly") ||
      (targetDepth === "semi_annual" && (reportingFreq === "semi_annual" || reportingFreq === "quarterly")) ||
      (targetDepth === "monthly" && reportingFreq === "monthly") ||
      (targetDepth === "annual" && reportingFreq === "annual");

    const pNode = {
      id: p.id,
      level: p.level,
      label: p.label,
      periodCode: p.periodCode,
      startDate: p.startDate,
      endDate: p.endDate,
      targetQuantity: p.targetQuantity,
      actualQuantity: Number(pActualQty.toFixed(4)),
      remainingTarget: Number(Math.max(0, p.targetQuantity - pActualQty).toFixed(4)),
      achievementPct: Number(pAchievement.toFixed(2)),
      unitSymbol,
      classification: pClassification,
      targetPeriodId: p.targetId,
      isReportingLevel: isDirectReportingLevel,
      children: [],
    };

    // Sub-period decomposition (e.g. daily matrix or monthly breakdown under quarter or half-year)
    if (!isDirectReportingLevel && (reportingFreq === "daily" || reportingFreq === "monthly")) {
      let subCount = 3;
      if (p.level === "half_year") subCount = 6;
      else if (p.level === "year") subCount = 12;

      const subIntervals = divideDateRange(p.startDate, p.endDate, subCount, `${p.periodCode || ""}-M`, "month");
      const subTargetQty = Number((p.targetQuantity / subCount).toFixed(4));

      for (const sm of subIntervals) {
        const smReports = reports.filter((r) => r.report_date >= sm.period_start_date && r.report_date <= sm.period_end_date);
        const smActualQty = smReports.reduce((sum, r) => sum + (Number(r.quantity_reported) || 0), 0);

        const smClassification = classifyPeriodRange({
          startDate: sm.period_start_date,
          endDate: sm.period_end_date,
          todayStr,
          allowanceWindow,
          license,
          assignment,
          approvedTarget: approvedRootTarget,
        });

        pNode.children.push({
          id: `sub-${sm.period_start_date}-${sm.period_end_date}`,
          level: "month",
          label: sm.period_label,
          monthKey: sm.period_start_date.slice(0, 7),
          startDate: sm.period_start_date,
          endDate: sm.period_end_date,
          targetQuantity: subTargetQty,
          actualQuantity: Number(smActualQty.toFixed(4)),
          unitSymbol,
          classification: smClassification,
          targetPeriodId: p.targetId,
          isReportingLevel: reportingFreq === "monthly",
          requiresDailyMatrix: reportingFreq === "daily",
          children: [],
        });
      }
    }

    rootNode.children.push(pNode);
  }

  return {
    assignment: {
      assignment_id: assignment.assignment_id,
      company_id: assignment.company_id,
      license_id: assignment.license_id,
      production_item_name: assignment.productionItem?.name,
      license_number: assignment.license?.license_number,
      target_allocation_depth: targetDepth,
      reporting_frequency: reportingFreq,
      unit_symbol: unitSymbol,
      unit_name: unitName,
      allow_past_reporting: assignment.allow_past_reporting,
      past_reporting_duration: assignment.past_reporting_duration,
      past_reporting_unit: assignment.past_reporting_unit,
      effective_from: assignment.effective_from,
      effective_to: assignment.effective_to,
    },
    today: todayStr,
    allowanceWindow,
    approvedTargetVersion: approvedRootTarget ? approvedRootTarget.version_number : null,
    hierarchy: rootNode,
  };
}

/**
 * Build the 7-day weekly calendar matrix for a specific month
 */
async function buildDailyReportingMatrix({ assignmentId, monthStr, dateOverride = null }) {
  const todayStr = getBusinessToday(dateOverride);

  // Parse YYYY-MM
  const [yearStr, mStr] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10);

  const assignment = await CompanyProductionAssignment.findByPk(assignmentId, {
    include: [
      { model: CompanyLicense, as: "license" },
      { model: ProductionItem, as: "productionItem" },
      { model: ProductionReportingFrequency, as: "reportingFrequency" },
      { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
    ],
  });

  if (!assignment) {
    const err = new Error("Company production assignment not found.");
    err.status = 404;
    throw err;
  }

  // Days in month
  const totalDaysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDate = `${yearStr}-${mStr.padStart(2, "0")}-01`;
  const endDate = `${yearStr}-${mStr.padStart(2, "0")}-${String(totalDaysInMonth).padStart(2, "0")}`;

  // Find approved target overlapping with this month
  const approvedRootTarget = await CompanyProductionTarget.findOne({
    where: {
      assignment_id: assignmentId,
      status: ["approved", "published"],
      target_period_type: "year",
      period_start_date: { [Op.lte]: endDate },
      period_end_date: { [Op.gte]: startDate },
    },
    order: [["version_number", "DESC"]],
  });

  const allowanceWindow = calculateAllowanceWindow(assignment, todayStr);
  const license = assignment.license;
  const unitSymbol = assignment.defaultReportingUnit?.symbol || "units";

  // Fetch reports for this month
  const existingReports = await CompanyProductionReport.findAll({
    where: {
      assignment_id: assignmentId,
      report_date: { [Op.between]: [startDate, endDate] },
    },
    include: [
      { model: GoldMeasurementUnit, as: "reportedUnit" },
      { model: User, as: "submitter", attributes: ["user_id", "full_name", "email"] },
    ],
  });

  const reportsByDate = {};
  for (const r of existingReports) {
    reportsByDate[r.report_date] = r;
  }

  // Determine starting day of week for day 1 (1 = Monday ... 7 = Sunday)
  const firstDayObj = new Date(Date.UTC(year, month - 1, 1));
  let startDayOfWeek = firstDayObj.getUTCDay();
  if (startDayOfWeek === 0) startDayOfWeek = 7; // Sunday to 7

  const weeks = [];
  let currentWeek = {
    weekNumber: 1,
    days: [],
    weekActualTotal: 0,
    reportedCount: 0,
    availableCount: 0,
    lockedCount: 0,
  };

  // Add padding days for days before day 1 in the first week
  for (let p = 1; p < startDayOfWeek; p++) {
    currentWeek.days.push({
      isPadding: true,
      dayNumber: null,
      date: null,
    });
  }

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dayStr = String(day).padStart(2, "0");
    const dateStr = `${yearStr}-${mStr.padStart(2, "0")}-${dayStr}`;
    const report = reportsByDate[dateStr] || null;

    const classification = classifyReportingDate({
      dateStr,
      todayStr,
      allowanceWindow,
      license,
      assignment,
      existingReport: report,
      approvedTarget: approvedRootTarget,
    });

    const isReported = Boolean(report);
    const qty = isReported ? Number(report.quantity_reported) || 0 : 0;

    if (isReported) {
      currentWeek.weekActualTotal += qty;
      currentWeek.reportedCount += 1;
    } else if (classification.isAccessible) {
      currentWeek.availableCount += 1;
    } else {
      currentWeek.lockedCount += 1;
    }

    currentWeek.days.push({
      isPadding: false,
      dayNumber: day,
      date: dateStr,
      isToday: dateStr === todayStr,
      classification: classification.status,
      isAccessible: classification.isAccessible,
      reason: classification.reason,
      report: report
        ? {
            report_id: report.report_id,
            quantity_reported: Number(report.quantity_reported),
            unit_symbol: report.reportedUnit?.symbol || unitSymbol,
            status: report.status,
            notes: report.notes,
            submitted_by_name: report.submitter
              ? report.submitter.full_name || `${report.submitter.first_name || ""} ${report.submitter.last_name || ""}`.trim() || "Company Representative"
              : "Company Representative",
            created_at: report.created_at,
          }
        : null,
    });

    if (currentWeek.days.length === 7) {
      currentWeek.weekActualTotal = Number(currentWeek.weekActualTotal.toFixed(4));
      weeks.push(currentWeek);
      currentWeek = {
        weekNumber: weeks.length + 1,
        days: [],
        weekActualTotal: 0,
        reportedCount: 0,
        availableCount: 0,
        lockedCount: 0,
      };
    }
  }

  // Add trailing padding days to fill the last week to 7 days
  if (currentWeek.days.length > 0) {
    while (currentWeek.days.length < 7) {
      currentWeek.days.push({
        isPadding: true,
        dayNumber: null,
        date: null,
      });
    }
    currentWeek.weekActualTotal = Number(currentWeek.weekActualTotal.toFixed(4));
    weeks.push(currentWeek);
  }

  let monthReportedTotal = 0;
  for (const w of weeks) {
    monthReportedTotal += w.weekActualTotal;
  }

  return {
    assignmentId,
    month: monthStr,
    monthName: `${MONTH_NAMES[month - 1]} ${year}`,
    today: todayStr,
    allowanceWindow,
    unitSymbol,
    monthReportedTotal: Number(monthReportedTotal.toFixed(4)),
    weeks,
  };
}

module.exports = {
  PERIOD_STATUS,
  getBusinessToday,
  calculateAllowanceWindow,
  classifyReportingDate,
  classifyPeriodRange,
  classifyReportingPeriod,
  getMonthDateRange,
  getQuarterDateRange,
  getHalfYearDateRange,
  buildTargetAlignedReportingHierarchy,
  buildDailyReportingMatrix,
};
