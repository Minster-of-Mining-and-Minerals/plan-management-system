"use strict";

function isEmptyValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function normalizeScalar(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function evaluateVisibilityRule(fieldValue, rule) {
  if (!rule?.operator) return true;
  const expected = rule.value;

  switch (rule.operator) {
    case "truthy":
      if (typeof fieldValue === "boolean") return fieldValue;
      if (Array.isArray(fieldValue)) return fieldValue.length > 0;
      return !isEmptyValue(fieldValue);
    case "falsy":
      if (typeof fieldValue === "boolean") return !fieldValue;
      if (Array.isArray(fieldValue)) return fieldValue.length === 0;
      return isEmptyValue(fieldValue);
    case "empty":
      return isEmptyValue(fieldValue);
    case "not_empty":
      return !isEmptyValue(fieldValue);
    case "eq":
      return normalizeScalar(fieldValue) === normalizeScalar(expected);
    case "neq":
      return normalizeScalar(fieldValue) !== normalizeScalar(expected);
    case "in": {
      const list = Array.isArray(expected)
        ? expected.map(String)
        : [String(expected)];
      const current = Array.isArray(fieldValue)
        ? fieldValue.map(String)
        : [normalizeScalar(fieldValue)];
      return current.some((v) => list.includes(v));
    }
    default:
      return true;
  }
}

function isFieldVisibleByRules(field, flatValues = {}) {
  const rule = field.config?.visible_when;
  if (!rule?.field_key) return true;
  return evaluateVisibilityRule(flatValues[rule.field_key], rule);
}

module.exports = {
  isEmptyValue,
  evaluateVisibilityRule,
  isFieldVisibleByRules,
};
