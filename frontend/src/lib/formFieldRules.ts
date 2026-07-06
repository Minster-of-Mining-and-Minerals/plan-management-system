import type { FormField, FormFieldStepGroup, DynamicFormValues } from "@/redux/types/formField";
import { isFieldVisibleByRules } from "@/lib/formConditionUtils";

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function isFieldEffectivelyVisible(
  group: FormFieldStepGroup,
  field: FormField,
  values: DynamicFormValues = {}
): boolean {
  if (!group.is_visible) return false;
  if (!field.is_visible) return false;
  return isFieldVisibleByRules(field, values);
}

export function groupHasRequiredVisibleField(
  group: FormFieldStepGroup,
  values: DynamicFormValues = {}
): boolean {
  return (group.fields || []).some(
    (f) => isFieldEffectivelyVisible(group, f, values) && f.is_required
  );
}

export function isGroupStepRequired(
  group: FormFieldStepGroup,
  values: DynamicFormValues = {}
): boolean {
  return group.is_required_step ?? groupHasRequiredVisibleField(group, values);
}

export function groupHasAnyInput(
  group: FormFieldStepGroup,
  values: DynamicFormValues
): boolean {
  return (group.fields || []).some((field) => {
    if (!isFieldEffectivelyVisible(group, field, values)) return false;
    return !isEmpty(values[field.field_key]);
  });
}

export function getVisibleFieldsInGroup(
  group: FormFieldStepGroup,
  values: DynamicFormValues = {}
): FormField[] {
  return (group.fields || [])
    .filter((f) => isFieldEffectivelyVisible(group, f, values))
    .sort((a, b) => a.sort_order - b.sort_order);
}
