"use strict";

const assert = require("assert");
const {
  PERFORMANCE_SCORING_POLICY,
  VARIANCE_TYPE,
  computePerformanceMetrics,
  normalizePerformanceScoringPolicy,
  validateAchievementNarration,
  isNarrationRequiredForVariance,
} = require("../utils/planPerformanceScoringUtils");
const { computeRollupMap } = require("../services/planExecutionRollupService");

function runUtilTests() {
  assert.strictEqual(
    normalizePerformanceScoringPolicy("allow_over_achievement"),
    PERFORMANCE_SCORING_POLICY.ALLOW_OVER_ACHIEVEMENT
  );
  assert.strictEqual(
    normalizePerformanceScoringPolicy("nope"),
    PERFORMANCE_SCORING_POLICY.CAP_100
  );

  // 1. Exact target
  const exact = computePerformanceMetrics(10, 10, PERFORMANCE_SCORING_POLICY.CAP_100);
  assert.strictEqual(exact.raw_performance_percentage, 100);
  assert.strictEqual(exact.performance_percentage, 100);
  assert.strictEqual(exact.variance, 0);
  assert.strictEqual(exact.variance_percentage, 0);
  assert.strictEqual(exact.variance_type, VARIANCE_TYPE.ON_TARGET);

  // 2. Under performance
  const under = computePerformanceMetrics(10, 8, PERFORMANCE_SCORING_POLICY.CAP_100);
  assert.strictEqual(under.raw_performance_percentage, 80);
  assert.strictEqual(under.performance_percentage, 80);
  assert.strictEqual(under.variance, -2);
  assert.strictEqual(under.variance_percentage, -20);
  assert.strictEqual(under.variance_type, VARIANCE_TYPE.UNDER);

  // 3. Over performance with CAP_100
  const overCap = computePerformanceMetrics(10, 12, PERFORMANCE_SCORING_POLICY.CAP_100);
  assert.strictEqual(overCap.actual, 12);
  assert.strictEqual(overCap.raw_performance_percentage, 120);
  assert.strictEqual(overCap.performance_percentage, 100);
  assert.strictEqual(overCap.variance, 2);
  assert.strictEqual(overCap.variance_percentage, 20);
  assert.strictEqual(overCap.variance_type, VARIANCE_TYPE.OVER);

  // 4. Over performance with ALLOW_OVER_ACHIEVEMENT
  const overAllow = computePerformanceMetrics(
    10,
    12,
    PERFORMANCE_SCORING_POLICY.ALLOW_OVER_ACHIEVEMENT
  );
  assert.strictEqual(overAllow.actual, 12);
  assert.strictEqual(overAllow.raw_performance_percentage, 120);
  assert.strictEqual(overAllow.performance_percentage, 120);
  assert.strictEqual(overAllow.variance_type, VARIANCE_TYPE.OVER);

  // Target <= 0 → null scores (existing caller behavior)
  const noTarget = computePerformanceMetrics(0, 5, PERFORMANCE_SCORING_POLICY.CAP_100);
  assert.strictEqual(noTarget.performance_percentage, null);
  assert.strictEqual(noTarget.variance_type, null);

  // 5. Narration required when actual != target
  assert.strictEqual(isNarrationRequiredForVariance(10, 12), true);
  assert.strictEqual(isNarrationRequiredForVariance(10, 10), false);
  const missingNarration = validateAchievementNarration(10, 12, null);
  assert.strictEqual(missingNarration.valid, false);
  const withNarration = validateAchievementNarration(10, 12, "  Delivered extra training  ");
  assert.strictEqual(withNarration.valid, true);
  assert.strictEqual(withNarration.narration, "Delivered extra training");

  // 6. Narration optional when on target
  const onTargetNarration = validateAchievementNarration(10, 10, null);
  assert.strictEqual(onTargetNarration.valid, true);
  assert.strictEqual(onTargetNarration.narration, null);

  // 7. Float noise near target → ON_TARGET, narration optional
  const nearExact = computePerformanceMetrics(10, 10.0005, PERFORMANCE_SCORING_POLICY.CAP_100);
  assert.strictEqual(nearExact.variance_type, VARIANCE_TYPE.ON_TARGET);
  assert.strictEqual(isNarrationRequiredForVariance(10, 10.0005), false);
  assert.strictEqual(isNarrationRequiredForVariance(10, 9.9995), false);
  assert.strictEqual(validateAchievementNarration(10, 10.0005, null).valid, true);
}

function runRollupCompatibilityTests() {
  const nodes = [
    { plan_node_id: "parent", parent_id: null, level: 1, order: 0, is_active: true },
    {
      plan_node_id: "leaf",
      parent_id: "parent",
      level: 2,
      order: 0,
      is_active: true,
      period_target: 10,
      period_actual: 12,
      period_actual_status: "approved",
    },
  ];

  const capRule = {
    performance_scoring_policy: PERFORMANCE_SCORING_POLICY.CAP_100,
    steps: [],
  };
  const allowRule = {
    performance_scoring_policy: PERFORMANCE_SCORING_POLICY.ALLOW_OVER_ACHIEVEMENT,
    steps: [],
  };

  const capMap = computeRollupMap(nodes, {}, capRule);
  const capLeaf = capMap.get("leaf");
  assert.strictEqual(capLeaf.execution_progress_percent, 100);
  assert.strictEqual(capLeaf.raw_performance_percentage, 120);
  assert.strictEqual(capLeaf.variance_type, VARIANCE_TYPE.OVER);
  assert.strictEqual(capLeaf.computed_period_actual, 12);
  assert.strictEqual(capMap.get("parent").execution_progress_percent, 100);

  const allowMap = computeRollupMap(nodes, {}, allowRule);
  const allowLeaf = allowMap.get("leaf");
  assert.strictEqual(allowLeaf.execution_progress_percent, 120);
  assert.strictEqual(allowLeaf.raw_performance_percentage, 120);
  assert.strictEqual(allowMap.get("parent").execution_progress_percent, 120);

  // Parent of multiple over-performing leaves under ALLOW
  const multiNodes = [
    { plan_node_id: "parent", parent_id: null, level: 1, order: 0, is_active: true },
    {
      plan_node_id: "leaf_a",
      parent_id: "parent",
      level: 2,
      order: 0,
      is_active: true,
      period_target: 10,
      period_actual: 12,
      period_actual_status: "approved",
    },
    {
      plan_node_id: "leaf_b",
      parent_id: "parent",
      level: 2,
      order: 1,
      is_active: true,
      period_target: 10,
      period_actual: 15,
      period_actual_status: "approved",
    },
  ];
  const multiAllow = computeRollupMap(multiNodes, {}, allowRule);
  assert.strictEqual(multiAllow.get("leaf_a").execution_progress_percent, 120);
  assert.strictEqual(multiAllow.get("leaf_b").execution_progress_percent, 150);
  assert.strictEqual(multiAllow.get("parent").execution_progress_percent, 135);

  const multiCap = computeRollupMap(multiNodes, {}, capRule);
  assert.strictEqual(multiCap.get("leaf_a").execution_progress_percent, 100);
  assert.strictEqual(multiCap.get("leaf_b").execution_progress_percent, 100);
  assert.strictEqual(multiCap.get("parent").execution_progress_percent, 100);
}

runUtilTests();
runRollupCompatibilityTests();
console.log("Performance scoring checks passed.");
