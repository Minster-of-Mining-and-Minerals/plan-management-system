import { baseApi } from "../baseApi";
import type { UserFormConfigGrouped } from "../types/formField";
import type { FormField, CreateFormFieldPayload, UpdateFormFieldPayload } from "../types/formField";
import type { FormFieldGroup } from "../types/formFieldGroup";

export type DiagnosisTemplate = {
  template_id: string;
  title: string;
  description?: string | null;
  status: "active" | "archived";
  created_at?: string;
  updated_at?: string;
};

export const diagnosisTemplateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listDiagnosisTemplates: builder.query<
      DiagnosisTemplate[],
      { include_archived?: boolean } | void
    >({
      query: (params) => ({
        url: "/diagnosis-templates",
        params: params?.include_archived ? { include_archived: "true" } : undefined,
      }),
      transformResponse: (r: { data: DiagnosisTemplate[] }) => r.data ?? [],
      providesTags: ["DiagnosisTemplate"],
    }),

    getDiagnosisTemplate: builder.query<DiagnosisTemplate, string>({
      query: (id) => `/diagnosis-templates/${id}`,
      transformResponse: (r: { data: DiagnosisTemplate }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "DiagnosisTemplate", id }],
    }),

    getDiagnosisTemplateForm: builder.query<UserFormConfigGrouped, string>({
      query: (id) => `/diagnosis-templates/${id}/form-config`,
      transformResponse: (r: { data: UserFormConfigGrouped }) => r.data,
      providesTags: ["FormFields", "FormFieldGroups", "DiagnosisTemplate"],
    }),

    createDiagnosisTemplate: builder.mutation<
      DiagnosisTemplate,
      { title: string; description?: string; seed_defaults?: boolean }
    >({
      query: (body) => ({ url: "/diagnosis-templates", method: "POST", body }),
      transformResponse: (r: { data: DiagnosisTemplate }) => r.data,
      invalidatesTags: ["DiagnosisTemplate"],
    }),

    updateDiagnosisTemplate: builder.mutation<
      DiagnosisTemplate,
      { templateId: string; body: Partial<DiagnosisTemplate> }
    >({
      query: ({ templateId, body }) => ({
        url: `/diagnosis-templates/${templateId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: DiagnosisTemplate }) => r.data,
      invalidatesTags: ["DiagnosisTemplate"],
    }),

    archiveDiagnosisTemplate: builder.mutation<DiagnosisTemplate, string>({
      query: (id) => ({
        url: `/diagnosis-templates/${id}/archive`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: DiagnosisTemplate }) => r.data,
      invalidatesTags: ["DiagnosisTemplate"],
    }),

    deleteDiagnosisTemplate: builder.mutation<void, string>({
      query: (id) => ({ url: `/diagnosis-templates/${id}`, method: "DELETE" }),
      invalidatesTags: ["DiagnosisTemplate"],
    }),

    duplicateDiagnosisTemplate: builder.mutation<
      DiagnosisTemplate,
      { templateId: string; title?: string }
    >({
      query: ({ templateId, title }) => ({
        url: `/diagnosis-templates/${templateId}/duplicate`,
        method: "POST",
        body: title ? { title } : {},
      }),
      transformResponse: (r: { data: DiagnosisTemplate }) => r.data,
      invalidatesTags: ["DiagnosisTemplate"],
    }),

    createTemplateGroup: builder.mutation<
      FormFieldGroup,
      { templateId: string; body: { title: string; description?: string } }
    >({
      query: ({ templateId, body }) => ({
        url: `/diagnosis-templates/${templateId}/groups`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FormFieldGroup }) => r.data,
      invalidatesTags: ["FormFields", "FormFieldGroups", "DiagnosisTemplate"],
    }),

    updateTemplateGroup: builder.mutation<
      FormFieldGroup,
      { templateId: string; groupId: string; body: Partial<FormFieldGroup> }
    >({
      query: ({ templateId, groupId, body }) => ({
        url: `/diagnosis-templates/${templateId}/groups/${groupId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    deleteTemplateGroup: builder.mutation<void, { templateId: string; groupId: string }>({
      query: ({ templateId, groupId }) => ({
        url: `/diagnosis-templates/${templateId}/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    reorderTemplateGroups: builder.mutation<
      FormFieldGroup[],
      { templateId: string; ids: string[] }
    >({
      query: ({ templateId, ids }) => ({
        url: `/diagnosis-templates/${templateId}/groups/reorder`,
        method: "PUT",
        body: { ids },
      }),
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    createTemplateField: builder.mutation<
      FormField,
      { templateId: string; body: CreateFormFieldPayload }
    >({
      query: ({ templateId, body }) => ({
        url: `/diagnosis-templates/${templateId}/fields`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    updateTemplateField: builder.mutation<
      FormField,
      { templateId: string; fieldId: string; body: UpdateFormFieldPayload }
    >({
      query: ({ templateId, fieldId, body }) => ({
        url: `/diagnosis-templates/${templateId}/fields/${fieldId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    deleteTemplateField: builder.mutation<void, { templateId: string; fieldId: string }>({
      query: ({ templateId, fieldId }) => ({
        url: `/diagnosis-templates/${templateId}/fields/${fieldId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    reorderTemplateFields: builder.mutation<
      UserFormConfigGrouped,
      { templateId: string; ids: string[] }
    >({
      query: ({ templateId, ids }) => ({
        url: `/diagnosis-templates/${templateId}/fields/reorder`,
        method: "PUT",
        body: { ids },
      }),
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),
  }),
});

export const {
  useListDiagnosisTemplatesQuery,
  useGetDiagnosisTemplateQuery,
  useGetDiagnosisTemplateFormQuery,
  useCreateDiagnosisTemplateMutation,
  useUpdateDiagnosisTemplateMutation,
  useArchiveDiagnosisTemplateMutation,
  useDeleteDiagnosisTemplateMutation,
  useDuplicateDiagnosisTemplateMutation,
  useCreateTemplateGroupMutation,
  useUpdateTemplateGroupMutation,
  useDeleteTemplateGroupMutation,
  useReorderTemplateGroupsMutation,
  useCreateTemplateFieldMutation,
  useUpdateTemplateFieldMutation,
  useDeleteTemplateFieldMutation,
  useReorderTemplateFieldsMutation,
} = diagnosisTemplateApi;
