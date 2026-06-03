import { baseApi } from "../baseApi";
import type { UserFormConfigGrouped } from "../types/formField";
import type { FormField, CreateFormFieldPayload, UpdateFormFieldPayload } from "../types/formField";
import type { FormFieldGroup } from "../types/formFieldGroup";

export type StaffDiagnosisFormBundle = {
  config: DiagnosisFormConfig;
  form: UserFormConfigGrouped | null;
};

export type DiagnosisFormConfig = {
  config_id: string;
  assigned_staff_id: string;
  title: string;
  description?: string | null;
  source_template_id?: string | null;
  sourceTemplate?: { template_id: string; title: string; description?: string | null };
  is_active: boolean;
  sort_order?: number;
  staff?: { user_id: string; full_name: string; email?: string };
  created_at?: string;
  updated_at?: string;
};

export const diagnosisFormApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listDiagnosisFormConfigs: builder.query<
      DiagnosisFormConfig[],
      { staff_id?: string } | void
    >({
      query: (params) => ({
        url: "/diagnosis-form-configs",
        params: params?.staff_id ? { staff_id: params.staff_id } : undefined,
      }),
      transformResponse: (r: { data: DiagnosisFormConfig[] }) => r.data ?? [],
      providesTags: ["DiagnosisFormConfig"],
    }),

    getDiagnosisFormConfig: builder.query<DiagnosisFormConfig, string>({
      query: (configId) => `/diagnosis-form-configs/${configId}`,
      transformResponse: (r: { data: DiagnosisFormConfig }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "DiagnosisFormConfig", id }],
    }),

    getDiagnosisFormConfigByStaff: builder.query<
      { config: DiagnosisFormConfig | null; form: UserFormConfigGrouped | null },
      string
    >({
      query: (staffId) => `/diagnosis-form-configs/staff/${staffId}`,
      transformResponse: (r: {
        data: { config: DiagnosisFormConfig | null; form: UserFormConfigGrouped | null };
      }) => r.data,
      providesTags: ["DiagnosisFormConfig", "FormFields"],
    }),

    getDiagnosisFormConfigsByStaff: builder.query<StaffDiagnosisFormBundle[], string>({
      query: (staffId) => `/diagnosis-form-configs/staff/${staffId}/all`,
      transformResponse: (r: { data: StaffDiagnosisFormBundle[] }) => r.data ?? [],
      providesTags: ["DiagnosisFormConfig", "FormFields"],
    }),

    assignDiagnosisTemplateToStaff: builder.mutation<
      { config: DiagnosisFormConfig; form: UserFormConfigGrouped },
      {
        staffId: string;
        template_id: string;
        replace_existing?: boolean;
        config_id?: string;
        title?: string;
        description?: string;
      }
    >({
      query: ({ staffId, ...body }) => ({
        url: `/diagnosis-form-configs/staff/${staffId}/assign-template`,
        method: "POST",
        body,
      }),
      transformResponse: (r: {
        data: { config: DiagnosisFormConfig; form: UserFormConfigGrouped };
      }) => r.data,
      invalidatesTags: ["DiagnosisFormConfig", "FormFields", "FormFieldGroups"],
    }),

    getDiagnosisGroupedForm: builder.query<UserFormConfigGrouped, string>({
      query: (configId) => `/diagnosis-form-configs/${configId}/form-config`,
      transformResponse: (r: { data: UserFormConfigGrouped }) => r.data,
      providesTags: ["FormFields", "FormFieldGroups"],
    }),

    createDiagnosisFormConfig: builder.mutation<
      DiagnosisFormConfig,
      {
        assigned_staff_id: string;
        title?: string;
        description?: string;
        source_template_id: string;
      }
    >({
      query: (body) => ({
        url: "/diagnosis-form-configs",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: DiagnosisFormConfig }) => r.data,
      invalidatesTags: ["DiagnosisFormConfig"],
    }),

    updateDiagnosisFormConfig: builder.mutation<
      DiagnosisFormConfig,
      { configId: string; body: Partial<DiagnosisFormConfig> }
    >({
      query: ({ configId, body }) => ({
        url: `/diagnosis-form-configs/${configId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: DiagnosisFormConfig }) => r.data,
      invalidatesTags: ["DiagnosisFormConfig"],
    }),

    deleteDiagnosisFormConfig: builder.mutation<void, string>({
      query: (configId) => ({
        url: `/diagnosis-form-configs/${configId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DiagnosisFormConfig"],
    }),

    createDiagnosisGroup: builder.mutation<
      FormFieldGroup,
      { configId: string; body: { title: string; description?: string } }
    >({
      query: ({ configId, body }) => ({
        url: `/diagnosis-form-configs/${configId}/groups`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FormFieldGroup }) => r.data,
      invalidatesTags: ["FormFieldGroups", "FormFields", "DiagnosisFormConfig"],
    }),

    updateDiagnosisGroup: builder.mutation<
      FormFieldGroup,
      { configId: string; groupId: string; body: Partial<FormFieldGroup> }
    >({
      query: ({ configId, groupId, body }) => ({
        url: `/diagnosis-form-configs/${configId}/groups/${groupId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: FormFieldGroup }) => r.data,
      invalidatesTags: ["FormFieldGroups", "FormFields"],
    }),

    deleteDiagnosisGroup: builder.mutation<void, { configId: string; groupId: string }>({
      query: ({ configId, groupId }) => ({
        url: `/diagnosis-form-configs/${configId}/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FormFieldGroups", "FormFields"],
    }),

    reorderDiagnosisGroups: builder.mutation<
      FormFieldGroup[],
      { configId: string; ids: string[] }
    >({
      query: ({ configId, ids }) => ({
        url: `/diagnosis-form-configs/${configId}/groups/reorder`,
        method: "PUT",
        body: { ids },
      }),
      transformResponse: (r: { data: FormFieldGroup[] }) => r.data ?? [],
      invalidatesTags: ["FormFieldGroups", "FormFields"],
    }),

    createDiagnosisField: builder.mutation<
      FormField,
      { configId: string; body: CreateFormFieldPayload }
    >({
      query: ({ configId, body }) => ({
        url: `/diagnosis-form-configs/${configId}/fields`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: FormField }) => r.data,
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    updateDiagnosisField: builder.mutation<
      FormField,
      { configId: string; fieldId: string; body: UpdateFormFieldPayload }
    >({
      query: ({ configId, fieldId, body }) => ({
        url: `/diagnosis-form-configs/${configId}/fields/${fieldId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: FormField }) => r.data,
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    deleteDiagnosisField: builder.mutation<void, { configId: string; fieldId: string }>({
      query: ({ configId, fieldId }) => ({
        url: `/diagnosis-form-configs/${configId}/fields/${fieldId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    reorderDiagnosisFields: builder.mutation<
      UserFormConfigGrouped,
      { configId: string; ids: string[] }
    >({
      query: ({ configId, ids }) => ({
        url: `/diagnosis-form-configs/${configId}/fields/reorder`,
        method: "PUT",
        body: { ids },
      }),
      transformResponse: (r: { data: UserFormConfigGrouped }) => r.data,
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),
  }),
});

export const {
  useListDiagnosisFormConfigsQuery,
  useGetDiagnosisFormConfigQuery,
  useGetDiagnosisFormConfigByStaffQuery,
  useGetDiagnosisFormConfigsByStaffQuery,
  useAssignDiagnosisTemplateToStaffMutation,
  useGetDiagnosisGroupedFormQuery,
  useCreateDiagnosisFormConfigMutation,
  useUpdateDiagnosisFormConfigMutation,
  useDeleteDiagnosisFormConfigMutation,
  useCreateDiagnosisGroupMutation,
  useUpdateDiagnosisGroupMutation,
  useDeleteDiagnosisGroupMutation,
  useReorderDiagnosisGroupsMutation,
  useCreateDiagnosisFieldMutation,
  useUpdateDiagnosisFieldMutation,
  useDeleteDiagnosisFieldMutation,
  useReorderDiagnosisFieldsMutation,
} = diagnosisFormApi;
