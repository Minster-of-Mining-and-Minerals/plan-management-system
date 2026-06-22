export interface NoteUser {
  user_id: string;
  full_name: string;
  email: string;
}

export interface NoteAttachment {
  attachment_id: string;
  file_name: string;
  file_path: string;
  uploaded_by?: string | null;
  created_at?: string;
}

export interface Note {
  note_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  pin_order?: number | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  attachments?: NoteAttachment[];
  attachments_count?: number;
  createdByUser?: NoteUser;
  updatedByUser?: NoteUser;
}

export interface NotesListQuery {
  page?: number;
  limit?: number;
  search?: string;
  title?: string;
  is_pinned?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface NotesListResponse {
  data: Note[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateNotePayload {
  title: string;
  content?: string;
  is_pinned?: boolean;
  attachment_ids?: string[];
}

export type UpdateNotePayload = Partial<CreateNotePayload>;

export const NOTES_VIEW = ["NOTES:VIEW", "NOTES:MANAGE"] as const;
export const NOTES_CREATE = ["NOTES:CREATE", "NOTES:MANAGE"] as const;
export const NOTES_UPDATE = ["NOTES:UPDATE", "NOTES:MANAGE"] as const;
export const NOTES_DELETE = ["NOTES:DELETE", "NOTES:MANAGE"] as const;
