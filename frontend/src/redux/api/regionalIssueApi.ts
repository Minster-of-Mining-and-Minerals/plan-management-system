import { baseApi } from "../baseApi";
import {
  RegionalIssue,
  RegionalIssueDashboardStats,
  RegionalIssueListResponse,
  GetRegionalIssuesParams,
  CreateRegionalIssuePayload,
  UpdateRegionalIssuePayload,
  RegionalIssueComment,
} from "../types/regionalIssue";
import { IssuePriority, IssueCategory } from "../types/issue";

function cleanParams<T extends Record<string, unknown>>(params?: T) {
  if (!params) return undefined;
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined
    )
  );
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export const regionalIssueApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRegionalIssuePriorities: builder.query<IssuePriority[], void>({
      query: () => "/regional/issues/priorities",
      transformResponse: (response: { data?: IssuePriority[] }) =>
        response.data ?? [],
      providesTags: ["IssuePriorities"],
    }),

    getRegionalIssueCategories: builder.query<IssueCategory[], void>({
      query: () => "/regional/issues/categories",
      transformResponse: (response: { data?: IssueCategory[] }) =>
        response.data ?? [],
      providesTags: ["IssueCategories"],
    }),

    getRegionalIssues: builder.query<
      RegionalIssueListResponse,
      GetRegionalIssuesParams
    >({
      query: ({ regionId, ...params }) => ({
        url: `/regional/issues/${regionId}`,
        params: cleanParams(params as Record<string, unknown>),
      }),
      transformResponse: (response: {
        data?: RegionalIssue[];
        pagination?: RegionalIssueListResponse["pagination"];
      }): RegionalIssueListResponse => ({
        data: response.data ?? [],
        pagination: response.pagination ?? {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ regional_issue_id }) => ({
                type: "RegionalIssues" as const,
                id: regional_issue_id,
              })),
              "RegionalIssues",
            ]
          : ["RegionalIssues"],
    }),

    getRegionalIssueDashboard: builder.query<
      RegionalIssueDashboardStats,
      string
    >({
      query: (regionId) => `/regional/issues/${regionId}/dashboard`,
      transformResponse: (response: { data: RegionalIssueDashboardStats }) =>
        response.data,
      providesTags: (_r, _e, regionId) => [
        { type: "RegionalIssueDashboard" as const, id: regionId },
        "RegionalIssueDashboard",
      ],
    }),

    getRegionalIssueById: builder.query<
      RegionalIssue,
      { regionId: string; issueId: string }
    >({
      query: ({ regionId, issueId }) => `/regional/issues/${regionId}/${issueId}`,
      transformResponse: (response: { data: RegionalIssue }) => response.data,
      providesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
      ],
    }),

    createRegionalIssue: builder.mutation<RegionalIssue, CreateRegionalIssuePayload>({
      query: ({ regionId, ...body }) => ({
        url: `/regional/issues/${regionId}`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: RegionalIssue }) => response.data,
      invalidatesTags: ["RegionalIssues", "RegionalIssueDashboard"],
    }),

    updateRegionalIssue: builder.mutation<RegionalIssue, UpdateRegionalIssuePayload>({
      query: ({ regionId, issueId, ...body }) => ({
        url: `/regional/issues/${regionId}/${issueId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: RegionalIssue }) => response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
        "RegionalIssues",
        "RegionalIssueDashboard",
      ],
    }),

    assignRegionalIssue: builder.mutation<
      RegionalIssue,
      { regionId: string; issueId: string; assigned_to: string | null }
    >({
      query: ({ regionId, issueId, assigned_to }) => ({
        url: `/regional/issues/${regionId}/${issueId}/assign`,
        method: "PATCH",
        body: { assigned_to },
      }),
      transformResponse: (response: { data: RegionalIssue }) => response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
        "RegionalIssues",
      ],
    }),

    startRegionalIssueReview: builder.mutation<
      RegionalIssue,
      { regionId: string; issueId: string }
    >({
      query: ({ regionId, issueId }) => ({
        url: `/regional/issues/${regionId}/${issueId}/review`,
        method: "PATCH",
      }),
      transformResponse: (response: { data: RegionalIssue }) => response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
        "RegionalIssues",
        "RegionalIssueDashboard",
      ],
    }),

    acceptRegionalIssue: builder.mutation<
      RegionalIssue,
      {
        regionId: string;
        issueId: string;
        response?: string;
        assigned_to?: string;
      }
    >({
      query: ({ regionId, issueId, ...body }) => ({
        url: `/regional/issues/${regionId}/${issueId}/accept`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: { data: RegionalIssue }) => response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
        "RegionalIssues",
        "RegionalIssueDashboard",
      ],
    }),

    rejectRegionalIssue: builder.mutation<
      RegionalIssue,
      { regionId: string; issueId: string; rejection_reason: string }
    >({
      query: ({ regionId, issueId, ...body }) => ({
        url: `/regional/issues/${regionId}/${issueId}/reject`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: { data: RegionalIssue }) => response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
        "RegionalIssues",
        "RegionalIssueDashboard",
      ],
    }),

    resolveRegionalIssue: builder.mutation<
      RegionalIssue,
      { regionId: string; issueId: string; resolution_notes: string }
    >({
      query: ({ regionId, issueId, ...body }) => ({
        url: `/regional/issues/${regionId}/${issueId}/resolve`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: { data: RegionalIssue }) => response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
        "RegionalIssues",
        "RegionalIssueDashboard",
      ],
    }),

    closeRegionalIssue: builder.mutation<
      RegionalIssue,
      { regionId: string; issueId: string }
    >({
      query: ({ regionId, issueId }) => ({
        url: `/regional/issues/${regionId}/${issueId}/close`,
        method: "PATCH",
      }),
      transformResponse: (response: { data: RegionalIssue }) => response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
        "RegionalIssues",
        "RegionalIssueDashboard",
      ],
    }),

    addRegionalIssueComment: builder.mutation<
      RegionalIssueComment,
      {
        regionId: string;
        issueId: string;
        comment_text: string;
        is_internal?: boolean;
      }
    >({
      query: ({ regionId, issueId, ...body }) => ({
        url: `/regional/issues/${regionId}/${issueId}/comments`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: RegionalIssueComment }) =>
        response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
      ],
    }),

    escalateRegionalIssue: builder.mutation<
      any,
      {
        regionId: string;
        issueId: string;
        escalation_reason: string;
        requested_assistance: string;
        assistance_type?: string;
        escalation_priority?: string;
        selected_attachment_ids?: string[];
      }
    >({
      query: ({ regionId, issueId, ...body }) => ({
        url: `/regional/issues/${regionId}/${issueId}/escalate`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: any }) => response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
        "RegionalIssues",
        "RegionalIssueDashboard",
        "RegionalIssueEscalations",
        "FederalRegionalEscalations",
      ],
    }),

    recallRegionalIssueEscalation: builder.mutation<
      any,
      {
        regionId: string;
        issueId: string;
        escalationId: string;
        recall_reason?: string;
      }
    >({
      query: ({ regionId, issueId, escalationId, ...body }) => ({
        url: `/regional/issues/${regionId}/${issueId}/escalations/${escalationId}/recall`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: any }) => response.data,
      invalidatesTags: (_r, _e, { issueId }) => [
        { type: "RegionalIssues", id: issueId },
        "RegionalIssues",
        "RegionalIssueDashboard",
        "RegionalIssueEscalations",
        "FederalRegionalEscalations",
      ],
    }),

    getRegionalIssueEscalations: builder.query<
      any[],
      { regionId: string; issueId: string }
    >({
      query: ({ regionId, issueId }) =>
        `/regional/issues/${regionId}/${issueId}/escalations`,
      transformResponse: (response: { data: any[] }) => response.data || [],
      providesTags: ["RegionalIssueEscalations"],
    }),

    addRegionalIssueEscalationMessage: builder.mutation<
      any,
      {
        regionId: string;
        issueId: string;
        escalationId: string;
        message_text: string;
        message_type?: string;
      }
    >({
      query: ({ regionId, issueId, escalationId, ...body }) => ({
        url: `/regional/issues/${regionId}/${issueId}/escalations/${escalationId}/messages`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: any }) => response.data,
      invalidatesTags: ["RegionalIssueEscalations"],
    }),
  }),
});

export const {
  useGetRegionalIssuePrioritiesQuery,
  useGetRegionalIssueCategoriesQuery,
  useGetRegionalIssuesQuery,
  useGetRegionalIssueDashboardQuery,
  useGetRegionalIssueByIdQuery,
  useCreateRegionalIssueMutation,
  useUpdateRegionalIssueMutation,
  useAssignRegionalIssueMutation,
  useStartRegionalIssueReviewMutation,
  useAcceptRegionalIssueMutation,
  useRejectRegionalIssueMutation,
  useResolveRegionalIssueMutation,
  useCloseRegionalIssueMutation,
  useAddRegionalIssueCommentMutation,
  useEscalateRegionalIssueMutation,
  useRecallRegionalIssueEscalationMutation,
  useGetRegionalIssueEscalationsQuery,
  useAddRegionalIssueEscalationMessageMutation,
} = regionalIssueApi;
