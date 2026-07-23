import { baseApi } from "../baseApi";

// ── Types ────────────────────────────────────────────────────────────────────

export type FollowUpPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type FollowUpStatus =
  | "RECOMMENDED"
  | "PENDING_SCHEDULING"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "MISSED";

export type AttemptStatus = "SCHEDULED" | "MISSED" | "CANCELLED" | "ATTENDED";

export type FollowUpAttempt = {
  attempt_id: string;
  follow_up_id: string;
  schedule_id: string | null;
  attempt_number: number;
  status: AttemptStatus;
  scheduled_date: string | null;
  scheduled_at: string | null;
  attended_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  missed_reason: string | null;
  notes: string | null;
  scheduled_by: string | null;
  created_at: string;
  updated_at: string;
  schedule?: {
    schedule_id: string;
    schedule_date: string;
    start_time: string;
    end_time: string;
    status: string;
    appointment_type: string;
    assigned_staff_id: string;
    staff?: {
      user_id: string;
      full_name: string;
    };
  } | null;
  scheduler?: {
    user_id: string;
    full_name: string;
  } | null;
};

export type FollowUpRecord = {
  follow_up_id: string;
  patient_id: string;
  appointment_id: string;
  recommended_by: string;
  assigned_department_id: string | null;
  assigned_user_id: string | null;
  reason: string;
  clinical_instructions: string | null;
  priority: FollowUpPriority;
  recommended_date: string;
  target_date: string | null;
  status: FollowUpStatus;
  completion_notes: string | null;
  completed_encounter_id: string | null;
  cancel_reason: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Included relations
  patient?: {
    user_id: string;
    full_name: string;
    email: string;
    phone_number: string;
  };
  appointment?: {
    appointment_id: string;
    workflow_status: string;
    workflow_completed_at: string | null;
  };
  recommender?: {
    user_id: string;
    full_name: string;
  };
  assignedDepartment?: {
    department_id: string;
    name: string;
  };
  assignedUser?: {
    user_id: string;
    full_name: string;
  };
  attempts?: FollowUpAttempt[];
  completedEncounter?: {
    appointment_id: string;
    workflow_status: string;
    workflow_completed_at: string | null;
  };
  createdByUser?: {
    user_id: string;
    full_name: string;
  };
  updatedByUser?: {
    user_id: string;
    full_name: string;
  };
};

