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
  const grouped = data as UserFormConfigGrouped;
  return flattenFormFields(grouped);
}

export const formFieldApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFormFields: builder.query<
      FormField[],
      { model?: string; visible_only?: boolean; grouped?: boolean } | void
    >({
      query: (params) => ({
        url: "/form-fields",
        params: { model: "User", grouped: true, ...params },
      }),
      transformResponse: (response: { data: unknown }) =>
        parseGroupedResponse(response.data),
      providesTags: ["FormFields"],
    }),

    getUserFormConfig: builder.query<UserFormConfigGrouped, void>({
      query: () => "/form-fields/config",
      transformResponse: (response: { data: UserFormConfigGrouped }) =>
        response.data ?? {
          core_fields: [],
          categories: [],
          fields: [],
        },
      providesTags: ["FormFields"],
    }),

    createFormField: builder.mutation<FormField, CreateFormFieldPayload>({
      query: (body) => ({
        url: "/form-fields",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: FormField }) => response.data,
      invalidatesTags: ["FormFields"],
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
      invalidatesTags: ["FormFields"],
    }),

    deleteFormField: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/form-fields/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FormFields"],
    }),

    reorderFormFields: builder.mutation<FormField[], ReorderFormFieldsPayload>({
      query: (body) => ({
        url: "/form-fields/reorder",
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: unknown }) =>
        parseGroupedResponse(response.data),
      invalidatesTags: ["FormFields"],
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
