import { baseApi } from "../baseApi";

export type StockTransferItem = {
  id: string;
  source_pharmacy_id: string;
  destination_pharmacy_id: string;
  medication_batch_id: string;
  quantity: number;
  status: "REQUESTED" | "TRANSIT" | "RECEIVED" | "REJECTED";
  requested_by: string;
  received_by?: string | null;
  received_at?: string | null;
  created_at: string;
  sourcePharmacy?: { pharmacy_name: string };
  destinationPharmacy?: { pharmacy_name: string };
  batch?: {
    batch_number: string;
    medicationCatalog?: { generic_name: string };
  };
};

export type BarcodeVerificationResult = {
  is_valid: boolean;
  status: string;
  batch_id?: string;
  batch_number?: string;
  barcode_identifier?: string;
  expiry_date?: string;
  medication_name?: string;
  quantity_available?: number;
  message: string;
};

export type RefillResult = {
  refill: {
    id: string;
    prescription_id: string;
    refill_number: number;
    max_refills: number;
    dispensed_at: string;
    status: string;
  };
  remaining_refills: number;
};

export type AdvancedAnalyticsData = {
  pharmacy_id: string;
  clinical_metrics: {
    total_medication_catalogs: number;
    controlled_medication_count: number;
    controlled_utilization_percent: number;
    controlled_dispensing_logs: number;
    total_substitutions_requested: number;
    approved_substitutions: number;
    substitution_rate_percent: number;
  };
  operational_metrics: {
    total_stock_transfers: number;
    completed_transfers: number;
    average_turnaround_minutes: number;
    queue_performance_status: string;
    pharmacist_workload_score: string;
  };
};

export const pharmacyHardeningApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    requestStockTransfer: builder.mutation<StockTransferItem, { source_pharmacy_id: string; destination_pharmacy_id: string; medication_batch_id: string; quantity: number }>({
      query: (body) => ({
        url: "/pharmacy/hardening/transfers/request",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: StockTransferItem }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    confirmStockTransfer: builder.mutation<StockTransferItem, string>({
      query: (transferId) => ({
        url: `/pharmacy/hardening/transfers/${transferId}/confirm`,
        method: "POST",
      }),
      transformResponse: (r: { data: StockTransferItem }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    listStockTransfers: builder.query<StockTransferItem[], string>({
      query: (pharmacy_id) => `/pharmacy/hardening/transfers?pharmacy_id=${pharmacy_id}`,
      transformResponse: (r: { data: StockTransferItem[] }) => r.data,
      providesTags: ["Pharmacy"],
    }),

    verifyBarcode: builder.mutation<BarcodeVerificationResult, { barcode_identifier?: string; batch_id?: string; patient_id?: string }>({
      query: (body) => ({
        url: "/pharmacy/hardening/barcode/verify",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: BarcodeVerificationResult }) => r.data,
    }),

    processRefill: builder.mutation<RefillResult, { prescription_id: string; max_refills?: number }>({
      query: (body) => ({
        url: "/pharmacy/hardening/refills/process",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: RefillResult }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    getRefillHistory: builder.query<any[], string>({
      query: (prescriptionId) => `/pharmacy/hardening/refills/history/${prescriptionId}`,
      transformResponse: (r: { data: any[] }) => r.data,
    }),

    getAdvancedAnalytics: builder.query<AdvancedAnalyticsData, string>({
      query: (pharmacy_id) => `/pharmacy/hardening/analytics?pharmacy_id=${pharmacy_id}`,
      transformResponse: (r: { data: AdvancedAnalyticsData }) => r.data,
      providesTags: ["Pharmacy"],
    }),
  }),
});

export const {
  useRequestStockTransferMutation,
  useConfirmStockTransferMutation,
  useListStockTransfersQuery,
  useVerifyBarcodeMutation,
  useProcessRefillMutation,
  useGetRefillHistoryQuery,
  useGetAdvancedAnalyticsQuery,
} = pharmacyHardeningApi;
