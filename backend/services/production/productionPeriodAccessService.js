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

  // Past check: evaluate rolling allowance
  if (allowanceWindow.allowPast) {
    if (dateStr >= allowanceWindow.earliestAllowedDate) {
      return {
        status: PERIOD_STATUS.AVAILABLE_PAST,
        isAccessible: true,
        reason: `Eligible past reporting date within the ${allowanceWindow.duration} ${allowanceWindow.unit} window.`,
      };
    } else {
      return {
        status: PERIOD_STATUS.LOCKED_PAST,
        isAccessible: false,
        reason: `Reporting is closed. You can submit reports for the previous ${allowanceWindow.duration} ${allowanceWindow.unit} only.`,
      };
    }
  }

  return {
    status: PERIOD_STATUS.LOCKED_PAST,
    isAccessible: false,
    reason: "Past reporting is disabled for this production assignment.",
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
    return { status: PERIOD_STATUS.LOCKED_FUTURE, isAccessible: false, reason: "Future period." };
  }

  const isCurrent = todayStr >= startDate && todayStr <= endDate;
  if (isCurrent) {
    return {
      status: PERIOD_STATUS.CURRENT,
      isAccessible: true,
      reason: "Current active reporting period.",
    };
  }

  // It is a past period (endDate < todayStr)
  if (allowanceWindow.allowPast) {
    // If the period's end date or any portion overlaps with the rolling allowance window
    if (endDate >= allowanceWindow.earliestAllowedDate) {
      return {
        status: PERIOD_STATUS.AVAILABLE_PAST,
        isAccessible: true,
        reason: `Accessible under ${allowanceWindow.duration} ${allowanceWindow.unit} past-reporting allowance.`,
      };
    }
  }

  return {
    status: PERIOD_STATUS.LOCKED_PAST,
    isAccessible: false,
    reason: `Past period closed. Outside permitted past-reporting window.`,
  };
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

  // Fetch approved target for this assignment and year
  const approvedRootTarget = await CompanyProductionTarget.findOne({
    where: {
      assignment_id: assignmentId,
      status: ["approved", "published"],
      target_period_type: "year",
      period_start_date: { [Op.lte]: `${currentYear}-12-31` },
      period_end_date: { [Op.gte]: `${currentYear}-01-01` },
    },
    order: [["version_number", "DESC"]],
  });

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

  // Fetch all reports submitted for this assignment within this year
  const reports = await CompanyProductionReport.findAll({
    where: {
      assignment_id: assignmentId,
      report_date: {
        [Op.between]: [`${currentYear}-01-01`, `${currentYear}-12-31`],
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

  // Build target lookups by period_label (e.g. 'Q1', 'Q2', '2026-01', 'H1', etc.)
  const targetByPeriodKey = {};
  for (const t of periodTargetAllocations) {
    targetByPeriodKey[t.period_label.trim()] = t;
  }

  // Pre-index reports by date (YYYY-MM-DD), month (YYYY-MM), quarter (Q1-Q4), half-year (H1-H2)
  const reportsByDate = {};
  const actualsByMonth = {};
  const actualsByQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  const actualsByHalfYear = { H1: 0, H2: 0 };
  let annualActualTotal = 0;

  for (const r of reports) {
    const dStr = r.report_date;
    reportsByDate[dStr] = r;

    const qty = Number(r.quantity_reported) || 0;
    annualActualTotal += qty;

    const mKey = dStr.slice(0, 7);
    actualsByMonth[mKey] = (actualsByMonth[mKey] || 0) + qty;

    const monthNum = parseInt(dStr.slice(5, 7), 10);
    const qNum = getQuarterFromMonth(monthNum);
    const qKey = `Q${qNum}`;
    actualsByQuarter[qKey] = (actualsByQuarter[qKey] || 0) + qty;

    const hKey = qNum <= 2 ? "H1" : "H2";
    actualsByHalfYear[hKey] = (actualsByHalfYear[hKey] || 0) + qty;
  }

  const annualTargetQuantity = approvedRootTarget ? Number(approvedRootTarget.target_quantity) || 0 : 0;
  const annualAchievementPct = annualTargetQuantity > 0 ? (annualActualTotal / annualTargetQuantity) * 100 : 0;

  const rootNode = {
    id: approvedRootTarget ? approvedRootTarget.target_id : `annual-${currentYear}`,
    level: "annual",
    label: `Calendar Year ${currentYear}`,
    year: currentYear,
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
    targetQuantity: annualTargetQuantity,
    actualQuantity: Number(annualActualTotal.toFixed(4)),
    remainingTarget: Number(Math.max(0, annualTargetQuantity - annualActualTotal).toFixed(4)),
    achievementPct: Number(annualAchievementPct.toFixed(2)),
    unitSymbol,
    unitName,
    targetDepth,
    reportingFrequency: reportingFreq,
    classification: classifyPeriodRange({
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      todayStr,
      allowanceWindow,
      license,
      assignment,
      approvedTarget: approvedRootTarget,
    }),
    children: [],
  };

  // -----------------------------------------------------------------------------------
  // GENERATE INTERMEDIATE & REPORTING NODES (SCENARIOS A THROUGH H)
  // -----------------------------------------------------------------------------------

  // SCENARIO A, B, C, D (Target Depth = 'quarterly')
  if (targetDepth === "quarterly") {
    for (let q = 1; q <= 4; q++) {
      const qKey = `Q${q}`;
      const qDates = getQuarterDateRange(currentYear, q);
      const allocatedTarget = targetByPeriodKey[qKey];
      const qTargetQty = allocatedTarget ? Number(allocatedTarget.target_quantity) || 0 : 0;
      const qActualQty = actualsByQuarter[qKey] || 0;
      const qAchievement = qTargetQty > 0 ? (qActualQty / qTargetQty) * 100 : 0;

      const qClassification = classifyPeriodRange({
        startDate: qDates.startDate,
        endDate: qDates.endDate,
        todayStr,
        allowanceWindow,
        license,
        assignment,
        approvedTarget: approvedRootTarget,
      });

      const quarterNode = {
        id: allocatedTarget ? allocatedTarget.target_id : `quarter-${currentYear}-${qKey}`,
        level: "quarter",
        label: `${qKey} ${currentYear}`,
        periodCode: qKey,
        startDate: qDates.startDate,
        endDate: qDates.endDate,
        targetQuantity: qTargetQty,
        actualQuantity: Number(qActualQty.toFixed(4)),
        remainingTarget: Number(Math.max(0, qTargetQty - qActualQty).toFixed(4)),
        achievementPct: Number(qAchievement.toFixed(2)),
        unitSymbol,
        classification: qClassification,
        targetPeriodId: allocatedTarget ? allocatedTarget.target_id : null,
        children: [],
      };

      // If Daily or Monthly reporting, populate child months
      if (reportingFreq === "daily" || reportingFreq === "monthly") {
        const startMonth = (q - 1) * 3 + 1;
        for (let m = startMonth; m <= startMonth + 2; m++) {
          const mDates = getMonthDateRange(currentYear, m);
          const mKey = `${currentYear}-${String(m).padStart(2, "0")}`;
          const mActualQty = actualsByMonth[mKey] || 0;
          const mName = MONTH_NAMES[m - 1];

          const mClassification = classifyPeriodRange({
            startDate: mDates.startDate,
            endDate: mDates.endDate,
            todayStr,
            allowanceWindow,
            license,
            assignment,
            approvedTarget: approvedRootTarget,
          });

          const monthNode = {
            id: `month-${mKey}`,
            level: "month",
            label: `${mName} ${currentYear}`,
            monthKey: mKey,
            startDate: mDates.startDate,
            endDate: mDates.endDate,
            targetQuantity: Number((qTargetQty / 3).toFixed(4)), // Informational proportional share
            actualQuantity: Number(mActualQty.toFixed(4)),
            unitSymbol,
            classification: mClassification,
            targetPeriodId: allocatedTarget ? allocatedTarget.target_id : null,
            isReportingLevel: reportingFreq === "monthly",
            requiresDailyMatrix: reportingFreq === "daily",
            children: [],
          };

          quarterNode.children.push(monthNode);
        }
      }

      rootNode.children.push(quarterNode);
    }
  }

  // SCENARIO E, F (Target Depth = 'monthly')
  else if (targetDepth === "monthly") {
    for (let m = 1; m <= 12; m++) {
      const mDates = getMonthDateRange(currentYear, m);
      const mKey = `${currentYear}-${String(m).padStart(2, "0")}`;
      const mName = MONTH_NAMES[m - 1];
      const allocatedTarget = targetByPeriodKey[mKey] || targetByPeriodKey[mName];
      const mTargetQty = allocatedTarget ? Number(allocatedTarget.target_quantity) || 0 : 0;
      const mActualQty = actualsByMonth[mKey] || 0;
      const mAchievement = mTargetQty > 0 ? (mActualQty / mTargetQty) * 100 : 0;

      const mClassification = classifyPeriodRange({
        startDate: mDates.startDate,
        endDate: mDates.endDate,
        todayStr,
        allowanceWindow,
        license,
        assignment,
        approvedTarget: approvedRootTarget,
      });

      const monthNode = {
        id: allocatedTarget ? allocatedTarget.target_id : `month-${mKey}`,
        level: "month",
        label: `${mName} ${currentYear}`,
        monthKey: mKey,
        startDate: mDates.startDate,
        endDate: mDates.endDate,
        targetQuantity: mTargetQty,
        actualQuantity: Number(mActualQty.toFixed(4)),
        remainingTarget: Number(Math.max(0, mTargetQty - mActualQty).toFixed(4)),
        achievementPct: Number(mAchievement.toFixed(2)),
        unitSymbol,
        classification: mClassification,
        targetPeriodId: allocatedTarget ? allocatedTarget.target_id : null,
        isReportingLevel: reportingFreq === "monthly",
        requiresDailyMatrix: reportingFreq === "daily",
        children: [],
      };

      rootNode.children.push(monthNode);
    }
  }

  // SCENARIO G (Target Depth = 'semi_annual')
  else if (targetDepth === "semi_annual") {
    for (let h = 1; h <= 2; h++) {
      const hKey = `H${h}`;
      const hDates = getHalfYearDateRange(currentYear, h);
      const allocatedTarget = targetByPeriodKey[hKey] || targetByPeriodKey[`Semi-Annual ${h}`];
      const hTargetQty = allocatedTarget ? Number(allocatedTarget.target_quantity) || 0 : 0;
      const hActualQty = actualsByHalfYear[hKey] || 0;
      const hAchievement = hTargetQty > 0 ? (hActualQty / hTargetQty) * 100 : 0;

      const hClassification = classifyPeriodRange({
        startDate: hDates.startDate,
        endDate: hDates.endDate,
        todayStr,
        allowanceWindow,
        license,
        assignment,
        approvedTarget: approvedRootTarget,
      });

      const halfYearNode = {
        id: allocatedTarget ? allocatedTarget.target_id : `half-year-${currentYear}-${hKey}`,
        level: "half_year",
        label: `${hKey === "H1" ? "First Half (H1)" : "Second Half (H2)"} ${currentYear}`,
        periodCode: hKey,
        startDate: hDates.startDate,
        endDate: hDates.endDate,
        targetQuantity: hTargetQty,
        actualQuantity: Number(hActualQty.toFixed(4)),
        remainingTarget: Number(Math.max(0, hTargetQty - hActualQty).toFixed(4)),
        achievementPct: Number(hAchievement.toFixed(2)),
        unitSymbol,
        classification: hClassification,
        targetPeriodId: allocatedTarget ? allocatedTarget.target_id : null,
        children: [],
      };

      if (reportingFreq === "daily" || reportingFreq === "monthly") {
        const startMonth = h === 1 ? 1 : 7;
        for (let m = startMonth; m <= startMonth + 5; m++) {
          const mDates = getMonthDateRange(currentYear, m);
          const mKey = `${currentYear}-${String(m).padStart(2, "0")}`;
          const mActualQty = actualsByMonth[mKey] || 0;
          const mName = MONTH_NAMES[m - 1];

          const mClassification = classifyPeriodRange({
            startDate: mDates.startDate,
            endDate: mDates.endDate,
            todayStr,
            allowanceWindow,
            license,
            assignment,
            approvedTarget: approvedRootTarget,
          });

          halfYearNode.children.push({
            id: `month-${mKey}`,
            level: "month",
            label: `${mName} ${currentYear}`,
            monthKey: mKey,
            startDate: mDates.startDate,
            endDate: mDates.endDate,
            targetQuantity: Number((hTargetQty / 6).toFixed(4)),
            actualQuantity: Number(mActualQty.toFixed(4)),
            unitSymbol,
            classification: mClassification,
            targetPeriodId: allocatedTarget ? allocatedTarget.target_id : null,
            isReportingLevel: reportingFreq === "monthly",
            requiresDailyMatrix: reportingFreq === "daily",
            children: [],
          });
        }
      }

      rootNode.children.push(halfYearNode);
    }
  }

  // SCENARIO H (Target Depth = 'annual')
  else {
    // Dynamically decompose based on reporting frequency
    if (reportingFreq === "quarterly") {
      for (let q = 1; q <= 4; q++) {
        const qKey = `Q${q}`;
        const qDates = getQuarterDateRange(currentYear, q);
        const qActualQty = actualsByQuarter[qKey] || 0;
        const qClassification = classifyPeriodRange({
          startDate: qDates.startDate,
          endDate: qDates.endDate,
          todayStr,
          allowanceWindow,
          license,
          assignment,
          approvedTarget: approvedRootTarget,
        });

        rootNode.children.push({
          id: `quarter-${currentYear}-${qKey}`,
          level: "quarter",
          label: `${qKey} ${currentYear}`,
          periodCode: qKey,
          startDate: qDates.startDate,
          endDate: qDates.endDate,
          targetQuantity: Number((annualTargetQuantity / 4).toFixed(4)),
          actualQuantity: Number(qActualQty.toFixed(4)),
          unitSymbol,
          classification: qClassification,
          targetPeriodId: approvedRootTarget ? approvedRootTarget.target_id : null,
          isReportingLevel: true,
          children: [],
        });
      }
    } else if (reportingFreq === "monthly" || reportingFreq === "daily") {
      for (let m = 1; m <= 12; m++) {
        const mDates = getMonthDateRange(currentYear, m);
        const mKey = `${currentYear}-${String(m).padStart(2, "0")}`;
        const mName = MONTH_NAMES[m - 1];
        const mActualQty = actualsByMonth[mKey] || 0;

        const mClassification = classifyPeriodRange({
          startDate: mDates.startDate,
          endDate: mDates.endDate,
          todayStr,
          allowanceWindow,
          license,
          assignment,
          approvedTarget: approvedRootTarget,
        });

        rootNode.children.push({
          id: `month-${mKey}`,
          level: "month",
          label: `${mName} ${currentYear}`,
          monthKey: mKey,
          startDate: mDates.startDate,
          endDate: mDates.endDate,
          targetQuantity: Number((annualTargetQuantity / 12).toFixed(4)),
          actualQuantity: Number(mActualQty.toFixed(4)),
          unitSymbol,
          classification: mClassification,
          targetPeriodId: approvedRootTarget ? approvedRootTarget.target_id : null,
          isReportingLevel: reportingFreq === "monthly",
          requiresDailyMatrix: reportingFreq === "daily",
          children: [],
        });
      }
    }
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

  // Find approved target
  const approvedRootTarget = await CompanyProductionTarget.findOne({
    where: {
      assignment_id: assignmentId,
      status: ["approved", "published"],
      target_period_type: "year",
      period_start_date: { [Op.lte]: `${year}-12-31` },
      period_end_date: { [Op.gte]: `${year}-01-01` },
    },
    order: [["version_number", "DESC"]],
  });

  const allowanceWindow = calculateAllowanceWindow(assignment, todayStr);
  const license = assignment.license;
  const unitSymbol = assignment.defaultReportingUnit?.symbol || "units";

  // Days in month
  const totalDaysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDate = `${yearStr}-${mStr.padStart(2, "0")}-01`;
  const endDate = `${yearStr}-${mStr.padStart(2, "0")}-${String(totalDaysInMonth).padStart(2, "0")}`;

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
  buildTargetAlignedReportingHierarchy,
  buildDailyReportingMatrix,
};
