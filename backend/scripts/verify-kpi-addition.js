"use strict";

/**
 * KPI Addition — domain, handler, reporting, and registry checks.
 * Pure unit tests (no DB). Covers period/weight planning, preview/impact shapes,
 * conflict keys, handler availability, and reporting artifacts.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  KPI_ADDITION_MESSAGES,
  WEIGHT_MODE,
  normalizeKpiAdditionMetadata,
  buildPeriodAllocations,
  buildSiblingWeightPlan,
  buildKpiAdditionPreviewData,
  buildKpiAdditionImpactData,
} = require("../services/planAmendment/kpiAdditionDomain");
const {
  KpiAdditionHandler,
} = require("../services/planAmendment/handlers/kpiAdditionHandler");
const { AMENDMENT_TYPE } = require("../utils/planAmendmentTypes");
const {
  clearAmendmentHandlers,
  registerDefaultAmendmentHandlers,
  resolveAmendmentHandler,
  listAvailableAmendmentTypes,
  getAmendmentHandlerCatalog,
} = require("../services/planAmendment/planAmendmentRegistry");

const root = path.join(__dirname, "..");

function makePeriod(id, finalized, sequenceIndex = 0) {
  return {
    livePeriodId: id,
    snapshotPeriodId: `snap-${id}`,
    periodLabel: id.toUpperCase(),
    sequenceIndex,
    executionStatus: finalized ? "completed" : "open",
    finalized,
  };
}

function samplePrepared(overrides = {}) {
  const periods = [
    makePeriod("q1", true, 1),
    makePeriod("q2", false, 2),
    makePeriod("q3", false, 3),
    makePeriod("q4", false, 4),
  ];
  const periodPlan = buildPeriodAllocations(
    {
      startPeriodId: "q2",
      endPeriodId: "q4",
      periodAllocations: [
        { periodId: "q2", target: 40 },
        { periodId: "q3", target: 30 },
        { periodId: "q4", target: 30 },
      ],
    },
    periods,
    100
  );
  assert.strictEqual(periodPlan.valid, true);

  const weightPlan = buildSiblingWeightPlan({
    siblings: [
      {
        kpiId: "sib-1",
        weight: 50,
        contributionWeight: 50,
        node: { plan_node_id: "sib-1" },
      },
    ],
    newWeight: 20,
    newContributionWeight: 20,
    parentWeight: 70,
    mode: WEIGHT_MODE.PROPORTIONAL,
    manualAdjustments: [],
  });
  assert.strictEqual(weightPlan.valid, true);

  return {
    success: true,
    metadata: {
      title: "New Output KPI",
      description: "Added mid-year",
      parentId: "goal-1",
      annualTarget: 100,
      weight: 20,
      contributionWeight: 20,
      targetUnit: "units",
      targetAllocationMode: "manual",
      achievementMode: "cumulative",
      ownerUserId: "user-1",
      governmentStructureId: "dept-1",
      internalStructureId: null,
      reason: "Restructure",
      reasonCode: "restructure",
      effectiveDate: "2026-07-01",
      weightRedistributionMode: WEIGHT_MODE.PROPORTIONAL,
    },
    context: {
      liveParent: { plan_node_id: "goal-1", title: "Strategic Goal" },
      liveAnnualVersion: { plan_version_id: "annual-1" },
      siblings: [{ kpiId: "sib-1" }],
    },
    periodPlan,
    weightPlan,
    ruleCheck: { nodeType: "kpi" },
    nodeLevel: 2,
    ...overrides,
  };
}

function testNormalization() {
  const meta = normalizeKpiAdditionMetadata({
    parent_id: "parent-1",
    annual_version_id: "annual-1",
    annual_target: 120,
    period_allocations: [{ period_id: "q2", period_target: 40 }],
    sibling_weight_adjustments: [{ kpi_id: "k1", weight: 10 }],
    weight_redistribution_mode: "AUTO_PROPORTIONAL",
    reason_code: "restructure",
    effective_date: "2026-07-01",
  });

  assert.strictEqual(meta.parentId, "parent-1");
  assert.strictEqual(meta.annualVersionId, "annual-1");
  assert.strictEqual(meta.annualTarget, 120);
  assert.strictEqual(meta.periodAllocations[0].periodId, "q2");
  assert.strictEqual(meta.periodAllocations[0].target, 40);
  assert.strictEqual(meta.siblingWeightAdjustments[0].kpiId, "k1");
  assert.strictEqual(meta.weightRedistributionMode, "AUTO_PROPORTIONAL");
  assert.strictEqual(meta.reasonCode, "restructure");
  assert.strictEqual(meta.effectiveDate, "2026-07-01");
}

function testBuildPeriodAllocations() {
  const periods = [
    makePeriod("q1", true, 1),
    makePeriod("q2", false, 2),
    makePeriod("q3", false, 3),
    makePeriod("q4", false, 4),
  ];

  const ok = buildPeriodAllocations(
    {
      startPeriodId: "q2",
      periodAllocations: [
        { periodId: "q2", target: 50 },
        { periodId: "q3", target: 25 },
        { periodId: "q4", target: 25 },
      ],
    },
    periods,
    100
  );
  assert.strictEqual(ok.valid, true);
  assert.strictEqual(ok.rows.find((r) => r.livePeriodId === "q1").target, 0);
  assert.strictEqual(ok.openSum, 100);

  const mismatch = buildPeriodAllocations(
    {
      startPeriodId: "q2",
      periodAllocations: [
        { periodId: "q2", target: 10 },
        { periodId: "q3", target: 10 },
        { periodId: "q4", target: 10 },
      ],
    },
    periods,
    100
  );
  assert.strictEqual(mismatch.valid, false);
  assert.strictEqual(mismatch.message, KPI_ADDITION_MESSAGES.PERIOD_SUM_MISMATCH);

  const finalizedNonZero = buildPeriodAllocations(
    {
      startPeriodId: "q1",
      endPeriodId: "q3",
      periodAllocations: [
        { periodId: "q1", target: 50 },
        { periodId: "q2", target: 5 },
        { periodId: "q3", target: 45 },
      ],
    },
    [
      makePeriod("q1", false, 1),
      makePeriod("q2", true, 2),
      makePeriod("q3", false, 3),
    ],
    100
  );
  assert.strictEqual(finalizedNonZero.valid, false);
  assert.strictEqual(
    finalizedNonZero.message,
    KPI_ADDITION_MESSAGES.FINALIZED_PERIOD_TARGET
  );
}

function testBuildSiblingWeightPlan() {
  const siblings = [
    {
      kpiId: "s1",
      weight: 40,
      contributionWeight: 40,
      node: { plan_node_id: "s1" },
    },
    {
      kpiId: "s2",
      weight: 40,
      contributionWeight: 40,
      node: { plan_node_id: "s2" },
    },
  ];

  const proportional = buildSiblingWeightPlan({
    siblings,
    newWeight: 30,
    newContributionWeight: 30,
    parentWeight: 100,
    parentContributionTarget: 100,
    mode: WEIGHT_MODE.PROPORTIONAL,
    manualAdjustments: [],
  });
  assert.strictEqual(proportional.valid, true);
  const totalAfter =
    proportional.adjustments.reduce((sum, row) => sum + row.newWeight, 0) +
    proportional.newWeight;
  assert.ok(totalAfter <= 100.001);

  const equal = buildSiblingWeightPlan({
    siblings,
    newWeight: 30,
    newContributionWeight: 30,
    parentWeight: 100,
    parentContributionTarget: 100,
    mode: WEIGHT_MODE.EQUAL,
    manualAdjustments: [],
  });
  assert.strictEqual(equal.valid, true);
  assert.strictEqual(equal.adjustments[0].newWeight, equal.adjustments[1].newWeight);

  const manualMismatch = buildSiblingWeightPlan({
    siblings,
    newWeight: 10,
    newContributionWeight: 10,
    parentWeight: 100,
    mode: WEIGHT_MODE.MANUAL,
    manualAdjustments: [{ kpiId: "s1", weight: 35 }],
  });
  assert.strictEqual(manualMismatch.valid, false);
  assert.strictEqual(
    manualMismatch.message,
    KPI_ADDITION_MESSAGES.MANUAL_WEIGHTS_REQUIRED
  );
}

function testPreviewImpact() {
  const prepared = samplePrepared();
  const preview = buildKpiAdditionPreviewData(prepared);

  assert.strictEqual(preview.amendment_type, AMENDMENT_TYPE.KPI_ADDITION);
  assert.strictEqual(preview.parent_id, "goal-1");
  assert.strictEqual(preview.new_kpi.title, "New Output KPI");
  assert.strictEqual(preview.new_kpi.annual_target, 100);
  assert.strictEqual(preview.period_allocations.length, 4);
  assert.ok(preview.sibling_weight_changes.length >= 0);

  const impact = buildKpiAdditionImpactData(prepared);
  assert.ok(Array.isArray(impact.summary));
  assert.ok(impact.summary.some((line) => /Add KPI/i.test(line)));
  assert.strictEqual(impact.affected_rollups, true);
  assert.ok(impact.changes.some((c) => c.field === "kpi_create"));
  assert.strictEqual(impact.preview.amendment_type, AMENDMENT_TYPE.KPI_ADDITION);
}

function testHandlerRegistrationAndConflictKeys() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();

  const available = listAvailableAmendmentTypes();
  assert.ok(available.includes(AMENDMENT_TYPE.TARGET_REALLOCATION));
  assert.ok(available.includes(AMENDMENT_TYPE.ANNUAL_TARGET_REVISION));
  assert.ok(available.includes(AMENDMENT_TYPE.KPI_ADDITION));
  assert.strictEqual(available.length, 3);

  const handler = resolveAmendmentHandler(AMENDMENT_TYPE.KPI_ADDITION);
  assert.ok(handler instanceof KpiAdditionHandler);
  assert.strictEqual(handler.isAvailable(), true);

  const catalog = getAmendmentHandlerCatalog();
  const entry = catalog.find((row) => row.type === AMENDMENT_TYPE.KPI_ADDITION);
  assert.strictEqual(entry.available, true);
  assert.strictEqual(entry.registered, true);

  const keys = handler.conflictKeys({
    metadata: {
      parentId: "parent-9",
      title: "New KPI Title",
      periodAllocations: [{ periodId: "p1" }],
      governmentStructureId: "dept-1",
    },
  });
  assert.ok(keys.entityKeys.some((key) => key.startsWith("structural:parent:")));
  assert.ok(keys.entityKeys.some((key) => key.startsWith("kpi_name:")));
  assert.deepStrictEqual(keys.departmentIds, ["dept-1"]);
}

function testReportingArtifacts() {
  const reportingSource = fs.readFileSync(
    path.join(root, "services/planAmendment/kpiAdditionReportingService.js"),
    "utf8"
  );
  assert.match(reportingSource, /added_kpis/);
  assert.match(reportingSource, /comparison_mode/);
  assert.match(reportingSource, /process_started/);
  assert.match(reportingSource, /AMENDMENT_TYPE\.KPI_ADDITION/);

  const routesSource = fs.readFileSync(
    path.join(root, "routers/plan/planRoutes.js"),
    "utf8"
  );
  assert.match(routesSource, /kpi-addition-reporting/);

  const docs = fs.readFileSync(
    path.join(root, "../docs/PLAN_AMENDMENT_FRAMEWORK.md"),
    "utf8"
  );
  assert.match(docs, /kpi_addition/);
}

function testEngineUntouched() {
  const engineSource = fs.readFileSync(
    path.join(root, "services/planAmendment/planAmendmentEngine.js"),
    "utf8"
  );
  assert.doesNotMatch(engineSource, /case\s+['"]kpi_addition['"]/);
  assert.doesNotMatch(engineSource, /KpiAdditionHandler/);
}

function run() {
  testNormalization();
  testBuildPeriodAllocations();
  testBuildSiblingWeightPlan();
  testPreviewImpact();
  testHandlerRegistrationAndConflictKeys();
  testReportingArtifacts();
  testEngineUntouched();
  console.log("KPI Addition checks passed.");
}

run();
