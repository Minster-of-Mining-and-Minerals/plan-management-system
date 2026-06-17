"use strict";

const { v4: uuidv4 } = require("uuid");
const { IssueHistory } = require("../models");

async function logIssueHistory(
  {
    issueId,
    actionType,
    fieldName = null,
    oldValue = null,
    newValue = null,
    notes = null,
    performedBy = null,
  },
  transaction = null
) {
  return IssueHistory.create(
    {
      issue_history_id: uuidv4(),
      issue_id: issueId,
      action_type: actionType,
      field_name: fieldName,
      old_value: oldValue != null ? String(oldValue) : null,
      new_value: newValue != null ? String(newValue) : null,
      notes,
      performed_by: performedBy,
    },
    { transaction }
  );
}

async function logFieldChange(
  { issueId, fieldName, oldValue, newValue, performedBy, actionType = "field_change" },
  transaction
) {
  if (oldValue === newValue) return null;
  return logIssueHistory(
    {
      issueId,
      actionType,
      fieldName,
      oldValue,
      newValue,
      performedBy,
    },
    transaction
  );
}

async function logStatusChange({ issueId, oldStatus, newStatus, performedBy, notes }, transaction) {
  return logIssueHistory(
    {
      issueId,
      actionType: "status_change",
      fieldName: "status",
      oldValue: oldStatus,
      newValue: newStatus,
      notes,
      performedBy,
    },
    transaction
  );
}

module.exports = {
  logIssueHistory,
  logFieldChange,
  logStatusChange,
};
