export type IssueStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "resolved"
  | "closed";

export type IssueEntityType =
  | "plan_version"
  | "strategic"
  | "objective"
  | "goal"
  | "kpi"
  | "activity"
  | "task"
  | "initiative"
  | "budget"
  | "target";

export interface IssueFormResponseRef {
  issue_form_response_id: string;
  form_config_field_id: string;
  value_text?: string | null;
  value_json?: Record<string, unknown> | null;
  field?: {
    form_config_field_id: string;
    label: string;
    field_key: string;
    field_type: string;
    placeholder?: string | null;
    help_text?: string | null;
    options?: { label: string; value: string }[];
    display_order?: number;
  };
}

export interface IssueCategoryFormConfig {
  fields?: IssueFormFieldConfig[];
  standardFields?: Record<string, IssueStandardFieldRule>;
}

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
  allowedTypes?: IssueEntityType[];
}

export interface IssueCategoryFormConfigContainerRef {
  form_config_container_id: string;
  name: string;
  code: string;
  is_published: boolean;
  is_active: boolean;
  fields?: { form_config_field_id: string; is_active: boolean }[];
}

export interface IssueCategory {
  issue_category_id: string;
  code?: string | null;
  name: string;
  description: string | null;
  display_order: number;
  is_selectable?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  formConfigContainers?: IssueCategoryFormConfigContainerRef[];
}

export interface IssuePriority {
  issue_priority_id: string;
  code: string;
  label: string;
  display_order: number;
  color_hex: string | null;
  is_active: boolean;
}

export interface IssueUserRef {
  user_id: string;
  full_name: string;
  email: string;
}

export interface IssueAttachmentRef {
  attachment_id: string;
  file_name: string;
  file_path: string;
  mime_type?: string;
}

export interface Issue {
  issue_id: string;
  issue_number: string;
  title: string;
  description: string;
  issue_category_id: string;
  issue_priority_id: string | null;
  form_config_container_id: string | null;
  status: IssueStatus;
  raised_by: string;
  assigned_to: string | null;
  entity_type: IssueEntityType | null;
  entity_id: string | null;
  review_snapshot_id?: string | null;
  current_value: string | null;
  suggested_value: string | null;
  form_data?: Record<string, string> | null;
  formResponses?: IssueFormResponseRef[];
  justification: string | null;
  response: string | null;
  rejection_reason: string | null;
  resolution_notes: string | null;
  attachment_path: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  category?: IssueCategory;
  formConfigContainer?: { form_config_container_id: string; name: string; code: string };
  priority?: IssuePriority;
  raiser?: IssueUserRef;
  assignee?: IssueUserRef;
  attachments?: IssueAttachmentRef[];
}

export interface IssueHistoryEntry {
  issue_history_id: string;
  issue_id: string;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  performer?: IssueUserRef | null;
}

export interface IssueDashboardStats {
  total: number;
  submitted: number;
  under_review: number;
  accepted: number;
  rejected: number;
  resolved: number;
  closed: number;
}

export interface IssueListResponse {
  data: Issue[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetIssuesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: IssueStatus;
  issue_category_id?: string;
  issue_priority_id?: string;
  raised_by?: string;
  assigned_to?: string;
  entity_type?: IssueEntityType;
  entity_id?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "ASC" | "DESC";
}

export interface CreateIssuePayload {
  issue_category_id: string;
  form_config_container_id: string;
  issue_priority_id: string;
  form_responses: Record<string, unknown>;
  entity_type?: IssueEntityType;
  entity_id?: string;
  assigned_to?: string | null;
  attachment_ids?: string[];
}

export interface UpdateIssuePayload {
  issue_category_id?: string;
  issue_priority_id?: string;
  title?: string;
  entity_type?: IssueEntityType;
  entity_id?: string;
  current_value?: string;
  suggested_value?: string;
  description?: string;
  justification?: string;
  attachment_path?: string;
  assigned_to?: string | null;
}

export interface CreateIssueCategoryPayload {
  code?: string | null;
  name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateIssueCategoryPayload {
  code?: string | null;
  name?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  resolved: "Resolved",
  closed: "Closed",
};

export const ISSUE_ENTITY_TYPE_LABELS: Record<IssueEntityType, string> = {
  plan_version: "Plan",
  strategic: "Strategic Objective",
  objective: "Objective",
  goal: "Objective",
  kpi: "KPI",
  activity: "Activity",
  task: "Activity",
  initiative: "Initiative",
  budget: "Budget Item",
  target: "Target",
};
