"use strict";

const REALLOCATION_VALIDATION_MESSAGES = Object.freeze({
  AMOUNT_POSITIVE: "Reallocation amount must be greater than zero.",
  DISTINCT_PERIODS: "Source and destination periods must be different.",
  CROSS_KPI: "Source and destination periods must belong to the same KPI.",
  SAME_ANNUAL_YEAR: "Target reallocation must stay within the same annual year.",
  EXCEEDS_MOVABLE: "Requested amount exceeds remaining movable target.",
  NEGATIVE_RESULT: "Reallocation would result in a negative period target.",
  FINALIZED_SOURCE: "Targets cannot be reallocated from finalized periods.",
  PROCESS_NOT_STARTED: "Target reallocation is only available after execution has started.",
  KPI_NOT_FOUND: "KPI was not found for this plan.",
  PERIOD_NOT_FOUND: "Execution period was not found.",
  INVALID_KPI: "Selected node cannot receive target reallocation.",
  PERMISSION_REQUIRED: "Plan request target reallocation permission required.",
  APPROVE_PERMISSION_REQUIRED: "Plan approve target reallocation permission required.",
  SCOPE_DENIED:
    "You must be assigned to this KPI in your sector to request target reallocation.",
  APPROVE_SCOPE_DENIED:
    "You must be assigned within this plan branch in your sector to approve target reallocation.",
  REQUEST_NOT_FOUND: "Target reallocation request was not found.",
  REQUEST_NOT_PENDING: "Only pending target reallocation requests can be reviewed.",
  CANCEL_NOT_ALLOWED: "Only the requester can cancel a pending target reallocation request.",
  REVIEW_COMMENT_REQUIRED: "Review comment is required when rejecting a request.",
});

function normalizeTargetValue(value) {
  if (value == null || value === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function validateReallocationAmount(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { valid: false, message: REALLOCATION_VALIDATION_MESSAGES.AMOUNT_POSITIVE };
  }
  return { valid: true, value: numeric };
}

function validateDistinctPeriods(fromPeriodId, toPeriodId) {
  if (String(fromPeriodId) === String(toPeriodId)) {
    return { valid: false, message: REALLOCATION_VALIDATION_MESSAGES.DISTINCT_PERIODS };
  }
  return { valid: true };
}

function computeMovableTarget(periodTarget, periodActual) {
  const target = normalizeTargetValue(periodTarget);
  const actual = normalizeTargetValue(periodActual);
  return Math.max(0, target - actual);
}

function validateMovableAmount(amount, movableTarget) {
  if (Number(amount) > Number(movableTarget)) {
    return { valid: false, message: REALLOCATION_VALIDATION_MESSAGES.EXCEEDS_MOVABLE };
  }
  return { valid: true };
}

function validateResultingTargets({ fromTarget, toTarget, amount }) {
  const from = normalizeTargetValue(fromTarget);
  const to = normalizeTargetValue(toTarget);
  const move = Number(amount);

  if (from - move < 0 || to + move < 0) {
    return { valid: false, message: REALLOCATION_VALIDATION_MESSAGES.NEGATIVE_RESULT };
  }

  return { valid: true, fromResult: from - move, toResult: to + move };
}

function isFinalizedExecutionPeriod(executionStatus) {
  return executionStatus === "completed";
}

function normalizeCreatePayload(body = {}) {
  return {
    draftId: body.draftId ?? body.draft_id ?? body.masterPlanVersionId ?? body.master_plan_version_id ?? null,
    kpiId: body.kpiId ?? body.kpi_id,
    fromPeriodId: body.fromPeriodId ?? body.from_period_id,
    toPeriodId: body.toPeriodId ?? body.to_period_id,
    amount: body.amount,
    reason: body.reason,
  };
}

module.exports = {
  REALLOCATION_VALIDATION_MESSAGES,
  normalizeTargetValue,
  normalizeCreatePayload,
  validateReallocationAmount,
  validateDistinctPeriods,
  computeMovableTarget,
  validateMovableAmount,
  validateResultingTargets,
  isFinalizedExecutionPeriod,
};
