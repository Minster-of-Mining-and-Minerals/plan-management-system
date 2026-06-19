"use strict";

const TEXT_FIELD_TYPES = new Set([
  "TEXT",
  "TEXTAREA",
  "EMAIL",
  "PHONE",
  "URL",
  "PASSWORD",
  "DATE",
  "DATETIME",
  "TIME",
]);

const JSON_FIELD_TYPES = new Set([
  "NUMBER",
  "SELECT",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
  "BOOLEAN",
  "FILE",
  "IMAGE",
  "ATTACHMENT",
]);

const OPTION_FIELD_TYPES = new Set(["SELECT", "MULTI_SELECT", "RADIO", "CHECKBOX"]);

const ATTACHMENT_FIELD_TYPES = new Set(["FILE", "IMAGE", "ATTACHMENT"]);

function slugifyFieldKey(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .filter((o) => o && o.value !== undefined && o.value !== null)
    .map((o) => ({
      label: String(o.label ?? o.value),
      value: String(o.value),
    }));
}

function isEmptyValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.files &&
    Array.isArray(value.files) &&
    value.files.length === 0
  ) {
    return true;
  }
  return false;
}

function validateRegex(value, pattern) {
  try {
    const regex = new RegExp(pattern);
    return regex.test(String(value));
  } catch {
    return true;
  }
}

function validateAttachmentValue(value, rules = {}) {
  const files = Array.isArray(value?.files)
    ? value.files
    : Array.isArray(value?.attachment_ids)
      ? value.attachment_ids.map((id) => ({ attachment_id: id }))
      : Array.isArray(value)
        ? value.map((id) => ({ attachment_id: id }))
        : [];

  if (!files.length) return { valid: false, message: "At least one file is required" };

  const multiple = rules.multiple_files !== false;
  if (!multiple && files.length > 1) {
    return { valid: false, message: "Only one file is allowed" };
  }

  const allowedExtensions = (rules.allowed_extensions || []).map((e) =>
    String(e).toLowerCase().replace(/^\./, "")
  );
  const maxSize = rules.max_file_size ? Number(rules.max_file_size) : null;

  for (const file of files) {
    const name = file.name || file.file_name || "";
    if (allowedExtensions.length && name.includes(".")) {
      const ext = name.split(".").pop()?.toLowerCase();
      if (ext && !allowedExtensions.includes(ext)) {
        return { valid: false, message: `File type .${ext} is not allowed` };
      }
    }
    if (maxSize && file.size && Number(file.size) > maxSize) {
      return { valid: false, message: "File exceeds maximum allowed size" };
    }
  }

  return { valid: true };
}

function validateFieldValue(field, rawValue) {
  const rules = field.validation_rules || {};
  const fieldType = String(field.field_type || "TEXT").toUpperCase();

  if (field.required && isEmptyValue(rawValue)) {
    return `${field.label} is required`;
  }

  if (isEmptyValue(rawValue)) return null;

  if (ATTACHMENT_FIELD_TYPES.has(fieldType)) {
    const result = validateAttachmentValue(rawValue, rules);
    return result.valid ? null : result.message;
  }

  if (fieldType === "NUMBER") {
    const num = Number(rawValue);
    if (Number.isNaN(num)) return `${field.label} must be a number`;
    if (rules.min !== undefined && num < Number(rules.min)) {
      return `${field.label} must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && num > Number(rules.max)) {
      return `${field.label} must be at most ${rules.max}`;
    }
    return null;
  }

  if (fieldType === "EMAIL") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(rawValue))) return `${field.label} must be a valid email`;
  }

  if (fieldType === "URL") {
    try {
      new URL(String(rawValue));
    } catch {
      return `${field.label} must be a valid URL`;
    }
  }

  if (fieldType === "BOOLEAN") {
    if (typeof rawValue !== "boolean" && !["true", "false", "1", "0"].includes(String(rawValue))) {
      return `${field.label} must be true or false`;
    }
    return null;
  }

  if (OPTION_FIELD_TYPES.has(fieldType)) {
    const options = normalizeOptions(field.options);
    const allowed = new Set(options.map((o) => o.value));
    if (fieldType === "MULTI_SELECT" || fieldType === "CHECKBOX") {
      const values = Array.isArray(rawValue) ? rawValue.map(String) : [String(rawValue)];
      if (values.some((v) => !allowed.has(v))) {
        return `${field.label} contains an invalid option`;
      }
    } else if (!allowed.has(String(rawValue))) {
      return `${field.label} contains an invalid option`;
    }
    return null;
  }

  const textValue = String(rawValue);
  if (rules.min_length !== undefined && textValue.length < Number(rules.min_length)) {
    return `${field.label} must be at least ${rules.min_length} characters`;
  }
  if (rules.max_length !== undefined && textValue.length > Number(rules.max_length)) {
    return `${field.label} must be at most ${rules.max_length} characters`;
  }
  if (rules.regex && !validateRegex(textValue, rules.regex)) {
    return `${field.label} format is invalid`;
  }

  return null;
}

function serializeFieldValue(field, rawValue) {
  const fieldType = String(field.field_type || "TEXT").toUpperCase();

  if (isEmptyValue(rawValue)) {
    return { value_text: null, value_json: null };
  }

  if (TEXT_FIELD_TYPES.has(fieldType)) {
    return { value_text: String(rawValue), value_json: null };
  }

  if (fieldType === "NUMBER") {
    return { value_text: String(rawValue), value_json: { number: Number(rawValue) } };
  }

  if (fieldType === "BOOLEAN") {
    const boolVal =
      typeof rawValue === "boolean" ? rawValue : ["true", "1"].includes(String(rawValue).toLowerCase());
    return { value_text: boolVal ? "true" : "false", value_json: { boolean: boolVal } };
  }

  if (ATTACHMENT_FIELD_TYPES.has(fieldType)) {
    const attachmentIds = Array.isArray(rawValue?.attachment_ids)
      ? rawValue.attachment_ids
      : Array.isArray(rawValue)
        ? rawValue
        : Array.isArray(rawValue?.files)
          ? rawValue.files.map((f) => f.attachment_id).filter(Boolean)
          : [];

    return {
      value_text: null,
      value_json: {
        files: attachmentIds.map((id) => ({ attachment_id: id })),
        attachment_ids: attachmentIds,
      },
    };
  }

  if (fieldType === "MULTI_SELECT" || fieldType === "CHECKBOX") {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    return {
      value_text: values.map(String).join(", "),
      value_json: { values: values.map(String) },
    };
  }

  if (JSON_FIELD_TYPES.has(fieldType)) {
    return { value_text: String(rawValue), value_json: { value: rawValue } };
  }

  return { value_text: String(rawValue), value_json: null };
}

function validateFormResponses(fields, responses = {}) {
  const activeFields = (fields || []).filter((f) => f.is_active !== false);
  const errors = [];

  for (const field of activeFields) {
    const key = field.field_key;
    const rawValue = responses[key];
    const error = validateFieldValue(field, rawValue);
    if (error) errors.push(error);
  }

  if (errors.length) {
    const err = new Error(errors[0]);
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }

  return activeFields.map((field) => ({
    field,
    ...serializeFieldValue(field, responses[field.field_key]),
  }));
}

module.exports = {
  TEXT_FIELD_TYPES,
  JSON_FIELD_TYPES,
  OPTION_FIELD_TYPES,
  ATTACHMENT_FIELD_TYPES,
  slugifyFieldKey,
  normalizeOptions,
  validateFieldValue,
  serializeFieldValue,
  validateFormResponses,
};
