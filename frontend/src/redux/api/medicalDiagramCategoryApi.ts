import { baseApi } from "../baseApi";

export type MedicalDiagramCategory = {
  category_id: string;
  name: string;
  code: string;
  sort_order: number;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export const medicalDiagramCategoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMedicalDiagramCategories: builder.query<
      MedicalDiagramCategory[],
      { include_inactive?: boolean } | void
    >({
      query: (params) => ({
        url: "/medical-diagram-categories",
        params: params?.include_inactive
          ? { include_inactive: "true" }
          : undefined,
      }),
      transformResponse: (r: { data: MedicalDiagramCategory[] }) => r.data ?? [],
      providesTags: ["MedicalDiagramCategory"],
    }),
    createMedicalDiagramCategory: builder.mutation<
      MedicalDiagramCategory,
      { name: string; code?: string; sort_order?: number; status?: string }
    >({
      query: (body) => ({
        url: "/medical-diagram-categories",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MedicalDiagramCategory }) => r.data,
      invalidatesTags: ["MedicalDiagramCategory", "MedicalDiagram"],
    }),
    updateMedicalDiagramCategory: builder.mutation<
      MedicalDiagramCategory,
      { categoryId: string; body: Partial<MedicalDiagramCategory> }
    >({
      query: ({ categoryId, body }) => ({
        url: `/medical-diagram-categories/${categoryId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: MedicalDiagramCategory }) => r.data,
      invalidatesTags: ["MedicalDiagramCategory", "MedicalDiagram"],
    }),
    deleteMedicalDiagramCategory: builder.mutation<
      { deleted?: boolean; archived?: boolean },
      string
    >({
      query: (categoryId) => ({
        url: `/medical-diagram-categories/${categoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["MedicalDiagramCategory", "MedicalDiagram"],
    }),
  }),
});

export const {
  useListMedicalDiagramCategoriesQuery,
  useCreateMedicalDiagramCategoryMutation,
  useUpdateMedicalDiagramCategoryMutation,
  useDeleteMedicalDiagramCategoryMutation,
} = medicalDiagramCategoryApi;
