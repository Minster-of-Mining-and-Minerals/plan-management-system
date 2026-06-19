"use strict";

const { v4: uuidv4 } = require("uuid");
const { IssueFormResponse, FormConfigField } = require("../models");
const { validateFormResponses } = require("../utils/formConfigFieldValidationUtils");
const { getPublishedFormByContainerId } = require("./formConfigContainerService");

async function saveIssueFormResponses(issueId, containerId, formResponses, transaction) {
  const publishedForm = await getPublishedFormByContainerId(containerId);
  if (!publishedForm) {
    const error = new Error("Published form configuration not found for this container");
    error.statusCode = 400;
    throw error;
  }

  const serialized = validateFormResponses(publishedForm.fields, formResponses || {});

  const rows = [];
  for (const item of serialized) {
    const row = await IssueFormResponse.create(
      {
        issue_form_response_id: uuidv4(),
        issue_id: issueId,
        form_config_field_id: item.field.form_config_field_id,
        value_text: item.value_text,
        value_json: item.value_json,
      },
      { transaction }
    );
    rows.push(row);
  }

  return rows;
}

async function listResponsesForIssue(issueId) {
  return IssueFormResponse.findAll({
    where: { issue_id: issueId },
    include: [
      {
        model: FormConfigField,
        as: "field",
        attributes: [
          "form_config_field_id",
          "label",
          "field_key",
          "field_type",
          "placeholder",
          "help_text",
          "options",
          "display_order",
        ],
      },
    ],
    order: [[{ model: FormConfigField, as: "field" }, "display_order", "ASC"]],
  });
}

module.exports = {
  saveIssueFormResponses,
  listResponsesForIssue,
};
