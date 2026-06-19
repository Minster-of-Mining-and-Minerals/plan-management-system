export type FormConfigFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "EMAIL"
  | "PHONE"
  | "DATE"
  | "DATETIME"
  | "TIME"
  | "SELECT"
  | "MULTI_SELECT"
  | "RADIO"
  | "CHECKBOX"
  | "BOOLEAN"
  | "FILE"
  | "IMAGE"
  | "ATTACHMENT"
  | "URL"
  | "PASSWORD";

export interface FormConfigFieldOption {
  label: string;
  value: string;
}

export interface FormConfigValidationRules {
  min_length?: number;
  max_length?: number;
  min?: number;
  max?: number;
  regex?: string;
  allowed_extensions?: string[];
  max_file_size?: number;
  multiple_files?: boolean;
}

export interface FormConfigField {
  form_config_field_id: string;
  form_config_container_id: string;
  label: string;
  field_key: string;
  placeholder?: string | null;
  help_text?: string | null;
  field_type: FormConfigFieldType;
  required: boolean;
  is_active: boolean;
  display_order: number;
  default_value?: string | null;
  validation_rules?: FormConfigValidationRules;
  options?: FormConfigFieldOption[];
  created_at?: string;
  updated_at?: string;
}

export interface FormConfigContainer {
  form_config_container_id: string;
  issue_category_id?: string | null;
  name: string;
  code: string;
  description?: string | null;
  version_number: number;
  is_active: boolean;
  is_published: boolean;
  display_order: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  fields?: FormConfigField[];
  issueCategory?: { issue_category_id: string; name: string; code?: string | null } | null;
}

export interface PublishedFormByCategoryResponse {
  container: FormConfigContainer;
  fields: FormConfigField[];
}

export interface IssueFormResponse {
  issue_form_response_id: string;
  issue_id: string;
  form_config_field_id: string;
  value_text?: string | null;
  value_json?: Record<string, unknown> | null;
  created_at: string;
  field?: FormConfigField;
}

export type DynamicFormResponses = Record<string, unknown>;

export interface CreateFormConfigContainerPayload {
  issue_category_id: string;
  name: string;
  code: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateFormConfigContainerPayload {
  issue_category_id?: string;
  name?: string;
  code?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface CreateFormConfigFieldPayload {
  label: string;
  field_key?: string;
  placeholder?: string;
  help_text?: string;
  field_type?: FormConfigFieldType;
  required?: boolean;
  is_active?: boolean;
  display_order?: number;
  default_value?: string;
  validation_rules?: FormConfigValidationRules;
  options?: FormConfigFieldOption[];
}

export interface UpdateFormConfigFieldPayload extends Partial<CreateFormConfigFieldPayload> {}

export const FORM_CONFIG_FIELD_TYPE_LABELS: Record<FormConfigFieldType, string> = {
  TEXT: "Short Text",
  TEXTAREA: "Long Text",
  NUMBER: "Number",
  EMAIL: "Email",
  PHONE: "Phone",
  DATE: "Date",
  DATETIME: "Date & Time",
  TIME: "Time",
  SELECT: "Dropdown",
  MULTI_SELECT: "Multi Select",
  RADIO: "Radio",
  CHECKBOX: "Checkbox Group",
  BOOLEAN: "Yes / No",
  FILE: "File Upload",
  IMAGE: "Image Upload",
  ATTACHMENT: "Attachment",
  URL: "URL",
  PASSWORD: "Password",
};

export const FORM_CONFIG_FIELD_TYPES = Object.keys(
  FORM_CONFIG_FIELD_TYPE_LABELS
) as FormConfigFieldType[];
