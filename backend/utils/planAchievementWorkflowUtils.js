"use strict";

const ACHIEVEMENT_STATUS = Object.freeze({
  EMPTY: "empty",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  VALIDATED: "validated",
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
  [ACHIEVEMENT_STATUS.APPROVED]: new Set([
    ACHIEVEMENT_STATUS.VALIDATED,
    ACHIEVEMENT_STATUS.REJECTED,
  ]),
  [ACHIEVEMENT_STATUS.VALIDATED]: new Set([]),
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
 * When validation gate is on, only validated achievements roll up.
 */
function isRollupEligibleAchievementStatus(status, options = {}) {
  const normalized = normalizeAchievementStatus(status);
  if (options.requiresValidation) {
    return (
      normalized === ACHIEVEMENT_STATUS.VALIDATED ||
      normalized === ACHIEVEMENT_STATUS.APPROVED ||
      normalized === ACHIEVEMENT_STATUS.SUBMITTED
    );
  }
  return (
    normalized === ACHIEVEMENT_STATUS.APPROVED ||
    normalized === ACHIEVEMENT_STATUS.SUBMITTED ||
    normalized === ACHIEVEMENT_STATUS.EMPTY
  );
}

/** Editable only on first entry or after rejection (not while pending approval/validation or after validated). */
function canEditAchievementValue(status) {
  const normalized = normalizeAchievementStatus(status);
  return (
    normalized === ACHIEVEMENT_STATUS.EMPTY ||
    normalized === ACHIEVEMENT_STATUS.REJECTED
  );
}

function buildEmptyAchievementWorkflowFields() {
  return {
    period_actual_status: ACHIEVEMENT_STATUS.EMPTY,
    period_actual_submitted_at: null,
    period_actual_submitted_by: null,
    period_actual_approved_at: null,
    period_actual_approved_by: null,
    period_actual_validated_at: null,
    period_actual_validated_by: null,
    period_actual_rejection_comment: null,
  };
}

function resolveAnnualAchievementStatus(node) {
  if (!node) return ACHIEVEMENT_STATUS.EMPTY;

  if (node.annual_actual_status) {
    return normalizeAchievementStatus(node.annual_actual_status);
  }

  if (node.annual_actual != null && node.annual_actual !== undefined) {
    return ACHIEVEMENT_STATUS.APPROVED;
  }

  return ACHIEVEMENT_STATUS.EMPTY;
}

function hasRecordedAnnualAchievementValue(node) {
  return node?.annual_actual != null && node.annual_actual !== undefined;
}

function buildEmptyAnnualAchievementWorkflowFields() {
  return {
    annual_actual_status: ACHIEVEMENT_STATUS.EMPTY,
    annual_actual_submitted_at: null,
    annual_actual_submitted_by: null,
    annual_actual_approved_at: null,
    annual_actual_approved_by: null,
    annual_actual_validated_at: null,
    annual_actual_validated_by: null,
    annual_actual_rejection_comment: null,
  };
}

function buildSubmittedAnnualAchievementWorkflowFields(userId, submittedAt = new Date()) {
  return {
    annual_actual_status: ACHIEVEMENT_STATUS.SUBMITTED,
    annual_actual_submitted_at: submittedAt,
    annual_actual_submitted_by: userId,
    annual_actual_approved_at: null,
    annual_actual_approved_by: null,
    annual_actual_validated_at: null,
    annual_actual_validated_by: null,
    annual_actual_rejection_comment: null,
  };
}

function buildApprovedAnnualAchievementWorkflowFields(userId, approvedAt = new Date()) {
  return {
    annual_actual_status: ACHIEVEMENT_STATUS.APPROVED,
    annual_actual_approved_at: approvedAt,
    annual_actual_approved_by: userId,
    annual_actual_validated_at: null,
    annual_actual_validated_by: null,
    annual_actual_rejection_comment: null,
  };
}

function buildValidatedAnnualAchievementWorkflowFields(userId, validatedAt = new Date()) {
  return {
    annual_actual_status: ACHIEVEMENT_STATUS.VALIDATED,
    annual_actual_validated_at: validatedAt,
    annual_actual_validated_by: userId,
    annual_actual_rejection_comment: null,
  };
}

function buildRejectedAnnualAchievementWorkflowFields(comment = null) {
  return {
    annual_actual_status: ACHIEVEMENT_STATUS.REJECTED,
    annual_actual_approved_at: null,
    annual_actual_approved_by: null,
    annual_actual_validated_at: null,
    annual_actual_validated_by: null,
    annual_actual_rejection_comment: comment || null,
  };
}

function buildSubmittedAchievementWorkflowFields(userId, submittedAt = new Date()) {
  return {
    period_actual_status: ACHIEVEMENT_STATUS.SUBMITTED,
    period_actual_submitted_at: submittedAt,
    period_actual_submitted_by: userId,
    period_actual_approved_at: null,
    period_actual_approved_by: null,
    period_actual_validated_at: null,
    period_actual_validated_by: null,
    period_actual_rejection_comment: null,
  };
}

function buildApprovedAchievementWorkflowFields(userId, approvedAt = new Date()) {
  return {
    period_actual_status: ACHIEVEMENT_STATUS.APPROVED,
    period_actual_approved_at: approvedAt,
    period_actual_approved_by: userId,
    period_actual_validated_at: null,
    period_actual_validated_by: null,
    period_actual_rejection_comment: null,
  };
}

function buildValidatedAchievementWorkflowFields(userId, validatedAt = new Date()) {
  return {
    period_actual_status: ACHIEVEMENT_STATUS.VALIDATED,
    period_actual_validated_at: validatedAt,
    period_actual_validated_by: userId,
    period_actual_rejection_comment: null,
  };
}

function buildRejectedAchievementWorkflowFields(comment = null) {
  return {
    period_actual_status: ACHIEVEMENT_STATUS.REJECTED,
    period_actual_approved_at: null,
    period_actual_approved_by: null,
    period_actual_validated_at: null,
    period_actual_validated_by: null,
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
  canEditAchievementValue,
  buildEmptyAchievementWorkflowFields,
  buildSubmittedAchievementWorkflowFields,
  buildApprovedAchievementWorkflowFields,
  buildValidatedAchievementWorkflowFields,
  buildRejectedAchievementWorkflowFields,
  resolveAnnualAchievementStatus,
  hasRecordedAnnualAchievementValue,
  buildEmptyAnnualAchievementWorkflowFields,
  buildSubmittedAnnualAchievementWorkflowFields,
  buildApprovedAnnualAchievementWorkflowFields,
  buildValidatedAnnualAchievementWorkflowFields,
  buildRejectedAnnualAchievementWorkflowFields,
};
