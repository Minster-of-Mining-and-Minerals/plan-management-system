import { baseApi } from "../baseApi";
import type { PrescriptionTemplate } from "../types/prescription";

export const prescriptionTemplateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPrescriptionTemplates: builder.query<
      PrescriptionTemplate[],
      {
        category_id?: string;
        search?: string;
        include_archived?: boolean;
      } | void
    >({
      query: (params) => ({
        url: "/prescription-templates",
        params: params
          ? {
              ...params,
              include_archived: params.include_archived ? "true" : undefined,
            }
          : undefined,
      }),
      transformResponse: (r: { data: PrescriptionTemplate[] }) => r.data ?? [],
      providesTags: ["PrescriptionTemplate"],
    }),
    getPrescriptionTemplate: builder.query<PrescriptionTemplate, string>({
      query: (templateId) => `/prescription-templates/${templateId}`,
      transformResponse: (r: { data: PrescriptionTemplate }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "PrescriptionTemplate", id }],
    }),
    createPrescriptionTemplate: builder.mutation<
      PrescriptionTemplate,
      Partial<PrescriptionTemplate> & { items?: PrescriptionTemplate["items"] }
    >({
      query: (body) => ({ url: "/prescription-templates", method: "POST", body }),
      transformResponse: (r: { data: PrescriptionTemplate }) => r.data,
      invalidatesTags: ["PrescriptionTemplate"],
    }),
    updatePrescriptionTemplate: builder.mutation<
      PrescriptionTemplate,
      { templateId: string; body: Partial<PrescriptionTemplate> }
    >({
      query: ({ templateId, body }) => ({
        url: `/prescription-templates/${templateId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: PrescriptionTemplate }) => r.data,
      invalidatesTags: ["PrescriptionTemplate"],
    }),
    archivePrescriptionTemplate: builder.mutation<PrescriptionTemplate, string>({
      query: (templateId) => ({
        url: `/prescription-templates/${templateId}/archive`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: PrescriptionTemplate }) => r.data,
      invalidatesTags: ["PrescriptionTemplate"],
    }),
  }),
});

export const {
  useListPrescriptionTemplatesQuery,
  useGetPrescriptionTemplateQuery,
  useCreatePrescriptionTemplateMutation,
  useUpdatePrescriptionTemplateMutation,
  useArchivePrescriptionTemplateMutation,
} = prescriptionTemplateApi;
