import { baseApi } from "../baseApi";

export type AuditLogRow = {
  audit_id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  actor?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
};

export type AuditLogListResponse = {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  results: AuditLogRow[];
};

export const auditLogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<
      AuditLogListResponse,
      {
        page?: number;
        limit?: number;
        search?: string;
        actor_user_id?: string;
        resource_type?: string;
        action?: string;
        from_date?: string;
        to_date?: string;
      }
    >({
      query: (params) => ({
        url: "/audit-logs",
        params,
      }),
      transformResponse: (r: { data: AuditLogListResponse }) => r.data,
      providesTags: ["AuditLog"],
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditLogApi;
