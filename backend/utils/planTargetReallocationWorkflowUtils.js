"use strict";

const REALLOCATION_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  APPLIED: "applied",
});

const REALLOCATION_STATUS_VALUES = Object.freeze(Object.values(REALLOCATION_STATUS));

const REALLOCATION_STATUS_TRANSITIONS = Object.freeze({
  [REALLOCATION_STATUS.PENDING]: new Set([
    REALLOCATION_STATUS.APPROVED,
    REALLOCATION_STATUS.REJECTED,
    REALLOCATION_STATUS.CANCELLED,
  ]),
  [REALLOCATION_STATUS.APPROVED]: new Set([REALLOCATION_STATUS.APPLIED]),
  [REALLOCATION_STATUS.REJECTED]: new Set([]),
  [REALLOCATION_STATUS.CANCELLED]: new Set([]),
  [REALLOCATION_STATUS.APPLIED]: new Set([]),
});

const ALLOCATION_CHANGE_TYPE = Object.freeze({
  REALLOCATION: "reallocation",
});

function normalizeReallocationStatus(status) {
  const normalized = String(status ?? REALLOCATION_STATUS.PENDING).toLowerCase();
  return REALLOCATION_STATUS_VALUES.includes(normalized)
    ? normalized
    : REALLOCATION_STATUS.PENDING;
}

function canTransitionReallocationStatus(fromStatus, toStatus) {
  const from = normalizeReallocationStatus(fromStatus);
  const to = normalizeReallocationStatus(toStatus);
  return REALLOCATION_STATUS_TRANSITIONS[from]?.has(to) ?? false;
}

function isTerminalReallocationStatus(status) {
  const normalized = normalizeReallocationStatus(status);
  return (
    normalized === REALLOCATION_STATUS.REJECTED ||
    normalized === REALLOCATION_STATUS.CANCELLED ||
    normalized === REALLOCATION_STATUS.APPLIED
  );
}

function isPendingReallocationStatus(status) {
  return normalizeReallocationStatus(status) === REALLOCATION_STATUS.PENDING;
}

function buildPendingReallocationWorkflowFields(userId, requestedAt = new Date()) {
  return {
    status: REALLOCATION_STATUS.PENDING,
    requested_by: userId,
    requested_at: requestedAt,
    reviewed_by: null,
    reviewed_at: null,
    review_comment: null,
    applied_at: null,
  };
}

function buildApprovedReallocationWorkflowFields(userId, comment = null, reviewedAt = new Date()) {
  return {
    status: REALLOCATION_STATUS.APPROVED,
    reviewed_by: userId,
    reviewed_at: reviewedAt,
    review_comment: comment,
  };
}

function buildRejectedReallocationWorkflowFields(userId, comment, reviewedAt = new Date()) {
  return {
    status: REALLOCATION_STATUS.REJECTED,
    reviewed_by: userId,
    reviewed_at: reviewedAt,
    review_comment: comment,
  };
}

function buildCancelledReallocationWorkflowFields(userId, reviewedAt = new Date()) {
  return {
    status: REALLOCATION_STATUS.CANCELLED,
    reviewed_by: userId,
    reviewed_at: reviewedAt,
    review_comment: null,
  };
}

function buildAppliedReallocationWorkflowFields(appliedAt = new Date()) {
  return {
    status: REALLOCATION_STATUS.APPLIED,
    applied_at: appliedAt,
  };
}

function reallocationStatusLabel(status) {
  switch (normalizeReallocationStatus(status)) {
    case REALLOCATION_STATUS.PENDING:
      return "Pending";
    case REALLOCATION_STATUS.APPROVED:
      return "Approved";
    case REALLOCATION_STATUS.REJECTED:
      return "Rejected";
    case REALLOCATION_STATUS.CANCELLED:
      return "Cancelled";
    case REALLOCATION_STATUS.APPLIED:
      return "Applied";
    default:
      return "Pending";
  }
}

module.exports = {
  REALLOCATION_STATUS,
  REALLOCATION_STATUS_VALUES,
  REALLOCATION_STATUS_TRANSITIONS,
  ALLOCATION_CHANGE_TYPE,
  normalizeReallocationStatus,
  canTransitionReallocationStatus,
  isTerminalReallocationStatus,
  isPendingReallocationStatus,
  buildPendingReallocationWorkflowFields,
  buildApprovedReallocationWorkflowFields,
  buildRejectedReallocationWorkflowFields,
  buildCancelledReallocationWorkflowFields,
  buildAppliedReallocationWorkflowFields,
  reallocationStatusLabel,
};
