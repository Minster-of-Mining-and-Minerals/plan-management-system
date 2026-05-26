export type UserTitleStatus = "active" | "inactive";

export interface UserTitle {
  title_id: string;
  name: string;
  code: string;
  status: UserTitleStatus;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserTitlePayload {
  name: string;
  code: string;
  status?: UserTitleStatus;
}

export interface UpdateUserTitlePayload {
  name?: string;
  code?: string;
  status?: UserTitleStatus;
}

export interface UserTitleListParams {
  status?: UserTitleStatus;
  search?: string;
  page?: number;
  limit?: number;
  paginate?: boolean;
}
