import { baseApi } from "../baseApi";

export type ClinicalIncident = {
  incident_id: string;
  title: string;
  incident_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  department_id: string;
  assigned_to_user_id?: string | null;
  assigned_owner_role?: string | null;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  root_cause?: string | null;
  resolution_notes?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
};

export type ClinicalPlaybook = {
  playbook_id: string;
  incident_type: string;
  title: string;
  description?: string;
  steps: Array<{ step_id: number; title: string; type: string; status: string }>;
  is_active: boolean;
};

export type OperationalMessage = {
  message_id: string;
  incident_id?: string | null;
  sender_id?: string | null;
  recipient_role: string;
  message_type: string;
  content: string;
  channel: string;
  created_at: string;
};

export type IncidentAnalytics = {
  total_incidents: number;
  resolved_incidents_count: number;
  mean_resolution_time_minutes: number;
  incident_frequency_by_type: Record<string, number>;
  severity_distribution: Record<string, number>;
  department_ranking: Array<{ department: string; count: number }>;
  top_root_causes: Record<string, number>;
  automation_effectiveness_pct: number;
  sla_recovery_rate_pct: number;
};

export type ExecutiveIncidentSummary = {
  active_incidents_count: number;
  critical_incidents_count: number;
  mean_resolution_time_minutes: number;
  automation_success_rate_pct: number;
  operational_health_score: number;
  incident_trends: string;
  departments_at_risk: string[];
  top_recurring_incidents: string[];
  active_incidents_list: ClinicalIncident[];
};

export const incidentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getIncidents: builder.query<ClinicalIncident[], Record<string, any> | void>({
      query: (arg) => ({
        url: "/operations/incidents",
        params: arg || {},
      }),
      providesTags: ["ClinicalOrder"],
    }),
    createIncident: builder.mutation<ClinicalIncident, Partial<ClinicalIncident>>({
      query: (body) => ({
        url: "/operations/incidents",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    updateIncidentStatus: builder.mutation<ClinicalIncident, { id: string; status: string; resolution_notes?: string; root_cause?: string }>({
      query: ({ id, ...body }) => ({
        url: `/operations/incidents/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    assignIncident: builder.mutation<ClinicalIncident, { id: string; assigned_to_user_id?: string; assigned_owner_role?: string }>({
      query: ({ id, ...body }) => ({
        url: `/operations/incidents/${id}/assign`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    evaluateRules: builder.mutation<any, void>({
      query: () => ({
        url: "/operations/incidents/evaluate-rules",
        method: "POST",
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    getPlaybooks: builder.query<ClinicalPlaybook[], string | void>({
      query: (incidentType) => `/operations/incidents/playbooks${incidentType ? `?incidentType=${incidentType}` : ""}`,
      providesTags: ["ClinicalOrder"],
    }),
    executePlaybookStep: builder.mutation<any, { playbook_id: string; step_id: number; incident_id?: string }>({
      query: (body) => ({
        url: "/operations/incidents/playbooks/execute-step",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    executeAutomationAction: builder.mutation<any, { recommendation_id: string; action_type: string; target_resource_type?: string; target_resource_id?: string }>({
      query: (body) => ({
        url: "/operations/incidents/automation/execute",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    evaluateCrossDomainImpact: builder.mutation<any, { source_department: string; delay_minutes?: number; patient_id?: string }>({
      query: (body) => ({
        url: "/operations/incidents/cross-domain/evaluate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    getOperationalMessages: builder.query<OperationalMessage[], void>({
      query: () => "/operations/incidents/messages",
      providesTags: ["ClinicalOrder"],
    }),
    sendMessage: builder.mutation<OperationalMessage, { incident_id?: string; recipient_role: string; message_type?: string; content: string }>({
      query: (body) => ({
        url: "/operations/incidents/messages",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    getIncidentAnalytics: builder.query<IncidentAnalytics, void>({
      query: () => "/operations/incidents/analytics",
      providesTags: ["ClinicalOrder"],
    }),
    getExecutiveIncidentSummary: builder.query<ExecutiveIncidentSummary, void>({
      query: () => "/operations/incidents/executive-summary",
      providesTags: ["ClinicalOrder"],
    }),
  }),
});

export const {
  useGetIncidentsQuery,
  useCreateIncidentMutation,
  useUpdateIncidentStatusMutation,
  useAssignIncidentMutation,
  useEvaluateRulesMutation,
  useGetPlaybooksQuery,
  useExecutePlaybookStepMutation,
  useExecuteAutomationActionMutation,
  useEvaluateCrossDomainImpactMutation,
  useGetOperationalMessagesQuery,
  useSendMessageMutation,
  useGetIncidentAnalyticsQuery,
  useGetExecutiveIncidentSummaryQuery,
} = incidentApi;
