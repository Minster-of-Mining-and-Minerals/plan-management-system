export type FormFieldType =
  | "input"
  | "textarea"
  | "select"
  | "file"
  | "checkbox"
  | "date"
  | "number";

export type FormFieldStorageType = "core" | "custom";

export interface FormFieldConfig {
  options?: string[];
  multiple?: boolean;
  max_selected?: number;
  min_length?: number;
  max_length?: number;
  pattern?: "email" | "text" | "phone";
  allowed_types?: string[];
  max_size_mb?: number;
}

export interface FormField {
  field_id: string;
  model_name: string;
  field_key: string;
  label: string;
  field_type: FormFieldType;
  storage_type: FormFieldStorageType;
  category: string;
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
  config: FormFieldConfig;
  created_at?: string;
  updated_at?: string;
}

export interface FormFieldCategoryGroup {
  category: string;
  fields: FormField[];
}

export interface UserFormConfigGrouped {
  core_fields: FormField[];
  categories: FormFieldCategoryGroup[];
  fields: FormField[];
}

export const CORE_USER_FIELD_KEYS = ["full_name", "email", "phone_number"] as const;

export const DEFAULT_FIELD_CATEGORIES = [
  "Account",
  "Demographics",
  "Emergency Contact",
  "Medical",
  "Insurance",
  "General",
] as const;

export function flattenFormFields(
  config: UserFormConfigGrouped | FormField[] | undefined
): FormField[] {
  if (!config) return [];
  if (Array.isArray(config)) return config;
  if (config.fields?.length) return config.fields;
  return [
    ...(config.core_fields || []),
    ...(config.categories || []).flatMap((c) => c.fields),
  ];
}

export function hasCoreFormFields(
  config: UserFormConfigGrouped | FormField[] | undefined
): boolean {
  const fields = flattenFormFields(config);
  return CORE_USER_FIELD_KEYS.every((key) =>
    fields.some(
      (f) =>
        f.field_key === key &&
        f.storage_type === "core" &&
        f.is_visible &&
        f.is_required
    )
  );
}

/** True when required core fields exist (custom fields are optional). */
export function hasConfiguredFormFields(
  config: UserFormConfigGrouped | FormField[] | undefined
): boolean {
  return hasCoreFormFields(config);
}

export interface CreateFormFieldPayload {
  model_name?: string;
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
