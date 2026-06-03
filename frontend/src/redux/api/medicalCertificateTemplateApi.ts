import { baseApi } from "../baseApi";
import type {
  MedicalCertificatePlaceholder,
  MedicalCertificateTemplate,
} from "../types/medicalCertificate";

export const medicalCertificateTemplateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMedicalCertificateTemplates: builder.query<
      MedicalCertificateTemplate[],
      { status?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/medical-certificate-templates",
        params: params || undefined,
      }),
      transformResponse: (r: { data: MedicalCertificateTemplate[] }) => r.data ?? [],
      providesTags: ["MedicalCertificateTemplate"],
    }),
    getMedicalCertificateTemplate: builder.query<MedicalCertificateTemplate, string>({
      query: (id) => `/medical-certificate-templates/${id}`,
      transformResponse: (r: { data: MedicalCertificateTemplate }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "MedicalCertificateTemplate", id }],
    }),
    getMedicalCertificatePlaceholders: builder.query<
      MedicalCertificatePlaceholder[],
      void
    >({
      query: () => "/medical-certificate-templates/placeholders",
      transformResponse: (r: { data: MedicalCertificatePlaceholder[] }) => r.data ?? [],
    }),
    createMedicalCertificateTemplate: builder.mutation<
      MedicalCertificateTemplate,
      Partial<MedicalCertificateTemplate>
    >({
      query: (body) => ({
        url: "/medical-certificate-templates",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MedicalCertificateTemplate }) => r.data,
      invalidatesTags: ["MedicalCertificateTemplate"],
    }),
    updateMedicalCertificateTemplate: builder.mutation<
      MedicalCertificateTemplate,
      { templateId: string; body: Partial<MedicalCertificateTemplate> }
    >({
      query: ({ templateId, body }) => ({
        url: `/medical-certificate-templates/${templateId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: MedicalCertificateTemplate }) => r.data,
      invalidatesTags: ["MedicalCertificateTemplate"],
    }),
    deleteMedicalCertificateTemplate: builder.mutation<
      MedicalCertificateTemplate,
      string
    >({
      query: (templateId) => ({
        url: `/medical-certificate-templates/${templateId}`,
        method: "DELETE",
      }),
      transformResponse: (r: { data: MedicalCertificateTemplate }) => r.data,
      invalidatesTags: ["MedicalCertificateTemplate"],
    }),
  }),
});

export const {
  useListMedicalCertificateTemplatesQuery,
  useGetMedicalCertificateTemplateQuery,
  useGetMedicalCertificatePlaceholdersQuery,
  useCreateMedicalCertificateTemplateMutation,
  useUpdateMedicalCertificateTemplateMutation,
  useDeleteMedicalCertificateTemplateMutation,
} = medicalCertificateTemplateApi;
