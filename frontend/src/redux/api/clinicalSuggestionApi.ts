import { baseApi } from "../baseApi";

export type ClinicalSuggestionCategory =
  | "diagnosis"
  | "assessment"
  | "plan"
  | "prescription"
  | "referral"
  | "procedure"
  | "certificate"
  | "general";

export type ClinicalSuggestion = {
  suggestion_id: string;
  text: string;
  category: ClinicalSuggestionCategory;
  department_id?: string | null;
  frequency: number;
  organization_frequency: number;
  is_pinned: boolean;
  is_active: boolean;
  user_usage_count?: number;
  score?: number;
  department?: { department_id: string; name: string } | null;
  created_at?: string;
};

export const clinicalSuggestionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchClinicalSuggestions: builder.query<
      ClinicalSuggestion[],
      { q?: string; category?: ClinicalSuggestionCategory; limit?: number }
    >({
      query: (params) => ({
        url: "/clinical-suggestions/search",
        params,
      }),
      transformResponse: (r: { data: ClinicalSuggestion[] }) => r.data ?? [],
      keepUnusedDataFor: 30,
    }),

    listClinicalSuggestions: builder.query<
      ClinicalSuggestion[],
      { category?: string; status?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/clinical-suggestions",
        params: params || undefined,
      }),
      transformResponse: (r: { data: ClinicalSuggestion[] }) => r.data ?? [],
      providesTags: ["ClinicalSuggestion"],
    }),

    getClinicalSuggestionCategories: builder.query<string[], void>({
      query: () => "/clinical-suggestions/categories",
      transformResponse: (r: { data: string[] }) => r.data ?? [],
    }),

    createClinicalSuggestion: builder.mutation<
      ClinicalSuggestion,
      Partial<ClinicalSuggestion>
    >({
      query: (body) => ({
        url: "/clinical-suggestions",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: ClinicalSuggestion }) => r.data,
      invalidatesTags: ["ClinicalSuggestion"],
    }),

    updateClinicalSuggestion: builder.mutation<
      ClinicalSuggestion,
      { suggestionId: string; body: Partial<ClinicalSuggestion> }
    >({
      query: ({ suggestionId, body }) => ({
        url: `/clinical-suggestions/${suggestionId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: ClinicalSuggestion }) => r.data,
      invalidatesTags: ["ClinicalSuggestion"],
    }),

    deleteClinicalSuggestion: builder.mutation<ClinicalSuggestion, string>({
      query: (suggestionId) => ({
        url: `/clinical-suggestions/${suggestionId}`,
        method: "DELETE",
      }),
      transformResponse: (r: { data: ClinicalSuggestion }) => r.data,
      invalidatesTags: ["ClinicalSuggestion"],
    }),

    recordClinicalSuggestionUsage: builder.mutation<
      { success: boolean },
      string
    >({
      query: (suggestionId) => ({
        url: `/clinical-suggestions/${suggestionId}/usage`,
        method: "POST",
      }),
      transformResponse: (r: { data: { success: boolean } }) => r.data,
    }),

    learnClinicalText: builder.mutation<
      { learned: number },
      { text: string; category?: ClinicalSuggestionCategory }
    >({
      query: (body) => ({
        url: "/clinical-suggestions/learn",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: { learned: number } }) => r.data,
    }),

    importClinicalSuggestionDefaults: builder.mutation<{ imported: number }, void>({
      query: () => ({
        url: "/clinical-suggestions/import-defaults",
        method: "POST",
      }),
      transformResponse: (r: { data: { imported: number } }) => r.data,
      invalidatesTags: ["ClinicalSuggestion"],
    }),
  }),
});

export const {
  useSearchClinicalSuggestionsQuery,
  useLazySearchClinicalSuggestionsQuery,
  useListClinicalSuggestionsQuery,
  useGetClinicalSuggestionCategoriesQuery,
  useCreateClinicalSuggestionMutation,
  useUpdateClinicalSuggestionMutation,
  useDeleteClinicalSuggestionMutation,
  useRecordClinicalSuggestionUsageMutation,
  useLearnClinicalTextMutation,
  useImportClinicalSuggestionDefaultsMutation,
} = clinicalSuggestionApi;
