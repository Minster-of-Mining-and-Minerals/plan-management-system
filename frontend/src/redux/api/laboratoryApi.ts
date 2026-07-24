import { baseApi } from "../baseApi";

export type LaboratoryCategory =
  | "HEMATOLOGY"
  | "BIOCHEMISTRY"
  | "MICROBIOLOGY"
  | "URINALYSIS"
  | "IMMUNOLOGY"
  | "OTHER";

export type SampleType = "BLOOD" | "URINE" | "CSF" | "STOOL" | "SWAB" | "TISSUE";

export type SpecimenStatus =
  | "PENDING_COLLECTION"
  | "COLLECTED"
  | "RECEIVED"
  | "ACCEPTED"
  | "REJECTED"
  | "RECOLLECTION_REQUIRED"
  | "CANCELLED";

export type QueueType = "COLLECTION" | "RECEPTION" | "PROCESSING" | "RESULT_ENTRY" | "VERIFICATION";
export type QueueStatus = "WAITING" | "CLAIMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type QueuePriority = "STAT" | "URGENT" | "ROUTINE";

export type LaboratoryWorkQueueItem = {
  id: string;
  order_id: string;
  specimen_id?: string | null;
  queue_type: QueueType;
  status: QueueStatus;
  priority: QueuePriority;
  assigned_staff_id?: string | null;
  department_id?: string | null;
  entered_at: string;
  claimed_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  order?: {
    order_id: string;
    title: string;
    priority: QueuePriority;
    patient?: { user_id: string; full_name: string };
    orderedByUser?: { user_id: string; full_name: string };
  };
  specimen?: {
    specimen_id: string;
    specimen_type: SampleType;
    collection_status: SpecimenStatus;
  };
  assignedStaff?: {
    user_id: string;
    full_name: string;
  };
};

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

export type SpecimenStatusHistoryRecord = {
  specimen_status_history_id: string;
  specimen_id: string;
  previous_status?: string | null;
  new_status: string;
  changed_by: string;
  reason?: string | null;
  created_at: string;
  changedByUser?: { user_id: string; full_name: string };
};

export type SpecimenCollectionRecord = {
  collection_id: string;
  specimen_id: string;
  collected_by: string;
  collection_time: string;
  collection_site?: string | null;
  collector_notes?: string | null;
  created_at: string;
  collector?: { user_id: string; full_name: string };
};

