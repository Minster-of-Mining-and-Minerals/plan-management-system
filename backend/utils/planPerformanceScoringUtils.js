"use strict";

const PERFORMANCE_SCORING_POLICY = Object.freeze({
  CAP_100: "CAP_100",
  ALLOW_OVER_ACHIEVEMENT: "ALLOW_OVER_ACHIEVEMENT",
});

const VARIANCE_TYPE = Object.freeze({
  OVER: "OVER",
  UNDER: "UNDER",
  ON_TARGET: "ON_TARGET",
});

const ON_TARGET_EPSILON = 0.001;

function normalizePerformanceScoringPolicy(value) {
  const normalized = String(value || PERFORMANCE_SCORING_POLICY.CAP_100)
    .trim()
    .toUpperCase();
  return normalized === PERFORMANCE_SCORING_POLICY.ALLOW_OVER_ACHIEVEMENT
    ? PERFORMANCE_SCORING_POLICY.ALLOW_OVER_ACHIEVEMENT
    : PERFORMANCE_SCORING_POLICY.CAP_100;
}

function resolvePerformanceScoringPolicyFromRule(rule) {
  return normalizePerformanceScoringPolicy(rule?.performance_scoring_policy);
}

function roundScorePercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return Math.round(value);
}

/**
 * Pure scoring + variance. Does not mutate actual.
 * When target <= 0, returns null percentages (caller decides evaluability).
 */
function computePerformanceMetrics(target, actual, policy = PERFORMANCE_SCORING_POLICY.CAP_100) {
  const numericTarget = Number(target);
  const numericActual = Number(actual);
  const scoringPolicy = normalizePerformanceScoringPolicy(policy);

  if (
    !Number.isFinite(numericTarget) ||
    numericTarget <= 0 ||
    !Number.isFinite(numericActual)
  ) {
    return {
      target: Number.isFinite(numericTarget) ? numericTarget : null,
      actual: Number.isFinite(numericActual) ? numericActual : null,
      raw_performance_percentage: null,
      performance_percentage: null,
      variance: null,
      variance_percentage: null,
      variance_type: null,
      performance_scoring_policy: scoringPolicy,
    };
  }

  const rawPercentage = (numericActual / numericTarget) * 100;
  const performancePercentage =
    scoringPolicy === PERFORMANCE_SCORING_POLICY.CAP_100
      ? Math.min(rawPercentage, 100)
      : rawPercentage;

  const variance = numericActual - numericTarget;
  const variancePercentage = (variance / numericTarget) * 100;

  let varianceType = VARIANCE_TYPE.ON_TARGET;
  if (variance > ON_TARGET_EPSILON) {
    varianceType = VARIANCE_TYPE.OVER;
  } else if (variance < -ON_TARGET_EPSILON) {
    varianceType = VARIANCE_TYPE.UNDER;
  }

  return {
    target: numericTarget,
    actual: numericActual,
    raw_performance_percentage: roundScorePercent(rawPercentage),
    performance_percentage: roundScorePercent(performancePercentage),
    variance: Math.round(variance * 1000) / 1000,
    variance_percentage: roundScorePercent(variancePercentage),
    variance_type: varianceType,
    performance_scoring_policy: scoringPolicy,
  };
}

function isNarrationRequiredForVariance(target, actual) {
  const numericTarget = Number(target);
  const numericActual = Number(actual);
  if (!(numericTarget > 0) || !Number.isFinite(numericActual)) {
    return false;
  }
  return Math.abs(numericActual - numericTarget) > ON_TARGET_EPSILON;
}

function normalizeAchievementNarration(value) {
  if (value == null) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > 1000 ? trimmed.slice(0, 1000) : trimmed;
}

/**
 * When actual differs from target (target > 0), narration is required.
 * NULL narration on old records is only enforced on new submit/edit.
 */
function validateAchievementNarration(target, actual, narration) {
  const normalized = normalizeAchievementNarration(narration);
  if (!isNarrationRequiredForVariance(target, actual)) {
    return { valid: true, narration: normalized };
  }
  if (!normalized) {
    return {
      valid: false,
      message:
        "Performance narration is required when actual achievement differs from the target.",
      narration: null,
    };
  }
  return { valid: true, narration: normalized };
}

/**
 * Enrich a plan-node JSON payload with performance / variance fields (snake_case).
 */
function attachAchievementPerformanceFields(nodeJson, options = {}) {
  if (!nodeJson) {
    return nodeJson;
  }

  const target =
    options.target !== undefined
      ? options.target
      : options.useAnnual
        ? nodeJson.annual_target
        : nodeJson.period_target ?? nodeJson.computed_period_target;
  const actual =
    options.actual !== undefined
      ? options.actual
      : options.useAnnual
        ? nodeJson.annual_actual
        : nodeJson.period_actual ?? nodeJson.computed_period_actual;
  const narration =
    options.narration !== undefined
      ? options.narration
      : options.useAnnual
        ? nodeJson.annual_actual_narration
        : nodeJson.period_actual_narration;

  const metrics = computePerformanceMetrics(
    target,
    actual,
    options.policy ?? PERFORMANCE_SCORING_POLICY.CAP_100
  );

  return {
    ...nodeJson,
    target: metrics.target,
    actual: metrics.actual,
    raw_performance_percentage:
      metrics.raw_performance_percentage ?? nodeJson.raw_performance_percentage ?? null,
    performance_percentage:
      metrics.performance_percentage ?? nodeJson.execution_progress_percent ?? null,
    variance: metrics.variance ?? nodeJson.variance ?? null,
    variance_percentage: metrics.variance_percentage ?? nodeJson.variance_percentage ?? null,
    variance_type: metrics.variance_type ?? nodeJson.variance_type ?? null,
    narration: narration ?? null,
  };
}

module.exports = {
  PERFORMANCE_SCORING_POLICY,
  VARIANCE_TYPE,
  ON_TARGET_EPSILON,
  normalizePerformanceScoringPolicy,
  resolvePerformanceScoringPolicyFromRule,
  computePerformanceMetrics,
  roundScorePercent,
  isNarrationRequiredForVariance,
  normalizeAchievementNarration,
  validateAchievementNarration,
  attachAchievementPerformanceFields,
};
