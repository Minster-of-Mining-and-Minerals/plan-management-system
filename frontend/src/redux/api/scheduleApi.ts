import { baseApi } from "../baseApi";

export type PatientScheduleStatus =
  | "scheduled"
  | "pending"
  | "admitted"
  | "completed"
  | "cancelled"
  | "updated"
  | "rescheduled";

export type DayScheduleConfig = {
  active: boolean;
  start: string;
  end: string;
  lunch_start?: string;
  lunch_end?: string;
};

export type ScheduleSettings = {
  schedule_setting_id: string;
  slot_interval_minutes: number;
  horizon_days: number;
  days_config: Record<string, DayScheduleConfig>;
};

export type PatientSchedule = {
  schedule_id: string;
  patient_id: string;
  assigned_staff_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  status: PatientScheduleStatus;
  appointment_type?: string | null;
  notes?: string | null;
  patient?: {
    user_id: string;
    full_name: string;
    email?: string;
    patientProfile?: { patient_code?: string };
  };
  staff?: { user_id: string; full_name: string };
  staffAppointment?: {
    appointment_id: string;
    status?: string;
    workflow_status?: string;
  } | null;
};

export type EligibleStaff = {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  internalProfile?: {
    departmentRef?: { name: string };
    titleRef?: { name: string };
  };
};

export type ScheduleMatrixResponse = {
  dates: { date: string; dayOfWeek: string; active: boolean; slots: string[] }[];
  settings: ScheduleSettings;
  schedules: PatientSchedule[];
};

export const scheduleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getScheduleConfig: builder.query<ScheduleSettings, void>({
      query: () => "/schedules/config",
      transformResponse: (r: { data: ScheduleSettings }) => r.data,
      providesTags: ["ScheduleConfig"],
    }),

    updateScheduleConfig: builder.mutation<ScheduleSettings, Partial<ScheduleSettings>>({
      query: (body) => ({
        url: "/schedules/config",
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: ScheduleSettings }) => r.data,
      invalidatesTags: ["ScheduleConfig", "PatientSchedule"],
    }),

    getEligibleStaff: builder.query<EligibleStaff[], void>({
      query: () => "/schedules/eligible-staff",
      transformResponse: (r: { data: EligibleStaff[] }) => r.data ?? [],
    }),

    getStaffBookingCounts: builder.query<
      { from: string; to: string; counts: Record<string, number> },
      { from: string; to: string }
    >({
      query: ({ from, to }) => ({
        url: "/schedules/staff-booking-counts",
        params: { from, to },
      }),
      transformResponse: (r: {
        data: { from: string; to: string; counts: Record<string, number> };
      }) => r.data,
    }),

    getScheduleMatrix: builder.query<
      ScheduleMatrixResponse,
      { staff_id: string; from?: string; to?: string }
    >({
      query: ({ staff_id, from, to }) => ({
        url: "/schedules/matrix",
        params: { staff_id, from, to },
      }),
      transformResponse: (r: { data: ScheduleMatrixResponse }) => r.data,
      providesTags: ["PatientSchedule"],
    }),

    getPatientSchedules: builder.query<PatientSchedule[], string>({
      query: (patientId) => ({
        url: "/schedules",
        params: { patient_id: patientId },
      }),
      transformResponse: (r: { data: PatientSchedule[] }) => r.data ?? [],
      providesTags: (_r, _e, patientId) => [
        { type: "PatientSchedule", id: `patient-${patientId}` },
      ],
    }),

    createSchedule: builder.mutation<
      PatientSchedule,
      {
        patient_id: string;
        assigned_staff_id: string;
        schedule_date: string;
        start_time: string;
        status?: PatientScheduleStatus;
        appointment_type?: string;
        notes?: string;
      }
    >({
      query: (body) => ({ url: "/schedules", method: "POST", body }),
      transformResponse: (r: { data: PatientSchedule }) => r.data,
      invalidatesTags: ["PatientSchedule"],
    }),

    updateSchedule: builder.mutation<
      PatientSchedule,
      { id: string; body: Partial<PatientSchedule> }
    >({
      query: ({ id, body }) => ({
        url: `/schedules/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (r: { data: PatientSchedule }) => r.data,
      invalidatesTags: ["PatientSchedule", "StaffAppointment", "Notification"],
    }),

    shiftSchedules: builder.mutation<
      { shifted: number },
      {
        assigned_staff_id: string;
        from_date?: string;
        to_date?: string;
        shift_minutes?: number;
        shift_days?: number;
        anchor_date?: string;
        anchor_time?: string;
        end_date?: string;
        end_time?: string;
        range_mode?:
          | "from_start_to_end"
          | "from_start_to_column"
          | "column_to_column";
      }
    >({
      query: (body) => ({
        url: "/schedules/shift",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: { shifted: number } }) => r.data,
      invalidatesTags: ["PatientSchedule"],
    }),
  }),
});

export const {
  useGetScheduleConfigQuery,
  useUpdateScheduleConfigMutation,
  useGetEligibleStaffQuery,
  useGetStaffBookingCountsQuery,
  useGetScheduleMatrixQuery,
  useGetPatientSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useShiftSchedulesMutation,
} = scheduleApi;
