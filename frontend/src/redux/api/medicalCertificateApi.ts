import { baseApi } from "../baseApi";
import type {
  MedicalCertificate,
  MedicalCertificateIncludeOptions,
  MedicalCertificatePreviewResult,
} from "../types/medicalCertificate";

export type IssueMedicalCertificatePayload = {
  patient_id: string;
  schedule_id: string;
  appointment_id?: string;
  template_id?: string;
  include_options?: MedicalCertificateIncludeOptions;
  signature_type?: "none" | "user" | "template";
  doctor_notes?: string;
};

export const medicalCertificateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    previewMedicalCertificate: builder.mutation<
      MedicalCertificatePreviewResult,
      IssueMedicalCertificatePayload
    >({
      query: (body) => ({
        url: "/medical-certificates/preview",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MedicalCertificatePreviewResult }) => r.data,
    }),
    issueMedicalCertificate: builder.mutation<
      MedicalCertificate,
      IssueMedicalCertificatePayload
    >({
      query: (body) => ({
        url: "/medical-certificates/issue",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MedicalCertificate }) => r.data,
      invalidatesTags: (_r, _e, arg) => [
        { type: "MedicalCertificate", id: `schedule-${arg.schedule_id}` },
      ],
    }),
    listScheduleMedicalCertificates: builder.query<MedicalCertificate[], string>({
      query: (scheduleId) => `/medical-certificates/schedule/${scheduleId}`,
      transformResponse: (r: { data: MedicalCertificate[] }) => r.data ?? [],
      providesTags: (_r, _e, scheduleId) => [
        { type: "MedicalCertificate", id: `schedule-${scheduleId}` },
      ],
    }),
    getMedicalCertificate: builder.query<MedicalCertificate, string>({
      query: (certificateId) => `/medical-certificates/${certificateId}`,
      transformResponse: (r: { data: MedicalCertificate }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "MedicalCertificate", id }],
    }),
  }),
});

export const {
  usePreviewMedicalCertificateMutation,
  useIssueMedicalCertificateMutation,
  useListScheduleMedicalCertificatesQuery,
  useGetMedicalCertificateQuery,
} = medicalCertificateApi;
