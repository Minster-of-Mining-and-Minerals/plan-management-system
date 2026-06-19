import { baseApi } from "../baseApi";

import {

  CreateFormConfigContainerPayload,

  CreateFormConfigFieldPayload,

  FormConfigContainer,

  FormConfigField,

  PublishedFormByCategoryResponse,

  UpdateFormConfigContainerPayload,

  UpdateFormConfigFieldPayload,

} from "../types/formConfig";



function cleanParams<T extends Record<string, unknown>>(params?: T) {

  if (!params) return undefined;

  const cleaned = Object.fromEntries(

    Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)

  );

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;

}



export const formConfigApi = baseApi.injectEndpoints({

  endpoints: (builder) => ({

    getFormConfigContainers: builder.query<

      FormConfigContainer[],

      {

        is_active?: boolean;

        is_published?: boolean;

        search?: string;

        issue_category_id?: string;

      } | void

    >({

      query: (params) => ({

        url: "/form-config-containers",

        params: cleanParams(params as Record<string, unknown>),

      }),

      transformResponse: (response: { data?: FormConfigContainer[] }) => response.data ?? [],

      providesTags: ["FormConfigContainers"],

    }),



    getPublishedFormConfigContainers: builder.query<FormConfigContainer[], void>({

      query: () => "/form-config-containers/published",

      transformResponse: (response: { data?: FormConfigContainer[] }) => response.data ?? [],

      providesTags: ["FormConfigContainers"],

    }),



    getPublishedContainersByCategory: builder.query<FormConfigContainer[], string>({

      query: (categoryId) => `/form-config-containers/by-category/${categoryId}/published`,

      transformResponse: (response: { data?: FormConfigContainer[] }) => response.data ?? [],

      providesTags: (_r, _e, categoryId) => [

        { type: "FormConfigContainers", id: `category-${categoryId}` },

      ],

    }),



    getPublishedFormByContainer: builder.query<PublishedFormByCategoryResponse | null, string>({

      query: (containerId) => `/form-config-containers/${containerId}/published-form`,

      transformResponse: (response: { data: PublishedFormByCategoryResponse | null }) =>

        response.data ?? null,

      providesTags: (_r, _e, containerId) => [

        { type: "FormConfigContainers", id: `form-${containerId}` },

      ],

    }),



    getFormConfigContainerById: builder.query<FormConfigContainer, string>({

      query: (id) => `/form-config-containers/${id}`,

      transformResponse: (response: { data: FormConfigContainer }) => response.data,

      providesTags: (_r, _e, id) => [{ type: "FormConfigContainers", id }],

    }),



    createFormConfigContainer: builder.mutation<

      FormConfigContainer,

      CreateFormConfigContainerPayload

    >({

      query: (body) => ({ url: "/form-config-containers", method: "POST", body }),

      transformResponse: (response: { data: FormConfigContainer }) => response.data,

      invalidatesTags: ["FormConfigContainers", "IssueCategories"],

    }),



    updateFormConfigContainer: builder.mutation<

      FormConfigContainer,

      { id: string; data: UpdateFormConfigContainerPayload }

    >({

      query: ({ id, data }) => ({

        url: `/form-config-containers/${id}`,

        method: "PUT",

        body: data,

      }),

      transformResponse: (response: { data: FormConfigContainer }) => response.data,

      invalidatesTags: (_r, _e, { id }) => [{ type: "FormConfigContainers", id }, "FormConfigContainers"],

    }),



    deleteFormConfigContainer: builder.mutation<void, string>({

      query: (id) => ({ url: `/form-config-containers/${id}`, method: "DELETE" }),

      invalidatesTags: ["FormConfigContainers", "IssueCategories"],

    }),



    publishFormConfigContainer: builder.mutation<FormConfigContainer, string>({

      query: (id) => ({ url: `/form-config-containers/${id}/publish`, method: "PATCH" }),

      transformResponse: (response: { data: FormConfigContainer }) => response.data,

      invalidatesTags: ["FormConfigContainers", "IssueCategories"],

    }),



    unpublishFormConfigContainer: builder.mutation<FormConfigContainer, string>({

      query: (id) => ({ url: `/form-config-containers/${id}/unpublish`, method: "PATCH" }),

      transformResponse: (response: { data: FormConfigContainer }) => response.data,

      invalidatesTags: ["FormConfigContainers", "IssueCategories"],

    }),



    createFormConfigField: builder.mutation<

      FormConfigField,

      { containerId: string; data: CreateFormConfigFieldPayload }

    >({

      query: ({ containerId, data }) => ({

        url: `/form-config-containers/${containerId}/fields`,

        method: "POST",

        body: data,

      }),

      transformResponse: (response: { data: FormConfigField }) => response.data,

      invalidatesTags: (_r, _e, { containerId }) => [

        { type: "FormConfigContainers", id: containerId },

        "FormConfigContainers",

      ],

    }),



    updateFormConfigField: builder.mutation<

      FormConfigField,

      { fieldId: string; data: UpdateFormConfigFieldPayload }

    >({

      query: ({ fieldId, data }) => ({

        url: `/form-config-containers/fields/${fieldId}`,

        method: "PUT",

        body: data,

      }),

      transformResponse: (response: { data: FormConfigField }) => response.data,

      invalidatesTags: ["FormConfigContainers"],

    }),



    deleteFormConfigField: builder.mutation<void, string>({

      query: (fieldId) => ({

        url: `/form-config-containers/fields/${fieldId}`,

        method: "DELETE",

      }),

      invalidatesTags: ["FormConfigContainers"],

    }),



    reorderFormConfigFields: builder.mutation<

      FormConfigField[],

      { containerId: string; ordered_field_ids: string[] }

    >({

      query: ({ containerId, ordered_field_ids }) => ({

        url: `/form-config-containers/${containerId}/fields/reorder`,

        method: "PUT",

        body: { ordered_field_ids },

      }),

      transformResponse: (response: { data: FormConfigField[] }) => response.data ?? [],

      invalidatesTags: (_r, _e, { containerId }) => [

        { type: "FormConfigContainers", id: containerId },

      ],

    }),

  }),

});



export const {

  useGetFormConfigContainersQuery,

  useGetPublishedFormConfigContainersQuery,

  useGetPublishedContainersByCategoryQuery,

  useGetPublishedFormByContainerQuery,

  useGetFormConfigContainerByIdQuery,

  useCreateFormConfigContainerMutation,

  useUpdateFormConfigContainerMutation,

  useDeleteFormConfigContainerMutation,

  usePublishFormConfigContainerMutation,

  useUnpublishFormConfigContainerMutation,

  useCreateFormConfigFieldMutation,

  useUpdateFormConfigFieldMutation,

  useDeleteFormConfigFieldMutation,

  useReorderFormConfigFieldsMutation,

} = formConfigApi;

