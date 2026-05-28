import { baseApi } from "../baseApi";
import type { UserFormConfigGrouped } from "../types/formField";
import type { DiagnosisFormConfig } from "./diagnosisFormApi";
import type { StaffAppointment } from "./appointmentApi";

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

export type WorkflowContext = {
  appointment: StaffAppointment & {
    workflow_status?: string;
    workflow_completed_at?: string | null;
  };
  timeline: MedicalHistoryLog[];
  formConfig: DiagnosisFormConfig | null;
  form: UserFormConfigGrouped | null;
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
  }),
});

export const {
  useGetWorkflowContextQuery,
  useSubmitWorkflowEntryMutation,
  useGetPatientMedicalTimelineQuery,
  useGetWorkflowInboxQuery,
  useGetWorkflowReceiversQuery,
} = medicalWorkflowApi;
