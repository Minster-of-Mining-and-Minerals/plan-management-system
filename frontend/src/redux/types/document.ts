export type DocumentFileType = "docx" | "xlsx" | "pptx" | "pdf";
export type DocumentStatus = "draft" | "finalized";
export type DocumentOwnerType = "standalone" | "plan_version";

export interface DocumentAccess {
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canFinalize: boolean;
  canUnfinalize: boolean;
  canShare: boolean;
  canForward: boolean;
  grantRole?: "viewer" | "editor" | "manager" | null;
  mode: "edit" | "view";
  reason: string;
}

export type DocumentGrantRole = "viewer" | "editor" | "manager";
export type DocumentGrantPrincipalType = "user" | "permission_group";

export interface DocumentGrant {
  document_grant_id: string;
  document_id: string;
  principal_type: DocumentGrantPrincipalType;
  principal_id: string;
  role: DocumentGrantRole;
  granted_by: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  principal_name?: string | null;
  principal_email?: string | null;
}

export interface CollaborationDocument {
  document_id: string;
  title: string;
  file_name: string;
  file_type: DocumentFileType;
  mime_type: string;
  file_size: number;
  version_number: number;
  status: DocumentStatus;
  owner_app: string;
  owner_type: DocumentOwnerType;
  owner_id: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  access?: DocumentAccess;
}

export interface DocumentVersion {
  document_version_id: string;
  document_id: string;
  version_number: number;
  document_key: string;
  saved_by: string | null;
  saved_by_name?: string | null;
  saved_by_email?: string | null;
  created_at: string;
  file_size: number | null;
}

export interface EditorSession {
  document: CollaborationDocument;
  documentServerUrl: string;
  access: DocumentAccess;
  config: Record<string, unknown>;
}

export interface VersionEditorSession extends EditorSession {
  version_number: number;
  version: DocumentVersion;
}

export interface CreateDocumentPayload {
  title: string;
  fileType?: DocumentFileType;
  ownerApp?: string;
  ownerType?: DocumentOwnerType;
  ownerId?: string | null;
  file?: File;
}

export interface ListDocumentsQuery {
  ownerApp?: string;
  ownerType?: DocumentOwnerType;
  ownerId?: string;
}

export interface DocumentCountsQuery {
  ownerApp?: string;
  ownerType: DocumentOwnerType;
  ownerIds: string[];
}

export interface UpdateDocumentStatusPayload {
  id: string;
  status: DocumentStatus;
}

export interface CreateDocumentSharePayload {
  documentId: string;
  principalType?: DocumentGrantPrincipalType;
  principalId: string;
  role?: DocumentGrantRole;
}

export interface ForwardDocumentPayload {
  documentId: string;
  recipientUserId: string;
  message?: string;
  grantAccess?: boolean;
}
