import { IssueCategory, IssuePriority, IssueUserRef, IssueAttachmentRef } from "./issue";

export type RegionalIssueStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "resolved"
  | "closed";

export type RegionalEscalationStatus =
  | "none"
  | "escalated"
  | "under_federal_review"
  | "clarification_requested"
  | "assistance_provided"
  | "returned"
  | "closed";

export interface RegionalStructureRef {
  regional_structure_id: string;
  name: string;
  level?: number;
}

export interface RegionalIssueHistory {
  history_id: string;
  regional_issue_id: string;
  action_type: string;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  performed_by: string;
  notes?: string | null;
  created_at: string;
  performer?: IssueUserRef;
}

export interface RegionalIssueComment {
  comment_id: string;
  regional_issue_id: string;
  user_id: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  author?: IssueUserRef;
}

export interface RegionalIssue {
  regional_issue_id: string;
  region_id: string;
  regional_structure_id?: string | null;
  issue_number: string;
  title: string;
  description: string;
  issue_category_id?: string | null;
  issue_priority_id?: string | null;
  form_config_container_id?: string | null;
  status: RegionalIssueStatus;
  escalation_status: RegionalEscalationStatus;
  raised_by: string;
  assigned_to?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  current_value?: string | null;
  suggested_value?: string | null;
  form_data?: Record<string, unknown>;
  justification?: string | null;
  response?: string | null;
  rejection_reason?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  region?: { region_id: string; name: string; code?: string };
  category?: IssueCategory;
  priority?: IssuePriority;
  regionalStructure?: RegionalStructureRef;
  raiser?: IssueUserRef;
  assignee?: IssueUserRef;
  histories?: RegionalIssueHistory[];
  comments?: RegionalIssueComment[];
  attachments?: IssueAttachmentRef[];
  escalation?: RegionalIssueEscalationRef;
}

export interface RegionalIssueEscalationRef {
  escalation_id: string;
  escalation_number: string;
  escalation_status: RegionalEscalationStatus;
  assistance_type: string;
  escalated_at: string;
  requested_assistance?: string;
  federal_response_summary?: string;
}

export interface RegionalIssueDashboardStats {
  total: number;
  submitted: number;
  under_review: number;
  accepted: number;
  rejected: number;
  resolved: number;
  closed: number;
  escalated_count: number;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
}

export interface RegionalIssueListResponse {
  data: RegionalIssue[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetRegionalIssuesParams {
  regionId: string;
  page?: number;
  limit?: number;
  status?: RegionalIssueStatus;
  escalation_status?: RegionalEscalationStatus;
  priority_id?: string;
  category_id?: string;
  assigned_to?: string;
  raised_by?: string;
  regional_structure_id?: string;
  search?: string;
}

export interface CreateRegionalIssuePayload {
  regionId: string;
  title: string;
  description: string;
  issue_category_id?: string;
  issue_priority_id?: string;
  regional_structure_id?: string;
  entity_type?: string;
  entity_id?: string;
  form_data?: Record<string, unknown>;
  justification?: string;
  attachment_ids?: string[];
}

export interface UpdateRegionalIssuePayload {
  regionId: string;
  issueId: string;
  title?: string;
  description?: string;
  issue_category_id?: string;
  issue_priority_id?: string;
  regional_structure_id?: string;
  justification?: string;
  form_data?: Record<string, unknown>;
}
