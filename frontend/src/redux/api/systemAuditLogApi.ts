import { baseApi } from "../baseApi";
import type {
  GetSystemAuditLogsQueryParams,
  SystemAuditLog,
  SystemAuditLogsResponse,
} from "../types/systemAuditLog";

export const systemAuditLogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemAuditLogs: builder.query<SystemAuditLogsResponse, GetSystemAuditLogsQueryParams>({
      query: (params) => {
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== "" && v !== null && v !== undefined
          )
        );
        return {
          url: "/system-audit-logs",
          params: cleanParams,
        };
      },
      transformResponse: (response: {
        data: SystemAuditLog[];
        meta: SystemAuditLogsResponse["meta"];
      }) => ({
        data: response.data ?? [],
        meta: response.meta ?? { page: 1, limit: 10, total: 0, totalPages: 1 },
      }),
      providesTags: ["SystemAuditLog"],
    }),

    getSystemAuditLogById: builder.query<SystemAuditLog, string>({
      query: (id) => `/system-audit-logs/${id}`,
      transformResponse: (response: { data: SystemAuditLog }) => response.data,
      providesTags: (_r, _e, id) => [{ type: "SystemAuditLog", id }],
    }),
  }),
});

export const { useGetSystemAuditLogsQuery, useGetSystemAuditLogByIdQuery } =
  systemAuditLogApi;
