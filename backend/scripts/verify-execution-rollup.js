"use strict";

const assert = require("assert");
const {
  computeRollupMap,
  computeVersionProgressFromRoots,
} = require("../services/planExecutionRollupService");

const STANDARD_RULE = {
  steps: [
    { step_order: 1, requires_weight: false, node_type: "strategic" },
    { step_order: 2, requires_weight: true, node_type: "goal" },
    { step_order: 3, requires_weight: true, node_type: "kpi" },
  ],
};

function metrics(map, id) {
  return map.get(id);
}

function assertPercent(actual, expected, label) {
  assert.strictEqual(
    actual,
    expected,
    `${label}: expected ${expected}% but got ${actual}%`
  );
}

function assertActualTargetConsistent(nodeMetrics, label) {
  if (!nodeMetrics) {
    throw new Error(`${label}: missing metrics`);
  }
  const { execution_progress_percent, computed_period_actual, computed_period_target } =
    nodeMetrics;
  if (
    computed_period_target != null &&
    computed_period_target > 0 &&
    computed_period_actual != null &&
    execution_progress_percent != null
  ) {
    const derived = Math.max(
      0,
      Math.min(100, Math.round((computed_period_actual / computed_period_target) * 100))
    );
    assert.strictEqual(
      execution_progress_percent,
      derived,
      `${label}: percent ${execution_progress_percent}% does not match actual/target (${computed_period_actual}/${computed_period_target} => ${derived}%)`
    );
  }
}

function buildPartialReportingFixture() {
  return [
    { plan_node_id: "sf1", parent_id: null, level: 1, order: 0, is_active: true },
    {
      plan_node_id: "g1",
      parent_id: "sf1",
      level: 2,
      order: 0,
      weight: 50,
      is_active: true,
    },
    {
      plan_node_id: "k1",
      parent_id: "g1",
      level: 3,
      order: 0,
      weight: 33,
      period_target: 10,
      period_actual: 8,
      is_active: true,
    },
    {
      plan_node_id: "k2",
      parent_id: "g1",
      level: 3,
      order: 1,
      weight: 33,
      period_target: 10,
      is_active: true,
    },
    {
      plan_node_id: "k3",
      parent_id: "g1",
      level: 3,
      order: 2,
      weight: 34,
      period_target: 10,
      is_active: true,
    },
    {
      plan_node_id: "g2",
      parent_id: "sf1",
      level: 2,
      order: 1,
      weight: 50,
      is_active: true,
    },
    {
      plan_node_id: "k4",
      parent_id: "g2",
      level: 3,
      order: 0,
      weight: 100,
      period_target: 20,
      is_active: true,
    },
  ];
}

function buildTwoRootFixture() {
  return [
    { plan_node_id: "sf1", parent_id: null, level: 1, order: 0, weight: 1, is_active: true },
    {
      plan_node_id: "g1",
      parent_id: "sf1",
      level: 2,
      order: 0,
      weight: 100,
      is_active: true,
    },
    {
      plan_node_id: "k1",
      parent_id: "g1",
      level: 3,
      order: 0,
      weight: 100,
      period_target: 50,
      period_actual: 10,
      is_active: true,
    },
    { plan_node_id: "sf2", parent_id: null, level: 1, order: 1, weight: 1, is_active: true },
    {
      plan_node_id: "g2",
      parent_id: "sf2",
      level: 2,
      order: 0,
      weight: 100,
      is_active: true,
    },
    {
      plan_node_id: "k2",
      parent_id: "g2",
      level: 3,
      order: 0,
      weight: 100,
      period_target: 50,
      period_actual: 40,
      is_active: true,
    },
  ];
}

