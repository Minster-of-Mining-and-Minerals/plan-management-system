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
    getBuilderWorkflowDefinitions: builder.query<any[], void>({
      query: () => "/workflow-builder",
      providesTags: ["ClinicalOrder"],
    }),
    getBuilderWorkflowById: builder.query<any, string>({
      query: (id) => `/workflow-builder/${id}`,
      providesTags: ["ClinicalOrder"],
    }),
    createBuilderWorkflow: builder.mutation<any, any>({
      query: (body) => ({
        url: "/workflow-builder",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    addBuilderWorkflowStep: builder.mutation<any, { workflow_id: string; step_data: any }>({
      query: ({ workflow_id, step_data }) => ({
        url: `/workflow-builder/${workflow_id}/steps`,
        method: "POST",
        body: step_data,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    reorderBuilderSteps: builder.mutation<any, { workflow_id: string; stepIds: string[] }>({
      query: ({ workflow_id, stepIds }) => ({
        url: `/workflow-builder/${workflow_id}/reorder`,
        method: "PUT",
        body: { stepIds },
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    deleteBuilderStep: builder.mutation<any, { workflow_id: string; step_id: string }>({
      query: ({ workflow_id, step_id }) => ({
        url: `/workflow-builder/${workflow_id}/steps/${step_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    startWorkflowExecution: builder.mutation<any, { appointment_id: string; workflow_id: string }>({
      query: (body) => ({
        url: `/appointments/${body.appointment_id}/workflow/start`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    getWorkflowExecutionState: builder.query<any, string>({
      query: (appointment_id) => `/appointments/${appointment_id}/workflow`,
      providesTags: ["ClinicalOrder"],
    }),
    completeWorkflowExecutionStep: builder.mutation<any, { appointment_id: string; step_instance_id: string; form_data?: any; form_config_id?: string; notes?: string }>({
      query: ({ appointment_id, step_instance_id, ...body }) => ({
        url: `/appointments/${appointment_id}/workflow/steps/${step_instance_id}/complete`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    forwardWorkflowExecutionStep: builder.mutation<any, { appointment_id: string; step_instance_id: string; to_staff_id: string; notes?: string }>({
      query: ({ appointment_id, step_instance_id, ...body }) => ({
        url: `/appointments/${appointment_id}/workflow/steps/${step_instance_id}/forward`,
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
  useGetBuilderWorkflowDefinitionsQuery,
  useGetBuilderWorkflowByIdQuery,
  useCreateBuilderWorkflowMutation,
  useAddBuilderWorkflowStepMutation,
  useReorderBuilderStepsMutation,
  useDeleteBuilderStepMutation,
  useStartWorkflowExecutionMutation,
  useGetWorkflowExecutionStateQuery,
  useCompleteWorkflowExecutionStepMutation,
  useForwardWorkflowExecutionStepMutation,
} = clinicalWorkflowApi;
