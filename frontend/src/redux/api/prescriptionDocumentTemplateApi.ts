import { baseApi } from "../baseApi";
import type {
  PrescriptionDocumentPlaceholder,
  PrescriptionDocumentTemplate,
} from "../types/prescriptionDocument";

export const prescriptionDocumentTemplateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPrescriptionDocumentTemplates: builder.query<
      PrescriptionDocumentTemplate[],
      { status?: string; category_id?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/prescription-document-templates",
        params: params || undefined,
      }),
      transformResponse: (r: { data: PrescriptionDocumentTemplate[] }) => r.data ?? [],
      providesTags: ["PrescriptionDocumentTemplate"],
    }),
    getPrescriptionDocumentTemplate: builder.query<PrescriptionDocumentTemplate, string>({
      query: (id) => `/prescription-document-templates/${id}`,
      transformResponse: (r: { data: PrescriptionDocumentTemplate }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "PrescriptionDocumentTemplate", id }],
    }),
    getPrescriptionDocumentPlaceholders: builder.query<
      PrescriptionDocumentPlaceholder[],
      void
    >({
      query: () => "/prescription-document-templates/placeholders",
      transformResponse: (r: { data: PrescriptionDocumentPlaceholder[] }) => r.data ?? [],
    }),
    createPrescriptionDocumentTemplate: builder.mutation<
      PrescriptionDocumentTemplate,
      Partial<PrescriptionDocumentTemplate>
    >({
      query: (body) => ({
        url: "/prescription-document-templates",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: PrescriptionDocumentTemplate }) => r.data,
      invalidatesTags: ["PrescriptionDocumentTemplate"],
    }),
    updatePrescriptionDocumentTemplate: builder.mutation<
      PrescriptionDocumentTemplate,
      { documentTemplateId: string; body: Partial<PrescriptionDocumentTemplate> }
    >({
      query: ({ documentTemplateId, body }) => ({
        url: `/prescription-document-templates/${documentTemplateId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: PrescriptionDocumentTemplate }) => r.data,
      invalidatesTags: ["PrescriptionDocumentTemplate"],
    }),
    deletePrescriptionDocumentTemplate: builder.mutation<
      PrescriptionDocumentTemplate,
      string
    >({
      query: (documentTemplateId) => ({
        url: `/prescription-document-templates/${documentTemplateId}`,
        method: "DELETE",
      }),
      transformResponse: (r: { data: PrescriptionDocumentTemplate }) => r.data,
      invalidatesTags: ["PrescriptionDocumentTemplate"],
    }),
  }),
});

export const {
  useListPrescriptionDocumentTemplatesQuery,
  useGetPrescriptionDocumentTemplateQuery,
  useGetPrescriptionDocumentPlaceholdersQuery,
  useCreatePrescriptionDocumentTemplateMutation,
  useUpdatePrescriptionDocumentTemplateMutation,
  useDeletePrescriptionDocumentTemplateMutation,
} = prescriptionDocumentTemplateApi;
