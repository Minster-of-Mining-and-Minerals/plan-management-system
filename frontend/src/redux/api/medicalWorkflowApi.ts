import { baseApi } from "../baseApi";
import type { UserFormConfigGrouped } from "../types/formField";
import type { DiagnosisFormConfig } from "./diagnosisFormApi";
import type { StaffAppointment } from "./appointmentApi";
import type { PrescriptionRecord } from "../types/prescription";

export type WorkflowActionType =
  | "submit"
  | "forward"
  | "return"
  | "prescribe"
  | "complete";

export type MedicalHistoryLog = {
  log_id: string;
  patient_id: string;
  appointment_id: string;
  sender_staff_id: string;
  receiver_staff_id?: string | null;
  action_type: WorkflowActionType;
  header_title: string;
  form_config_id?: string | null;
  form_data: Record<string, unknown>;
  attachment_ids: string[];
  notes?: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
  sender?: {
    user_id: string;
    full_name: string;
    internalProfile?: {
      departmentRef?: { name: string };
      titleRef?: { name: string };
    };
  };
  receiver?: {
    user_id: string;
    full_name: string;
    internalProfile?: {
      departmentRef?: { name: string };
    };
  };
  formConfig?: { config_id: string; title: string };
  formSchema?: UserFormConfigGrouped | null;
  appointment?: { appointment_id: string; workflow_status: string };
  /** Attached for prescribe logs when loading appointment timeline */
  prescription?: PrescriptionRecord | null;
};

export type WorkflowTask = {
  task_id: string;
  appointment_id: string;
  patient_id: string;
  assignee_staff_id: string;
  assigned_by_staff_id?: string | null;
  medical_log_id?: string | null;
  status: "pending" | "done" | "cancelled";
  created_at: string;
  appointment?: StaffAppointment;
  assignedBy?: { user_id: string; full_name: string };
  medicalLog?: {
    log_id: string;
    header_title: string;
    action_type: string;
    created_at: string;
  };
};

export type StaffDiagnosisFormOption = {
  config: DiagnosisFormConfig;
  form: UserFormConfigGrouped | null;
};

export type WorkflowContext = {
  appointment: StaffAppointment & {
    workflow_status?: string;
    workflow_completed_at?: string | null;
  };
  timeline: MedicalHistoryLog[];
  formConfig: DiagnosisFormConfig | null;
  form: UserFormConfigGrouped | null;
  formOptions?: StaffDiagnosisFormOption[];
  pendingTask: WorkflowTask | null;
  workflowActive: boolean;
  returnCandidates: { user_id: string; full_name: string }[];
};

export type WorkflowReceiver = {
  user_id: string;
  full_name: string;
  email?: string;
  internalProfile?: {
    departmentRef?: { name: string };
    titleRef?: { name: string };
  };
};

export type SubmitWorkflowPayload = {
  appointment_id: string;
  header_title: string;
  action_type: WorkflowActionType;
  receiver_staff_id?: string;
  form_data?: Record<string, unknown>;
  form_config_id?: string;
  attachment_ids?: string[];
  notes?: string;
  partial?: boolean;
};

// ── Encounter Validation Engine Types ────────────────────────────────────────

export type ValidationIssue = {
  code: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  resolutionHint?: string;
};

export type ValidationResult = {
  canComplete: boolean;
  blockingIssues: ValidationIssue[];
  warnings: ValidationIssue[];
  recommendations: ValidationIssue[];
  validationSummary: {
    totalRulesEvaluated: number;
    contextData: Record<string, boolean | number>;
  };
};

export type ExecuteCompletionPayload = {
  appointmentId: string;
  overrideReason?: string;
  overriddenWarnings?: ValidationIssue[];
};

// ─────────────────────────────────────────────────────────────────────────────

export const medicalWorkflowApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkflowContext: builder.query<WorkflowContext, string>({
      query: (appointmentId) =>
        `/workflow/appointment/${appointmentId}/context`,
      transformResponse: (r: { data: WorkflowContext }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "MedicalWorkflow", id }],
    }),

    submitWorkflowEntry: builder.mutation<MedicalHistoryLog, SubmitWorkflowPayload>({
      query: (body) => ({
        url: "/workflow/submit",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MedicalHistoryLog }) => r.data,
      invalidatesTags: (_r, _e, { appointment_id }) => [
        { type: "MedicalWorkflow", id: appointment_id },
        { type: "MedicalWorkflow", id: "INBOX" },
        { type: "MedicalWorkflow" },
        "Notification",
      ],
    }),

    getPatientMedicalTimeline: builder.query<MedicalHistoryLog[], string>({
      query: (patientId) =>
        `/workflow/timeline?patient_id=${encodeURIComponent(patientId)}`,
      transformResponse: (r: { data: MedicalHistoryLog[] }) => r.data,
      providesTags: (_r, _e, patientId) => [
        { type: "MedicalWorkflow", id: `patient-${patientId}` },
      ],
    }),

    getScheduleMedicalTimeline: builder.query<MedicalHistoryLog[], string>({
      query: (scheduleId) =>
        `/workflow/timeline?schedule_id=${encodeURIComponent(scheduleId)}`,
      transformResponse: (r: { data: MedicalHistoryLog[] }) => r.data,
      providesTags: (_r, _e, scheduleId) => [
        { type: "MedicalWorkflow", id: `schedule-${scheduleId}` },
      ],
    }),

    getWorkflowInbox: builder.query<WorkflowTask[], { status?: string } | void>({
      query: (params) => {
        const status = params?.status ?? "pending";
        return `/workflow/inbox?status=${encodeURIComponent(status)}`;
      },
      transformResponse: (r: { data: WorkflowTask[] }) => r.data,
      providesTags: [{ type: "MedicalWorkflow", id: "INBOX" }],
    }),

    getWorkflowReceivers: builder.query<WorkflowReceiver[], void>({
      query: () => "/workflow/receivers",
      transformResponse: (r: { data: WorkflowReceiver[] }) => r.data,
    }),

    // Encounter Validation Engine
    validateEncounterCompletion: builder.query<ValidationResult, string>({
      query: (appointmentId) =>
        `/workflow/appointment/${appointmentId}/validate-completion`,
      transformResponse: (r: { data: ValidationResult }) => r.data,
    }),

    executeEncounterCompletion: builder.mutation<
      MedicalHistoryLog,
      ExecuteCompletionPayload
    >({
      query: ({ appointmentId, ...body }) => ({
        url: `/workflow/appointment/${appointmentId}/execute-completion`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MedicalHistoryLog }) => r.data,
      invalidatesTags: (_r, _e, { appointmentId }) => [
        { type: "MedicalWorkflow", id: appointmentId },
        { type: "MedicalWorkflow", id: "INBOX" },
        { type: "MedicalWorkflow" },
        "Notification",
      ],
    }),
  }),
});

export const {
  useGetWorkflowContextQuery,
  useSubmitWorkflowEntryMutation,
  useGetPatientMedicalTimelineQuery,
  useGetScheduleMedicalTimelineQuery,
  useGetWorkflowInboxQuery,
  useGetWorkflowReceiversQuery,
  useLazyValidateEncounterCompletionQuery,
  useExecuteEncounterCompletionMutation,
} = medicalWorkflowApi;
