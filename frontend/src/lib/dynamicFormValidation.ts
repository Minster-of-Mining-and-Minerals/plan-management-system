import type { FormField, DynamicFormValues } from "@/redux/types/formField";

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

function validateFile(value: unknown, field: FormField, fileMeta?: File): string[] {
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

export function validateDynamicForm(
  fields: FormField[],
  values: DynamicFormValues,
  fileMetaByKey?: Record<string, File>
): Record<string, string> {
  const errors: Record<string, string> = {};

  const visible = fields
    .filter((f) => f.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const field of visible) {
    const value = values[field.field_key];
    const key = field.field_key;
    const mustHaveValue =
      field.storage_type === "core" ? true : field.is_required;

    if (mustHaveValue && isEmpty(value)) {
      errors[key] = `${field.label} is required`;
      continue;
    }

    if (isEmpty(value)) continue;

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
      case "file":
        fieldErrors = validateFile(value, field, fileMetaByKey?.[key]);
        break;
      case "number":
        if (Number.isNaN(Number(value))) fieldErrors = ["Must be a number"];
        break;
      case "date":
        if (Number.isNaN(Date.parse(String(value)))) {
          fieldErrors = ["Invalid date"];
        }
        break;
    }

    if (fieldErrors.length) {
      errors[key] = fieldErrors[0];
    }
  }

  return errors;
}

export function buildUserPayloadFromDynamicValues(
  fields: FormField[],
  values: DynamicFormValues
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const custom_fields: Record<string, unknown> = {};

  for (const field of fields.filter((f) => f.is_visible)) {
    const value = values[field.field_key];
    if (isEmpty(value)) continue;

    const config = field.config || {};
    const isMulti =
      (field.field_type === "select" && config.multiple) ||
      field.field_type === "checkbox";

    const normalized =
      isMulti && Array.isArray(value) ? value : value;

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

/** Merge core user columns with hybrid custom_fields from API. */
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