export type CreateFollowUpPayload = {
  patient_id: string;
  appointment_id: string;
  recommended_by: string;
  reason: string;
  clinical_instructions?: string;
  priority?: FollowUpPriority;
  recommended_date?: string;
  target_date?: string;
  assigned_department_id?: string;
  assigned_user_id?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateFollowUpPayload = {
  reason?: string;
  clinical_instructions?: string;
  priority?: FollowUpPriority;
  recommended_date?: string;
  target_date?: string;
  assigned_department_id?: string;
  assigned_user_id?: string;
  metadata?: Record<string, unknown>;
};

export type ScheduleAppointmentPayload = {
  assigned_staff_id: string;
  schedule_date: string;
  start_time: string;
  appointment_type?: string;
  notes?: string;
};

export type RescheduleAttemptPayload = {
  assigned_staff_id: string;
  schedule_date: string;
  start_time: string;
  appointment_type?: string;
  notes?: string;
};

export type AutoCompletePayload = {
  schedule_id: string;
  new_encounter_id: string;
};

export type FollowUpCounts = {
  RECOMMENDED: number;
  PENDING_SCHEDULING: number;
  SCHEDULED: number;
  COMPLETED: number;
  CANCELLED: number;
  EXPIRED: number;
  MISSED: number;
};

// ── Phase 2.4.4 - Follow-up Outcome Types ────────────────────────────────────

export type FollowUpOutcomeStatus =
  | "RESOLVED"
  | "IMPROVED"
  | "STABLE"
  | "WORSENED"
  | "REFERRED"
  | "LOST_TO_FOLLOW_UP"
  | "PATIENT_DECLINED"
  | "OTHER";

export type FollowUpOutcome = {
  follow_up_outcome_id: string;
  follow_up_id: string;
  encounter_id: string;
  outcome_status: FollowUpOutcomeStatus;
  treatment_response?: string | null;
  resolution_notes?: string | null;
  requires_additional_follow_up: boolean;
  recorded_by: string;
  recorder?: { user_id: string; full_name: string };
  encounter?: {
    appointment_id: string;
    workflow_status: string;
    workflow_completed_at?: string | null;
  };
  recorded_at: string;
  created_at: string;
  updated_at: string;
};

export type FollowUpChainItem = {
  follow_up_id: string;
  status: string;
  reason: string;
  priority: string;
  recommended_date: string;
  target_date?: string | null;
  clinical_instructions?: string | null;
  parent_follow_up_id?: string | null;
  appointment_id?: string | null;
  completed_encounter_id?: string | null;
  outcome: {
    outcome_status: FollowUpOutcomeStatus;
    treatment_response?: string | null;
    resolution_notes?: string | null;
    requires_additional_follow_up: boolean;
    recorded_at: string;
  } | null;
};

export type CreateOutcomePayload = {
  encounter_id: string;
  outcome_status: FollowUpOutcomeStatus;
  treatment_response?: string;
  resolution_notes?: string;
  requires_additional_follow_up?: boolean;
};

export type UpdateOutcomePayload = {
  outcome_status?: FollowUpOutcomeStatus;
  treatment_response?: string;
  resolution_notes?: string;
  requires_additional_follow_up?: boolean;
};

export type CreateNextFollowUpPayload = {
  patient_id?: string;
  appointment_id: string;
  assigned_department_id?: string;
  assigned_user_id?: string;
  reason: string;
  clinical_instructions?: string;
  priority?: string;
  recommended_date?: string;
  target_date?: string;
};

export type OutcomeAnalytics = {
  distribution: Record<string, number>;
  resolution_rate: number;
  worsened_rate: number;
  referral_rate: number;
  lost_follow_up_rate: number;
  average_resolution_time_days: number | null;
  average_chain_length: number;
  per_provider: Array<{
    user_id: string;
    full_name: string;
    count: number;
  }>;
  per_specialty: Array<{
    department_id: string | null;
    department_name: string;
    count: number;
  }>;
};

// ── API Slice ─────────────────────────────────────────────────────────────────

export const followUpApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── CRUD ────────────────────────────────────────────────────────────────

    createFollowUp: builder.mutation<FollowUpRecord, CreateFollowUpPayload>({
      query: (body) => ({
        url: "/follow-ups",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      invalidatesTags: ["FollowUp"],
    }),

    getFollowUp: builder.query<FollowUpRecord, string>({
      query: (id) => `/follow-ups/${id}`,
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "FollowUp", id }],
    }),

    updateFollowUp: builder.mutation<
      FollowUpRecord,
      { id: string; data: UpdateFollowUpPayload }
    >({
      query: ({ id, data }) => ({
        url: `/follow-ups/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "FollowUp", id },
        { type: "FollowUp" },
      ],
    }),

    cancelFollowUp: builder.mutation<
      FollowUpRecord,
      { id: string; cancel_reason?: string }
    >({
      query: ({ id, cancel_reason }) => ({
        url: `/follow-ups/${id}/cancel`,
        method: "POST",
        body: { cancel_reason },
      }),
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "FollowUp", id },
        { type: "FollowUp" },
      ],
    }),

    completeFollowUp: builder.mutation<
      FollowUpRecord,
      { id: string; completed_encounter_id: string; completion_notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/follow-ups/${id}/complete`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "FollowUp", id },
        { type: "FollowUp" },
      ],
    }),

    getFollowUpHistory: builder.query<FollowUpRecord, string>({
      query: (id) => `/follow-ups/${id}/history`,
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "FollowUp", id }],
    }),

    // ── Patient-scoped ──────────────────────────────────────────────────────

    listPatientFollowUps: builder.query<
      { data: FollowUpRecord[]; count: number },
      { patientId: string; status?: string; limit?: number; offset?: number }
    >({
      query: ({ patientId, status, limit, offset }) => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (limit) params.set("limit", String(limit));
        if (offset) params.set("offset", String(offset));
        return `/follow-ups/patients/${patientId}/follow-ups?${params.toString()}`;
      },
      transformResponse: (r: { data: FollowUpRecord[]; count: number }) => r,
      providesTags: (_r, _e, { patientId }) => [
        { type: "FollowUp", id: `patient-${patientId}` },
      ],
    }),

    // ── Attempt-based ───────────────────────────────────────────────────────

    createAttempt: builder.mutation<
      FollowUpRecord,
      {
        id: string;
        schedule_id: string;
        scheduled_date?: string;
        notes?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/follow-ups/${id}/attempts`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "FollowUp", id },
        { type: "FollowUp" },
      ],
    }),

    listAttempts: builder.query<FollowUpAttempt[], string>({
      query: (id) => `/follow-ups/${id}/attempts`,
      transformResponse: (r: { data: FollowUpAttempt[] }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "FollowUp", id }],
    }),

    markAttemptMissed: builder.mutation<
      FollowUpAttempt,
      { attemptId: string; missed_reason?: string }
    >({
      query: ({ attemptId, ...body }) => ({
        url: `/follow-ups/attempts/${attemptId}/missed`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FollowUpAttempt }) => r.data,
      invalidatesTags: ["FollowUp"],
    }),

    markAttemptAttended: builder.mutation<
      FollowUpRecord,
      {
        attemptId: string;
        completed_encounter_id: string;
        completion_notes?: string;
      }
    >({
      query: ({ attemptId, ...body }) => ({
        url: `/follow-ups/attempts/${attemptId}/attended`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      invalidatesTags: ["FollowUp"],
    }),

    markAttemptCancelled: builder.mutation<
      FollowUpAttempt,
      { attemptId: string; cancel_reason?: string }
    >({
      query: ({ attemptId, ...body }) => ({
        url: `/follow-ups/attempts/${attemptId}/cancel`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FollowUpAttempt }) => r.data,
      invalidatesTags: ["FollowUp"],
    }),

    // ── Phase 2.4.2 - Scheduling Workflow ───────────────────────────────────

    scheduleAppointment: builder.mutation<
      FollowUpRecord,
      { id: string; data: ScheduleAppointmentPayload }
    >({
      query: ({ id, data }) => ({
        url: `/follow-ups/${id}/schedule-appointment`,
        method: "POST",
        body: data,
      }),
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "FollowUp", id },
        { type: "FollowUp" },
      ],
    }),

    rescheduleAttempt: builder.mutation<
      FollowUpRecord,
      {
        id: string;
        previousAttemptId: string;
        data: RescheduleAttemptPayload;
      }
    >({
      query: ({ id, previousAttemptId, data }) => ({
        url: `/follow-ups/${id}/reschedule/${previousAttemptId}`,
        method: "POST",
        body: data,
      }),
      transformResponse: (r: { data: FollowUpRecord }) => r.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "FollowUp", id },
        { type: "FollowUp" },
      ],
    }),

    listFollowUpsByStatus: builder.query<
      { data: FollowUpRecord[]; count: number },
      {
        status?: string;
        statuses?: string;
        assigned_department_id?: string;
        assigned_user_id?: string;
        patient_id?: string;
        limit?: number;
        offset?: number;
      }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.set("status", params.status);
        if (params.statuses) searchParams.set("statuses", params.statuses);
        if (params.assigned_department_id)
          searchParams.set("assigned_department_id", params.assigned_department_id);
        if (params.assigned_user_id)
          searchParams.set("assigned_user_id", params.assigned_user_id);
        if (params.patient_id) searchParams.set("patient_id", params.patient_id);
        if (params.limit) searchParams.set("limit", String(params.limit));
        if (params.offset) searchParams.set("offset", String(params.offset));
        return `/follow-ups/queue/list?${searchParams.toString()}`;
      },
      transformResponse: (r: { data: FollowUpRecord[]; count: number }) => r,
      providesTags: [{ type: "FollowUp", id: "QUEUE" }],
    }),

    findFollowUpBySchedule: builder.query<FollowUpRecord | null, string>({
      query: (scheduleId) => `/follow-ups/by-schedule/${scheduleId}`,
      transformResponse: (r: { data: FollowUpRecord | null }) => r.data,
      providesTags: (_r, _e, scheduleId) => [
        { type: "FollowUp", id: `schedule-${scheduleId}` },
      ],
    }),

    autoCompleteFollowUp: builder.mutation<
      FollowUpRecord | null,
      AutoCompletePayload
    >({
      query: (body) => ({
        url: "/follow-ups/auto-complete",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FollowUpRecord | null }) => r.data,
      invalidatesTags: ["FollowUp"],
    }),

    getFollowUpCounts: builder.query<FollowUpCounts, void>({
      query: () => "/follow-ups/counts/all",
      transformResponse: (r: { data: FollowUpCounts }) => r.data,
      providesTags: [{ type: "FollowUp", id: "COUNTS" }],
    }),

    // ── Phase 2.4.4 - Follow-up Outcome & Chain ─────────────────────────────

    getFollowUpOutcome: builder.query<FollowUpOutcome | null, string>({
      query: (followUpId) => `/follow-ups/${followUpId}/outcome`,
      transformResponse: (r: { data: FollowUpOutcome | null }) => r.data,
      providesTags: (_r, _e, followUpId) => [
        { type: "FollowUp", id: `outcome-${followUpId}` },
      ],
    }),

    createFollowUpOutcome: builder.mutation<
      FollowUpOutcome,
      { followUpId: string; data: CreateOutcomePayload }
    >({
      query: ({ followUpId, data }) => ({
        url: `/follow-ups/${followUpId}/outcome`,
        method: "POST",
        body: data,
      }),
      transformResponse: (r: { data: FollowUpOutcome }) => r.data,
      invalidatesTags: (_r, _e, { followUpId }) => [
        { type: "FollowUp", id: `outcome-${followUpId}` },
        { type: "FollowUp", id: followUpId },
      ],
    }),

    updateFollowUpOutcome: builder.mutation<
      FollowUpOutcome,
      {
        followUpId: string;
        outcomeId: string;
        data: UpdateOutcomePayload;
      }
    >({
      query: ({ followUpId, outcomeId, data }) => ({
        url: `/follow-ups/${followUpId}/outcome/${outcomeId}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (r: { data: FollowUpOutcome }) => r.data,
      invalidatesTags: (_r, _e, { followUpId }) => [
        { type: "FollowUp", id: `outcome-${followUpId}` },
        { type: "FollowUp", id: followUpId },
      ],
    }),

    createNextFollowUp: builder.mutation<
      unknown,
      { followUpId: string; data: CreateNextFollowUpPayload }
    >({
      query: ({ followUpId, data }) => ({
        url: `/follow-ups/${followUpId}/create-next`,
        method: "POST",
        body: data,
      }),
      transformResponse: (r: { data: unknown }) => r.data,
      invalidatesTags: (_r, _e, { followUpId }) => [
        { type: "FollowUp", id: followUpId },
        { type: "FollowUp", id: `chain-${followUpId}` },
      ],
    }),

    getFollowUpChain: builder.query<FollowUpChainItem[], string>({
      query: (followUpId) => `/follow-ups/${followUpId}/chain`,
      transformResponse: (r: { data: FollowUpChainItem[] }) => r.data,
      providesTags: (_r, _e, followUpId) => [
        { type: "FollowUp", id: `chain-${followUpId}` },
      ],
    }),

    getFollowUpOutcomeAnalytics: builder.query<OutcomeAnalytics, void>({
      query: () => "/follow-ups/analytics/outcomes",
      transformResponse: (r: { data: OutcomeAnalytics }) => r.data,
      providesTags: [{ type: "FollowUp", id: "ANALYTICS" }],
    }),
  }),
});

export const {
  // CRUD
  useCreateFollowUpMutation,
  useGetFollowUpQuery,
  useUpdateFollowUpMutation,
  useCancelFollowUpMutation,
  useCompleteFollowUpMutation,
  useGetFollowUpHistoryQuery,
  // Patient-scoped
  useListPatientFollowUpsQuery,
  // Attempt-based
  useCreateAttemptMutation,
  useListAttemptsQuery,
  useMarkAttemptMissedMutation,
  useMarkAttemptAttendedMutation,
  useMarkAttemptCancelledMutation,
  // Phase 2.4.2 - Scheduling Workflow
  useScheduleAppointmentMutation,
  useRescheduleAttemptMutation,
  useListFollowUpsByStatusQuery,
  useFindFollowUpByScheduleQuery,
  useAutoCompleteFollowUpMutation,
  useGetFollowUpCountsQuery,
  // Phase 2.4.4 - Follow-up Outcome & Chain
  useGetFollowUpOutcomeQuery,
  useCreateFollowUpOutcomeMutation,
  useUpdateFollowUpOutcomeMutation,
  useCreateNextFollowUpMutation,
  useGetFollowUpChainQuery,
  useGetFollowUpOutcomeAnalyticsQuery,
} = followUpApi;