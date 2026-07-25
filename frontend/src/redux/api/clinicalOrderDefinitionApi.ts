import { baseApi } from "../baseApi";

export type ClinicalOrderDefinition = {
  definition_id?: string;
  organization_id?: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  department_id: string;
  activity_type: string;
  workflow_definition_id?: string | null;
  request_form_config_id?: string | null;
  execution_form_config_id?: string | null;
  result_form_config_id?: string | null;
  billing_configuration_id?: string | null;
  sla_configuration_id?: string | null;
  priority_configuration?: { default_priority: string; allowed_priorities: string[] };
  validation_rules_json?: Record<string, any>;
  required_permissions_json?: string[];
  status?: string;
  version?: string;
};

export type RuntimeOrderInstantiation = {
  definition_code?: string;
  definition_id?: string;
  appointment_id: string;
  patient_id: string;
  ordered_by: string;
  intent_data?: Record<string, any>;
  priority?: string;
  notes?: string;
};

export type DesignerConfigOptions = {
  available_categories: string[];
  available_departments: string[];
  default_sla_presets: Array<{ name: string; target_minutes: number; warning_threshold_minutes: number }>;
  default_billing_presets: Array<{ service_code: string; default_fee: number }>;
};

export const clinicalOrderDefinitionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrderDefinitions: builder.query<ClinicalOrderDefinition[], Record<string, any> | void>({
      query: (arg) => ({
        url: "/clinical-order-definitions/definitions",
        params: arg || {},
      }),
      providesTags: ["ClinicalOrder"],
    }),
    createOrderDefinition: builder.mutation<ClinicalOrderDefinition, Partial<ClinicalOrderDefinition>>({
      query: (body) => ({
        url: "/clinical-order-definitions/definitions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    instantiateRuntimeOrder: builder.mutation<any, RuntimeOrderInstantiation>({
      query: (body) => ({
        url: "/clinical-order-definitions/instantiate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ClinicalOrder"],
    }),
    getDesignerConfigOptions: builder.query<DesignerConfigOptions, void>({
      query: () => "/clinical-order-definitions/designer-options",
      providesTags: ["ClinicalOrder"],
    }),
  }),
});

export const {
  useGetOrderDefinitionsQuery,
  useCreateOrderDefinitionMutation,
  useInstantiateRuntimeOrderMutation,
  useGetDesignerConfigOptionsQuery,
} = clinicalOrderDefinitionApi;
