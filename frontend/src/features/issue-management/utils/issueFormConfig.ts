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

export const ISSUE_STANDARD_FIELD_DEFINITIONS = [
  {
    key: "description",
    label: "Description",
    defaultVisible: true,
    defaultRequired: true,
  },
  {
    key: "justification",
    label: "Justification",
    defaultVisible: true,
    defaultRequired: true,
  },
  {
    key: "current_value",
    label: "Current Value",
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    key: "suggested_value",
    label: "Suggested Value",
    defaultVisible: true,
    defaultRequired: false,
  },
  {
    key: "entity_type",
    label: "Affected Entity Type",
    defaultVisible: true,
    defaultRequired: true,
    supportsAllowedTypes: true,
  },
  {
    key: "entity_id",
    label: "Affected Entity ID",
    defaultVisible: true,
    defaultRequired: true,
  },
  {
    key: "attachment_path",
    label: "Attachment Path",
    defaultVisible: true,
    defaultRequired: false,
  },
] as const;

export const ISSUE_ENTITY_TYPE_OPTIONS = [
  "plan_version",
  "strategic",
  "objective",
  "goal",
  "kpi",
  "activity",
  "task",
  "initiative",
  "budget",
  "target",
] as const;

export function createEmptyFormConfig(): IssueCategoryFormConfig {
  return { fields: [], standardFields: {} };
}

export function slugifyFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function validateFormConfigBuilder(config: IssueCategoryFormConfig): string | null {
  const normalized = normalizeFormConfig(config);
  const keys = new Set<string>();

  for (const field of normalized.fields) {
    if (!field.key?.trim()) return "Each custom field needs a field key";
    if (!field.label?.trim()) return "Each custom field needs a label";
    if (keys.has(field.key)) return `Duplicate custom field key: ${field.key}`;
    keys.add(field.key);

    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      return `Select field "${field.label}" needs at least one option`;
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
