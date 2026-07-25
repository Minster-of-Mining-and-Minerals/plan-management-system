import { baseApi } from "../baseApi";

export type PharmacyWarehouseItem = {
  id: string;
  pharmacy_id: string;
  warehouse_name: string;
  location?: string | null;
  status: string;
  created_at: string;
};

export type MedicationBatchItem = {
  id: string;
  pharmacy_id: string;
  warehouse_id?: string | null;
  medication_catalog_id: string;
  batch_number: string;
  manufacturer?: string | null;
  manufacture_date?: string | null;
  expiry_date: string;
  quantity_received: number;
  quantity_available: number;
  unit_cost: number;
  selling_price: number;
  status: "ACTIVE" | "EXPIRED" | "QUARANTINED" | "DEPLETED";
  medicationCatalog?: {
    id: string;
    generic_name: string;
    brand_name?: string;
  };
  warehouse?: PharmacyWarehouseItem;
};

export type PharmacyAnalyticsData = {
  pharmacy_id: string;
  total_batches: number;
  total_medications_quantity: number;
  total_stock_value: number;
  low_stock_items: number;
  expired_or_quarantined_items: number;
  total_dispensing_transactions: number;
};

export type ReceiveStockPayload = {
  pharmacy_id: string;
  warehouse_id?: string;
  medication_catalog_id: string;
  batch_number: string;
  manufacturer?: string;
  manufacture_date?: string;
  expiry_date: string;
  quantity_received: number;
  unit_cost?: number;
  selling_price?: number;
};

export type LogControlledDispensingPayload = {
  batchId: string;
  patientId: string;
  prescriptionId: string;
  quantity: number;
  verifierId: string;
  digitalSignature?: string;
};

export const pharmacyInventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createWarehouse: builder.mutation<PharmacyWarehouseItem, { pharmacy_id: string; warehouse_name: string; location?: string }>({
      query: (body) => ({
        url: "/pharmacy/inventory/warehouses",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: PharmacyWarehouseItem }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    listWarehouses: builder.query<PharmacyWarehouseItem[], string>({
      query: (pharmacy_id) => `/pharmacy/inventory/warehouses?pharmacy_id=${pharmacy_id}`,
      transformResponse: (r: { data: PharmacyWarehouseItem[] }) => r.data,
      providesTags: ["Pharmacy"],
    }),

    receiveStock: builder.mutation<MedicationBatchItem, ReceiveStockPayload>({
      query: (body) => ({
        url: "/pharmacy/inventory/batches/receive",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: MedicationBatchItem }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    listBatches: builder.query<MedicationBatchItem[], string>({
      query: (pharmacy_id) => `/pharmacy/inventory/batches?pharmacy_id=${pharmacy_id}`,
      transformResponse: (r: { data: MedicationBatchItem[] }) => r.data,
      providesTags: ["Pharmacy"],
    }),

    getExpiringBatches: builder.query<MedicationBatchItem[], { pharmacy_id: string; days?: number }>({
      query: ({ pharmacy_id, days = 90 }) => `/pharmacy/inventory/expiring?pharmacy_id=${pharmacy_id}&days=${days}`,
      transformResponse: (r: { data: MedicationBatchItem[] }) => r.data,
    }),

    quarantineExpired: builder.mutation<{ quarantinedCount: number }, string>({
      query: (pharmacy_id) => ({
        url: "/pharmacy/inventory/quarantine",
        method: "POST",
        body: { pharmacy_id },
      }),
      transformResponse: (r: { data: { quarantinedCount: number } }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    logControlledDispensing: builder.mutation<any, LogControlledDispensingPayload>({
      query: (body) => ({
        url: "/pharmacy/inventory/controlled/log",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: any }) => r.data,
    }),

    getControlledLogs: builder.query<any[], string | undefined>({
      query: (patientId) => `/pharmacy/inventory/controlled/logs${patientId ? `?patientId=${patientId}` : ""}`,
      transformResponse: (r: { data: any[] }) => r.data,
    }),

    getPharmacyAnalytics: builder.query<PharmacyAnalyticsData, string>({
      query: (pharmacy_id) => `/pharmacy/inventory/analytics?pharmacy_id=${pharmacy_id}`,
      transformResponse: (r: { data: PharmacyAnalyticsData }) => r.data,
      providesTags: ["Pharmacy"],
    }),
  }),
});

export const {
  useCreateWarehouseMutation,
  useListWarehousesQuery,
  useReceiveStockMutation,
  useListBatchesQuery,
  useGetExpiringBatchesQuery,
  useQuarantineExpiredMutation,
  useLogControlledDispensingMutation,
  useGetControlledLogsQuery,
  useGetPharmacyAnalyticsQuery,
} = pharmacyInventoryApi;
