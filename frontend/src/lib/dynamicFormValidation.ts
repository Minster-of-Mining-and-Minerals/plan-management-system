import type {
  FormField,
  FormFieldStepGroup,
  DynamicFormValues,
  UserFormConfigGrouped,
} from "@/redux/types/formField";
import { getVisibleSteps, flattenFormFields } from "@/redux/types/formField";
import {
  isFieldEffectivelyVisible,
  isGroupStepRequired,
  groupHasAnyInput,
  getVisibleFieldsInGroup,
} from "@/lib/formFieldRules";
import { isFieldVisibleByRules } from "@/lib/formConditionUtils";

const ETHIOPIAN_PHONE_REGEX = /^(\+251|0)(9|7)\d{8}$/;

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function validateInput(value: unknown, field: FormField): string[] {
  const errors: string[] = [];
  const config = field.config || {};
  const str = String(value ?? "");

  if (config.min_length != null && str.length < config.min_length) {
    errors.push(`Must be at least ${config.min_length} characters`);
  }
  if (config.max_length != null && str.length > config.max_length) {
    errors.push(`Must be at most ${config.max_length} characters`);
  }
  if (config.pattern === "email" && str) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      errors.push("Invalid email address");
    }
  }
  if (config.pattern === "phone" && str && !ETHIOPIAN_PHONE_REGEX.test(str)) {
    errors.push("Invalid Ethiopian phone number");
  }

  return errors;
}

function validateSelect(value: unknown, field: FormField): string[] {
  const config = field.config || {};
  const options = config.options || [];
  const multiple = Boolean(config.multiple);
  const errors: string[] = [];

  if (multiple) {
    const arr = Array.isArray(value) ? value : [];
    arr.forEach((v) => {
      if (!options.includes(String(v))) errors.push(`Invalid option: ${v}`);
    });
  } else {
    const v = Array.isArray(value) ? value[0] : value;
    if (v != null && v !== "" && !options.includes(String(v))) {
      errors.push(`Invalid option: ${v}`);
    }
  }

  return errors;
}

function validateCheckbox(value: unknown, field: FormField): string[] {
  const config = field.config || {};
  const options = config.options || [];
  const max = config.max_selected;
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const errors: string[] = [];

  selected.forEach((v) => {
    if (!options.includes(String(v))) errors.push(`Invalid option: ${v}`);
  });
  if (max != null && selected.length > max) {
    errors.push(`Select at most ${max} option(s)`);
  }

  return errors;
}

function validateCanvasAnnotation(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") {
    errors.push("Canvas annotation data is required");
    return errors;
  }
  const v = value as { canvas_data?: { annotations?: { objects?: unknown[] } } };
  if (!v.canvas_data) {
    errors.push("Canvas data is missing");
  } else if (!Array.isArray(v.canvas_data.annotations?.objects)) {
    errors.push("Invalid annotation structure");
  }
  return errors;
}

function validateFile(
  value: unknown,
  field: FormField,
  fileMeta?: File
): string[] {
  const config = field.config || {};
  const errors: string[] = [];

  if (fileMeta && config.max_size_mb) {
    const maxBytes = config.max_size_mb * 1024 * 1024;
    if (fileMeta.size > maxBytes) {
      errors.push(`File must be under ${config.max_size_mb} MB`);
    }
  }

  const allowed = (config.allowed_types || []).map((t) =>
    t.toLowerCase().replace(/^\./, "")
  );
  if (fileMeta && allowed.length > 0) {
    const ext = fileMeta.name.split(".").pop()?.toLowerCase();
    if (ext && !allowed.includes(ext)) {
      errors.push(`Allowed types: ${allowed.join(", ")}`);
    }
  }

  return errors;
}

function validateRepeater(value: unknown, field: FormField): string[] {
  const config = field.config?.repeater;
  const label = field.label || field.field_key;
  const errors: string[] = [];
  if (!config?.fields?.length) return errors;

  const rows = Array.isArray(value) ? value : [];
  if (field.is_required && rows.length === 0) {
    return [`${label} requires at least one row`];
  }
  if (config.min_rows != null && rows.length < config.min_rows) {
    errors.push(`${label} requires at least ${config.min_rows} row(s)`);
  }
  if (config.max_rows != null && rows.length > config.max_rows) {
    errors.push(`${label} allows at most ${config.max_rows} row(s)`);
  }

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      errors.push(`Row ${index + 1} is invalid`);
      return;
    }
    for (const sub of config.fields) {
      const subVal = (row as Record<string, unknown>)[sub.field_key];
      if (isEmpty(subVal)) continue;
      if (sub.field_type === "number" && Number.isNaN(Number(subVal))) {
        errors.push(`Row ${index + 1}: ${sub.label} must be a number`);
      }
      if (sub.field_type === "select") {
        const opts = sub.config?.options || [];
        if (!opts.includes(String(subVal))) {
          errors.push(`Row ${index + 1}: invalid ${sub.label}`);
        }
      }
    }
  });

  return errors;
}