export type LaboratorySpecimen = {
  specimen_id: string;
  order_id: string;
  parent_specimen_id?: string | null;
  specimen_type: SampleType;
  collection_status: SpecimenStatus;
  collected_by?: string | null;
  collected_at?: string | null;
  notes?: string | null;
  created_at: string;
  statusHistory?: SpecimenStatusHistoryRecord[];
  collections?: SpecimenCollectionRecord[];
  parentSpecimen?: LaboratorySpecimen;
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
    getWorkQueue: builder.query<LaboratoryWorkQueueItem[], { queue_type?: QueueType; status?: QueueStatus } | void>({
      query: (params) => ({
        url: "/laboratory/workqueue",
        params: params || undefined,
      }),
      transformResponse: (r: { data: LaboratoryWorkQueueItem[] }) => r.data,
      providesTags: [{ type: "Laboratory", id: "WORKQUEUE" }],
    }),

    getMyWorklist: builder.query<LaboratoryWorkQueueItem[], void>({
      query: () => "/laboratory/workqueue/my",
      transformResponse: (r: { data: LaboratoryWorkQueueItem[] }) => r.data,
      providesTags: [{ type: "Laboratory", id: "MY_WORKLIST" }],
    }),

    claimQueueItem: builder.mutation<LaboratoryWorkQueueItem, string>({
      query: (id) => ({
        url: `/laboratory/workqueue/${id}/claim`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: LaboratoryWorkQueueItem }) => r.data,
      invalidatesTags: [
        { type: "Laboratory", id: "WORKQUEUE" },
        { type: "Laboratory", id: "MY_WORKLIST" },
      ],
    }),

    startQueueItem: builder.mutation<LaboratoryWorkQueueItem, string>({
      query: (id) => ({
        url: `/laboratory/workqueue/${id}/start`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: LaboratoryWorkQueueItem }) => r.data,
      invalidatesTags: [
        { type: "Laboratory", id: "WORKQUEUE" },
        { type: "Laboratory", id: "MY_WORKLIST" },
      ],
    }),

    completeQueueItem: builder.mutation<LaboratoryWorkQueueItem, string>({
      query: (id) => ({
        url: `/laboratory/workqueue/${id}/complete`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: LaboratoryWorkQueueItem }) => r.data,
      invalidatesTags: [
        { type: "Laboratory", id: "WORKQUEUE" },
        { type: "Laboratory", id: "MY_WORKLIST" },
      ],
    }),

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
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "Laboratory", id: `order-${orderId}` },
        { type: "Laboratory", id: "WORKQUEUE" },
      ],
    }),

    collectSpecimen: builder.mutation<
      LaboratorySpecimen,
      { specimenId: string; notes?: string; site?: string }
    >({
      query: ({ specimenId, notes, site }) => ({
        url: `/laboratory/specimens/${specimenId}/collect`,
        method: "PATCH",
        body: { notes, site },
      }),
      transformResponse: (r: { data: LaboratorySpecimen }) => r.data,
      invalidatesTags: [
        { type: "Laboratory", id: "LIST" },
        { type: "Laboratory", id: "WORKQUEUE" },
      ],
    }),

    receiveSpecimen: builder.mutation<LaboratorySpecimen, string>({
      query: (specimenId) => ({
        url: `/laboratory/specimens/${specimenId}/receive`,
        method: "POST",
      }),
      transformResponse: (r: { data: LaboratorySpecimen }) => r.data,
      invalidatesTags: [
        { type: "Laboratory", id: "LIST" },
        { type: "Laboratory", id: "WORKQUEUE" },
      ],
    }),

    acceptSpecimen: builder.mutation<LaboratorySpecimen, string>({
      query: (specimenId) => ({
        url: `/laboratory/specimens/${specimenId}/accept`,
        method: "POST",
      }),
      transformResponse: (r: { data: LaboratorySpecimen }) => r.data,
      invalidatesTags: [
        { type: "Laboratory", id: "LIST" },
        { type: "Laboratory", id: "WORKQUEUE" },
      ],
    }),

    rejectSpecimen: builder.mutation<LaboratorySpecimen, { specimenId: string; reason: string }>({
      query: ({ specimenId, reason }) => ({
        url: `/laboratory/specimens/${specimenId}/reject`,
        method: "PATCH",
        body: { reason },
      }),
      transformResponse: (r: { data: LaboratorySpecimen }) => r.data,
      invalidatesTags: [
        { type: "Laboratory", id: "LIST" },
        { type: "Laboratory", id: "WORKQUEUE" },
      ],
    }),

    createRecollection: builder.mutation<LaboratorySpecimen, { specimenId: string; notes?: string }>({
      query: ({ specimenId, notes }) => ({
        url: `/laboratory/specimens/${specimenId}/recollect`,
        method: "POST",
        body: { notes },
      }),
      transformResponse: (r: { data: LaboratorySpecimen }) => r.data,
      invalidatesTags: [
        { type: "Laboratory", id: "LIST" },
        { type: "Laboratory", id: "WORKQUEUE" },
      ],
    }),

    getSpecimenHistory: builder.query<LaboratorySpecimen, string>({
      query: (specimenId) => `/laboratory/specimens/${specimenId}/history`,
      transformResponse: (r: { data: LaboratorySpecimen }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "Laboratory", id: `specimen-${id}` }],
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
  useGetWorkQueueQuery,
  useGetMyWorklistQuery,
  useClaimQueueItemMutation,
  useStartQueueItemMutation,
  useCompleteQueueItemMutation,
  useListTestCatalogQuery,
  useCreateTestCatalogMutation,
  useAddTestItemsMutation,
  useCreateSpecimenMutation,
  useCollectSpecimenMutation,
  useReceiveSpecimenMutation,
  useAcceptSpecimenMutation,
  useRejectSpecimenMutation,
  useCreateRecollectionMutation,
  useGetSpecimenHistoryQuery,
  useUpdateLaboratoryStatusMutation,
} = laboratoryApi;
