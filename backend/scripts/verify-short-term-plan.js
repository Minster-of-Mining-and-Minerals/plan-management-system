"use strict";

const assert = require("assert");
const utils = require("../utils/shortTermPlanPeriodUtils");
const { convertEthiopianToGregorian } = require("../utils/calendarUtils");

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

console.log("=== Short-Term Plan Scenario Verification ===");

const startGc = convertEthiopianToGregorian(2019, 3, 1).dateStr; // Hidar 1
const endGc = convertEthiopianToGregorian(2019, 5, 30).dateStr; // Tir 30

test("Generates 3 monthly divisions for Hidar-Tahsas-Tir (EC)", () => {
  const months = utils.generateShortTermDivisions(startGc, endGc, "monthly", "EC");
  assert.strictEqual(months.length, 3);
  assert.ok(months[0].period_label.includes("Hidar"));
  assert.ok(months[1].period_label.includes("Tahsas"));
  assert.ok(months[2].period_label.includes("Tir"));
});

test("Generates 12 weekly divisions (4 per month) for 3-month EC plan", () => {
  const weeks = utils.generateShortTermDivisions(startGc, endGc, "weekly", "EC");
  assert.strictEqual(weeks.length, 12);
  assert.strictEqual(weeks[0].period_label, "Hidar - Week 1");
  assert.strictEqual(weeks[1].period_label, "Hidar - Week 2");
  assert.strictEqual(weeks[11].period_label, "Tir - Week 4");
});

test("Generates 90 daily divisions with narrative-only vs end-of-week numeric checkpoints", () => {
  const days = utils.generateShortTermDivisions(startGc, endGc, "daily", "EC");
  assert.strictEqual(days.length, 90);
  assert.strictEqual(days[0].recommended_submission_type, "narrative_only");
  assert.strictEqual(days[6].recommended_submission_type, "actual_and_narrative");
});

test("Supports sparse milestone targets + narrative-only updates + end-of-period numeric rollup", () => {
  const weeks = utils.generateShortTermDivisions(startGc, endGc, "weekly", "EC");
  const kpi = { total_target: 2, target_mode: "cumulative", allow_narrative_only_updates: true };
  const assignment = {
    allocated_target: 2,
    period_targets: { "Tahsas - Week 4": 1, "Tir - Week 3": 1 },
  };
  const reports = [
    {
      report_id: "r1",
      period_label: "Hidar - Week 2",
      submission_type: "narrative_only",
      planned_target: null,
      reported_actual: null,
      achievement_percent: null,
      narrative: "Reviewed potash & petroleum basin documents.",
    },
    {
      report_id: "r2",
      period_label: "Tahsas - Week 4",
      submission_type: "actual_and_narrative",
      planned_target: 1,
      reported_actual: 1,
      achievement_percent: 100,
      narrative: "Completed 1st digital promotion package.",
    },
  ];
  const res = utils.summarizeAssignmentProgress(kpi, assignment, weeks, reports);
  assert.strictEqual(res.summary.narrative_only_count, 1);
  assert.strictEqual(res.summary.numeric_reports_count, 1);
  assert.strictEqual(res.summary.overall_actual, 1);
  assert.strictEqual(res.summary.overall_achievement_percent, 50);
  assert.strictEqual(res.divisions[1].recommended_submission_type, "narrative_only");
  assert.strictEqual(res.divisions[7].recommended_submission_type, "actual_and_narrative");
});

console.log(`\nAll ${passed} short-term plan tests passed.`);
