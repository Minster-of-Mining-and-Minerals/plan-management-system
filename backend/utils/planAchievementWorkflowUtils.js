"use strict";

const ACHIEVEMENT_STATUS = Object.freeze({
  EMPTY: "empty",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
});

const ACHIEVEMENT_STATUS_VALUES = Object.freeze(Object.values(ACHIEVEMENT_STATUS));

const ACHIEVEMENT_STATUS_TRANSITIONS = Object.freeze({
  [ACHIEVEMENT_STATUS.EMPTY]: new Set([ACHIEVEMENT_STATUS.SUBMITTED]),
  [ACHIEVEMENT_STATUS.REJECTED]: new Set([ACHIEVEMENT_STATUS.SUBMITTED]),
  [ACHIEVEMENT_STATUS.SUBMITTED]: new Set([
    ACHIEVEMENT_STATUS.APPROVED,
    ACHIEVEMENT_STATUS.REJECTED,
  ]),
  [ACHIEVEMENT_STATUS.APPROVED]: new Set([]),
});

function normalizeAchievementStatus(status) {
  const normalized = String(status ?? ACHIEVEMENT_STATUS.EMPTY).toLowerCase();
  return ACHIEVEMENT_STATUS_VALUES.includes(normalized)
    ? normalized
    : ACHIEVEMENT_STATUS.EMPTY;
}

function resolveAchievementStatus(node) {
  if (!node) return ACHIEVEMENT_STATUS.EMPTY;

  if (node.period_actual_status) {
    return normalizeAchievementStatus(node.period_actual_status);
  }

  if (node.period_actual != null && node.period_actual !== undefined) {
    return ACHIEVEMENT_STATUS.APPROVED;
  }

  return ACHIEVEMENT_STATUS.EMPTY;
}

function hasRecordedAchievementValue(node) {
  return node?.period_actual != null && node.period_actual !== undefined;
}

function canTransitionAchievementStatus(fromStatus, toStatus) {
  const from = normalizeAchievementStatus(fromStatus);
  const to = normalizeAchievementStatus(toStatus);
  return ACHIEVEMENT_STATUS_TRANSITIONS[from]?.has(to) ?? false;
}

/**
 * Whether a node value may contribute to parent rollup.
 * Only approved achievements roll up; submitted values stay pending at the leaf.
 */
function isRollupEligibleAchievementStatus(status) {
  const normalized = normalizeAchievementStatus(status);
  return normalized === ACHIEVEMENT_STATUS.APPROVED;
}

function buildEmptyAchievementWorkflowFields() {
  return {
    period_actual_status: ACHIEVEMENT_STATUS.EMPTY,
    period_actual_submitted_at: null,
    period_actual_submitted_by: null,
    period_actual_approved_at: null,
    period_actual_approved_by: null,
    period_actual_rejection_comment: null,
  };
}

function buildSubmittedAchievementWorkflowFields(userId, submittedAt = new Date()) {
  return {
    period_actual_status: ACHIEVEMENT_STATUS.SUBMITTED,
    period_actual_submitted_at: submittedAt,
    period_actual_submitted_by: userId,
    period_actual_approved_at: null,
    period_actual_approved_by: null,
    period_actual_rejection_comment: null,
  };
}

function buildApprovedAchievementWorkflowFields(userId, approvedAt = new Date()) {
  return {
    period_actual_status: ACHIEVEMENT_STATUS.APPROVED,
    period_actual_approved_at: approvedAt,
    period_actual_approved_by: userId,
    period_actual_rejection_comment: null,
  };
}

function buildRejectedAchievementWorkflowFields(comment = null) {
  return {
    period_actual_status: ACHIEVEMENT_STATUS.REJECTED,
    period_actual_approved_at: null,
    period_actual_approved_by: null,
    period_actual_rejection_comment: comment || null,
  };
}

module.exports = {
  ACHIEVEMENT_STATUS,
  ACHIEVEMENT_STATUS_VALUES,
  normalizeAchievementStatus,
  resolveAchievementStatus,
  hasRecordedAchievementValue,
  canTransitionAchievementStatus,
  isRollupEligibleAchievementStatus,
  buildEmptyAchievementWorkflowFields,
  buildSubmittedAchievementWorkflowFields,
  buildApprovedAchievementWorkflowFields,
  buildRejectedAchievementWorkflowFields,
};