function validateSingleField(
  field: FormField,
  value: unknown,
  fileMeta?: File
): string | null {
  const mustHaveValue =
    field.storage_type === "core" ? true : field.is_required;

  if (field.field_type === "canvas_annotation") {
    if (mustHaveValue && isEmpty(value)) {
      return `${field.label} is required`;
    }
    if (isEmpty(value)) return null;
    const canvasErrors = validateCanvasAnnotation(value);
    return canvasErrors.length ? canvasErrors[0] : null;
  }

  if (field.field_type === "file") {
    if (mustHaveValue && isEmpty(value) && !fileMeta) {
      return `${field.label} is required`;
    }
    if (isEmpty(value) && !fileMeta) return null;
    const fileErrors = validateFile(value, field, fileMeta);
    return fileErrors.length ? fileErrors[0] : null;
  }

  if (mustHaveValue && isEmpty(value)) {
    return `${field.label} is required`;
  }

  if (isEmpty(value)) return null;

  let fieldErrors: string[] = [];

  switch (field.field_type) {
    case "input":
    case "textarea":
      fieldErrors = validateInput(value, field);
      break;
    case "select":
      fieldErrors = validateSelect(value, field);
      break;
    case "checkbox":
      fieldErrors = validateCheckbox(value, field);
      break;
    case "number":
      if (Number.isNaN(Number(value))) fieldErrors = ["Must be a number"];
      break;
    case "date":
      if (Number.isNaN(Date.parse(String(value)))) {
        fieldErrors = ["Invalid date"];
      }
      break;
    case "time":
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(String(value))) {
        fieldErrors = ["Invalid time"];
      }
      break;
    case "radio":
      fieldErrors = validateSelect(value, field);
      break;
    case "switch":
      break;
    case "richtext":
      fieldErrors = validateInput(value, field);
      break;
    case "repeater":
      fieldErrors = validateRepeater(value, field);
      break;
    case "canvas_annotation":
      fieldErrors = validateCanvasAnnotation(value);
      break;
  }

  return fieldErrors.length ? fieldErrors[0] : null;
}

/** True when the step has no validation errors (required fields satisfied). */
export function isFormStepComplete(
  group: FormFieldStepGroup,
  values: DynamicFormValues,
  fileMetaByKey?: Record<string, File>
): boolean {
  return Object.keys(validateFormStep(group, values, fileMetaByKey)).length === 0;
}

/** Validate one wizard step (group). */
export function validateFormStep(
  group: FormFieldStepGroup,
  values: DynamicFormValues,
  fileMetaByKey?: Record<string, File>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const visibleFields = getVisibleFieldsInGroup(group, values);
  const stepRequired = isGroupStepRequired(group, values);
  const hasInput = groupHasAnyInput(group, values);

  if (!stepRequired && !hasInput) {
    return errors;
  }

  for (const field of visibleFields) {
    const err = validateSingleField(
      field,
      values[field.field_key],
      fileMetaByKey?.[field.field_key]
    );
    if (err) errors[field.field_key] = err;
  }

  return errors;
}

export function validateDynamicForm(
  fields: FormField[],
  values: DynamicFormValues,
  fileMetaByKey?: Record<string, File>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields.filter((f) => f.is_visible && isFieldVisibleByRules(f, values))) {
    const err = validateSingleField(
      field,
      values[field.field_key],
      fileMetaByKey?.[field.field_key]
    );
    if (err) errors[field.field_key] = err;
  }

  return errors;
}

export function validateAllFormSteps(
  config: UserFormConfigGrouped | undefined,
  values: DynamicFormValues,
  fileMetaByKey?: Record<string, File>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const steps = getVisibleSteps(config);

  for (const step of steps) {
    const stepErrors = validateFormStep(step, values, fileMetaByKey);
    Object.assign(errors, stepErrors);
  }

  return errors;
}

export function buildUserPayloadFromDynamicValues(
  fields: FormField[],
  values: DynamicFormValues
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const custom_fields: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.field_key];
    if (isEmpty(value)) continue;

    const config = field.config || {};
    const isMulti =
      (field.field_type === "select" && config.multiple) ||
      field.field_type === "checkbox" ||
      field.field_type === "repeater";

    const normalized = isMulti && Array.isArray(value) ? value : value;

    if (field.storage_type === "core") {
      payload[field.field_key] = normalized;
      if (field.field_key === "email") {
        payload.email = String(normalized).trim().toLowerCase();
      }
    } else {
      custom_fields[field.field_key] = normalized;
      payload[field.field_key] = normalized;
    }
  }

  if (Object.keys(custom_fields).length > 0) {
    payload.custom_fields = custom_fields;
  }

  return payload;
}

export function initialValuesFromUser(
  fields: FormField[],
  user: Record<string, unknown>
): DynamicFormValues {
  const values: DynamicFormValues = {};
  const custom =
    (user.custom_fields as Record<string, unknown> | undefined) || {};

  for (const field of fields) {
    const raw =
      field.storage_type === "custom"
        ? custom[field.field_key]
        : user[field.field_key];
    values[field.field_key] = parseDynamicValueFromUser(field, raw);
  }

  return values;
}

export function parseDynamicValueFromUser(
  field: FormField,
  raw: unknown
): unknown {
  if (raw == null) return raw;

  const config = field.config || {};
  const isMulti =
    (field.field_type === "select" && config.multiple) ||
    field.field_type === "checkbox";

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

export { flattenFormFields };
