"use strict";

const {
  validateFieldValue,
  normalizeCanvasFieldValue,
} = require("./dynamicUserValidationService");
const diagnosisFormConfigService = require("./diagnosisFormConfigService");
const { isFieldEffectivelyVisible, validateGroupFields } = require("./formFieldRuleService");

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

async function validateDiagnosisFormData(configId, formData, { partial = false } = {}) {
  const groups = await diagnosisFormConfigService.getGroupsByConfig(configId, {
    visibleOnly: false,
  });
  const fields = groups.flatMap((g) => g.fields || []);
  const fieldByKey = new Map(fields.map((f) => [f.field_key, f]));
  const flat = { ...(formData || {}) };
  const errors = [];
  const normalized = {};

  if (!partial) {
    for (const key of Object.keys(flat)) {
      if (!fieldByKey.has(key)) {
        errors.push(`Unknown or unconfigured field: ${key}`);
      }
    }
  }

  for (const group of groups) {
    const groupErrors = validateGroupFields(group, group.fields || [], flat, {
      isUpdate: partial,
    });
    errors.push(...groupErrors);

    for (const field of group.fields || []) {
      if (!isFieldEffectivelyVisible(group, field)) continue;
      if (partial && !(field.field_key in flat)) continue;

      const raw = flat[field.field_key];
      // Required empties are reported by validateGroupFields — avoid duplicate messages.
      if (isEmpty(raw) && field.is_required) continue;

      const fieldErrors = validateFieldValue(field, raw);
      if (fieldErrors.length) {
        errors.push(...fieldErrors);
        continue;
      }

      if (!isEmpty(raw)) {
        normalized[field.field_key] =
          field.field_type === "canvas_annotation"
            ? normalizeCanvasFieldValue(raw)
            : raw;
      }
    }
  }

  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.status = 400;
    err.details = errors;
    throw err;
  }

  return normalized;
}

module.exports = {
  validateDiagnosisFormData,
};
