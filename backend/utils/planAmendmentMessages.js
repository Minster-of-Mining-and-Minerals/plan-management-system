"use strict";

const AMENDMENT_MESSAGES = Object.freeze({
  TYPE_REQUIRED: "Amendment type is required.",
  TYPE_UNKNOWN: "Unknown amendment type.",
  TYPE_UNAVAILABLE: "This amendment type is registered but not available yet.",
  HANDLER_MISSING: "No handler is registered for this amendment type.",
  TITLE_REQUIRED: "Amendment title is required.",
  DRAFT_REQUIRED: "Draft plan (master plan version) is required.",
  DRAFT_NOT_FOUND: "Draft plan was not found.",
  PROCESS_NOT_STARTED: "Amendments are only available after execution has started.",
  NOT_MASTER: "Amendments can only be created against a master plan draft.",
  AMENDMENT_NOT_FOUND: "Plan amendment was not found.",
  INVALID_TRANSITION: "This status transition is not allowed.",
  NOT_DRAFT: "Only draft amendments can be submitted for approval.",
  NOT_PENDING: "Only amendments pending approval can be reviewed.",
  SUBMIT_NOT_ALLOWED: "Only the requester can submit a draft amendment.",
  CANCEL_NOT_ALLOWED: "Only the requester can cancel a draft or pending amendment.",
  REVIEW_COMMENT_REQUIRED: "Review comment is required when rejecting an amendment.",
  VALIDATION_FAILED: "Amendment validation failed.",
  APPLY_FAILED: "Amendment apply failed.",
  PREVIEW_FAILED: "Amendment preview failed.",
  PERMISSION_REQUEST: "Plan request amendment permission required.",
  PERMISSION_APPROVE: "Plan approve amendment permission required.",
  SCOPE_DENIED: "You do not have assignment scope on this plan to request amendments.",
  APPROVE_SCOPE_DENIED: "You do not have assignment scope on this plan to approve amendments.",
});

module.exports = {
  AMENDMENT_MESSAGES,
};
