import { baseApi } from "../baseApi";

export type MARRecordItem = {
  id: string;
  patient_id: string;
  prescription_id: string;
  medication_catalog_id?: string | null;
  dose: string;
  route?: string | null;
  scheduled_time: string;
  administered_time?: string | null;
  status: "GIVEN" | "MISSED" | "REFUSED" | "HELD";
  administered_by: string;
  reason?: string | null;
  medicationCatalog?: { generic_name: string };
  administrator?: { full_name: string };
};

export type FormularyRuleItem = {
  id: string;
  medication_catalog_id: string;
  department_restriction?: string | null;
  requires_approval: boolean;
  doctor_authorization_level?: string | null;
  preferred_alternative_id?: string | null;
  notes?: string | null;
  medicationCatalog?: { generic_name: string };
  preferredAlternative?: { generic_name: string };
};

export type MedicationReconciliationItem = {
  id: string;
  patient_id: string;
  reconciliation_type: "ADMISSION" | "DISCHARGE";
  home_medications_json?: any[];
  reconciled_medications_json?: any[];
  conflict_summary_json?: any[];
  reconciled_by: string;
  created_at: string;
  reconciler?: { full_name: string };
};

export const pharmacyEnterpriseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    transitionOrderState: builder.mutation<any, { clinicalOrderId: string; targetState: string; reason?: string }>({
      query: ({ clinicalOrderId, ...body }) => ({
        url: `/pharmacy/enterprise/orders/${clinicalOrderId}/transition`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: any }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    recordAdministration: builder.mutation<MARRecordItem, { patient_id: string; prescription_id: string; dose: string; route?: string; status?: string; reason?: string }>({
      query: (body) => ({
        url: "/pharmacy/enterprise/mar/record",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MARRecordItem }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    getPatientMAR: builder.query<MARRecordItem[], string>({
      query: (patientId) => `/pharmacy/enterprise/mar/${patientId}`,
      transformResponse: (r: { data: MARRecordItem[] }) => r.data,
    }),

    getMedicationHistory: builder.query<any, string>({
      query: (patientId) => `/pharmacy/enterprise/history/${patientId}`,
      transformResponse: (r: { data: any }) => r.data,
    }),

    setFormularyRule: builder.mutation<FormularyRuleItem, Partial<FormularyRuleItem>>({
      query: (body) => ({
        url: "/pharmacy/enterprise/formulary/rules",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FormularyRuleItem }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    validateFormulary: builder.query<{ is_allowed: boolean; reason?: string; requires_approval?: boolean }, { medicationCatalogId: string; departmentName?: string }>({
      query: ({ medicationCatalogId, departmentName }) =>
        `/pharmacy/enterprise/formulary/validate?medicationCatalogId=${medicationCatalogId}&departmentName=${departmentName || ""}`,
      transformResponse: (r: { data: any }) => r.data,
    }),

    listFormularyRules: builder.query<FormularyRuleItem[], void>({
      query: () => "/pharmacy/enterprise/formulary/rules",
      transformResponse: (r: { data: FormularyRuleItem[] }) => r.data,
      providesTags: ["Pharmacy"],
    }),

    performReconciliation: builder.mutation<MedicationReconciliationItem, { patient_id: string; reconciliation_type: string; home_medications: any[]; reconciled_medications: any[] }>({
      query: (body) => ({
        url: "/pharmacy/enterprise/reconciliation/perform",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MedicationReconciliationItem }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    getPatientReconciliations: builder.query<MedicationReconciliationItem[], string>({
      query: (patientId) => `/pharmacy/enterprise/reconciliation/${patientId}`,
      transformResponse: (r: { data: MedicationReconciliationItem[] }) => r.data,
    }),

    exportFHIRMedicationRequest: builder.query<any, string>({
      query: (prescriptionId) => `/pharmacy/enterprise/fhir/request/${prescriptionId}`,
      transformResponse: (r: { data: any }) => r.data,
    }),
  }),
});

export const {
  useTransitionOrderStateMutation,
  useRecordAdministrationMutation,
  useGetPatientMARQuery,
  useGetMedicationHistoryQuery,
  useSetFormularyRuleMutation,
  useValidateFormularyQuery,
  useListFormularyRulesQuery,
  usePerformReconciliationMutation,
  useGetPatientReconciliationsQuery,
  useExportFHIRMedicationRequestQuery,
} = pharmacyEnterpriseApi;
