export interface FormFieldGroup {
  group_id: string;
  group: string;
  title: string;
  description?: string | null;
  sort_order: number;
  is_visible: boolean;
  is_required: boolean;
  is_required_step: boolean;
  is_optional_step?: boolean;
  fields: import("./formField").FormField[];
}

export interface CreateFormFieldGroupPayload {
  model_name?: string;
  title: string;
  description?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  is_required?: boolean;
}

export interface UpdateFormFieldGroupPayload {
  title?: string;
  description?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  is_required?: boolean;
}

export interface ReorderFormFieldGroupsPayload {
  model_name?: string;
  group_ids: string[];
}
