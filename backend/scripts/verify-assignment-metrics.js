"use strict";

const assert = require("assert");
const {
  getAssignedNodeContribution,
  createAggregateBucket,
  applyContribution,
  finalizeAggregateBucket,
} = require("../services/planExecutionAssignmentMetricsService");

function run() {
  const leafReported = getAssignedNodeContribution(
    { period_target: 10, period_actual: 8 },
    null
  );
  assert.deepStrictEqual(leafReported, { actual: 8, target: 10, reported: true });

  const leafMissing = getAssignedNodeContribution({ period_target: 10 }, null);
  assert.deepStrictEqual(leafMissing, { actual: 0, target: 10, reported: false });

  const rollupParent = getAssignedNodeContribution(
    { period_target: 0 },
    {
      computed_period_actual: 8,
      computed_period_target: 30,
      has_contributing_data: true,
    }
  );
  assert.deepStrictEqual(rollupParent, { actual: 8, target: 30, reported: true });

  const bucket = createAggregateBucket();
  applyContribution(
    bucket,
    { actual: 8, target: 10, reported: true },
    { nodeKey: "p1:n1", planId: "plan-1", reported: true }
  );
  applyContribution(
    bucket,
    { actual: 0, target: 10, reported: false },
    { nodeKey: "p1:n2", planId: "plan-1", reported: false }
  );
  applyContribution(
    bucket,
    { actual: 8, target: 10, reported: true },
    { nodeKey: "p1:n1", planId: "plan-1", reported: true }
  );

  const finalized = finalizeAggregateBucket(bucket);
  assert.strictEqual(finalized.assignedNodeCount, 2);
  assert.strictEqual(finalized.reportedNodeCount, 1);
  assert.strictEqual(finalized.progress, 40);
  assert.strictEqual(finalized.planCount, 1);
  assert.strictEqual(finalized.has_progress, true);

  console.log("Assignment metrics checks passed.");
}

run();
