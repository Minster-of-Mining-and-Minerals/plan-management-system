import { baseApi } from "../baseApi";
import type { UserFormConfigGrouped } from "../types/formField";
import type { DiagnosisFormConfig } from "./diagnosisFormApi";
import type { StaffAppointment } from "./appointmentApi";

export type DiagnosisRecord = {
  diagnosis_id: string;
  patient_id: string;
  appointment_id: string;
  assigned_staff_id: string;
  form_config_id: string;
  form_data: Record<string, unknown>;
  status: "draft" | "submitted" | "finalized";
  created_at?: string;
  updated_at?: string;
};

export type AppointmentDiagnosisBundle = {
  appointment: StaffAppointment;
  formConfig: DiagnosisFormConfig;
  form: UserFormConfigGrouped;
  record: DiagnosisRecord | null;
};

export const diagnosisRecordApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppointmentDiagnosis: builder.query<AppointmentDiagnosisBundle, string>({
      query: (appointmentId) => `/diagnosis-records/appointment/${appointmentId}`,
      transformResponse: (r: { data: AppointmentDiagnosisBundle }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "DiagnosisRecord", id }],
    }),

    saveAppointmentDiagnosis: builder.mutation<
      DiagnosisRecord,
      {
        appointmentId: string;
        form_data: Record<string, unknown>;
        status?: "draft" | "submitted" | "finalized";
      }
    >({
      query: ({ appointmentId, form_data, status }) => ({
        url: `/diagnosis-records/appointment/${appointmentId}`,
        method: "PUT",
        body: { form_data, status },
      }),
      transformResponse: (r: { data: DiagnosisRecord }) => r.data,
      invalidatesTags: (_r, _e, { appointmentId }) => [
        { type: "DiagnosisRecord", id: appointmentId },
      ],
    }),
  }),
});

export const {
  useGetAppointmentDiagnosisQuery,
  useSaveAppointmentDiagnosisMutation,
} = diagnosisRecordApi;
