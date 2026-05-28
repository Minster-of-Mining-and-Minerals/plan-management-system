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
  useGetScheduleMatrixQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useShiftSchedulesMutation,
} = scheduleApi;
