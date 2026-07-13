import { baseApi } from "../baseApi";

export type ReceiptTemplatePlaceholder = {
  key: string;
  label: string;
};

export type ReceiptTemplate = {
  template_id: string;
  name: string;
  code: string;
  html_content: string;
  is_default: boolean;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export const receiptTemplateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listReceiptTemplates: builder.query<
      ReceiptTemplate[],
      { status?: string; search?: string }
    >({
      query: (params) => ({
        url: "/finance/receipt-templates",
        params,
      }),
      transformResponse: (r: { data: ReceiptTemplate[] }) => r.data,
      providesTags: ["ReceiptTemplate"],
    }),

    getReceiptTemplate: builder.query<ReceiptTemplate, string>({
      query: (templateId) => `/finance/receipt-templates/${templateId}`,
      transformResponse: (r: { data: ReceiptTemplate }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "ReceiptTemplate", id }],
    }),

    getReceiptTemplatePlaceholders: builder.query<
      ReceiptTemplatePlaceholder[],
      void
    >({
      query: () => "/finance/receipt-templates/placeholders",
      transformResponse: (r: { data: ReceiptTemplatePlaceholder[] }) => r.data,
    }),

    createReceiptTemplate: builder.mutation<
      ReceiptTemplate,
      {
        name: string;
        code: string;
        html_content?: string;
        is_default?: boolean;
        status?: string;
      }
    >({
      query: (body) => ({
        url: "/finance/receipt-templates",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: ReceiptTemplate }) => r.data,
      invalidatesTags: ["ReceiptTemplate"],
    }),

    updateReceiptTemplate: builder.mutation<
      ReceiptTemplate,
      {
        templateId: string;
        body: Partial<{
          name: string;
          code: string;
          html_content: string;
          is_default: boolean;
          status: string;
        }>;
      }
    >({
      query: ({ templateId, body }) => ({
        url: `/finance/receipt-templates/${templateId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: ReceiptTemplate }) => r.data,
      invalidatesTags: (_r, _e, { templateId }) => [
        "ReceiptTemplate",
        { type: "ReceiptTemplate", id: templateId },
      ],
    }),

    deleteReceiptTemplate: builder.mutation<
      { template_id: string; deleted: boolean },
      string
    >({
      query: (templateId) => ({
        url: `/finance/receipt-templates/${templateId}`,
        method: "DELETE",
      }),
      transformResponse: (r: { data: { template_id: string; deleted: boolean } }) =>
        r.data,
      invalidatesTags: ["ReceiptTemplate"],
    }),
  }),
});

export const {
  useListReceiptTemplatesQuery,
  useGetReceiptTemplateQuery,
  useGetReceiptTemplatePlaceholdersQuery,
  useCreateReceiptTemplateMutation,
  useUpdateReceiptTemplateMutation,
  useDeleteReceiptTemplateMutation,
} = receiptTemplateApi;
