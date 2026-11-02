"use strict";

const { RegionalIssueHistory } = require("../models");

async function recordRegionalHistory({
  regional_issue_id,
  action_type,
  field_name = null,
  old_value = null,
  new_value = null,
  performed_by,
  notes = null,
  transaction = null,
}) {
  return await RegionalIssueHistory.create(
    {
      regional_issue_id,
      action_type,
      field_name,
      old_value: old_value != null ? String(old_value) : null,
      new_value: new_value != null ? String(new_value) : null,
      performed_by,
      notes,
    },
    { transaction }
  );
}

module.exports = {
  recordRegionalHistory,
};

