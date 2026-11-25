"use strict";

const assert = require("assert");
const {
  PERIOD_STATUS,
  getBusinessToday,
  calculateAllowanceWindow,
  classifyReportingDate,
  classifyPeriodRange,
  classifyReportingPeriod,
} = require("../services/production/productionPeriodAccessService");

console.log("=====================================================================");
console.log("RUNNING PRODUCTION PERIOD ACCESS & ROLLING ALLOWANCE ENGINE TEST SUITE");
console.log("=====================================================================");

const todayStr = "2026-11-22";

// -------------------------------------------------------------------
// TEST 1: Allowance Window Calculation
// -------------------------------------------------------------------
console.log("\n[TEST 1] Allowance Window Calculation");

const assignDaily7 = {
  allow_past_reporting: true,
  past_reporting_duration: 7,
  past_reporting_unit: "days",
};
const winDaily7 = calculateAllowanceWindow(assignDaily7, todayStr);
assert.strictEqual(winDaily7.allowPast, true);
assert.strictEqual(winDaily7.earliestAllowedDate, "2026-11-15");
console.log("  ✓ Daily 7-day rolling allowance from 2026-11-22 => earliest: 2026-11-15");

const assignMonthly2 = {
  allow_past_reporting: true,
  past_reporting_duration: 2,
  past_reporting_unit: "months",
};
const winMonthly2 = calculateAllowanceWindow(assignMonthly2, todayStr);
assert.strictEqual(winMonthly2.allowPast, true);
assert.strictEqual(winMonthly2.earliestAllowedMonth, "2026-09");
console.log("  ✓ Monthly 2-month rolling allowance from 2026-11 => earliest: 2026-09");

const assignDisabled = {
  allow_past_reporting: false,
};
const winDisabled = calculateAllowanceWindow(assignDisabled, todayStr);
assert.strictEqual(winDisabled.allowPast, false);
assert.strictEqual(winDisabled.earliestAllowedDate, todayStr);
console.log("  ✓ Disabled past reporting strictly locks earliest date to today");

// -------------------------------------------------------------------
// TEST 2: Daily Reporting Date Classification & Rolling Access Window
// -------------------------------------------------------------------
console.log("\n[TEST 2] Daily Reporting Date Classification & Rolling Window");

const activeLicense = {
  license_number: "LIC-TEST-001",
  status: "active",
  effective_start_date: "2026-01-01",
  effective_end_date: "2028-12-31",
};

const activeAssignment = {
  is_active: true,
  effective_from: "2026-01-01",
  effective_to: "2027-12-31",
};

const approvedTarget = {
  version_number: 1,
  target_id: "target-root-1",
};

