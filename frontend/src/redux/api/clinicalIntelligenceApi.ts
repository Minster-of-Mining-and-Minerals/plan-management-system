import { baseApi } from "../baseApi";

export type PatientSnapshot = {
  patient_id: string;
  generated_at: string;
  demographics: Record<string, any>;
  allergies: any[];
  active_medications: any[];
  recent_lab_results: any[];
  recent_radiology_reports: any[];
  active_problems: any[];
  open_alerts: any[];
};

export type RiskScore = {
  patient_id: string;
  assessed_at: string;
  medication_risk: number;
  disease_risk: number;
  followup_risk: number;
  overall_risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: Record<string, number>;
};

export type ClinicalAlertItem = {
  alert_id: string;
  patient_id: string;
  alert_type: string;
  domain: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  recommendation?: string | null;
  status: "OPEN" | "ACKNOWLEDGED" | "ACTION_TAKEN" | "DISMISSED";
  created_at: string;
};

export type ClinicalProblemItem = {
  problem_id: string;
  patient_id: string;
  problem_code?: string | null;
  problem_name: string;
  status: "ACTIVE" | "RESOLVED" | "CHRONIC" | "SUSPECTED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  onset_date?: string | null;
  resolved_date?: string | null;
  notes?: string | null;
  created_at: string;
};

export const clinicalIntelligenceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPatientSnapshot: builder.query<PatientSnapshot, string>({
      query: (patientId) => `/clinical-intelligence/patients/${patientId}/snapshot`,
      transformResponse: (r: { data: PatientSnapshot }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),

    evaluatePatientContext: builder.mutation<any, string>({
      query: (patientId) => ({
        url: `/clinical-intelligence/patients/${patientId}/evaluate`,
        method: "POST",
      }),
      transformResponse: (r: { data: any }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),

    getPatientRiskScore: builder.query<RiskScore, string>({
      query: (patientId) => `/clinical-intelligence/patients/${patientId}/risk`,
      transformResponse: (r: { data: RiskScore }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),

    getPatientAlerts: builder.query<ClinicalAlertItem[], { patientId: string; status?: string }>({
      query: ({ patientId, status }) => {
        const qs = status ? `?status=${status}` : "";
        return `/clinical-intelligence/patients/${patientId}/alerts${qs}`;
      },
      transformResponse: (r: { data: ClinicalAlertItem[] }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),

    acknowledgeAlert: builder.mutation<ClinicalAlertItem, string>({
      query: (alertId) => ({
        url: `/clinical-intelligence/alerts/${alertId}/acknowledge`,
        method: "POST",
      }),
      transformResponse: (r: { data: ClinicalAlertItem }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),

    markAlertActionTaken: builder.mutation<ClinicalAlertItem, string>({
      query: (alertId) => ({
        url: `/clinical-intelligence/alerts/${alertId}/action-taken`,
        method: "POST",
      }),
      transformResponse: (r: { data: ClinicalAlertItem }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),

    dismissAlert: builder.mutation<ClinicalAlertItem, string>({
      query: (alertId) => ({
        url: `/clinical-intelligence/alerts/${alertId}/dismiss`,
        method: "POST",
      }),
      transformResponse: (r: { data: ClinicalAlertItem }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),

    addClinicalProblem: builder.mutation<ClinicalProblemItem, Partial<ClinicalProblemItem> & { patient_id: string; problem_name: string }>({
      query: (body) => ({
        url: "/clinical-intelligence/problems",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: ClinicalProblemItem }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),

    resolveClinicalProblem: builder.mutation<ClinicalProblemItem, string>({
      query: (problemId) => ({
        url: `/clinical-intelligence/problems/${problemId}/resolve`,
        method: "POST",
      }),
      transformResponse: (r: { data: ClinicalProblemItem }) => r.data,
      invalidatesTags: ["ClinicalOrder"],
    }),

    getPatientProblems: builder.query<ClinicalProblemItem[], { patientId: string; status?: string }>({
      query: ({ patientId, status }) => {
        const qs = status ? `?status=${status}` : "";
        return `/clinical-intelligence/patients/${patientId}/problems${qs}`;
      },
      transformResponse: (r: { data: ClinicalProblemItem[] }) => r.data,
      providesTags: ["ClinicalOrder"],
    }),
  }),
});

export const {
  useGetPatientSnapshotQuery,
  useEvaluatePatientContextMutation,
  useGetPatientRiskScoreQuery,
  useGetPatientAlertsQuery,
  useAcknowledgeAlertMutation,
  useMarkAlertActionTakenMutation,
  useDismissAlertMutation,
  useAddClinicalProblemMutation,
  useResolveClinicalProblemMutation,
  useGetPatientProblemsQuery,
} = clinicalIntelligenceApi;
