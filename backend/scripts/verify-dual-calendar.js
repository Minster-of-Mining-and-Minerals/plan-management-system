"use strict";

const assert = require("assert");
const cal = require("../utils/calendarUtils");
const nrPeriod = require("../utils/nationalReportingPeriodUtils");
const planConfigSvc = require("../services/planningConfigurationService");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log("=== 1. Calendar Conversion & Validation Tests ===");

test("Gregorian to Ethiopian conversion (2026-09-11 -> 2019-01-01 EC)", () => {
  const ec = cal.convertGregorianToEthiopian("2026-09-11");
  assert.deepStrictEqual({ year: ec.year, month: ec.month, day: ec.day }, { year: 2019, month: 1, day: 1 });
  assert.strictEqual(ec.monthName, "Meskerem");
});

test("Ethiopian to Gregorian conversion (2019-01-01 EC -> 2026-09-11 GC)", () => {
  const gc = cal.convertEthiopianToGregorian(2019, 1, 1);
  assert.strictEqual(gc.dateStr, "2026-09-11");
});

test("Round-trip conversion across year boundaries & Pagume", () => {
  const samples = ["2025-09-10", "2025-09-11", "2026-09-10", "2026-09-11", "2027-09-11", "2027-09-12"];
  for (const gcStr of samples) {
    const ec = cal.convertGregorianToEthiopian(gcStr);
    const back = cal.convertEthiopianToGregorian(ec.year, ec.month, ec.day);
    assert.strictEqual(back.dateStr, gcStr, `Round-trip failed for ${gcStr}`);
  }
});

test("Ethiopian leap year & Pagume 5 / Pagume 6 validation", () => {
  assert.strictEqual(cal.isEthiopianLeapYear(2015), true);
  assert.strictEqual(cal.isEthiopianLeapYear(2018), false);
  assert.strictEqual(cal.isEthiopianLeapYear(2019), true);

  assert.strictEqual(cal.validateEthiopianDate(2018, 13, 5).valid, true);
  assert.strictEqual(cal.validateEthiopianDate(2018, 13, 6).valid, false);
  assert.strictEqual(cal.validateEthiopianDate(2019, 13, 6).valid, true);
  assert.strictEqual(cal.validateEthiopianDate(2019, 13, 7).valid, false);
  assert.strictEqual(cal.validateEthiopianDate(2019, 14, 1).valid, false);
  assert.strictEqual(cal.validateEthiopianDate(2019, 1, 31).valid, false);
});

test("resolveCanonicalDateInput converts EC input and preserves GC input", () => {
  const ecRes = cal.resolveCanonicalDateInput("2019-01-01", "EC");
  assert.strictEqual(ecRes.valid, true);
  assert.strictEqual(ecRes.canonicalDate, "2026-09-11");

  const gcRes = cal.resolveCanonicalDateInput("2026-09-11", "GC");
  assert.strictEqual(gcRes.valid, true);
  assert.strictEqual(gcRes.canonicalDate, "2026-09-11");

  const badEc = cal.resolveCanonicalDateInput("2018-13-06", "EC");
  assert.strictEqual(badEc.valid, false);
});

console.log("\n=== 2. Planning Phase Integration Tests ===");

test("Gregorian annual & multi-year planning remains intact (regression)", () => {
  const period = planConfigSvc.computePlanningPeriodEnd("2026-01-01", 3, "GC");
  assert.strictEqual(period.calendar_system, "GC");
  assert.strictEqual(period.start_year, 2026);
  assert.strictEqual(period.end_year, 2028);
  assert.strictEqual(period.planning_end_date, "2028-01-01");
});

test("Ethiopian annual & multi-year planning boundaries & slices", () => {
  const period = planConfigSvc.computePlanningPeriodEnd("2026-09-11", 3, "EC");
  assert.strictEqual(period.calendar_system, "EC");
  assert.strictEqual(period.start_year, 2019);
  assert.strictEqual(period.end_year, 2021);
  assert.strictEqual(period.start_month, 1);
  assert.strictEqual(period.end_month, 13);

  const slices = cal.enumerateCalendarAnnualSlices(
    {
      planning_start_date: "2026-09-11",
      planning_duration_years: 2,
      calendar_system: "EC",
    },
    "EC"
  );
  assert.strictEqual(slices.length, 2);
  assert.strictEqual(slices[0].planning_year, 2019);
  assert.strictEqual(slices[0].planning_start_date, "2026-09-11");
  assert.strictEqual(slices[0].planning_end_date, "2027-09-11"); // 2019 EC is leap year (Pagume 6)
  assert.strictEqual(slices[1].planning_year, 2020);
  assert.strictEqual(slices[1].planning_start_date, "2027-09-12"); // 2020-01-01 EC
});