// 2a. Today
const classToday = classifyReportingDate({
  dateStr: "2026-11-22",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(classToday.status, PERIOD_STATUS.CURRENT);
assert.strictEqual(classToday.isAccessible, true);
console.log("  ✓ Today (2026-11-22) is CURRENT and accessible");

// 2b. Future date
const classFuture = classifyReportingDate({
  dateStr: "2026-11-23",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(classFuture.status, PERIOD_STATUS.LOCKED_FUTURE);
assert.strictEqual(classFuture.isAccessible, false);
console.log("  ✓ Future date (2026-11-23) is LOCKED_FUTURE");

// 2c. Past date strictly locked
const classPastAllowed = classifyReportingDate({
  dateStr: "2026-11-18",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(classPastAllowed.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(classPastAllowed.isAccessible, false);
console.log("  ✓ Past date (2026-11-18) is LOCKED_PAST and locked");

// 2d. Boundary date: past date
const classBoundary = classifyReportingDate({
  dateStr: "2026-11-15",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(classBoundary.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(classBoundary.isAccessible, false);
console.log("  ✓ Past boundary date (2026-11-15) is LOCKED_PAST and locked");

// 2e. Past date outside 7-day allowance (8 days ago)
const classPastLocked = classifyReportingDate({
  dateStr: "2026-11-14",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(classPastLocked.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(classPastLocked.isAccessible, false);
console.log("  ✓ Date outside allowance (2026-11-14) is LOCKED_PAST");

// 2f. Past date with past reporting disabled
const classPastDisabled = classifyReportingDate({
  dateStr: "2026-11-21",
  todayStr,
  allowanceWindow: winDisabled,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(classPastDisabled.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(classPastDisabled.isAccessible, false);
console.log("  ✓ Past date with disabled past reporting is LOCKED_PAST");

// 2g. License boundary check
const classBeforeLicense = classifyReportingDate({
  dateStr: "2025-12-31",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(classBeforeLicense.status, PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD);
assert.strictEqual(classBeforeLicense.isAccessible, false);
console.log("  ✓ Date before license effective start is OUTSIDE_LICENSE_PERIOD");

// 2h. Inactive license
const classSuspendedLicense = classifyReportingDate({
  dateStr: "2026-11-22",
  todayStr,
  allowanceWindow: winDaily7,
  license: { ...activeLicense, status: "suspended" },
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(classSuspendedLicense.status, PERIOD_STATUS.OUTSIDE_LICENSE_PERIOD);
assert.strictEqual(classSuspendedLicense.isAccessible, false);
console.log("  ✓ Suspended license strictly blocks reporting");

// 2i. Inactive assignment
const classInactiveAssign = classifyReportingDate({
  dateStr: "2026-11-22",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: { ...activeAssignment, is_active: false },
  approvedTarget,
});
assert.strictEqual(classInactiveAssign.status, PERIOD_STATUS.INACTIVE_ASSIGNMENT);
assert.strictEqual(classInactiveAssign.isAccessible, false);
console.log("  ✓ Inactive assignment strictly blocks reporting");

// 2j. Unapproved target
const classNoTarget = classifyReportingDate({
  dateStr: "2026-11-22",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget: null,
});
assert.strictEqual(classNoTarget.status, PERIOD_STATUS.NO_APPROVED_TARGET);
assert.strictEqual(classNoTarget.isAccessible, false);
console.log("  ✓ Assignment without approved target is NO_APPROVED_TARGET");

// 2k. Existing submitted report
const classExistingReport = classifyReportingDate({
  dateStr: "2026-11-22",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  existingReport: { report_id: "rep-1", status: "submitted", quantity_reported: "150" },
  approvedTarget,
});
assert.strictEqual(classExistingReport.status, PERIOD_STATUS.SUBMITTED);
assert.strictEqual(classExistingReport.isAccessible, false);
console.log("  ✓ Date with existing submitted report is SUBMITTED and duplicate-protected");

// 2l. Existing rejected report allows resubmission/correction
const classRejectedReport = classifyReportingDate({
  dateStr: "2026-11-20",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  existingReport: { report_id: "rep-2", status: "rejected", review_comments: "Missing scale receipt." },
  approvedTarget,
});
assert.strictEqual(classRejectedReport.status, PERIOD_STATUS.REJECTED);
assert.strictEqual(classRejectedReport.isAccessible, true);
console.log("  ✓ Date with rejected report allows correction (REJECTED and accessible)");

// -------------------------------------------------------------------
// TEST 3: Period Range Classification (Months, Quarters)
// -------------------------------------------------------------------
console.log("\n[TEST 3] Period Range Classification");

// Current quarter (Q4 2026: 2026-10-01 to 2026-12-31)
const q4Class = classifyPeriodRange({
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(q4Class.status, PERIOD_STATUS.CURRENT);
assert.strictEqual(q4Class.isAccessible, true);
console.log("  ✓ Q4 containing today is CURRENT");

// Future quarter (Q1 2027)
const qFutureClass = classifyPeriodRange({
  startDate: "2027-01-01",
  endDate: "2027-03-31",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(qFutureClass.status, PERIOD_STATUS.LOCKED_FUTURE);
assert.strictEqual(qFutureClass.isAccessible, false);
console.log("  ✓ Future period is LOCKED_FUTURE");

// Past quarter is strictly locked
const q3Class = classifyPeriodRange({
  startDate: "2026-07-01",
  endDate: "2026-09-30",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(q3Class.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(q3Class.isAccessible, false);
console.log("  ✓ Past period Q3 is LOCKED_PAST");

// -------------------------------------------------------------------
// TEST 4: Frequency-Aware classifyReportingPeriod (Daily, Monthly, Quarterly, Semi-Annual, Annual)
// -------------------------------------------------------------------
console.log("\n[TEST 4] Frequency-Aware classifyReportingPeriod");

// 4a. Daily reporting
const dailyToday = classifyReportingPeriod({
  frequencyCode: "daily",
  dateStr: "2026-11-22",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(dailyToday.status, PERIOD_STATUS.CURRENT);
assert.strictEqual(dailyToday.isAccessible, true);
console.log("  ✓ Daily today (2026-11-22) is CURRENT and accessible");

const dailyFuture = classifyReportingPeriod({
  frequencyCode: "daily",
  dateStr: "2026-11-23",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(dailyFuture.status, PERIOD_STATUS.LOCKED_FUTURE);
assert.strictEqual(dailyFuture.isAccessible, false);
console.log("  ✓ Daily future date is LOCKED_FUTURE");

const dailyPast = classifyReportingPeriod({
  frequencyCode: "daily",
  dateStr: "2026-11-21",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(dailyPast.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(dailyPast.isAccessible, false);
console.log("  ✓ Daily past date is LOCKED_PAST");

// 4b. Monthly reporting (The bug scenario: today is 2026-11-22, report_date is 2026-11-01)
const monthlyStart = classifyReportingPeriod({
  frequencyCode: "monthly",
  dateStr: "2026-11-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(monthlyStart.status, PERIOD_STATUS.CURRENT);
assert.strictEqual(monthlyStart.isAccessible, true);
console.log("  ✓ Monthly report on period start date (2026-11-01) while inside month is CURRENT and accessible (BUG FIXED)");

const monthlyEnd = classifyReportingPeriod({
  frequencyCode: "monthly",
  dateStr: "2026-11-30",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(monthlyEnd.status, PERIOD_STATUS.CURRENT);
assert.strictEqual(monthlyEnd.isAccessible, true);
console.log("  ✓ Monthly report on period end date (2026-11-30) while inside month is CURRENT and accessible");

const monthlyPast = classifyReportingPeriod({
  frequencyCode: "monthly",
  dateStr: "2026-10-15",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(monthlyPast.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(monthlyPast.isAccessible, false);
console.log("  ✓ Monthly report in closed past month (October 2026) is LOCKED_PAST");

const monthlyFuture = classifyReportingPeriod({
  frequencyCode: "monthly",
  dateStr: "2026-12-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(monthlyFuture.status, PERIOD_STATUS.LOCKED_FUTURE);
assert.strictEqual(monthlyFuture.isAccessible, false);
console.log("  ✓ Monthly report in upcoming month (December 2026) is LOCKED_FUTURE");

// 4c. Quarterly reporting
const quarterlyCurrent = classifyReportingPeriod({
  frequencyCode: "quarterly",
  dateStr: "2026-10-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(quarterlyCurrent.status, PERIOD_STATUS.CURRENT);
assert.strictEqual(quarterlyCurrent.isAccessible, true);
console.log("  ✓ Quarterly report for Q4 (2026-10-01) while inside Q4 is CURRENT and accessible");

const quarterlyPast = classifyReportingPeriod({
  frequencyCode: "quarterly",
  dateStr: "2026-08-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(quarterlyPast.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(quarterlyPast.isAccessible, false);
console.log("  ✓ Quarterly report for past Q3 is LOCKED_PAST");

const quarterlyFuture = classifyReportingPeriod({
  frequencyCode: "quarterly",
  dateStr: "2027-01-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(quarterlyFuture.status, PERIOD_STATUS.LOCKED_FUTURE);
assert.strictEqual(quarterlyFuture.isAccessible, false);
console.log("  ✓ Quarterly report for future Q1 2027 is LOCKED_FUTURE");

// 4d. Semi-Annual reporting
const semiAnnualCurrent = classifyReportingPeriod({
  frequencyCode: "semi_annual",
  dateStr: "2026-07-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(semiAnnualCurrent.status, PERIOD_STATUS.CURRENT);
assert.strictEqual(semiAnnualCurrent.isAccessible, true);
console.log("  ✓ Semi-annual report for H2 (2026-07-01) while inside H2 is CURRENT and accessible");

const semiAnnualPast = classifyReportingPeriod({
  frequencyCode: "semi_annual",
  dateStr: "2026-03-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(semiAnnualPast.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(semiAnnualPast.isAccessible, false);
console.log("  ✓ Semi-annual report for past H1 is LOCKED_PAST");

const semiAnnualFuture = classifyReportingPeriod({
  frequencyCode: "semi_annual",
  dateStr: "2027-01-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(semiAnnualFuture.status, PERIOD_STATUS.LOCKED_FUTURE);
assert.strictEqual(semiAnnualFuture.isAccessible, false);
console.log("  ✓ Semi-annual report for future H1 2027 is LOCKED_FUTURE");

// 4e. Annual reporting
const annualCurrent = classifyReportingPeriod({
  frequencyCode: "annual",
  dateStr: "2026-01-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(annualCurrent.status, PERIOD_STATUS.CURRENT);
assert.strictEqual(annualCurrent.isAccessible, true);
console.log("  ✓ Annual report for 2026 while inside 2026 is CURRENT and accessible");

const annualPast = classifyReportingPeriod({
  frequencyCode: "annual",
  dateStr: "2025-06-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: { ...activeLicense, effective_start_date: "2024-01-01" },
  assignment: { ...activeAssignment, effective_from: "2024-01-01" },
  approvedTarget,
});
assert.strictEqual(annualPast.status, PERIOD_STATUS.LOCKED_PAST);
assert.strictEqual(annualPast.isAccessible, false);
console.log("  ✓ Annual report for past year 2025 within license is LOCKED_PAST");

const annualFuture = classifyReportingPeriod({
  frequencyCode: "annual",
  dateStr: "2027-01-01",
  todayStr,
  allowanceWindow: winDaily7,
  license: activeLicense,
  assignment: activeAssignment,
  approvedTarget,
});
assert.strictEqual(annualFuture.status, PERIOD_STATUS.LOCKED_FUTURE);
assert.strictEqual(annualFuture.isAccessible, false);
console.log("  ✓ Annual report for future year 2027 is LOCKED_FUTURE");

console.log("\n=====================================================================");
console.log(">>> ALL PRODUCTION PERIOD ACCESS TESTS PASSED SUCCESSFULLY (30/30) <<<");
console.log("=====================================================================\n");
