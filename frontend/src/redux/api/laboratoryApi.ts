import { baseApi } from "../baseApi";

export type LaboratoryCategory =
  | "HEMATOLOGY"
  | "BIOCHEMISTRY"
  | "MICROBIOLOGY"
  | "URINALYSIS"
  | "IMMUNOLOGY"
  | "OTHER";

export type SampleType = "BLOOD" | "URINE" | "CSF" | "STOOL" | "SWAB" | "TISSUE";
export type SpecimenStatus = "PENDING_COLLECTION" | "COLLECTED" | "REJECTED" | "CANCELLED";

export type LaboratoryTestCatalog = {
  test_catalog_id: string;
  code: string;
  name: string;
  description?: string | null;
  category: LaboratoryCategory;
  sample_type: SampleType;
  unit?: string | null;
  reference_range?: Record<string, any> | null;
  billing_service_id?: string | null;
  is_active: boolean;
};

export type LaboratoryOrderItem = {
  item_id: string;
  order_id: string;
  test_catalog_id?: string | null;
  test_name: string;
  status: string;
  created_at: string;
};

export type LaboratorySpecimen = {
  specimen_id: string;
  order_id: string;
  specimen_type: SampleType;
  collection_status: SpecimenStatus;
  collected_by?: string | null;
  collected_at?: string | null;
  notes?: string | null;
  created_at: string;
};

export type CreateTestCatalogPayload = {
  code: string;
  name: string;
  description?: string;
  category?: LaboratoryCategory;
  sample_type?: SampleType;
  unit?: string;
  reference_range?: Record<string, any>;
  billing_service_id?: string;
};

export type AddTestItemsPayload = {
  items: { test_catalog_id?: string; test_name: string }[];
};

export type CreateSpecimenPayload = {
  specimen_type: SampleType;
  notes?: string;
};

export const laboratoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listTestCatalog: builder.query<LaboratoryTestCatalog[], string | void>({
      query: (category) => ({
        url: "/laboratory/tests",
        params: category ? { category } : undefined,
      }),
      transformResponse: (r: { data: LaboratoryTestCatalog[] }) => r.data,
      providesTags: [{ type: "Laboratory", id: "CATALOG" }],
    }),

    createTestCatalog: builder.mutation<LaboratoryTestCatalog, CreateTestCatalogPayload>({
      query: (payload) => ({
        url: "/laboratory/tests",
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: LaboratoryTestCatalog }) => r.data,
      invalidatesTags: [{ type: "Laboratory", id: "CATALOG" }],
    }),

    addTestItems: builder.mutation<
      LaboratoryOrderItem[],
      { orderId: string; payload: AddTestItemsPayload }
    >({
      query: ({ orderId, payload }) => ({
        url: `/laboratory/orders/${orderId}/items`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: LaboratoryOrderItem[] }) => r.data,
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "ClinicalOrder", id: orderId },
        { type: "Laboratory", id: `order-${orderId}` },
      ],
    }),

    createSpecimen: builder.mutation<
      LaboratorySpecimen,
      { orderId: string; payload: CreateSpecimenPayload }
    >({
      query: ({ orderId, payload }) => ({
        url: `/laboratory/orders/${orderId}/specimen`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: LaboratorySpecimen }) => r.data,
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "Laboratory", id: `order-${orderId}` }],
    }),

    collectSpecimen: builder.mutation<
      LaboratorySpecimen,
      { specimenId: string; notes?: string }
    >({
      query: ({ specimenId, notes }) => ({
        url: `/laboratory/specimens/${specimenId}/collect`,
        method: "PATCH",
        body: { notes },
      }),
      transformResponse: (r: { data: LaboratorySpecimen }) => r.data,
      invalidatesTags: [{ type: "Laboratory", id: "LIST" }],
    }),

    updateLaboratoryStatus: builder.mutation<
      any,
      { orderId: string; laboratory_status: string; reason?: string }
    >({
      query: ({ orderId, laboratory_status, reason }) => ({
        url: `/laboratory/orders/${orderId}/status`,
        method: "PATCH",
        body: { laboratory_status, reason },
      }),
      transformResponse: (r: { data: any }) => r.data,
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "ClinicalOrder", id: orderId }],
    }),
  }),
});

export const {
  useListTestCatalogQuery,
  useCreateTestCatalogMutation,
  useAddTestItemsMutation,
  useCreateSpecimenMutation,
  useCollectSpecimenMutation,
  useUpdateLaboratoryStatusMutation,
} = laboratoryApi;
