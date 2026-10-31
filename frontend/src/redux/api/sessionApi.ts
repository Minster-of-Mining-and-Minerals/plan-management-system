import { baseApi } from "../baseApi";

export interface UserSessionItem {
  session_id: string;
  masked_id: string;
  user_id?: string;
  user?: {
    user_id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    profile_image?: string;
    organization_name?: string;
  } | null;
  device_name: string;
  device_type: string;
  operating_system: string;
  browser: string;
  browser_version: string;
  ip_address: string;
  location: string;
  status: "active" | "terminated" | "expired" | "restricted";
  domain?: string;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  terminated_at?: string | null;
  termination_reason?: string | null;
  is_current: boolean;
  device_fingerprint_hash?: string;
}

export interface UserDeviceItem {
  device_fingerprint_hash: string;
  device_name: string;
  device_type: string;
  operating_system: string;
  browser: string;
  last_ip?: string | null;
  last_active_at?: string;
  is_current: boolean;
  is_restricted: boolean;
  restriction_id?: string | null;
  restriction_reason?: string | null;
  restricted_at?: string | null;
  expires_at?: string | null;
}

export interface SessionMetrics {
  total_active_sessions: number;
  active_users: number;
  active_devices: number;
  restricted_devices: number;
  restricted_ips: number;
  terminated_recently: number;
}

