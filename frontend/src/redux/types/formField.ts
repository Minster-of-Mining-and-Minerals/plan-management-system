export type FormFieldType =
  | "input"
  | "textarea"
  | "select"
  | "file"
  | "checkbox"
  | "radio"
  | "date"
  | "time"
  | "number"
  | "richtext"
  | "switch"
  | "canvas_annotation";

export type FormFieldStorageType = "core" | "custom";

export interface FormFieldConfig {
  options?: string[];
  multiple?: boolean;
  max_selected?: number;
  min_length?: number;
  max_length?: number;
  pattern?: "email" | "text" | "phone";
  placeholder?: string;
  default_value?: string | number | boolean;
  allowed_types?: string[];
  max_size_mb?: number;
  description?: string;
  canvas_source_type?: "library" | "custom";
  diagram_id?: string;
  custom_image_url?: string;
  /** Enable smart clinical text suggestions (default: on for text fields). */
  clinical_suggestions?: boolean;
  suggestion_category?:
    | "diagnosis"
    | "assessment"
    | "plan"
    | "prescription"
    | "referral"
    | "procedure"
    | "certificate"
    | "general";
}

export interface FormField {
  field_id: string;
  model_name: string;
  group_id?: string;
  field_key: string;
  label: string;
  field_type: FormFieldType;
  storage_type: FormFieldStorageType;
  category: string;
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
  config: FormFieldConfig;
  effective_visible?: boolean;
  effective_required?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FormFieldStepGroup {
  group_id: string;
  group: string;
  title: string;
  description?: string | null;
  sort_order: number;
  is_visible: boolean;
  is_required: boolean;
  is_required_step: boolean;
  is_optional_step: boolean;
  fields: FormField[];
}

export interface FormFieldCategoryGroup {
  category: string;
  fields: FormField[];
}

export interface UserFormConfigGrouped {
  groups: FormFieldStepGroup[];
  steps: FormFieldStepGroup[];
  core_fields: FormField[];
  categories?: FormFieldCategoryGroup[];
  fields: FormField[];
}

export const CORE_USER_FIELD_KEYS = ["full_name", "email", "phone_number"] as const;

export const DEFAULT_FIELD_CATEGORIES = [
  "Account",
  "Personal Information",
  "Demographics",
  "Emergency Contacts",
  "Insurance Information",
  "Medical Information",
  "Address Information",
  "Guardian Information",
  "General",
] as const;

export function getVisibleSteps(
  config: UserFormConfigGrouped | undefined
): FormFieldStepGroup[] {
  if (!config) return [];
  return (config.steps || config.groups || []).filter((g) => g.is_visible);
}

export function flattenFormFields(
  config: UserFormConfigGrouped | FormField[] | undefined
): FormField[] {
  if (!config) return [];
  if (Array.isArray(config)) return config;
  if (config.fields?.length) return config.fields;
  const groups = config.groups || config.steps || [];
  if (groups.length) return groups.flatMap((g) => g.fields);
  return [
    ...(config.core_fields || []),
    ...(config.categories || []).flatMap((c) => c.fields),
  ];
}

export function hasCoreFormFields(
  config: UserFormConfigGrouped | FormField[] | undefined
): boolean {
  const fields = flattenFormFields(config);
  const hasField = (key: string, requireRequired: boolean) =>
    fields.some(
      (f) =>
        f.field_key === key &&
        f.storage_type === "core" &&
        f.is_visible &&
        (!requireRequired || f.is_required)
    );

  return (
    hasField("full_name", true) &&
    hasField("phone_number", true) &&
    hasField("email", false)
  );
}

export function hasConfiguredFormFields(
  config: UserFormConfigGrouped | FormField[] | undefined
): boolean {
  return hasCoreFormFields(config);
}

export interface CreateFormFieldPayload {
  model_name?: string;
  group_id: string;
  field_key: string;
  label: string;
  field_type: FormFieldType;
  storage_type?: FormFieldStorageType;
  category?: string;
  is_required?: boolean;
  is_visible?: boolean;
  sort_order?: number;
  config?: FormFieldConfig;
}

export interface UpdateFormFieldPayload {
  field_key?: string;
  group_id?: string;
  label?: string;
  field_type?: FormFieldType;
  storage_type?: FormFieldStorageType;
  category?: string;
  is_required?: boolean;
  is_visible?: boolean;
  sort_order?: number;
  config?: FormFieldConfig;
}

export interface ReorderFormFieldsPayload {
  model_name?: string;
  field_ids: string[];
}

export type DynamicFormValues = Record<string, unknown>;
