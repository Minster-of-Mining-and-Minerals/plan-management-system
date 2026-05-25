import { baseApi } from "../baseApi";

export type PatientRecord = {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  is_active?: boolean;
  profile?: {
    patient_profile_id: string;
    patient_code: string;
    qr_code?: string;
    barcode?: string;
    patient_status?: string;
    emergency_contacts?: unknown[];
    insurance_profile?: Record<string, unknown>;
    medical_history_summary?: string;
  };
  custom_fields?: Record<string, unknown>;
};

export const patientApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPatients: builder.query<
      PatientRecord[],
      { search?: string; patient_status?: string; is_active?: boolean } | void
    >({
      query: (params) =>
        params ? { url: "/patients", params } : { url: "/patients" },
      transformResponse: (response: { data: PatientRecord[] }) =>
        response.data ?? [],
      providesTags: ["Patient"],
    }),

    getPatientById: builder.query<PatientRecord, string>({
      query: (id) => `/patients/${id}`,
      transformResponse: (response: { data: PatientRecord }) => response.data,
      providesTags: (_r, _e, id) => [{ type: "Patient", id }],
    }),

    getMyPatientProfile: builder.query<PatientRecord, void>({
      query: () => "/patients/me/profile",
      transformResponse: (response: { data: PatientRecord }) => response.data,
    }),

    createPatient: builder.mutation<PatientRecord, Record<string, unknown>>({
      query: (body) => ({
        url: "/patients",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: PatientRecord }) => response.data,
      invalidatesTags: ["Patient"],
    }),

    updatePatient: builder.mutation<
      PatientRecord,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/patients/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: PatientRecord }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "Patient", id }, "Patient"],
    }),
  }),
});

export const {
  useGetPatientsQuery,
  useGetPatientByIdQuery,
  useGetMyPatientProfileQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
} = patientApi;