export interface DeviceRestrictionItem {
  restriction_id: string;
  device_fingerprint_hash: string;
  user_id?: string | null;
  device_name?: string | null;
  device_type?: string | null;
  operating_system?: string | null;
  browser?: string | null;
  domain: string;
  restriction_reason: string;
  restricted_by: string;
  restricted_at: string;
  expires_at?: string | null;
  is_active: boolean;
  user?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  restrictedByUser?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface IpRestrictionItem {
  restriction_id: string;
  ip_address: string;
  is_cidr: boolean;
  domain: string;
  restriction_reason: string;
  restricted_by: string;
  restricted_at: string;
  expires_at?: string | null;
  is_active: boolean;
  restrictedByUser?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface SessionSecurityLogItem {
  log_id: string;
  event_type: string;
  user_id?: string | null;
  actor_id?: string | null;
  session_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  domain: string;
  details?: Record<string, any> | null;
  created_at: string;
  user?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  actor?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const sessionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================
    // USER SELF-MANAGEMENT ENDPOINTS
    // ==========================================

    getMySessions: builder.query<UserSessionItem[], void>({
      query: () => "/user/sessions",
      transformResponse: (res: any) => res.data || [],
      providesTags: ["UserSession"],
    }),

    getMyDevices: builder.query<UserDeviceItem[], void>({
      query: () => "/user/sessions/devices",
      transformResponse: (res: any) => res.data || [],
      providesTags: ["DeviceRestriction", "UserSession"],
    }),

    terminateMySession: builder.mutation<
      { session_id: string; status: string },
      { sessionId: string; reason?: string }
    >({
      query: ({ sessionId, reason }) => ({
        url: `/user/sessions/${sessionId}/terminate`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["UserSession", "SessionLog"],
    }),

    terminateOtherSessions: builder.mutation<{ terminated_count: number }, void>({
      query: () => ({
        url: "/user/sessions/terminate-other",
        method: "POST",
      }),
      invalidatesTags: ["UserSession", "SessionLog"],
    }),

    restrictMyDevice: builder.mutation<
      DeviceRestrictionItem,
      {
        device_fingerprint_hash: string;
        device_name?: string;
        device_type?: string;
        operating_system?: string;
        browser?: string;
        reason: string;
        duration_minutes?: number;
      }
    >({
      query: (body) => ({
        url: "/user/sessions/devices/restrict",
        method: "POST",
        body,
      }),
      invalidatesTags: ["UserSession", "DeviceRestriction", "SessionLog"],
    }),

    unrestrictMyDevice: builder.mutation<
      DeviceRestrictionItem,
      { restriction_id: string }
    >({
      query: (body) => ({
        url: "/user/sessions/devices/unrestrict",
        method: "POST",
        body,
      }),
      invalidatesTags: ["UserSession", "DeviceRestriction", "SessionLog"],
    }),

    // ==========================================
    // ADMINISTRATIVE ENDPOINTS
    // ==========================================

    getAdminSessionMetrics: builder.query<SessionMetrics, void>({
      query: () => "/admin/sessions/metrics",
      transformResponse: (res: any) => res.data,
      providesTags: ["UserSession", "DeviceRestriction", "IpRestriction"],
    }),

    getAdminSessions: builder.query<
      PaginatedResponse<UserSessionItem>,
      {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        device_type?: string;
        operating_system?: string;
        domain?: string;
        region_id?: string;
        company_id?: string;
        purchasing_center_id?: string;
        user_id?: string;
      } | void
    >({
      query: (params) =>
        params ? { url: "/admin/sessions", params } : { url: "/admin/sessions" },
      transformResponse: (res: any) => ({
        data: res.data || [],
        meta: res.meta || { total: 0, page: 1, limit: 10, totalPages: 0 },
      }),
      providesTags: ["UserSession"],
    }),

    terminateAdminSession: builder.mutation<
      { session_id: string; status: string },
      { sessionId: string; reason?: string }
    >({
      query: ({ sessionId, reason }) => ({
        url: `/admin/sessions/${sessionId}/terminate`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["UserSession", "SessionLog"],
    }),

    terminateUserSessionsAdmin: builder.mutation<
      { terminated_count: number },
      { userId: string; reason?: string }
    >({
      query: ({ userId, reason }) => ({
        url: `/admin/sessions/user/${userId}/terminate-all`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["UserSession", "SessionLog"],
    }),

    getDeviceRestrictions: builder.query<
      PaginatedResponse<DeviceRestrictionItem>,
      { page?: number; limit?: number; is_active?: boolean } | void
    >({
      query: (params) =>
        params ? { url: "/admin/sessions/devices", params } : { url: "/admin/sessions/devices" },
      transformResponse: (res: any) => ({
        data: res.data || [],
        meta: res.meta || { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
      providesTags: ["DeviceRestriction"],
    }),

    createDeviceRestriction: builder.mutation<
      DeviceRestrictionItem,
      {
        device_fingerprint_hash: string;
        user_id?: string;
        device_name?: string;
        device_type?: string;
        operating_system?: string;
        browser?: string;
        reason: string;
        duration_minutes?: number;
      }
    >({
      query: (body) => ({
        url: "/admin/sessions/devices",
        method: "POST",
        body,
      }),
      invalidatesTags: ["DeviceRestriction", "UserSession", "SessionLog"],
    }),

    deleteDeviceRestriction: builder.mutation<
      DeviceRestrictionItem,
      { restrictionId: string }
    >({
      query: ({ restrictionId }) => ({
        url: `/admin/sessions/devices/${restrictionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DeviceRestriction", "UserSession", "SessionLog"],
    }),

    getIpRestrictions: builder.query<
      PaginatedResponse<IpRestrictionItem>,
      { page?: number; limit?: number; is_active?: boolean } | void
    >({
      query: (params) =>
        params ? { url: "/admin/sessions/ips", params } : { url: "/admin/sessions/ips" },
      transformResponse: (res: any) => ({
        data: res.data || [],
        meta: res.meta || { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
      providesTags: ["IpRestriction"],
    }),

    createIpRestriction: builder.mutation<
      IpRestrictionItem,
      {
        ip_address: string;
        is_cidr?: boolean;
        reason: string;
        duration_minutes?: number;
      }
    >({
      query: (body) => ({
        url: "/admin/sessions/ips",
        method: "POST",
        body,
      }),
      invalidatesTags: ["IpRestriction", "UserSession", "SessionLog"],
    }),

    deleteIpRestriction: builder.mutation<
      IpRestrictionItem,
      { restrictionId: string }
    >({
      query: ({ restrictionId }) => ({
        url: `/admin/sessions/ips/${restrictionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["IpRestriction", "UserSession", "SessionLog"],
    }),

    getSessionSecurityLogs: builder.query<
      PaginatedResponse<SessionSecurityLogItem>,
      {
        page?: number;
        limit?: number;
        event_type?: string;
        user_id?: string;
        date_from?: string;
        date_to?: string;
      } | void
    >({
      query: (params) =>
        params ? { url: "/admin/sessions/logs", params } : { url: "/admin/sessions/logs" },
      transformResponse: (res: any) => ({
        data: res.data || [],
        meta: res.meta || { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
      providesTags: ["SessionLog"],
    }),
  }),
});

export const {
  useGetMySessionsQuery,
  useGetMyDevicesQuery,
  useTerminateMySessionMutation,
  useTerminateOtherSessionsMutation,
  useRestrictMyDeviceMutation,
  useUnrestrictMyDeviceMutation,
  useGetAdminSessionMetricsQuery,
  useGetAdminSessionsQuery,
  useTerminateAdminSessionMutation,
  useTerminateUserSessionsAdminMutation,
  useGetDeviceRestrictionsQuery,
  useCreateDeviceRestrictionMutation,
  useDeleteDeviceRestrictionMutation,
  useGetIpRestrictionsQuery,
  useCreateIpRestrictionMutation,
  useDeleteIpRestrictionMutation,
  useGetSessionSecurityLogsQuery,
} = sessionApi;

