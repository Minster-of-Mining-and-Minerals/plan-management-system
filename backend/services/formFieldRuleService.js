"use strict";

const { isFieldVisibleByRules } = require("./formConditionService");

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/** Field visible when group/field flags allow and conditional rules pass. */
function isFieldEffectivelyVisible(group, field, flatValues = {}) {
  if (!group?.is_visible) return false;
  if (!field?.is_visible) return false;
  return isFieldVisibleByRules(field, flatValues);
}

/** Any effectively visible required field makes the step required. */
function groupHasRequiredVisibleField(fields, group, flatValues = {}) {
  return (fields || []).some(
    (f) => isFieldEffectivelyVisible(group, f, flatValues) && Boolean(f.is_required)
  );
}

/**
 * Effective step required: at least one visible required field in the group.
 * DB group.is_required cannot force a step if all fields are optional.
 */
function isGroupStepRequired(group, fields, flatValues = {}) {
  return groupHasRequiredVisibleField(fields, group, flatValues);
}

/** Normalize stored group.is_required against field rules. */
function normalizeGroupRequiredFlag(group, fields) {
  const stepRequired = isGroupStepRequired(group, fields);
  return {
    ...group,
    is_required: stepRequired ? Boolean(group.is_required) : false,
    is_required_step: stepRequired,
    is_optional_step: !stepRequired,
  };
}

function assertValidGroupRequiredState(group, fields) {
  const stepRequired = isGroupStepRequired(group, fields);
  if (group.is_required && !stepRequired) {
    const err = new Error(
      "Group cannot be required when all fields in the group are optional"
    );
    err.status = 400;
    throw err;
  }
  if (!stepRequired) {
    group.is_required = false;
  }
}

/**
 * Whether the group has any user-provided input (for optional-step validation).
 */
function groupHasAnyInput(fields, group, flatValues) {
  return (fields || []).some((field) => {
    if (!isFieldEffectivelyVisible(group, field, flatValues)) return false;
    return !isEmpty(flatValues[field.field_key]);
  });
}

/**
 * Validate fields in a group per step rules.
 * @returns {string[]} error messages
 */
function validateGroupFields(group, fields, flatValues, { isUpdate = false } = {}) {
  const errors = [];
  const visibleFields = (fields || []).filter((f) =>
    isFieldEffectivelyVisible(group, f, flatValues)
  );

  if (!group.is_visible || visibleFields.length === 0) {
    return errors;
  }

  const stepRequired = isGroupStepRequired(group, fields, flatValues);
  const hasInput = groupHasAnyInput(visibleFields, group, flatValues);

  if (!stepRequired && !hasInput) {
    return errors;
  }

  for (const field of visibleFields) {
    const raw = flatValues[field.field_key];
    const inPayload = field.field_key in flatValues;

    if (isUpdate && !inPayload) continue;

    if (field.is_required && isEmpty(raw)) {
      errors.push(`${field.label || field.field_key} is required`);
      continue;
    }

    if (isEmpty(raw)) continue;
  }

  return errors;
}

function attachEffectiveFlagsToField(group, field, flatValues = {}) {
  const effectiveVisible = isFieldEffectivelyVisible(group, field, flatValues);
  return {
    ...field,
    effective_visible: effectiveVisible,
    effective_required: effectiveVisible && Boolean(field.is_required),
  };
}

function buildGroupPayload(group, fields) {
  const normalized = normalizeGroupRequiredFlag(group, fields);
  const sortedFields = [...(fields || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => attachEffectiveFlagsToField(group, f));

  return {
    group_id: group.group_id,
    group: group.title,
    title: group.title,
    description: group.description,
    sort_order: group.sort_order,
    is_visible: group.is_visible,
    is_required: normalized.is_required,
    is_required_step: normalized.is_required_step,
    is_optional_step: normalized.is_optional_step,
    fields: sortedFields,
  };
}

module.exports = {
  isEmpty,
  isFieldEffectivelyVisible,
  groupHasRequiredVisibleField,
  isGroupStepRequired,
  normalizeGroupRequiredFlag,
  assertValidGroupRequiredState,
  groupHasAnyInput,
  validateGroupFields,
  attachEffectiveFlagsToField,
  buildGroupPayload,
};