test("Ethiopian Annual-Monthly generation includes 13 months with Pagume", () => {
  const end2019 = cal.calculateCalendarAnnualEndDate("2026-09-11", "EC");
  const months = cal.generateCalendarPeriods("2026-09-11", end2019, "monthly", "EC");
  assert.strictEqual(months.length, 13);
  assert.strictEqual(months[0].ethiopian_month_name, "Meskerem");
  assert.strictEqual(months[12].ethiopian_month_name, "Pagume");
  assert.strictEqual(months[12].display_start_date, "2019-13-01");
  assert.strictEqual(months[12].display_end_date, "2019-13-06");
  assert.strictEqual(months[12].end_date, "2027-09-11");
});

test("Ethiopian Annual-Quarterly and Annual-Semi-Annual period generation", () => {
  const end2019 = cal.calculateCalendarAnnualEndDate("2026-09-11", "EC");
  const quarters = cal.generateCalendarPeriods("2026-09-11", end2019, "quarterly", "EC");
  assert.strictEqual(quarters.length, 4);
  assert.strictEqual(quarters[0].display_start_date, "2019-01-01");
  assert.strictEqual(quarters[0].display_end_date, "2019-03-30");
  assert.strictEqual(quarters[3].display_end_date, "2019-13-06");

  const semis = cal.generateCalendarPeriods("2026-09-11", end2019, "semi_annually", "EC");
  assert.strictEqual(semis.length, 2);
  assert.strictEqual(semis[0].display_start_date, "2019-01-01");
  assert.strictEqual(semis[0].display_end_date, "2019-06-30");
  assert.strictEqual(semis[1].display_end_date, "2019-13-06");
});

console.log("\n=== 3. National Reporting Integration & Regression Tests ===");

test("Gregorian National Reporting periods remain intact (regression)", () => {
  const endGc = nrPeriod.calculateAnnualEndDate("2026-07-01", "GC");
  assert.strictEqual(endGc, "2027-06-30");
  const periods = nrPeriod.generateReportingPeriods("2026-07-01", endGc, "quarterly", "GC");
  assert.strictEqual(periods.length, 4);
  assert.strictEqual(periods[0].start_date, "2026-07-01");
  assert.strictEqual(periods[3].end_date, "2027-06-30");
});

test("Daily reporting within Ethiopian Q1 quarterly boundaries", () => {
  const end2019 = nrPeriod.calculateAnnualEndDate("2026-09-11", "EC");
  const q1 = cal.getPeriodBoundaries("2026-09-11", end2019, "quarterly", "Q1", "EC");
  assert.ok(q1, "Q1 boundary must resolve");
  const dailyInQ1 = nrPeriod.generateReportingPeriods(q1.start_date, q1.end_date, "daily", "EC");
  assert.strictEqual(dailyInQ1.length, 90); // 3 Ethiopian months * 30 days = 90 days
  assert.strictEqual(dailyInQ1[0].display_start_date, "2019-01-01");
  assert.strictEqual(dailyInQ1[89].display_end_date, "2019-03-30");
});

test("Reporting phase lock calculation works with EC periods", () => {
  const end2019 = nrPeriod.calculateAnnualEndDate("2026-09-11", "EC");
  const months = nrPeriod.generateReportingPeriods("2026-09-11", end2019, "monthly", "EC");
  const lockStatus = nrPeriod.computePeriodLockStatus({
    period: months[0],
    phaseConfig: { open_days_before: 5, close_days_after: 5, allow_grace_period: true },
  });
  assert.ok(lockStatus.reporting_phase_start);
  assert.ok(lockStatus.reporting_phase_end);
  assert.ok(typeof lockStatus.is_locked === "boolean");
});

console.log(`\nAll ${passed} dual-calendar tests completed.`);
