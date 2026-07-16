"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { AMENDMENT_TYPE } = require("../utils/planAmendmentTypes");
const {
  normalizeTargetReallocationMetadata,
  buildTargetReallocationTitle,
  buildTargetReallocationPreviewData,
  buildAmendmentHistoryRows,
} = require("../services/planAmendment/targetReallocationDomain");
const {
  clearAmendmentHandlers,
  registerDefaultAmendmentHandlers,
  resolveAmendmentHandler,
} = require("../services/planAmendment/planAmendmentRegistry");
const { TargetReallocationHandler } = require("../services/planAmendment/handlers/targetReallocationHandler");
const { validateReallocationBusinessRules } = require("../services/planTargetReallocationService");

const root = path.join(__dirname, "..");
const handlerSource = fs.readFileSync(
  path.join(root, "services/planAmendment/handlers/targetReallocationHandler.js"),
  "utf8"
);
const domainSource = fs.readFileSync(
  path.join(root, "services/planAmendment/targetReallocationDomain.js"),
  "utf8"
);
const registrySource = fs.readFileSync(
  path.join(root, "services/planAmendment/planAmendmentRegistry.js"),
  "utf8"
);

function runMetadataTests() {
  const normalized = normalizeTargetReallocationMetadata({
    kpi_id: "kpi-1",
    from_period_id: "q2",
    toPeriodId: "q3",
    amount: 10,
    reason: "Venue unavailable",
    legacy_request_id: "req-1",
  });

  assert.strictEqual(normalized.kpiId, "kpi-1");
  assert.strictEqual(normalized.fromPeriodId, "q2");
  assert.strictEqual(normalized.toPeriodId, "q3");
  assert.strictEqual(normalized.amount, 10);
  assert.strictEqual(normalized.reason, "Venue unavailable");
  assert.strictEqual(normalized.legacyRequestId, "req-1");
  assert.strictEqual(buildTargetReallocationTitle(normalized), "Target Reallocation (10)");
}

function runHappyPathMathAndPreviewShape() {
  const business = validateReallocationBusinessRules({
    amount: 10,
    fromPeriodNode: { period_target: 25, period_actual: 0 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "open",
  });
  assert.strictEqual(business.valid, true);
  assert.strictEqual(business.fromResult, 15);
  assert.strictEqual(business.toResult, 35);

  const prepared = {
    metadata: {
      kpiId: "kpi-1",
      fromPeriodId: "from",
      toPeriodId: "to",
      amount: 10,
      reason: "Venue unavailable",
    },
    context: {
      liveAnnualKpi: { title: "Train Staff", annual_target: 100 },
      fromPeriod: { period_label: "Q2" },
      toPeriod: { period_label: "Q3" },
      fromPeriodNode: { plan_node_id: "from-node" },
      toPeriodNode: { plan_node_id: "to-node" },
    },
    validation: business,
    annualTarget: 100,
    fromOldTarget: 25,
    toOldTarget: 25,
    fromNewTarget: 15,
    toNewTarget: 35,
  };

  const preview = buildTargetReallocationPreviewData(prepared);
  assert.strictEqual(preview.from_period.current_target, 25);
  assert.strictEqual(preview.from_period.preview_target, 15);
  assert.strictEqual(preview.to_period.preview_target, 35);
  assert.strictEqual(preview.annual_target, 100);

  const history = buildAmendmentHistoryRows(prepared);
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].field_name, "period_target");
  assert.strictEqual(history[0].old_value, "25");
  assert.strictEqual(history[0].new_value, "15");
  assert.strictEqual(history[1].new_value, "35");
}

async function runHandlerRegistrationTests() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();

  const handler = resolveAmendmentHandler(AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.ok(handler instanceof TargetReallocationHandler);
  assert.strictEqual(handler.isAvailable(), true);
  assert.match(handlerSource, /prepareTargetReallocationChange/);
  assert.match(handlerSource, /applyPreparedTargetReallocation/);
  assert.match(domainSource, /buildAmendmentHistoryRows/);
  assert.match(registrySource, /TargetReallocationHandler/);
  assert.doesNotMatch(registrySource, /TargetReallocationAmendmentHandlerSkeleton/);

  const missing = await handler.validate({ metadata: {} });
  assert.strictEqual(missing.valid, false);
  assert.match(missing.message, /required/i);
}

async function run() {
  runMetadataTests();
  runHappyPathMathAndPreviewShape();
  await runHandlerRegistrationTests();
  console.log("Plan amendment Step 4 checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
