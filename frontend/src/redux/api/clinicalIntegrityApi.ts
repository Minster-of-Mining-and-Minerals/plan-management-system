import { baseApi } from "../baseApi";

export type AuditEventItem = {
  id: string;
  event_type: string;
  domain: string;
  entity_type: string;
  entity_id: string;
  patient_id: string;
  actor_id: string;
  actor_role?: string | null;
  action: string;
  previous_value_json?: any;
  new_value_json?: any;
  reason?: string | null;
  timestamp: string;
  patient?: { full_name: string };
  actor?: { full_name: string };
};

export type RecordVersionItem = {
  id: string;
  entity_type: string;
  entity_id: string;
  version_number: number;
  snapshot_json: any;
  changed_by: string;
  change_reason?: string | null;
  created_at: string;
  modifier?: { full_name: string };
};

export type ClinicalAmendmentItem = {
  id: string;
  entity_type: string;
  entity_id: string;
  patient_id: string;
  requested_by: string;
  reviewed_by?: string | null;
  status: "REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  original_content_json?: any;
  proposed_content_json: any;
  clinical_reason: string;
  review_notes?: string | null;
  created_at: string;
  requester?: { full_name: string };
  reviewer?: { full_name: string };
};

export const clinicalIntegrityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditTrail: builder.query<AuditEventItem[], { patient_id?: string; domain?: string; entity_type?: string; entity_id?: string }>({
      query: (params) => {
        const queryStr = new URLSearchParams(params as any).toString();
        return `/clinical-integrity/audit-trail?${queryStr}`;
      },
      transformResponse: (r: { data: AuditEventItem[] }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),

    getRecordVersions: builder.query<RecordVersionItem[], { entity_type: string; entity_id: string }>({
      query: ({ entity_type, entity_id }) => `/clinical-integrity/versions/${entity_type}/${entity_id}`,
      transformResponse: (r: { data: RecordVersionItem[] }) => r.data,
    }),

    requestAmendment: builder.mutation<ClinicalAmendmentItem, { entity_type: string; entity_id: string; patient_id: string; original_content?: any; proposed_content: any; clinical_reason: string }>({
      query: (body) => ({
        url: "/clinical-integrity/amendments/request",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: ClinicalAmendmentItem }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),

    reviewAmendment: builder.mutation<ClinicalAmendmentItem, { amendmentId: string; status: string; review_notes?: string }>({
      query: ({ amendmentId, ...body }) => ({
        url: `/clinical-integrity/amendments/${amendmentId}/review`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: ClinicalAmendmentItem }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),

    getAmendments: builder.query<ClinicalAmendmentItem[], { patient_id?: string; entity_id?: string; status?: string }>({
      query: (params) => {
        const queryStr = new URLSearchParams(params as any).toString();
        return `/clinical-integrity/amendments?${queryStr}`;
      },
      transformResponse: (r: { data: ClinicalAmendmentItem[] }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),

    getComplianceMetrics: builder.query<any, void>({
      query: () => "/clinical-integrity/compliance/metrics",
      transformResponse: (r: { data: any }) => r.data,
    }),
  }),
});

export const {
  useGetAuditTrailQuery,
  useGetRecordVersionsQuery,
  useRequestAmendmentMutation,
  useReviewAmendmentMutation,
  useGetAmendmentsQuery,
  useGetComplianceMetricsQuery,
} = clinicalIntegrityApi;
