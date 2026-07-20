import { baseApi } from "../baseApi";
import type { UserFormConfigGrouped } from "../types/formField";

export type SignatureEntry = {
  user_id: string;
  full_name: string;
  signed_at: string;
  signature_value: string;
  hash: string | null;
  public_key: string | null;
};

export type ClinicalDocumentRecord = {
  document_id: string;
  patient_id: string;
  appointment_id?: string | null;
  document_type: string;
  title: string;
  form_config_id?: string | null;
  form_data: Record<string, any>;
  version: number;
  parent_document_id?: string | null;
  status: "draft" | "in_progress" | "submitted" | "reviewed" | "approved" | "finalized" | "final" | "archived";
  created_by: string;
  updated_by: string;
  reviewer_id?: string | null;
  approver_id?: string | null;
  attachment_ids: string[];
  signatures: {
    author?: SignatureEntry;
    reviewer?: SignatureEntry;
    approver?: SignatureEntry;
  };
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  creator?: { user_id: string; full_name: string };
  reviewer?: { user_id: string; full_name: string };
  approver?: { user_id: string; full_name: string };
  formConfig?: { config_id: string; title: string };
};

export type DocumentHistoryResponse = {
  current: ClinicalDocumentRecord;
  history: ClinicalDocumentRecord[];
};

export type ClinicalDocumentFilters = {
  patient_id?: string;
  appointment_id?: string;
  form_config_id?: string;
  created_by?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  keyword?: string;
};

export const clinicalDocumentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listClinicalDocuments: builder.query<ClinicalDocumentRecord[], ClinicalDocumentFilters | void>({
      query: (params) => ({
        url: "/clinical-documents",
        params: params || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ document_id }) => ({ type: "ClinicalDocument" as const, id: document_id })),
              { type: "ClinicalDocument", id: "LIST" },
            ]
          : [{ type: "ClinicalDocument", id: "LIST" }],
    }),

    getClinicalDocument: builder.query<DocumentHistoryResponse, string>({
      query: (documentId) => `/clinical-documents/${documentId}`,
      providesTags: (result, error, id) => [{ type: "ClinicalDocument", id }],
    }),

    createClinicalDocument: builder.mutation<ClinicalDocumentRecord, Partial<ClinicalDocumentRecord>>({
      query: (body) => ({
        url: "/clinical-documents",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ClinicalDocument", id: "LIST" }],
    }),

    updateClinicalDocument: builder.mutation<
      ClinicalDocumentRecord,
      { documentId: string; body: Partial<ClinicalDocumentRecord> }
    >({
      query: ({ documentId, body }) => ({
        url: `/clinical-documents/${documentId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { documentId }) => [
        { type: "ClinicalDocument", id: documentId },
        { type: "ClinicalDocument", id: "LIST" },
      ],
    }),

    signClinicalDocument: builder.mutation<
      ClinicalDocumentRecord,
      {
        documentId: string;
        body: {
          role: "author" | "reviewer" | "approver";
          signature_value: string;
          hash?: string;
          public_key?: string;
        };
      }
    >({
      query: ({ documentId, body }) => ({
        url: `/clinical-documents/${documentId}/sign`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { documentId }) => [
        { type: "ClinicalDocument", id: documentId },
        { type: "ClinicalDocument", id: "LIST" },
      ],
    }),

    transitionClinicalDocumentStatus: builder.mutation<
      ClinicalDocumentRecord,
      {
        documentId: string;
        body: {
          status: string;
          assignee_id?: string;
        };
      }
    >({
      query: ({ documentId, body }) => ({
        url: `/clinical-documents/${documentId}/transition`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { documentId }) => [
        { type: "ClinicalDocument", id: documentId },
        { type: "ClinicalDocument", id: "LIST" },
        { type: "WorkflowTask" as any, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListClinicalDocumentsQuery,
  useGetClinicalDocumentQuery,
  useCreateClinicalDocumentMutation,
  useUpdateClinicalDocumentMutation,
  useSignClinicalDocumentMutation,
  useTransitionClinicalDocumentStatusMutation,
} = clinicalDocumentApi;
