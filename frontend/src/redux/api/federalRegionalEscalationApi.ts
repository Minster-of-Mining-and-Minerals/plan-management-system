import { baseApi } from "../baseApi";

function cleanParams<T extends Record<string, unknown>>(params?: T) {
  if (!params) return undefined;
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined
    )
  );
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export interface FederalRegionalEscalationItem {
  escalation_id: string;
  regional_issue_id: string;
  region_id: string;
  escalation_number: string;
  escalated_at: string;
  escalation_reason: string;
  requested_assistance: string;
  assistance_type: string;
  escalation_priority: string;
  escalation_status: string;
  federal_assigned_to?: string | null;
  federal_response_summary?: string | null;
  federal_action_taken?: string | null;
  returned_reason?: string | null;
  recalled_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  selected_attachment_ids?: string[];
  shared_attachments?: Array<{
    attachment_id: string;
    file_name: string;
    file_path: string;
    created_at?: string;
  }>;
  created_at: string;
  region?: {
    region_id: string;
    name: string;
    code?: string;
  };
  regionalIssue?: {
    regional_issue_id: string;
    issue_number: string;
    title: string;
    description: string;
    status: string;
    escalation_status: string;
    created_at: string;
    category?: { issue_category_id: string; name: string; code?: string };
    priority?: { issue_priority_id: string; code: string; label: string; color_hex?: string };
    raiser?: { user_id: string; full_name: string; email: string };
    assignee?: { user_id: string; full_name: string; email: string };
  };
  escalator?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  federalAssignee?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  messages?: Array<{
    message_id: string;
    sender_id: string;
    sender_scope: string;
    message_type: string;
    message_text: string;
    is_internal_federal_note: boolean;
    created_at: string;
    sender?: { user_id: string; full_name: string; email: string };
  }>;
}

export interface FederalRegionalEscalationStats {
  total: number;
  escalated: number;
  under_federal_review: number;
  clarification_requested: number;
  assistance_provided: number;
  returned: number;
  closed: number;
  by_region: Record<string, number>;
  by_assistance_type: Record<string, number>;
}

export interface GetFederalRegionalEscalationsParams {
  page?: number;
  limit?: number;
  region_id?: string;
  status?: string;
  priority?: string;
  assistance_type?: string;
  assigned_to?: string;
  search?: string;
}

export const federalRegionalEscalationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFederalRegionalEscalations: builder.query<
      { data: FederalRegionalEscalationItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } },
      GetFederalRegionalEscalationsParams | void
    >({
      query: (params) => ({
        url: "/federal-regional-escalations",
        params: cleanParams(params as Record<string, unknown>),
      }),
      transformResponse: (response: {
        data?: FederalRegionalEscalationItem[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      }) => ({
        data: response.data ?? [],
        pagination: response.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
      providesTags: ["FederalRegionalEscalations"],
    }),

    getFederalRegionalEscalationStats: builder.query<
      FederalRegionalEscalationStats,
      { region_id?: string } | void
    >({
      query: (params) => ({
        url: "/federal-regional-escalations/dashboard",
        params: cleanParams(params as Record<string, unknown>),
      }),
      transformResponse: (response: { data: FederalRegionalEscalationStats }) => response.data,
      providesTags: ["FederalRegionalEscalations"],
    }),

    getFederalRegionalEscalationById: builder.query<
      FederalRegionalEscalationItem,
      string
    >({
      query: (escalationId) => `/federal-regional-escalations/${escalationId}`,
      transformResponse: (response: { data: FederalRegionalEscalationItem }) => response.data,
      providesTags: (_r, _e, id) => [{ type: "FederalRegionalEscalations", id }],
    }),

    assignFederalOfficer: builder.mutation<
      FederalRegionalEscalationItem,
      { escalationId: string; federal_user_id: string }
    >({
      query: ({ escalationId, ...body }) => ({
        url: `/federal-regional-escalations/${escalationId}/assign`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: { data: FederalRegionalEscalationItem }) => response.data,
      invalidatesTags: ["FederalRegionalEscalations", "RegionalIssueEscalations"],
    }),

    startFederalReview: builder.mutation<
      FederalRegionalEscalationItem,
      string
    >({
      query: (escalationId) => ({
        url: `/federal-regional-escalations/${escalationId}/start-review`,
        method: "PATCH",
      }),
      transformResponse: (response: { data: FederalRegionalEscalationItem }) => response.data,
      invalidatesTags: ["FederalRegionalEscalations", "RegionalIssues", "RegionalIssueEscalations"],
    }),

    requestFederalClarification: builder.mutation<
      FederalRegionalEscalationItem,
      { escalationId: string; clarification_text: string }
    >({
      query: ({ escalationId, ...body }) => ({
        url: `/federal-regional-escalations/${escalationId}/request-clarification`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: FederalRegionalEscalationItem }) => response.data,
      invalidatesTags: ["FederalRegionalEscalations", "RegionalIssues", "RegionalIssueEscalations"],
    }),

    provideFederalAssistance: builder.mutation<
      FederalRegionalEscalationItem,
      {
        escalationId: string;
        federal_response_summary: string;
        federal_action_taken?: string;
      }
    >({
      query: ({ escalationId, ...body }) => ({
        url: `/federal-regional-escalations/${escalationId}/provide-assistance`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: FederalRegionalEscalationItem }) => response.data,
      invalidatesTags: ["FederalRegionalEscalations", "RegionalIssues", "RegionalIssueEscalations"],
    }),

    returnFederalEscalationToRegion: builder.mutation<
      FederalRegionalEscalationItem,
      { escalationId: string; returned_reason: string }
    >({
      query: ({ escalationId, ...body }) => ({
        url: `/federal-regional-escalations/${escalationId}/return`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: FederalRegionalEscalationItem }) => response.data,
      invalidatesTags: ["FederalRegionalEscalations", "RegionalIssues", "RegionalIssueEscalations"],
    }),

    closeFederalIntervention: builder.mutation<
      FederalRegionalEscalationItem,
      string
    >({
      query: (escalationId) => ({
        url: `/federal-regional-escalations/${escalationId}/close`,
        method: "PATCH",
      }),
      transformResponse: (response: { data: FederalRegionalEscalationItem }) => response.data,
      invalidatesTags: ["FederalRegionalEscalations", "RegionalIssues", "RegionalIssueEscalations"],
    }),

    addFederalEscalationMessage: builder.mutation<
      any,
      {
        escalationId: string;
        message_text: string;
        message_type?: string;
        is_internal_federal_note?: boolean;
      }
    >({
      query: ({ escalationId, ...body }) => ({
        url: `/federal-regional-escalations/${escalationId}/messages`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: any }) => response.data,
      invalidatesTags: ["FederalRegionalEscalations", "RegionalIssueEscalations"],
    }),
  }),
});

export const {
  useGetFederalRegionalEscalationsQuery,
  useGetFederalRegionalEscalationStatsQuery,
  useGetFederalRegionalEscalationByIdQuery,
  useAssignFederalOfficerMutation,
  useStartFederalReviewMutation,
  useRequestFederalClarificationMutation,
  useProvideFederalAssistanceMutation,
  useReturnFederalEscalationToRegionMutation,
  useCloseFederalInterventionMutation,
  useAddFederalEscalationMessageMutation,
} = federalRegionalEscalationApi;

