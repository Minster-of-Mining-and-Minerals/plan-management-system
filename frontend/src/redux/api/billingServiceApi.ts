import { baseApi } from "../baseApi";
import type {
  BillingService,
  BillingServiceCategory,
  BillingServiceListResponse,
} from "../types/billing";

export const billingServiceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listBillingServices: builder.query<
      BillingServiceListResponse,
      {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        department_id?: string;
        category_id?: string;
        sort_by?: string;
        sort_dir?: string;
      }
    >({
      query: (params) => ({
        url: "/billing-services",
        params,
      }),
      transformResponse: (r: { data: BillingServiceListResponse }) => r.data,
      providesTags: ["BillingService"],
    }),

    listActiveBillingServices: builder.query<
      BillingService[],
      { department_id?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/billing-services/active",
        params: params || undefined,
      }),
      transformResponse: (r: { data: BillingService[] }) => r.data ?? [],
      providesTags: ["BillingService"],
    }),

    getBillingService: builder.query<BillingService, string>({
      query: (id) => `/billing-services/${id}`,
      transformResponse: (r: { data: BillingService }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "BillingService", id }],
    }),

    createBillingService: builder.mutation<
      BillingService,
      Record<string, unknown>
    >({
      query: (body) => ({
        url: "/billing-services",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: BillingService }) => r.data,
      invalidatesTags: ["BillingService"],
    }),

    updateBillingService: builder.mutation<
      BillingService,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/billing-services/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: BillingService }) => r.data,
      invalidatesTags: ["BillingService"],
    }),

    activateBillingService: builder.mutation<BillingService, string>({
      query: (id) => ({
        url: `/billing-services/${id}/activate`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: BillingService }) => r.data,
      invalidatesTags: ["BillingService"],
    }),

    deactivateBillingService: builder.mutation<BillingService, string>({
      query: (id) => ({
        url: `/billing-services/${id}/deactivate`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: BillingService }) => r.data,
      invalidatesTags: ["BillingService"],
    }),

    deleteBillingService: builder.mutation<{ service_id: string }, string>({
      query: (id) => ({
        url: `/billing-services/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["BillingService"],
    }),

    listBillingServiceCategories: builder.query<
      BillingServiceCategory[],
      { status?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/billing-service-categories",
        params: params || undefined,
      }),
      transformResponse: (r: { data: BillingServiceCategory[] }) => r.data ?? [],
      providesTags: ["BillingServiceCategory"],
    }),

    createBillingServiceCategory: builder.mutation<
      BillingServiceCategory,
      Record<string, unknown>
    >({
      query: (body) => ({
        url: "/billing-service-categories",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: BillingServiceCategory }) => r.data,
      invalidatesTags: ["BillingServiceCategory"],
    }),

    updateBillingServiceCategory: builder.mutation<
      BillingServiceCategory,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/billing-service-categories/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: BillingServiceCategory }) => r.data,
      invalidatesTags: ["BillingServiceCategory"],
    }),
  }),
});

export const {
  useListBillingServicesQuery,
  useListActiveBillingServicesQuery,
  useGetBillingServiceQuery,
  useCreateBillingServiceMutation,
  useUpdateBillingServiceMutation,
  useActivateBillingServiceMutation,
  useDeactivateBillingServiceMutation,
  useDeleteBillingServiceMutation,
  useListBillingServiceCategoriesQuery,
  useCreateBillingServiceCategoryMutation,
  useUpdateBillingServiceCategoryMutation,
} = billingServiceApi;
