import { baseApi } from "../baseApi";
import type { PrescriptionCategory } from "../types/prescription";

export const prescriptionCategoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPrescriptionCategories: builder.query<
      PrescriptionCategory[],
      { status?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/prescription-categories",
        params: params || undefined,
      }),
      transformResponse: (r: { data: PrescriptionCategory[] }) => r.data ?? [],
      providesTags: ["PrescriptionCategory"],
    }),
    createPrescriptionCategory: builder.mutation<
      PrescriptionCategory,
      { name: string; code: string; description?: string; status?: string }
    >({
      query: (body) => ({ url: "/prescription-categories", method: "POST", body }),
      transformResponse: (r: { data: PrescriptionCategory }) => r.data,
      invalidatesTags: ["PrescriptionCategory"],
    }),
    updatePrescriptionCategory: builder.mutation<
      PrescriptionCategory,
      { categoryId: string; body: Partial<PrescriptionCategory> }
    >({
      query: ({ categoryId, body }) => ({
        url: `/prescription-categories/${categoryId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: PrescriptionCategory }) => r.data,
      invalidatesTags: ["PrescriptionCategory"],
    }),
    deletePrescriptionCategory: builder.mutation<PrescriptionCategory, string>({
      query: (categoryId) => ({
        url: `/prescription-categories/${categoryId}`,
        method: "DELETE",
      }),
      transformResponse: (r: { data: PrescriptionCategory }) => r.data,
      invalidatesTags: ["PrescriptionCategory"],
    }),
  }),
});

export const {
  useListPrescriptionCategoriesQuery,
  useCreatePrescriptionCategoryMutation,
  useUpdatePrescriptionCategoryMutation,
  useDeletePrescriptionCategoryMutation,
} = prescriptionCategoryApi;
