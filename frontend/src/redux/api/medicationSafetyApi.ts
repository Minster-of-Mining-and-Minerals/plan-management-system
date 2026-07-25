import { baseApi } from "../baseApi";

export type SafetyAlertSeverity = "INFO" | "WARNING" | "SEVERE" | "CONTRAINDICATED";
export type SafetyAlertType = "ALLERGY" | "INTERACTION" | "DUPLICATE_THERAPY" | "DOSE_SAFETY";

export type MedicationSafetyAlertItem = {
  type: SafetyAlertType;
  severity: SafetyAlertSeverity;
  medication_name?: string;
  allergen?: string;
  medication_a?: string;
  medication_b?: string;
  message: string;
  clinical_action?: string;
};

export type MedicationSafetyAssessment = {
  patient_id: string;
  prescription_id?: string | null;
  overall_severity: "CLEAN" | SafetyAlertSeverity;
  is_safe: boolean;
  has_warnings: boolean;
  requires_override: boolean;
  total_alerts: number;
  alerts: MedicationSafetyAlertItem[];
  persisted_alerts?: any[];
};

export type MedicationCatalogItem = {
  id: string;
  generic_name: string;
  brand_name?: string | null;
  medication_code?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  route?: string | null;
  manufacturer?: string | null;
  controlled_status: string;
  active: boolean;
};

export type EvaluatePrescriptionSafetyPayload = {
  patient_id: string;
  prescription_id?: string;
  items: Array<{
    item_name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: string;
  }>;
};

export type OverrideSafetyAlertPayload = {
  alertId: string;
  reason: string;
};

export const medicationSafetyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    evaluatePrescriptionSafety: builder.mutation<MedicationSafetyAssessment, EvaluatePrescriptionSafetyPayload>({
      query: (body) => ({
        url: "/medication-safety/evaluate",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MedicationSafetyAssessment }) => r.data,
      invalidatesTags: [{ type: "Prescription", id: "SAFETY" }],
    }),

    searchMedicationCatalog: builder.query<MedicationCatalogItem[], { query: string; limit?: number }>({
      query: ({ query, limit = 20 }) => `/medication-safety/catalog/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      transformResponse: (r: { data: MedicationCatalogItem[] }) => r.data,
    }),

    getMedicationAlerts: builder.query<any[], { patientId: string; prescription_id?: string }>({
      query: ({ patientId, prescription_id }) =>
        `/medication-safety/alerts/patient/${patientId}${prescription_id ? `?prescription_id=${prescription_id}` : ""}`,
      transformResponse: (r: { data: any[] }) => r.data,
      providesTags: (_r, _e, { patientId }) => [{ type: "Prescription", id: `alerts-${patientId}` }],
    }),

    overrideSafetyAlert: builder.mutation<any, OverrideSafetyAlertPayload>({
      query: ({ alertId, reason }) => ({
        url: `/medication-safety/alerts/${alertId}/override`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: (r: { data: any }) => r.data,
      invalidatesTags: [{ type: "Prescription", id: "SAFETY" }],
    }),
  }),
});

export const {
  useEvaluatePrescriptionSafetyMutation,
  useSearchMedicationCatalogQuery,
  useGetMedicationAlertsQuery,
  useOverrideSafetyAlertMutation,
} = medicationSafetyApi;