function run() {
  const partialNodes = buildPartialReportingFixture();
  const partialMap = computeRollupMap(partialNodes, STANDARD_RULE);
  const partialVersion = computeVersionProgressFromRoots(partialNodes, STANDARD_RULE);

  assertPercent(metrics(partialMap, "g1").execution_progress_percent, 27, "Goal 1");
  assert.strictEqual(metrics(partialMap, "g1").computed_period_actual, 8);
  assert.strictEqual(metrics(partialMap, "g1").computed_period_target, 30);
  assert.strictEqual(metrics(partialMap, "g1").has_contributing_data, true);
  assertActualTargetConsistent(metrics(partialMap, "g1"), "Goal 1");

  assertPercent(metrics(partialMap, "g2").execution_progress_percent, 0, "Goal 2");
  assert.strictEqual(metrics(partialMap, "g2").computed_period_actual, 0);
  assert.strictEqual(metrics(partialMap, "g2").computed_period_target, 20);
  assert.strictEqual(metrics(partialMap, "g2").has_contributing_data, false);
  assertActualTargetConsistent(metrics(partialMap, "g2"), "Goal 2");

  assertPercent(metrics(partialMap, "sf1").execution_progress_percent, 16, "Strategic focus");
  assert.strictEqual(metrics(partialMap, "sf1").computed_period_actual, 8);
  assert.strictEqual(metrics(partialMap, "sf1").computed_period_target, 50);
  assert.strictEqual(metrics(partialMap, "sf1").has_contributing_data, true);
  assertActualTargetConsistent(metrics(partialMap, "sf1"), "Strategic focus");

  assertPercent(partialVersion.execution_progress_percent, 16, "Period version");
  assert.strictEqual(partialVersion.computed_period_actual, 8);
  assert.strictEqual(partialVersion.computed_period_target, 50);
  assert.strictEqual(partialVersion.has_contributing_data, true);
  assertActualTargetConsistent(partialVersion, "Period version");

  const twoRootNodes = buildTwoRootFixture();
  const twoRootMap = computeRollupMap(twoRootNodes, STANDARD_RULE);
  const twoRootVersion = computeVersionProgressFromRoots(twoRootNodes, STANDARD_RULE);

  assertPercent(metrics(twoRootMap, "sf1").execution_progress_percent, 20, "SF1");
  assertPercent(metrics(twoRootMap, "sf2").execution_progress_percent, 80, "SF2");
  assertActualTargetConsistent(metrics(twoRootMap, "sf1"), "SF1");
  assertActualTargetConsistent(metrics(twoRootMap, "sf2"), "SF2");

  assertPercent(twoRootVersion.execution_progress_percent, 50, "Two-root period");
  assert.strictEqual(twoRootVersion.computed_period_actual, 50);
  assert.strictEqual(twoRootVersion.computed_period_target, 100);
  assertActualTargetConsistent(twoRootVersion, "Two-root period");

  const emptyVersion = computeVersionProgressFromRoots(
    [
      { plan_node_id: "sf1", parent_id: null, level: 1, is_active: true },
      {
        plan_node_id: "k1",
        parent_id: "sf1",
        level: 3,
        period_target: 10,
        is_active: true,
      },
    ],
    STANDARD_RULE
  );
  assert.strictEqual(emptyVersion.execution_progress_percent, null);
  assert.strictEqual(emptyVersion.has_contributing_data, false);

  const allReportedMap = computeRollupMap(
    partialNodes.map((node) =>
      node.plan_node_id === "k2"
        ? { ...node, period_actual: 10 }
        : node.plan_node_id === "k3"
          ? { ...node, period_actual: 10 }
          : node.plan_node_id === "k4"
            ? { ...node, period_actual: 20 }
            : node
    ),
    STANDARD_RULE
  );
  assertPercent(metrics(allReportedMap, "g1").execution_progress_percent, 93, "Fully reported goal");
  assertPercent(metrics(allReportedMap, "sf1").execution_progress_percent, 96, "Fully reported SF");
  assertActualTargetConsistent(metrics(allReportedMap, "g1"), "Fully reported goal");
  assertActualTargetConsistent(metrics(allReportedMap, "sf1"), "Fully reported SF");

  console.log("Execution rollup checks passed.");
}

run();
