"use strict";

const LOG_ACTION_TYPES = [
  "submit",
  "forward",
  "return",
  "prescribe",
  "complete",
];

const LOG_STATUSES = [
  "submitted",
  "forwarded",
  "returned",
  "prescribed",
  "completed",
];

const TASK_STATUSES = ["pending", "done", "cancelled"];

const WORKFLOW_APPOINTMENT_STATUSES = ["active", "completed"];

module.exports = {
  LOG_ACTION_TYPES,
  LOG_STATUSES,
  TASK_STATUSES,
  WORKFLOW_APPOINTMENT_STATUSES,
};
