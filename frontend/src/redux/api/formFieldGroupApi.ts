import { baseApi } from "../baseApi";
import type {
  FormFieldGroup,
  CreateFormFieldGroupPayload,
  UpdateFormFieldGroupPayload,
  ReorderFormFieldGroupsPayload,
} from "../types/formFieldGroup";

export const formFieldGroupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFormFieldGroups: builder.query<
      FormFieldGroup[],
      { model?: string; visible_only?: boolean } | void
    >({
      query: (params) => ({
        url: "/form-field-groups",
        params: params || { model: "User" },
      }),
      transformResponse: (response: { data: FormFieldGroup[] }) =>
        response.data ?? [],
      providesTags: ["FormFieldGroups", "FormFields"],
    }),

    createFormFieldGroup: builder.mutation<
      FormFieldGroup,
      CreateFormFieldGroupPayload
    >({
      query: (body) => ({
        url: "/form-field-groups",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: FormFieldGroup }) => response.data,
      invalidatesTags: ["FormFieldGroups", "FormFields"],
    }),

    updateFormFieldGroup: builder.mutation<
      FormFieldGroup,
      { id: string; data: UpdateFormFieldGroupPayload }
    >({
      query: ({ id, data }) => ({
        url: `/form-field-groups/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { data: FormFieldGroup }) => response.data,
      invalidatesTags: ["FormFieldGroups", "FormFields"],
    }),

    deleteFormFieldGroup: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/form-field-groups/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FormFieldGroups", "FormFields"],
    }),

    reorderFormFieldGroups: builder.mutation<
      FormFieldGroup[],
      ReorderFormFieldGroupsPayload
    >({
      query: (body) => ({
        url: "/form-field-groups/reorder",
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: FormFieldGroup[] }) =>
        response.data ?? [],
      invalidatesTags: ["FormFieldGroups", "FormFields"],
    }),
  }),
});

export const {
  useGetFormFieldGroupsQuery,
  useCreateFormFieldGroupMutation,
  useUpdateFormFieldGroupMutation,
  useDeleteFormFieldGroupMutation,
  useReorderFormFieldGroupsMutation,
} = formFieldGroupApi;
