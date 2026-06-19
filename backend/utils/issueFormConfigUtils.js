"use strict";

const STANDARD_FIELD_KEYS = [
  "title",
  "description",
  "justification",
  "current_value",
  "suggested_value",
  "entity_type",
  "entity_id",
  "attachment_path",
];

function normalizeFormConfig(formConfig) {
  if (!formConfig || typeof formConfig !== "object") {
    return { fields: [], standardFields: {} };
  }
  return {
    fields: Array.isArray(formConfig.fields) ? formConfig.fields : [],
    standardFields:
      formConfig.standardFields && typeof formConfig.standardFields === "object"
        ? formConfig.standardFields
        : {},
  };
}

function getStandardFieldRule(formConfig, fieldKey) {
  const config = normalizeFormConfig(formConfig);
  const rule = config.standardFields[fieldKey];
  if (!rule || typeof rule !== "object") return null;
  return rule;
}

function isStandardFieldVisible(formConfig, fieldKey, defaultVisible = true) {
  const rule = getStandardFieldRule(formConfig, fieldKey);
  if (!rule) return defaultVisible;
  return rule.visible !== false;
}

function isStandardFieldRequired(formConfig, fieldKey, defaultRequired = false) {
  const rule = getStandardFieldRule(formConfig, fieldKey);
  if (!rule) return defaultRequired;
  return rule.required === true;
}

function getAllowedEntityTypes(formConfig, fallbackTypes) {
  const rule = getStandardFieldRule(formConfig, "entity_type");
  if (rule?.allowedTypes?.length) return rule.allowedTypes;
  return fallbackTypes;
}

function validateFormDataForCategory(category, payload) {
  const formConfig = normalizeFormConfig(category.form_config);
  const formData =
    payload.form_data && typeof payload.form_data === "object" ? payload.form_data : {};

  for (const field of formConfig.fields) {
    if (!field?.key) continue;
    const value = formData[field.key];
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "");

    if (field.required && isEmpty) {
      const error = new Error(`${field.label || field.key} is required for this issue category`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (
    isStandardFieldRequired(formConfig, "current_value") &&
    (!payload.current_value || !String(payload.current_value).trim())
  ) {
    const error = new Error("Current value is required for this issue category");
    error.statusCode = 400;
    throw error;
  }

  if (
    isStandardFieldRequired(formConfig, "suggested_value") &&
    (!payload.suggested_value || !String(payload.suggested_value).trim())
  ) {
    const error = new Error("Suggested value is required for this issue category");
    error.statusCode = 400;
    throw error;
  }

  if (
    isStandardFieldRequired(formConfig, "justification", true) &&
    (!payload.justification || !String(payload.justification).trim())
  ) {
    const error = new Error("Justification is required for this issue category");
    error.statusCode = 400;
    throw error;
  }

  return formData;
}

module.exports = {
  STANDARD_FIELD_KEYS,
  normalizeFormConfig,
  getStandardFieldRule,
  isStandardFieldVisible,
  isStandardFieldRequired,
  getAllowedEntityTypes,
  validateFormDataForCategory,
};
