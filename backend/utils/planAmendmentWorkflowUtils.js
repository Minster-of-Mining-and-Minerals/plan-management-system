"use strict";

const AMENDMENT_STATUS = Object.freeze({
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  APPLIED: "applied",
});

const AMENDMENT_STATUS_VALUES = Object.freeze(Object.values(AMENDMENT_STATUS));

const AMENDMENT_STATUS_TRANSITIONS = Object.freeze({
  [AMENDMENT_STATUS.DRAFT]: new Set([
    AMENDMENT_STATUS.PENDING_APPROVAL,
    AMENDMENT_STATUS.CANCELLED,
  ]),
  [AMENDMENT_STATUS.PENDING_APPROVAL]: new Set([
    AMENDMENT_STATUS.APPROVED,
    AMENDMENT_STATUS.REJECTED,
    AMENDMENT_STATUS.CANCELLED,
  ]),
  [AMENDMENT_STATUS.APPROVED]: new Set([AMENDMENT_STATUS.APPLIED]),
  [AMENDMENT_STATUS.REJECTED]: new Set([]),
  [AMENDMENT_STATUS.CANCELLED]: new Set([]),
  [AMENDMENT_STATUS.APPLIED]: new Set([]),
});

function normalizeAmendmentStatus(status) {
  const normalized = String(status ?? AMENDMENT_STATUS.DRAFT)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return AMENDMENT_STATUS_VALUES.includes(normalized)
    ? normalized
    : AMENDMENT_STATUS.DRAFT;
}

function canTransitionAmendmentStatus(fromStatus, toStatus) {
  const from = normalizeAmendmentStatus(fromStatus);
  const to = normalizeAmendmentStatus(toStatus);
  return AMENDMENT_STATUS_TRANSITIONS[from]?.has(to) ?? false;
}

function isTerminalAmendmentStatus(status) {
  const normalized = normalizeAmendmentStatus(status);
  return (
    normalized === AMENDMENT_STATUS.REJECTED ||
    normalized === AMENDMENT_STATUS.CANCELLED ||
    normalized === AMENDMENT_STATUS.APPLIED
  );
}

function isDraftAmendmentStatus(status) {
  return normalizeAmendmentStatus(status) === AMENDMENT_STATUS.DRAFT;
}

function isPendingApprovalAmendmentStatus(status) {
  return normalizeAmendmentStatus(status) === AMENDMENT_STATUS.PENDING_APPROVAL;
}

function buildDraftAmendmentWorkflowFields(userId, requestedAt = new Date()) {
  return {
    status: AMENDMENT_STATUS.DRAFT,
    requested_by: userId,
    requested_at: requestedAt,
    reviewed_by: null,
    reviewed_at: null,
    review_comment: null,
    applied_at: null,
    cancelled_at: null,
    version: null,
  };
}

function buildPendingApprovalAmendmentWorkflowFields(userId, requestedAt = new Date()) {
  return {
    status: AMENDMENT_STATUS.PENDING_APPROVAL,
    requested_by: userId,
    requested_at: requestedAt,
    reviewed_by: null,
    reviewed_at: null,
    review_comment: null,
    applied_at: null,
    cancelled_at: null,
  };
}

function buildApprovedAmendmentWorkflowFields(userId, comment = null, reviewedAt = new Date()) {
  return {
    status: AMENDMENT_STATUS.APPROVED,
    reviewed_by: userId,
    reviewed_at: reviewedAt,
    review_comment: comment,
  };
}

function buildRejectedAmendmentWorkflowFields(userId, comment, reviewedAt = new Date()) {
  return {
    status: AMENDMENT_STATUS.REJECTED,
    reviewed_by: userId,
    reviewed_at: reviewedAt,
    review_comment: comment,
  };
}

function buildCancelledAmendmentWorkflowFields(userId, cancelledAt = new Date()) {
  return {
    status: AMENDMENT_STATUS.CANCELLED,
    cancelled_at: cancelledAt,
    reviewed_by: userId,
    reviewed_at: cancelledAt,
  };
}

function buildAppliedAmendmentWorkflowFields(version, appliedAt = new Date()) {
  return {
    status: AMENDMENT_STATUS.APPLIED,
    applied_at: appliedAt,
    version,
  };
}

function amendmentStatusLabel(status) {
  switch (normalizeAmendmentStatus(status)) {
    case AMENDMENT_STATUS.DRAFT:
      return "Draft";
    case AMENDMENT_STATUS.PENDING_APPROVAL:
      return "Pending Approval";
    case AMENDMENT_STATUS.APPROVED:
      return "Approved";
    case AMENDMENT_STATUS.REJECTED:
      return "Rejected";
    case AMENDMENT_STATUS.CANCELLED:
      return "Cancelled";
    case AMENDMENT_STATUS.APPLIED:
      return "Applied";
    default:
      return "Unknown";
  }
}

module.exports = {
  AMENDMENT_STATUS,
  AMENDMENT_STATUS_VALUES,
  AMENDMENT_STATUS_TRANSITIONS,
  normalizeAmendmentStatus,
  canTransitionAmendmentStatus,
  isTerminalAmendmentStatus,
  isDraftAmendmentStatus,
  isPendingApprovalAmendmentStatus,
  buildDraftAmendmentWorkflowFields,
  buildPendingApprovalAmendmentWorkflowFields,
  buildApprovedAmendmentWorkflowFields,
  buildRejectedAmendmentWorkflowFields,
  buildCancelledAmendmentWorkflowFields,
  buildAppliedAmendmentWorkflowFields,
  amendmentStatusLabel,
};
