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
    date_of_birth?: string | null;
    gender?: string | null;
    blood_group?: string | null;
    marital_status?: string | null;
    nationality?: string | null;
    preferred_language?: string | null;
    registered_at?: string;
    emergency_contacts?: unknown[];
    insurance_profile?: Record<string, unknown>;
    medical_history_summary?: string;
  };
  custom_fields?: Record<string, unknown>;
};

export const patientApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPatients: builder.query<
      {
        patients: PatientRecord[];
        pagination?: {
          total: number;
          totalPages: number;
          currentPage: number;
          limit: number;
        };
      },
      {
        search?: string;
        patient_status?: string;
        is_active?: boolean;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) =>
        params ? { url: "/patients", params } : { url: "/patients" },
      transformResponse: (response: {
        data: PatientRecord[];
        pagination?: {
          total: number;
          totalPages: number;
          currentPage: number;
          limit: number;
        };
      }) => ({
        patients: response.data ?? [],
        pagination: response.pagination,
      }),
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
