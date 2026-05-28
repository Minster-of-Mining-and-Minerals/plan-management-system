import { baseApi } from "../baseApi";
import type {
  PrescriptionRecord,
  PrescriptionPreviewResult,
  SignatureCapabilities,
  PrescriptionItem,
} from "../types/prescription";

export type CreatePrescriptionPayload = {
  patient_id: string;
  appointment_id?: string;
  category_id?: string;
  template_id?: string;
  document_template_id?: string;
  header_title?: string;
  signature_type: "template" | "user" | "none";
  notes?: string;
  items?: PrescriptionItem[];
  workflow_log_id?: string;
};

export const prescriptionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPrescriptions: builder.query<
      PrescriptionRecord[],
      { patient_id?: string; appointment_id?: string } | void
    >({
      query: (params) => ({ url: "/prescriptions", params: params || undefined }),
      transformResponse: (r: { data: PrescriptionRecord[] }) => r.data ?? [],
      providesTags: (result, _e, arg) => {
        const tags: { type: "Prescription"; id: string }[] = [
          { type: "Prescription", id: "LIST" },
        ];
        if (arg && typeof arg === "object") {
          if (arg.appointment_id) {
            tags.push({ type: "Prescription", id: `APPT-${arg.appointment_id}` });
          }
          if (arg.patient_id) {
            tags.push({ type: "Prescription", id: `PATIENT-${arg.patient_id}` });
          }
        }
        return tags;
      },
    }),
    getPrescription: builder.query<PrescriptionRecord, string>({
      query: (id) => `/prescriptions/${id}`,
      transformResponse: (r: { data: PrescriptionRecord }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "Prescription", id }],
    }),
    getSignatureCapabilities: builder.query<
      SignatureCapabilities,
      { template_id?: string } | void
    >({
      query: (params) => ({
        url: "/prescriptions/signature-capabilities",
        params: params || undefined,
      }),
      transformResponse: (r: { data: SignatureCapabilities }) => r.data,
    }),
    previewPrescription: builder.mutation<
      PrescriptionPreviewResult,
      Partial<CreatePrescriptionPayload>
    >({
      query: (body) => ({ url: "/prescriptions/preview", method: "POST", body }),
      transformResponse: (r: { data: PrescriptionPreviewResult }) => r.data,
    }),
    createPrescription: builder.mutation<PrescriptionRecord, CreatePrescriptionPayload>({
      query: (body) => ({ url: "/prescriptions", method: "POST", body }),
      transformResponse: (r: { data: PrescriptionRecord }) => r.data,
      invalidatesTags: (result) => {
        const tags: (
          | "Prescription"
          | "MedicalWorkflow"
          | { type: "Prescription"; id: string }
        )[] = ["Prescription", "MedicalWorkflow", { type: "Prescription", id: "LIST" }];
        if (result?.appointment_id) {
          tags.push({ type: "Prescription", id: `APPT-${result.appointment_id}` });
        }
        if (result?.patient_id) {
          tags.push({ type: "Prescription", id: `PATIENT-${result.patient_id}` });
        }
        return tags;
      },
    }),
  }),
});

export const {
  useListPrescriptionsQuery,
  useGetPrescriptionQuery,
  useGetSignatureCapabilitiesQuery,
  usePreviewPrescriptionMutation,
  useCreatePrescriptionMutation,
} = prescriptionApi;
