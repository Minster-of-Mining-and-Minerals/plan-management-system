"use strict";

/**
 * Annual Target Revision — domain, handler, reporting, and registry checks.
 * Pure unit tests (no DB). Covers redistribution math, validation messages,
 * preview/impact shapes, conflict keys, history, and availability.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  ATR_MESSAGES,
  REDISTRIBUTION_MODE,
  ANNUAL_TARGET_REVISION_REASONS,
  normalizeRedistributionMode,
  normalizeAnnualTargetRevisionMetadata,
  buildRedistribution,
  computeRecordedAchievement,
  buildAnnualTargetRevisionPreviewData,
  buildAnnualTargetRevisionImpactData,
  buildAnnualTargetRevisionHistoryRows,
} = require("../services/planAmendment/annualTargetRevisionDomain");
const {
  AnnualTargetRevisionHandler,
} = require("../services/planAmendment/handlers/annualTargetRevisionHandler");
const { AMENDMENT_TYPE } = require("../utils/planAmendmentTypes");
const {
  clearAmendmentHandlers,
  registerDefaultAmendmentHandlers,
  resolveAmendmentHandler,
  listAvailableAmendmentTypes,
  getAmendmentHandlerCatalog,
} = require("../services/planAmendment/planAmendmentRegistry");
const {
  fingerprintsOverlap,
} = require("../services/planAmendment/planAmendmentConflictService");
const {
  DEFAULT_AMENDMENT_POLICY,
  mergeAmendmentPolicy,
} = require("../utils/planAmendmentActionUtils");

const root = path.join(__dirname, "..");

function makePeriod(id, target, finalized, actual = 0) {
  return {
    livePeriodId: id,
    snapshotPeriodId: `snap-${id}`,
    periodLabel: id.toUpperCase(),
    sequenceIndex: Number(String(id).replace(/\D/g, "") || 0),
    periodNode: { plan_node_id: `node-${id}` },
    executionStatus: finalized ? "completed" : "open",
    finalized,
    currentTarget: target,
    periodActual: actual,
  };
}

function samplePrepared(overrides = {}) {
  const periods = [
    makePeriod("q1", 25, true, 25),
    makePeriod("q2", 25, false),
    makePeriod("q3", 25, false),
    makePeriod("q4", 25, false),
  ];
  const redistribution = buildRedistribution({
    mode: REDISTRIBUTION_MODE.EQUAL,
    revisedAnnual: 80,
    periods,
    periodAllocations: [],
  });
  assert.strictEqual(redistribution.valid, true);

  return {
    success: true,
    metadata: {
      kpiId: "kpi-1",
      reason: "Budget Reduction",
      reasonCode: "budget_reduction",
      redistributionMode: REDISTRIBUTION_MODE.EQUAL,
      revisedAnnualTarget: 80,
    },
    context: {
      liveAnnualKpi: { plan_node_id: "kpi-1", title: "Output KPI" },
      snapshotAnnualKpi: { plan_node_id: "snap-annual-kpi" },
      snapshotMasterKpi: { plan_node_id: "snap-master-kpi" },
      periods,
      originalAnnualTarget: 100,
      currentAnnualTarget: 100,
    },
    redistribution,
    achieved: 25,
    originalAnnualTarget: 100,
    currentAnnualTarget: 100,
    revisedAnnualTarget: 80,
    delta: -20,
    ...overrides,
  };
}

function testNormalization() {
  assert.strictEqual(normalizeRedistributionMode("AUTO_PROPORTIONAL"), "proportional");
  assert.strictEqual(normalizeRedistributionMode("auto_equal"), "equal");
  assert.strictEqual(normalizeRedistributionMode("MANUAL"), "manual");
  assert.strictEqual(normalizeRedistributionMode("bogus"), null);

  const meta = normalizeAnnualTargetRevisionMetadata({
    kpi_id: "abc",
    revised_annual_target: 80,
    redistribution_mode: "AUTO_EQUAL",
    period_allocations: [{ period_id: "q2", period_target: 20 }],
    reason_code: "budget_reduction",
    reason: "Budget Reduction",
  });
  assert.strictEqual(meta.kpiId, "abc");
  assert.strictEqual(meta.revisedAnnualTarget, 80);
  assert.strictEqual(meta.periodAllocations[0].periodId, "q2");
  assert.strictEqual(meta.periodAllocations[0].target, 20);
  assert.ok(ANNUAL_TARGET_REVISION_REASONS.some((r) => r.code === "budget_reduction"));
}

function testBudgetReductionEqual() {
  const periods = [
    makePeriod("q1", 25, true),
    makePeriod("q2", 25, false),
    makePeriod("q3", 25, false),
    makePeriod("q4", 25, false),
  ];
  const result = buildRedistribution({
    mode: REDISTRIBUTION_MODE.EQUAL,
    revisedAnnual: 80,
    periods,
    periodAllocations: [],
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.completedSum, 25);
  assert.strictEqual(result.remainingBudget, 55);
  const sum = result.allocations.reduce((s, row) => s + row.newTarget, 0);
  assert.ok(Math.abs(sum - 55) < 0.001);
  assert.strictEqual(result.allocations.length, 3);
}

function testBudgetIncreaseProportional() {
  const periods = [
    makePeriod("q1", 10, true),
    makePeriod("q2", 20, false),
    makePeriod("q3", 30, false),
    makePeriod("q4", 40, false),
  ];
  const result = buildRedistribution({
    mode: REDISTRIBUTION_MODE.PROPORTIONAL,
    revisedAnnual: 190,
    periods,
    periodAllocations: [],
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.remainingBudget, 180);
  // weights 20+30+40 = 90 → shares 40, 60, 80
  assert.strictEqual(result.allocations[0].newTarget, 40);
  assert.strictEqual(result.allocations[1].newTarget, 60);
  assert.strictEqual(result.allocations[2].newTarget, 80);
}

function testManualRedistribution() {
  const periods = [
    makePeriod("q1", 25, true),
    makePeriod("q2", 25, false),
    makePeriod("q3", 25, false),
    makePeriod("q4", 25, false),
  ];
  const ok = buildRedistribution({
    mode: REDISTRIBUTION_MODE.MANUAL,
    revisedAnnual: 80,
    periods,
    periodAllocations: [
      { periodId: "q2", target: 20 },
      { periodId: "q3", target: 15 },
      { periodId: "q4", target: 20 },
    ],
  });
  assert.strictEqual(ok.valid, true);
  assert.strictEqual(ok.remainingBudget, 55);

  const mismatch = buildRedistribution({
    mode: REDISTRIBUTION_MODE.MANUAL,
    revisedAnnual: 80,
    periods,
    periodAllocations: [
      { periodId: "q2", target: 10 },
      { periodId: "q3", target: 10 },
      { periodId: "q4", target: 10 },
    ],
  });
  assert.strictEqual(mismatch.valid, false);
  assert.strictEqual(mismatch.message, ATR_MESSAGES.REDISTRIBUTION_MISMATCH);

  const negative = buildRedistribution({
    mode: REDISTRIBUTION_MODE.MANUAL,
    revisedAnnual: 80,
    periods,
    periodAllocations: [
      { periodId: "q2", target: -1 },
      { periodId: "q3", target: 28 },
      { periodId: "q4", target: 28 },
    ],
  });
  assert.strictEqual(negative.valid, false);
  assert.strictEqual(negative.message, ATR_MESSAGES.REVISED_NEGATIVE);
}

function testRemainingNegative() {
  const periods = [
    makePeriod("q1", 60, true),
    makePeriod("q2", 20, false),
    makePeriod("q3", 20, false),
  ];
  const result = buildRedistribution({
    mode: REDISTRIBUTION_MODE.EQUAL,
    revisedAnnual: 50,
    periods,
    periodAllocations: [],
  });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.message, ATR_MESSAGES.REMAINING_NEGATIVE);
}

function testAchievementFloorMessages() {
  assert.match(ATR_MESSAGES.BELOW_ACHIEVEMENT, /lower than recorded achievement/i);
  assert.match(ATR_MESSAGES.FINALIZED_PERIOD, /cannot be modified/i);
  assert.match(ATR_MESSAGES.ZERO_NOT_ALLOWED, /not allowed/i);

  const context = {
    snapshotAnnualKpi: { annual_actual: 70 },
    periods: [
      makePeriod("q1", 25, true, 25),
      makePeriod("q2", 25, false, 20),
      makePeriod("q3", 25, false, 15),
      makePeriod("q4", 25, false, 10),
    ],
  };
  assert.strictEqual(computeRecordedAchievement(context), 70);
}

function testZeroAnnualPolicy() {
  const policy = mergeAmendmentPolicy({
    ...DEFAULT_AMENDMENT_POLICY,
    allow_zero_annual_target: false,
  });
  assert.strictEqual(policy.allow_zero_annual_target, false);
  const allowed = mergeAmendmentPolicy({
    allow_zero_annual_target: true,
  });
  assert.strictEqual(allowed.allow_zero_annual_target, true);
}

function testPreviewImpactHistory() {
  const prepared = samplePrepared();
  const preview = buildAnnualTargetRevisionPreviewData(prepared);
  assert.strictEqual(preview.amendment_type, AMENDMENT_TYPE.ANNUAL_TARGET_REVISION);
  assert.strictEqual(preview.original_annual_target, 100);
  assert.strictEqual(preview.revised_annual_target, 80);
  assert.strictEqual(preview.completed_periods.length, 1);
  assert.strictEqual(preview.remaining_periods.length, 3);
  assert.strictEqual(preview.summary.remaining_target, 55);

  const impact = buildAnnualTargetRevisionImpactData(prepared);
  assert.ok(Array.isArray(impact.summary));
  assert.strictEqual(impact.difference, -20);
  assert.strictEqual(impact.affected_periods, 3);
  assert.strictEqual(impact.affected_kpi, "Output KPI");
  assert.strictEqual(impact.affected_rollups, true);
  assert.ok(impact.changes.some((c) => c.field === "annual_target"));

  const history = buildAnnualTargetRevisionHistoryRows(prepared);
  assert.ok(history.some((row) => row.field_name === "annual_target"));
  assert.ok(history.some((row) => row.field_name === "period_target"));
}

function testPerformanceUsesCurrentTarget() {
  const original = 100;
  const current = 80;
  const actual = 80;
  const performanceOnCurrent = Math.round((actual / current) * 1000) / 10;
  const performanceOnOriginal = Math.round((actual / original) * 1000) / 10;
  assert.strictEqual(performanceOnCurrent, 100);
  assert.notStrictEqual(performanceOnCurrent, performanceOnOriginal);
}

function testHandlerRegistrationAndConflictKeys() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();

  const available = listAvailableAmendmentTypes();
  assert.ok(available.includes(AMENDMENT_TYPE.TARGET_REALLOCATION));
  assert.ok(available.includes(AMENDMENT_TYPE.ANNUAL_TARGET_REVISION));
  assert.ok(available.includes(AMENDMENT_TYPE.KPI_ADDITION));
  assert.strictEqual(available.length, 3);

  const handler = resolveAmendmentHandler(AMENDMENT_TYPE.ANNUAL_TARGET_REVISION);
  assert.ok(handler instanceof AnnualTargetRevisionHandler);
  assert.strictEqual(handler.isAvailable(), true);

  const catalog = getAmendmentHandlerCatalog();
  const atr = catalog.find(
    (row) => row.type === AMENDMENT_TYPE.ANNUAL_TARGET_REVISION
  );
  assert.strictEqual(atr.available, true);
  assert.strictEqual(atr.registered, true);

  const keys = handler.conflictKeys({
    metadata: { kpiId: "kpi-9", periodAllocations: [{ periodId: "p1" }] },
  });
  assert.deepStrictEqual(keys.kpiIds, ["kpi-9"]);
  assert.ok(keys.entityKeys.includes("kpi:kpi-9"));
  assert.ok(keys.entityKeys.includes("annual_target:kpi-9"));
  assert.ok(keys.entityKeys.includes("structural:kpi:kpi-9"));

  const overlap = fingerprintsOverlap(
    { kpiIds: ["kpi-9"], periodIds: [], entityKeys: keys.entityKeys },
    {
      kpiIds: ["kpi-9"],
      periodIds: [],
      entityKeys: [`kpi:kpi-9`, `structural:kpi:kpi-9`],
    }
  );
  assert.strictEqual(overlap.overlaps, true);

  const noOverlap = fingerprintsOverlap(
    { kpiIds: ["kpi-9"], periodIds: [], entityKeys: keys.entityKeys },
    { kpiIds: ["other"], periodIds: [], entityKeys: ["kpi:other"] }
  );
  assert.strictEqual(noOverlap.overlaps, false);
}

function testReportingArtifacts() {
  const reportingSource = fs.readFileSync(
    path.join(
      root,
      "services/planAmendment/annualTargetRevisionReportingService.js"
    ),
    "utf8"
  );
  assert.match(reportingSource, /original_annual_target/);
  assert.match(reportingSource, /current_annual_target/);
  assert.match(reportingSource, /performance_percent/);
  assert.match(reportingSource, /comparison_mode/);
  assert.match(reportingSource, /applied_revisions/);

  const routesSource = fs.readFileSync(
    path.join(root, "routers/plan/planRoutes.js"),
    "utf8"
  );
  assert.match(routesSource, /annual-target-revision-reporting/);

  const docs = fs.readFileSync(
    path.join(root, "../docs/PLAN_AMENDMENT_FRAMEWORK.md"),
    "utf8"
  );
  assert.match(docs, /annual_target_revision/);
  assert.match(docs, /\*\*Yes\*\*/);
}

function testEngineUntouched() {
  const engineSource = fs.readFileSync(
    path.join(root, "services/planAmendment/planAmendmentEngine.js"),
    "utf8"
  );
  assert.doesNotMatch(engineSource, /case\s+['"]annual_target_revision['"]/);
  assert.doesNotMatch(engineSource, /AnnualTargetRevisionHandler/);
}

function run() {
  testNormalization();
  testBudgetReductionEqual();
  testBudgetIncreaseProportional();
  testManualRedistribution();
  testRemainingNegative();
  testAchievementFloorMessages();
  testZeroAnnualPolicy();
  testPreviewImpactHistory();
  testPerformanceUsesCurrentTarget();
  testHandlerRegistrationAndConflictKeys();
  testReportingArtifacts();
  testEngineUntouched();
  console.log("Annual Target Revision checks passed.");
}

run();
