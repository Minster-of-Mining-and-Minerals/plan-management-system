import { baseApi } from "../baseApi";
import type {
  FormField,
  CreateFormFieldPayload,
  UpdateFormFieldPayload,
  ReorderFormFieldsPayload,
  UserFormConfigGrouped,
} from "../types/formField";
import { flattenFormFields } from "../types/formField";

function parseGroupedResponse(data: unknown): FormField[] {
  if (!data || typeof data !== "object") return [];
  return flattenFormFields(data as UserFormConfigGrouped);
}

export const formFieldApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFormFields: builder.query<
      FormField[],
      { model?: string; visible_only?: boolean; grouped?: boolean } | void
    >({
      query: (params) => ({
        url: "/form-fields",
        params: { model: "Patient", grouped: true, ...params },
      }),
      transformResponse: (response: { data: unknown }) =>
        parseGroupedResponse(response.data),
      providesTags: ["FormFields"],
    }),

    getUserFormConfig: builder.query<UserFormConfigGrouped, void>({
      query: () => "/form-fields/config",
      transformResponse: (response: { data: UserFormConfigGrouped }) =>
        response.data ?? {
          groups: [],
          steps: [],
          core_fields: [],
          fields: [],
        },
      providesTags: ["FormFields", "FormFieldGroups"],
    }),

    createFormField: builder.mutation<FormField, CreateFormFieldPayload>({
      query: (body) => ({
        url: "/form-fields",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: FormField }) => response.data,
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    updateFormField: builder.mutation<
      FormField,
      { id: string; data: UpdateFormFieldPayload }
    >({
      query: ({ id, data }) => ({
        url: `/form-fields/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { data: FormField }) => response.data,
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    deleteFormField: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/form-fields/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),

    reorderFormFields: builder.mutation<
      UserFormConfigGrouped,
      ReorderFormFieldsPayload
    >({
      query: (body) => ({
        url: "/form-fields/reorder",
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: UserFormConfigGrouped }) =>
        response.data,
      invalidatesTags: ["FormFields", "FormFieldGroups"],
    }),
  }),
});

export const {
  useGetFormFieldsQuery,
  useGetUserFormConfigQuery,
  useCreateFormFieldMutation,
  useUpdateFormFieldMutation,
  useDeleteFormFieldMutation,
  useReorderFormFieldsMutation,
} = formFieldApi;
