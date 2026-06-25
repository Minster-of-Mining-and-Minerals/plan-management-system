"use strict";

const assert = require("assert");
const {
  computeRollupMap,
  computeVersionProgressFromRoots,
  EVALUATION_STATUS,
} = require("../services/planExecutionRollupService");

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

function buildBusinessRulesFixture() {
  return [
    { plan_node_id: "sf1", parent_id: null, level: 1, order: 0, is_active: true },
    { plan_node_id: "g1", parent_id: "sf1", level: 2, order: 0, is_active: true },
    {
      plan_node_id: "k11",
      parent_id: "g1",
      level: 3,
      order: 0,
      period_target: 100,
      period_actual: 100,
      is_active: true,
    },
    {
      plan_node_id: "k12",
      parent_id: "g1",
      level: 3,
      order: 1,
      period_target: 100,
      period_actual: 50,
      is_active: true,
    },
    {
      plan_node_id: "k13",
      parent_id: "g1",
      level: 3,
      order: 2,
      period_target: 100,
      period_actual: 25,
      is_active: true,
    },
    { plan_node_id: "g2", parent_id: "sf1", level: 2, order: 1, is_active: true },
    {
      plan_node_id: "k21",
      parent_id: "g2",
      level: 3,
      order: 0,
      period_target: 100,
      period_actual: 75,
      is_active: true,
    },
    {
      plan_node_id: "k22",
      parent_id: "g2",
      level: 3,
      order: 1,
      period_target: 100,
      period_actual: 50,
      is_active: true,
    },
    {
      plan_node_id: "k23",
      parent_id: "g2",
      level: 3,
      order: 2,
      period_target: 100,
      period_actual: 33,
      is_active: true,
    },
    { plan_node_id: "g3", parent_id: "sf1", level: 2, order: 2, is_active: true },
    {
      plan_node_id: "k31",
      parent_id: "g3",
      level: 3,
      order: 0,
      is_active: true,
    },
    {
      plan_node_id: "k32",
      parent_id: "g3",
      level: 3,
      order: 1,
      is_active: true,
    },
    {
      plan_node_id: "k33",
      parent_id: "g3",
      level: 3,
      order: 2,
      is_active: true,
    },
    { plan_node_id: "g4", parent_id: "sf1", level: 2, order: 3, is_active: true },
  ];
}

function buildPartialReportingFixture() {
  return [
    { plan_node_id: "sf1", parent_id: null, level: 1, order: 0, is_active: true },
    { plan_node_id: "g1", parent_id: "sf1", level: 2, order: 0, is_active: true },
    {
      plan_node_id: "k1",
      parent_id: "g1",
      level: 3,
      order: 0,
      period_target: 10,
      period_actual: 8,
      is_active: true,
    },
    {
      plan_node_id: "k2",
      parent_id: "g1",
      level: 3,
      order: 1,
      period_target: 10,
      is_active: true,
    },
    {
      plan_node_id: "k3",
      parent_id: "g1",
      level: 3,
      order: 2,
      period_target: 10,
      is_active: true,
    },
    { plan_node_id: "g2", parent_id: "sf1", level: 2, order: 1, is_active: true },
    {
      plan_node_id: "k4",
      parent_id: "g2",
      level: 3,
      order: 0,
      period_target: 20,
      is_active: true,
    },
  ];
}

function buildDeepHierarchyFixture() {
  return [
    { plan_node_id: "sf1", parent_id: null, level: 1, order: 0, is_active: true },
    { plan_node_id: "g1", parent_id: "sf1", level: 2, order: 0, is_active: true },
    { plan_node_id: "obj1", parent_id: "g1", level: 3, order: 0, is_active: true },
    {
      plan_node_id: "k1",
      parent_id: "obj1",
      level: 4,
      order: 0,
      period_target: 100,
      period_actual: 80,
      is_active: true,
    },
    {
      plan_node_id: "k2",
      parent_id: "obj1",
      level: 4,
      order: 1,
      period_target: 100,
      is_active: true,
    },
  ];
}

