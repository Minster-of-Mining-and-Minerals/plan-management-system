import { baseApi } from "../baseApi";
import {
  Issue,
  IssueCategory,
  IssuePriority,
  IssueHistoryEntry,
  IssueDashboardStats,
  IssueListResponse,
  GetIssuesQueryParams,
  CreateIssuePayload,
  UpdateIssuePayload,
  CreateIssueCategoryPayload,
  UpdateIssueCategoryPayload,
} from "../types/issue";

function cleanParams<T extends Record<string, unknown>>(params?: T) {
  if (!params) return undefined;
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined
    )
  );
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export const issueApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getIssueCategories: builder.query<
      IssueCategory[],
      { is_active?: boolean; parent_category_id?: string; selectable_only?: boolean } | void
    >({
      query: (params) => ({
        url: "/issue-categories",
        params: cleanParams(params as Record<string, unknown>),
      }),
      transformResponse: (response: { data?: IssueCategory[] }) =>
        response.data ?? [],
      providesTags: ["IssueCategories"],
    }),

    getIssueCategoryById: builder.query<IssueCategory, string>({
      query: (id) => `/issue-categories/${id}`,
      transformResponse: (response: { data: IssueCategory }) => response.data,
      providesTags: (_r, _e, id) => [{ type: "IssueCategories", id }],
    }),

    createIssueCategory: builder.mutation<IssueCategory, CreateIssueCategoryPayload>({
      query: (body) => ({
        url: "/issue-categories",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: IssueCategory }) => response.data,
      invalidatesTags: ["IssueCategories"],
    }),

    updateIssueCategory: builder.mutation<
      IssueCategory,
      { id: string; data: UpdateIssueCategoryPayload }
    >({
      query: ({ id, data }) => ({
        url: `/issue-categories/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { data: IssueCategory }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "IssueCategories", id },
        "IssueCategories",
      ],
    }),

    deactivateIssueCategory: builder.mutation<IssueCategory, string>({
      query: (id) => ({
        url: `/issue-categories/${id}/deactivate`,
        method: "PATCH",
      }),
      transformResponse: (response: { data: IssueCategory }) => response.data,
      invalidatesTags: ["IssueCategories"],
    }),

    getIssuePriorities: builder.query<IssuePriority[], void>({
      query: () => "/issues/priorities",
      transformResponse: (response: { data?: IssuePriority[] }) =>
        response.data ?? [],
      providesTags: ["IssuePriorities"],
    }),

    getIssues: builder.query<IssueListResponse, GetIssuesQueryParams | void>({
      query: (params) => ({
        url: "/issues",
        params: cleanParams(params as Record<string, unknown>),
      }),
      transformResponse: (response: {
        data?: Issue[];
        pagination?: IssueListResponse["pagination"];
      }): IssueListResponse => ({
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
              ...result.data.map(({ issue_id }) => ({
                type: "Issues" as const,
                id: issue_id,
              })),
              "Issues",
            ]
          : ["Issues"],
    }),

    getIssueDashboard: builder.query<
      IssueDashboardStats,
      Omit<GetIssuesQueryParams, "page" | "limit" | "search" | "status"> | void
    >({
      query: (params) => ({
        url: "/issues/dashboard",
        params: cleanParams(params as Record<string, unknown>),
      }),
      transformResponse: (response: { data: IssueDashboardStats }) => response.data,
      providesTags: ["IssueDashboard"],
    }),

    getIssueById: builder.query<Issue, string>({
      query: (id) => `/issues/${id}`,
      transformResponse: (response: { data: Issue }) => response.data,
      providesTags: (_r, _e, id) => [{ type: "Issues", id }],
    }),

    getIssueHistory: builder.query<IssueHistoryEntry[], string>({
      query: (id) => `/issues/${id}/history`,
      transformResponse: (response: { data?: IssueHistoryEntry[] }) =>
        response.data ?? [],
      providesTags: (_r, _e, id) => [{ type: "IssueHistory", id }],
    }),

    createIssue: builder.mutation<Issue, CreateIssuePayload>({
      query: (body) => ({
        url: "/issues",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: Issue }) => response.data,
      invalidatesTags: ["Issues", "IssueDashboard"],
    }),

    updateIssue: builder.mutation<Issue, { id: string; data: UpdateIssuePayload }>({
      query: ({ id, data }) => ({
        url: `/issues/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { data: Issue }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Issues", id },
        "Issues",
        "IssueDashboard",
      ],
    }),

    startIssueReview: builder.mutation<Issue, string>({
      query: (id) => ({
        url: `/issues/${id}/start-review`,
        method: "POST",
      }),
      transformResponse: (response: { data: Issue }) => response.data,
      invalidatesTags: (_r, _e, id) => [
        { type: "Issues", id },
        "Issues",
        "IssueDashboard",
        "IssueHistory",
      ],
    }),

    acceptIssue: builder.mutation<
      Issue,
      { id: string; review_notes?: string }
    >({
      query: ({ id, review_notes }) => ({
        url: `/issues/${id}/accept`,
        method: "POST",
        body: { review_notes },
      }),
      transformResponse: (response: { data: Issue }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Issues", id },
        "Issues",
        "IssueDashboard",
        "IssueHistory",
      ],
    }),

    rejectIssue: builder.mutation<
      Issue,
      { id: string; rejection_reason: string }
    >({
      query: ({ id, rejection_reason }) => ({
        url: `/issues/${id}/reject`,
        method: "POST",
        body: { rejection_reason },
      }),
      transformResponse: (response: { data: Issue }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Issues", id },
        "Issues",
        "IssueDashboard",
        "IssueHistory",
      ],
    }),

    resolveIssue: builder.mutation<
      Issue,
      { id: string; resolution_notes?: string }
    >({
      query: ({ id, resolution_notes }) => ({
        url: `/issues/${id}/resolve`,
        method: "POST",
        body: { resolution_notes },
      }),
      transformResponse: (response: { data: Issue }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Issues", id },
        "Issues",
        "IssueDashboard",
        "IssueHistory",
      ],
    }),

    closeIssue: builder.mutation<Issue, string>({
      query: (id) => ({
        url: `/issues/${id}/close`,
        method: "POST",
      }),
      transformResponse: (response: { data: Issue }) => response.data,
      invalidatesTags: (_r, _e, id) => [
        { type: "Issues", id },
        "Issues",
        "IssueDashboard",
        "IssueHistory",
      ],
    }),
  }),
});

export const {
  useGetIssueCategoriesQuery,
  useGetIssueCategoryByIdQuery,
  useCreateIssueCategoryMutation,
  useUpdateIssueCategoryMutation,
  useDeactivateIssueCategoryMutation,
  useGetIssuePrioritiesQuery,
  useGetIssuesQuery,
  useGetIssueDashboardQuery,
  useGetIssueByIdQuery,
  useGetIssueHistoryQuery,
  useCreateIssueMutation,
  useUpdateIssueMutation,
  useStartIssueReviewMutation,
  useAcceptIssueMutation,
  useRejectIssueMutation,
  useResolveIssueMutation,
  useCloseIssueMutation,
} = issueApi;
