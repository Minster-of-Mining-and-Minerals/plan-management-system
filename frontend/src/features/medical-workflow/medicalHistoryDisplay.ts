import { formatPatientFieldValue } from "@/lib/patientDisplay";
import { isFieldEffectivelyVisible } from "@/lib/formFieldRules";
import {
  flattenFormFields,
  getVisibleSteps,
  type FormField,
  type UserFormConfigGrouped,
} from "@/redux/types/formField";

export type LogDisplayField = {
  key: string;
  label: string;
  displayValue: string;
  fieldType?: string;
  multiline?: boolean;
};

export type LogDisplaySection = {
  title: string;
  description?: string | null;
  fields: LogDisplayField[];
};

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isEmpty(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function fieldFromSchema(
  field: FormField,
  formData: Record<string, unknown>
): LogDisplayField | null {
  if (field.field_type === "file") return null;
  if (field.field_type === "canvas_annotation") return null;
  if (!(field.field_key in formData)) return null;
  const value = formData[field.field_key];
  if (isEmpty(value)) return null;

  return {
    key: field.field_key,
    label: field.label || humanizeKey(field.field_key),
    displayValue: formatPatientFieldValue(field, value),
    fieldType: field.field_type,
    multiline:
      field.field_type === "textarea" ||
      (typeof value === "string" && value.length > 120),
  };
}

export function buildLogDisplaySections(
  formSchema: UserFormConfigGrouped | null | undefined,
  formData: Record<string, unknown> | undefined
): LogDisplaySection[] {
  const data = formData || {};
  const sections: LogDisplaySection[] = [];

  if (formSchema) {
    const steps = getVisibleSteps(formSchema);
    for (const step of steps) {
      const fields: LogDisplayField[] = [];
      for (const field of step.fields || []) {
        if (!isFieldEffectivelyVisible(step, field)) continue;
        const row = fieldFromSchema(field, data);
        if (row) fields.push(row);
      }
      if (fields.length) {
        sections.push({
          title: step.title,
          description: step.description,
          fields,
        });
      }
    }

    const knownKeys = new Set(flattenFormFields(formSchema).map((f) => f.field_key));
    const extra: LogDisplayField[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (knownKeys.has(key) || isEmpty(value)) continue;
      extra.push({
        key,
        label: humanizeKey(key),
        displayValue: formatPatientFieldValue(undefined, value),
        multiline: typeof value === "string" && value.length > 120,
      });
    }
    if (extra.length) {
      sections.push({ title: "Additional data", fields: extra });
    }

    return sections;
  }

  const fallbackFields = Object.entries(data)
    .filter(([, v]) => !isEmpty(v))
    .map(([key, value]) => ({
      key,
      label: humanizeKey(key),
      displayValue: formatPatientFieldValue(undefined, value),
      multiline: typeof value === "string" && value.length > 120,
    }));

  if (fallbackFields.length) {
    sections.push({ title: "Submitted data", fields: fallbackFields });
  }

  return sections;
}
