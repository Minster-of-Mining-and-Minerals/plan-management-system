"use strict";

const {
  PATIENT_MODEL_NAME,
  CORE_PATIENT_COLUMNS,
  CORE_USER_COLUMN_SET,
  SYSTEM_USER_PAYLOAD_KEYS,
  ETHIOPIAN_PHONE_REGEX,
} = require("../config/userFormConstants");

const CORE_USER_COLUMNS = CORE_PATIENT_COLUMNS;
const { getFormFieldsByModel } = require("./formFieldService");
const { getGroupsByModel } = require("./formFieldGroupService");
const {
  isFieldEffectivelyVisible,
  validateGroupFields,
} = require("./formFieldRuleService");

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function parseStoredValue(raw, field) {
  if (raw === undefined || raw === null) return raw;
  const config = field?.config || {};
  const isMulti =
    (field?.field_type === "select" && config.multiple) ||
    field?.field_type === "checkbox";

  if (isMulti && typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return raw;
}

function serializeValueForStorage(value, field) {
  const config = field?.config || {};
  const isMulti =
    (field?.field_type === "select" && config.multiple) ||
    field?.field_type === "checkbox";

  if (isMulti && Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (value === undefined || value === null) return null;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function validateInputField(value, config, label) {
  const errors = [];
  const str = value == null ? "" : String(value);

  if (config.min_length != null && str.length < config.min_length) {
    errors.push(`${label} must be at least ${config.min_length} characters`);
  }
  if (config.max_length != null && str.length > config.max_length) {
    errors.push(`${label} must be at most ${config.max_length} characters`);
  }

  const pattern = config.pattern;
  if (pattern === "email" && str) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(str)) errors.push(`${label} must be a valid email`);
  }
  if (pattern === "phone" && str && !ETHIOPIAN_PHONE_REGEX.test(str)) {
    errors.push(
      `${label} must be a valid Ethiopian phone (+2519… or 09…)`
    );
  }

  return errors;
}

function validateSelectField(value, config, label, required) {
  const errors = [];
  const options = config.options || [];
  const multiple = Boolean(config.multiple);

  if (isEmpty(value)) {
    return required ? [`${label} is required`] : [];
  }

  const values = multiple
    ? Array.isArray(value)
      ? value
      : [value]
    : [Array.isArray(value) ? value[0] : value];

  if (multiple && !Array.isArray(value)) {
    errors.push(`${label} must be an array for multi-select`);
  }

  for (const v of values) {
    if (v != null && v !== "" && !options.includes(String(v))) {
      errors.push(`${label}: invalid option "${v}"`);
    }
  }

  return errors;
}

function validateCheckboxField(value, config, label, required) {
  const errors = [];
  const options = config.options || [];
  const maxSelected = config.max_selected;

  const selected = Array.isArray(value)
    ? value
    : value == null || value === ""
      ? []
      : [value];

  if (required && selected.length === 0) {
    errors.push(`${label} is required`);
  }

  for (const v of selected) {
    if (!options.includes(String(v))) {
      errors.push(`${label}: invalid option "${v}"`);
    }
  }

  if (maxSelected != null && selected.length > maxSelected) {
    errors.push(`${label}: select at most ${maxSelected} option(s)`);
  }

  return errors;
}

function validateFileField(value, config, label, required) {
  const errors = [];
  if (isEmpty(value)) {
    return required ? [`${label} is required`] : [];
  }

  const str = String(value);
  const allowed = (config.allowed_types || []).map((t) =>
    t.toLowerCase().replace(/^\./, "")
  );

  if (allowed.length > 0) {
    const ext = str.split(".").pop()?.toLowerCase();
    if (ext && !allowed.includes(ext)) {
      errors.push(`${label}: file type must be one of: ${allowed.join(", ")}`);
    }
  }

  return errors;
}

function validateFieldValue(field, value) {
  const config = field.config || {};
  const label = field.label || field.field_key;
  const required = Boolean(field.is_required);

  if (isEmpty(value)) {
    return required ? [`${label} is required`] : [];
  }

  switch (field.field_type) {
    case "input":
    case "textarea":
      return validateInputField(value, config, label);
    case "number": {
      const num = Number(value);
      if (Number.isNaN(num)) return [`${label} must be a number`];
      return [];
    }
    case "date":
      if (Number.isNaN(Date.parse(String(value)))) {
        return [`${label} must be a valid date`];
      }
      return [];
    case "select":
      return validateSelectField(value, config, label, required);
    case "checkbox":
      return validateCheckboxField(value, config, label, required);
    case "file":
      return validateFileField(value, config, label, required);
    case "radio":
      return validateSelectField(value, config, label, required);
    case "time":
      if (String(value) && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(value))) {
        return [`${label} must be a valid time`];
      }
      return [];
    case "switch":
      if (
        typeof value !== "boolean" &&
        !["true", "false", "1", "0", "on", "off"].includes(String(value).toLowerCase())
      ) {
        return [`${label} must be true or false`];
      }
      return [];
    case "richtext":
      return validateInputField(value, config, label);
    default:
      return [];
  }
}

