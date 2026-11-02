"use strict";

const REGIONAL_ISSUE_STATUS = {
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

const ALLOWED_REGIONAL_TRANSITIONS = {
  [REGIONAL_ISSUE_STATUS.SUBMITTED]: [REGIONAL_ISSUE_STATUS.UNDER_REVIEW],
  [REGIONAL_ISSUE_STATUS.UNDER_REVIEW]: [
    REGIONAL_ISSUE_STATUS.ACCEPTED,
    REGIONAL_ISSUE_STATUS.REJECTED,
  ],
  [REGIONAL_ISSUE_STATUS.ACCEPTED]: [REGIONAL_ISSUE_STATUS.RESOLVED],
  [REGIONAL_ISSUE_STATUS.RESOLVED]: [REGIONAL_ISSUE_STATUS.CLOSED],
  [REGIONAL_ISSUE_STATUS.REJECTED]: [],
  [REGIONAL_ISSUE_STATUS.CLOSED]: [],
};

function isValidRegionalTransition(currentStatus, targetStatus) {
  const allowed = ALLOWED_REGIONAL_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

function assertValidRegionalTransition(currentStatus, targetStatus) {
  if (!isValidRegionalTransition(currentStatus, targetStatus)) {
    const error = new Error(
      `Invalid regional issue status transition from '${currentStatus}' to '${targetStatus}'.`
    );
    error.status = 400;
    throw error;
  }
}

function isRegionalIssueEditable(status) {
  return status === REGIONAL_ISSUE_STATUS.SUBMITTED;
}

module.exports = {
  REGIONAL_ISSUE_STATUS,
  ALLOWED_REGIONAL_TRANSITIONS,
  isValidRegionalTransition,
  assertValidRegionalTransition,
  isRegionalIssueEditable,
};