function buildTwoRootFixture() {
  return [
    { plan_node_id: "sf1", parent_id: null, level: 1, order: 0, is_active: true },
    { plan_node_id: "g1", parent_id: "sf1", level: 2, order: 0, is_active: true },
    {
      plan_node_id: "k1",
      parent_id: "g1",
      level: 3,
      order: 0,
      period_target: 50,
      period_actual: 10,
      is_active: true,
    },
    { plan_node_id: "sf2", parent_id: null, level: 1, order: 1, is_active: true },
    { plan_node_id: "g2", parent_id: "sf2", level: 2, order: 0, is_active: true },
    {
      plan_node_id: "k2",
      parent_id: "g2",
      level: 3,
      order: 0,
      period_target: 50,
      period_actual: 40,
      is_active: true,
    },
  ];
}

function run() {
  const businessMap = computeRollupMap(buildBusinessRulesFixture());
  assertPercent(metrics(businessMap, "g1").execution_progress_percent, 58, "Goal 1");
  assert.strictEqual(metrics(businessMap, "g1").is_evaluable, true);
  assertPercent(metrics(businessMap, "g2").execution_progress_percent, 53, "Goal 2");
  assert.strictEqual(metrics(businessMap, "g2").is_evaluable, true);
  assert.strictEqual(metrics(businessMap, "g3").is_evaluable, false);
  assert.strictEqual(metrics(businessMap, "g3").evaluation_status, EVALUATION_STATUS.NO_EVALUATION);
  assert.strictEqual(metrics(businessMap, "g4").is_evaluable, false);
  assertPercent(metrics(businessMap, "sf1").execution_progress_percent, 56, "Strategic focus");

  const businessVersion = computeVersionProgressFromRoots(buildBusinessRulesFixture());
  assertPercent(businessVersion.execution_progress_percent, 56, "Period version");

  const partialMap = computeRollupMap(buildPartialReportingFixture());
  assertPercent(metrics(partialMap, "g1").execution_progress_percent, 27, "Partial goal 1");
  assert.strictEqual(metrics(partialMap, "g1").is_evaluable, true);
  assertPercent(metrics(partialMap, "g2").execution_progress_percent, 0, "Partial goal 2");
  assert.strictEqual(metrics(partialMap, "g2").is_evaluable, true);
  assert.strictEqual(
    metrics(partialMap, "g2").evaluation_status,
    EVALUATION_STATUS.NOT_STARTED
  );
  assertPercent(metrics(partialMap, "sf1").execution_progress_percent, 14, "Partial SF");
  assertPercent(
    computeVersionProgressFromRoots(buildPartialReportingFixture()).execution_progress_percent,
    14,
    "Partial period"
  );

  const deepMap = computeRollupMap(buildDeepHierarchyFixture());
  assertPercent(metrics(deepMap, "obj1").execution_progress_percent, 40, "Objective");
  assertPercent(metrics(deepMap, "g1").execution_progress_percent, 40, "Deep goal");
  assertPercent(metrics(deepMap, "sf1").execution_progress_percent, 40, "Deep SF");

  const twoRootMap = computeRollupMap(buildTwoRootFixture());
  assertPercent(metrics(twoRootMap, "sf1").execution_progress_percent, 20, "SF1");
  assertPercent(metrics(twoRootMap, "sf2").execution_progress_percent, 80, "SF2");
  assertPercent(
    computeVersionProgressFromRoots(buildTwoRootFixture()).execution_progress_percent,
    50,
    "Two-root period"
  );

  const emptyVersion = computeVersionProgressFromRoots([
    { plan_node_id: "sf1", parent_id: null, level: 1, is_active: true },
    {
      plan_node_id: "k1",
      parent_id: "sf1",
      level: 3,
      period_target: 10,
      is_active: true,
    },
  ]);
  assert.strictEqual(emptyVersion.execution_progress_percent, 0);
  assert.strictEqual(emptyVersion.is_evaluable, true);
  assert.strictEqual(emptyVersion.evaluation_status, EVALUATION_STATUS.NOT_STARTED);

  const noTargetVersion = computeVersionProgressFromRoots([
    { plan_node_id: "sf1", parent_id: null, level: 1, is_active: true },
    { plan_node_id: "g1", parent_id: "sf1", level: 2, is_active: true },
  ]);
  assert.strictEqual(noTargetVersion.execution_progress_percent, null);
  assert.strictEqual(noTargetVersion.is_evaluable, false);

  console.log("Execution rollup checks passed.");
}

run();
