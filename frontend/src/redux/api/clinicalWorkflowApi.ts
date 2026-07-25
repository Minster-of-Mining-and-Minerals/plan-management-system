import { baseApi } from "../baseApi";

export type ClinicalActivityDefinition = {
  activity_id?: string;
  name: string;
  code: string;
  category: string;
  department_id: string;
  activity_type: string;
  form_config_id?: string | null;
  creates_clinical_order: boolean;
  order_type: string;
  default_priority: string;
  sla_configuration?: { target_minutes: number; warning_threshold_minutes: number };
  billing_configuration?: { is_billable: boolean; default_fee: number };
  execution_form_config_id?: string | null;
  result_form_config_id?: string | null;
  status?: string;
};

export type ClinicalWorkflowStep = {
  step_number: number;
  name: string;
  type: string;
  activity_code?: string;
  form_code?: string;
};

export type ClinicalWorkflowDefinition = {
  workflow_id: string;
  name: string;
  code: string;
  department_id: string;
  description?: string;
  steps: ClinicalWorkflowStep[];
  is_active: boolean;
};

export type ClinicalIntentSubmission = {
  activity_code: string;
  appointment_id: string;
  patient_id: string;
  ordered_by: string;
  clinical_data?: Record<string, any>;
  priority?: string;
  notes?: string;
};

export const clinicalWorkflowApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActivityDefinitions: builder.query<ClinicalActivityDefinition[], Record<string, any> | void>({
      query: (arg) => ({
        url: "/clinical-workflows/activities",
        params: arg || {},
      }),
      providesTags: ["ClinicalOrder"],
    }),
    createActivityDefinition: builder.mutation<ClinicalActivityDefinition, Partial<ClinicalActivityDefinition>>({
      query: (body) => ({
        url: "/clinical-workflows/activities",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    submitClinicalIntent: builder.mutation<any, ClinicalIntentSubmission>({
      query: (body) => ({
        url: "/clinical-workflows/intent",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    getWorkflowDefinitions: builder.query<ClinicalWorkflowDefinition[], void>({
      query: () => "/clinical-workflows/definitions",
      providesTags: ["ClinicalOrder"],
    }),
    executeOrderStep: builder.mutation<any, { order_id: string; step_status: string; result_data?: Record<string, any>; result_notes?: string }>({
      query: (body) => ({
        url: "/clinical-workflows/execute-step",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
  }),
});

export const {
  useGetActivityDefinitionsQuery,
  useCreateActivityDefinitionMutation,
  useSubmitClinicalIntentMutation,
  useGetWorkflowDefinitionsQuery,
  useExecuteOrderStepMutation,
} = clinicalWorkflowApi;
