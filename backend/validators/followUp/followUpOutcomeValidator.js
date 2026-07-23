"use strict";

const VALID_OUTCOME_STATUSES = [
  "RESOLVED",
  "IMPROVED",
  "STABLE",
  "WORSENED",
  "REFERRED",
  "LOST_TO_FOLLOW_UP",
  "PATIENT_DECLINED",
  "OTHER",
];

/**
 * Validate create outcome request body.
 */
function validateCreateOutcome(req, res, next) {
  const errors = [];

  if (!req.body.encounter_id) {
    errors.push("encounter_id is required");
  }
  if (!req.body.outcome_status) {
    errors.push("outcome_status is required");
  } else if (!VALID_OUTCOME_STATUSES.includes(req.body.outcome_status)) {
    errors.push(`Invalid outcome_status. Must be one of: ${VALID_OUTCOME_STATUSES.join(", ")}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join("; ") });
  }

  next();
}

/**
 * Validate update outcome request body.
 */
function validateUpdateOutcome(req, res, next) {
  const errors = [];

  if (req.body.outcome_status && !VALID_OUTCOME_STATUSES.includes(req.body.outcome_status)) {
    errors.push(`Invalid outcome_status. Must be one of: ${VALID_OUTCOME_STATUSES.join(", ")}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join("; ") });
  }

  next();
}

/**
 * Validate create next follow-up request body.
 */
function validateCreateNextFollowUp(req, res, next) {
  const errors = [];

  if (!req.body.appointment_id) {
    errors.push("appointment_id is required");
  }
  if (!req.body.reason) {
    errors.push("reason is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join("; ") });
  }

  next();
}

module.exports = {
  validateCreateOutcome,
  validateUpdateOutcome,
  validateCreateNextFollowUp,
  VALID_OUTCOME_STATUSES,
};