import type { FormField, FormFieldConfig, DynamicFormValues } from "@/redux/types/formField";

export type VisibilityOperator =
  | "eq"
  | "neq"
  | "in"
  | "truthy"
  | "falsy"
  | "empty"
  | "not_empty";

export type VisibilityRule = NonNullable<FormFieldConfig["visible_when"]>;

function normalizeScalar(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function evaluateVisibilityRule(
  fieldValue: unknown,
  rule: VisibilityRule
): boolean {
  const { operator, value: expected } = rule;

  switch (operator) {
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

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function isFieldVisibleByRules(
  field: FormField,
  values: DynamicFormValues
): boolean {
  const rule = field.config?.visible_when;
  if (!rule?.field_key) return true;
  return evaluateVisibilityRule(values[rule.field_key], rule);
}
