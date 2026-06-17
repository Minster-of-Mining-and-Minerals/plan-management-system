"use strict";

const VALID_TRANSITIONS = {
  submitted: ["under_review"],
  under_review: ["accepted", "rejected"],
  accepted: ["resolved"],
  resolved: ["closed"],
  rejected: [],
  closed: [],
};

const STATUS_LABELS = {
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  resolved: "Resolved",
  closed: "Closed",
};

function canTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

function assertValidTransition(fromStatus, toStatus) {
  if (!canTransition(fromStatus, toStatus)) {
    const fromLabel = STATUS_LABELS[fromStatus] || fromStatus;
    const toLabel = STATUS_LABELS[toStatus] || toStatus;
    const error = new Error(
      `Invalid status transition from "${fromLabel}" to "${toLabel}"`
    );
    error.statusCode = 400;
    throw error;
  }
}

function isEditableStatus(status) {
  return status === "submitted";
}

module.exports = {
  VALID_TRANSITIONS,
  STATUS_LABELS,
  canTransition,
  assertValidTransition,
  isEditableStatus,
};
