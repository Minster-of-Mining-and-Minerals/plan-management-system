export type DepartmentStatus = "active" | "inactive";

export interface Department {
  department_id: string;
  name: string;
  code: string;
  slug: string;
  dept_head?: string | null;
  dept_head_name?: string | null;
  dept_head_email?: string | null;
  status: DepartmentStatus;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentPayload {
  name: string;
  code: string;
  dept_head?: string | null;
  status?: DepartmentStatus;
}

export interface UpdateDepartmentPayload {
  name?: string;
  code?: string;
  dept_head?: string | null;
  status?: DepartmentStatus;
}

export interface DepartmentListParams {
  status?: DepartmentStatus;
  search?: string;
  page?: number;
  limit?: number;
  paginate?: boolean;
}
