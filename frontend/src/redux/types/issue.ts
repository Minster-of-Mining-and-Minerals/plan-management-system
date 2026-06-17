export type IssueStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "resolved"
  | "closed";

export type IssueEntityType =
  | "objective"
  | "kpi"
  | "activity"
  | "initiative"
  | "budget"
  | "target";

export interface IssueCategory {
  issue_category_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  issue_priority_id: string;
  status: IssueStatus;
  raised_by: string;
  assigned_to: string | null;
  entity_type: IssueEntityType;
  entity_id: string;
  current_value: string | null;
  suggested_value: string | null;
  justification: string;
  response: string | null;
  rejection_reason: string | null;
  resolution_notes: string | null;
  attachment_path: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  category?: IssueCategory;
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
  issue_priority_id: string;
  title: string;
  entity_type: IssueEntityType;
  entity_id: string;
  current_value?: string;
  suggested_value?: string;
  description: string;
  justification: string;
  attachment_path?: string;
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
  name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateIssueCategoryPayload {
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
  objective: "Objective",
  kpi: "KPI",
  activity: "Activity",
  initiative: "Initiative",
  budget: "Budget",
  target: "Target",
};
