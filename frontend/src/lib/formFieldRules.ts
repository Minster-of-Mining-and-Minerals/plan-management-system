import type { FormField, FormFieldStepGroup, DynamicFormValues } from "@/redux/types/formField";

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function isFieldEffectivelyVisible(
  group: FormFieldStepGroup,
  field: FormField
): boolean {
  if (!group.is_visible) return false;
  return Boolean(field.is_visible);
}

export function groupHasRequiredVisibleField(
  group: FormFieldStepGroup
): boolean {
  return (group.fields || []).some(
    (f) => isFieldEffectivelyVisible(group, f) && f.is_required
  );
}

export function isGroupStepRequired(group: FormFieldStepGroup): boolean {
  return group.is_required_step ?? groupHasRequiredVisibleField(group);
}

export function groupHasAnyInput(
  group: FormFieldStepGroup,
  values: DynamicFormValues
): boolean {
  return (group.fields || []).some((field) => {
    if (!isFieldEffectivelyVisible(group, field)) return false;
    return !isEmpty(values[field.field_key]);
  });
}

export function getVisibleFieldsInGroup(group: FormFieldStepGroup): FormField[] {
  return (group.fields || [])
    .filter((f) => isFieldEffectivelyVisible(group, f))
    .sort((a, b) => a.sort_order - b.sort_order);
}
