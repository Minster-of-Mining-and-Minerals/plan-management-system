import { baseApi } from "../baseApi";

export type StaffAppointmentStatus = "admitted" | "completed" | "cancelled";

export type AppointmentWorkflowAccess = {
  is_assigned_to_me: boolean;
  is_forwarded_to_me: boolean;
};

export type StaffAppointment = {
  appointment_id: string;
  schedule_id: string;
  patient_id: string;
  assigned_staff_id: string;
  workflow_access?: AppointmentWorkflowAccess;
  admitted_by?: string | null;
  admitted_at: string;
  status: StaffAppointmentStatus;
  workflow_status?: "active" | "completed";
  notes?: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    user_id: string;
    full_name: string;
    email?: string;
    phone_number?: string;
    patientProfile?: { patient_code?: string; patient_status?: string };
  };
  staff?: { user_id: string; full_name: string };
  schedule?: {
    schedule_id: string;
    schedule_date: string;
    start_time: string;
    end_time: string;
    status: string;
    appointment_type?: string | null;
    notes?: string | null;
  };
  admittedByUser?: { user_id: string; full_name: string };
};

export const appointmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyAppointments: builder.query<
      StaffAppointment[],
      {
        search?: string;
        status?: string;
        sort?: string;
        order?: string;
        schedule_date?: string;
      } | void
    >({
      query: (params) => ({
        url: "/appointments/me",
        params: params || undefined,
      }),
      transformResponse: (r: { data: StaffAppointment[] }) => r.data ?? [],
      providesTags: ["StaffAppointment"],
    }),

    getAppointmentById: builder.query<StaffAppointment, string>({
      query: (id) => `/appointments/${id}`,
      transformResponse: (r: { data: StaffAppointment }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "StaffAppointment", id }],
    }),
  }),
});

export const { useGetMyAppointmentsQuery, useGetAppointmentByIdQuery } =
  appointmentApi;