function flattenBody(body) {
  const flat = { ...(body || {}) };
  if (body?.custom_fields && typeof body.custom_fields === "object") {
    Object.assign(flat, body.custom_fields);
  }
  delete flat.custom_fields;
  return flat;
}

function isFieldInPayload(field, flat, isUpdate) {
  if (!isUpdate) return true;
  return field.field_key in flat;
}

/**
 * Hybrid validation: core columns → userData, custom keys → customValues.
 */
async function validateAndPickUserFields(body, { isUpdate = false } = {}) {
  const groups = await getGroupsByModel(PATIENT_MODEL_NAME, { visibleOnly: false });
  const fields = groups.flatMap((g) => g.fields || []);
  const fieldByKey = new Map(fields.map((f) => [f.field_key, f]));
  const flat = flattenBody(body);
  const errors = [];
  const userData = {};
  const customValues = {};

  for (const key of Object.keys(flat)) {
    if (SYSTEM_USER_PAYLOAD_KEYS.includes(key)) continue;
    if (!fieldByKey.has(key)) {
      errors.push(`Unknown or unconfigured field: ${key}`);
    }
  }

  for (const group of groups) {
    const groupFields = (group.fields || []).filter((f) =>
      isUpdate
        ? isFieldInPayload(f, flat, true) && isFieldEffectivelyVisible(group, f)
        : isFieldEffectivelyVisible(group, f)
    );

    const groupErrors = validateGroupFields(group, group.fields || [], flat, {
      isUpdate,
    });
    errors.push(...groupErrors);

    for (const field of groupFields) {
      const raw = flat[field.field_key];
      const fieldErrors = validateFieldValue(field, raw);

      if (fieldErrors.length) {
        errors.push(...fieldErrors);
        continue;
      }

      if (isEmpty(raw)) continue;

      if (
        field.storage_type === "core" ||
        CORE_USER_COLUMN_SET.has(field.field_key)
      ) {
        userData[field.field_key] =
          field.field_key === "phone_number"
            ? serializeValueForStorage(raw, field)
            : raw;
        if (field.field_key === "email") {
          userData.email = String(raw).trim().toLowerCase();
        }
      } else {
        customValues[field.field_key] = raw;
      }
    }
  }

  if (!isUpdate) {
    for (const key of CORE_USER_COLUMNS) {
      if (isEmpty(userData[key])) {
        const field = fieldByKey.get(key);
        const label = field?.label || key.replace(/_/g, " ");
        errors.push(`${label} is required`);
      }
    }
  }

  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.status = 400;
    err.details = errors;
    throw err;
  }

  return {
    userData,
    customValues,
    role_ids: body.role_ids,
    fields,
  };
}

module.exports = {
  validateAndPickUserFields,
  validateFieldValue,
  parseStoredValue,
  serializeValueForStorage,
  getFormFieldsByModel,
  PATIENT_MODEL_NAME,
  validateAndPickPatientFields: validateAndPickUserFields,
};
