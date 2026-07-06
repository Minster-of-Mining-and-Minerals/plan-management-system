import { baseApi } from "../baseApi";

export type PatientPortalSchedule = {
  schedule_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type?: string | null;
  notes?: string | null;
  doctor: { id: string; name: string; email?: string | null } | null;
  visit?: {
    appointment_id: string;
    status: string;
    workflow_status: string;
  } | null;
};

export type PatientPortalDoctor = {
  id: string;
  name: string;
  department?: string | null;
  department_code?: string | null;
};

export type PatientPortalPrescription = {
  prescription_id: string;
  status: string;
  created_at: string;
  notes?: string | null;
  category?: string | null;
  template_name?: string | null;
  prescriber?: { id: string; name: string } | null;
  item_count: number;
};

export type PatientPortalHistoryEvent = {
  id: string;
  date: string;
  title: string;
  type: string;
  action_type: string;
  status: string;
  provider?: string | null;
  summary?: string | null;
  appointment_id?: string;
};

export type PatientPortalDashboard = {
  next_appointment: PatientPortalSchedule | null;
  upcoming_count: number;
  active_prescriptions_count: number;
  unread_notifications_count: number;
  recent_prescriptions: PatientPortalPrescription[];
  upcoming_appointments: PatientPortalSchedule[];
};

export type PatientPortalNotification = {
  notification_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  category?: string | null;
  related_type?: string | null;
  related_id?: string | null;
};

export const patientPortalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPatientPortalDashboard: builder.query<PatientPortalDashboard, void>({
      query: () => "/patient-portal/dashboard",
      transformResponse: (r: { data: PatientPortalDashboard }) => r.data,
      providesTags: ["PatientPortal"],
    }),

    getPatientPortalSchedules: builder.query<
      PatientPortalSchedule[],
      { from?: string; to?: string; status?: string } | void
    >({
      query: (params) => ({
        url: "/patient-portal/schedules",
        params: params || undefined,
      }),
      transformResponse: (r: { data: PatientPortalSchedule[] }) => r.data ?? [],
      providesTags: ["PatientPortal"],
    }),

    getPatientPortalDoctors: builder.query<PatientPortalDoctor[], void>({
      query: () => "/patient-portal/doctors",
      transformResponse: (r: { data: PatientPortalDoctor[] }) => r.data ?? [],
    }),

    getPatientPortalAvailability: builder.query<
      { date: string; staff_id: string | null; slots: string[] },
      { date: string; staff_id?: string }
    >({
      query: ({ date, staff_id }) => ({
        url: "/patient-portal/availability",
        params: { date, staff_id },
      }),
      transformResponse: (r: { data: { date: string; staff_id: string | null; slots: string[] } }) =>
        r.data,
    }),

    bookPatientPortalSchedule: builder.mutation<
      PatientPortalSchedule,
      {
        assigned_staff_id: string;
        schedule_date: string;
        start_time: string;
        appointment_type?: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/patient-portal/schedules",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: PatientPortalSchedule }) => r.data,
      invalidatesTags: ["PatientPortal"],
    }),

    reschedulePatientPortalSchedule: builder.mutation<
      PatientPortalSchedule,
      {
        id: string;
        schedule_date?: string;
        start_time?: string;
        assigned_staff_id?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/patient-portal/schedules/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (r: { data: PatientPortalSchedule }) => r.data,
      invalidatesTags: ["PatientPortal"],
    }),

    cancelPatientPortalSchedule: builder.mutation<PatientPortalSchedule, string>({
      query: (id) => ({
        url: `/patient-portal/schedules/${id}/cancel`,
        method: "POST",
      }),
      transformResponse: (r: { data: PatientPortalSchedule }) => r.data,
      invalidatesTags: ["PatientPortal"],
    }),

    getPatientPortalPrescriptions: builder.query<PatientPortalPrescription[], void>({
      query: () => "/patient-portal/prescriptions",
      transformResponse: (r: { data: PatientPortalPrescription[] }) => r.data ?? [],
      providesTags: ["PatientPortal"],
    }),

    getPatientPortalMedicalHistory: builder.query<PatientPortalHistoryEvent[], void>({
      query: () => "/patient-portal/medical-history",
      transformResponse: (r: { data: PatientPortalHistoryEvent[] }) => r.data ?? [],
      providesTags: ["PatientPortal"],
    }),

    updatePatientPortalProfile: builder.mutation<
      unknown,
      {
        phone_number?: string;
        emergency_contacts?: unknown;
        insurance_profile?: Record<string, unknown>;
        preferred_language?: string;
      }
    >({
      query: (body) => ({
        url: "/patient-portal/me",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["PatientPortal", "Patient"],
    }),

    getPatientPortalNotifications: builder.query<PatientPortalNotification[], void>({
      query: () => "/patient-portal/notifications",
      transformResponse: (r: { data: PatientPortalNotification[] }) => r.data ?? [],
      providesTags: ["PatientPortal"],
    }),

    getPatientPortalUnreadCount: builder.query<number, void>({
      query: () => "/patient-portal/notifications/unread-count",
      transformResponse: (r: { data: { count: number } }) => r.data?.count ?? 0,
      providesTags: ["PatientPortal"],
    }),

    markPatientPortalNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/patient-portal/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["PatientPortal"],
    }),

    markAllPatientPortalNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: "/patient-portal/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["PatientPortal"],
    }),
  }),
});

export const {
  useGetPatientPortalDashboardQuery,
  useGetPatientPortalSchedulesQuery,
  useGetPatientPortalDoctorsQuery,
  useGetPatientPortalAvailabilityQuery,
  useBookPatientPortalScheduleMutation,
  useReschedulePatientPortalScheduleMutation,
  useCancelPatientPortalScheduleMutation,
  useGetPatientPortalPrescriptionsQuery,
  useGetPatientPortalMedicalHistoryQuery,
  useUpdatePatientPortalProfileMutation,
  useGetPatientPortalNotificationsQuery,
  useGetPatientPortalUnreadCountQuery,
  useMarkPatientPortalNotificationReadMutation,
  useMarkAllPatientPortalNotificationsReadMutation,
} = patientPortalApi;
