export interface IssueFormFieldOption {
  value: string;
  label: string;
}

export interface IssueFormFieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: IssueFormFieldOption[];
}

export interface IssueStandardFieldRule {
  visible?: boolean;
  required?: boolean;
  allowedTypes?: string[];
}

export interface IssueCategoryFormConfig {
  fields?: IssueFormFieldConfig[];
  standardFields?: Record<string, IssueStandardFieldRule>;
}

export function normalizeFormConfig(
  formConfig?: IssueCategoryFormConfig | null
): Required<IssueCategoryFormConfig> {
  return {
    fields: formConfig?.fields ?? [],
    standardFields: formConfig?.standardFields ?? {},
  };
}

export function isStandardFieldVisible(
  formConfig: IssueCategoryFormConfig | null | undefined,
  fieldKey: string,
  defaultVisible = true
): boolean {
  const rule = normalizeFormConfig(formConfig).standardFields[fieldKey];
  if (!rule) return defaultVisible;
  return rule.visible !== false;
}

export function isStandardFieldRequired(
  formConfig: IssueCategoryFormConfig | null | undefined,
  fieldKey: string,
  defaultRequired = false
): boolean {
  const rule = normalizeFormConfig(formConfig).standardFields[fieldKey];
  if (!rule) return defaultRequired;
  return rule.required === true;
}

export function getAllowedEntityTypes(
  formConfig: IssueCategoryFormConfig | null | undefined,
  fallbackTypes: string[]
): string[] {
  const rule = normalizeFormConfig(formConfig).standardFields.entity_type;
  if (rule?.allowedTypes?.length) return rule.allowedTypes;
  return fallbackTypes;
}

export function validateDynamicFormData(
  formConfig: IssueCategoryFormConfig | null | undefined,
  formData: Record<string, string> = {}
): string | null {
  for (const field of normalizeFormConfig(formConfig).fields) {
    const value = formData[field.key];
    if (field.required && (!value || !value.trim())) {
      return `${field.label} is required`;
    }
  }
  return null;
}

export function getTopLevelCategories(categories: Array<{ parent_category_id?: string | null }>) {
  return categories.filter((c) => !c.parent_category_id);
}

export function getSubCategories(
  categories: Array<{ parent_category_id?: string | null; is_selectable?: boolean }>,
  parentCategoryId: string
) {
  return categories.filter(
    (c) => c.parent_category_id === parentCategoryId && c.is_selectable !== false
  );
}
