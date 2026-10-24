import { baseApi } from "../baseApi";
import type {
  GoldMeasurementUnit,
  AsmMiner,
  AsmSearchCandidatesResponse,
  GoldPurchase,
  GoldDailyReportResponse,
  GoldDailyReportRecord,
  PurchasingCenterDashboardData,
  FederalOversightDashboardData,
  CreateGoldPurchasePayload,
  RegisterAsmMinerPayload,
  CreateMeasurementUnitPayload,
} from "../types/gold";

export const goldApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // ----------------------------------------------------
    // Measurement Units
    // ----------------------------------------------------
    getGoldUnits: builder.query<GoldMeasurementUnit[], { is_active?: boolean; search?: string } | void>({
      query: (params) => ({
        url: "/gold/units",
        params: params || undefined,
      }),
      transformResponse: (res: { data: GoldMeasurementUnit[] }) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ unit_id }) => ({ type: "GoldUnits" as const, id: unit_id })),
              { type: "GoldUnits", id: "LIST" },
            ]
          : [{ type: "GoldUnits", id: "LIST" }],
    }),

    getGoldUnitById: builder.query<GoldMeasurementUnit, string>({
      query: (id) => `/gold/units/${id}`,
      transformResponse: (res: { data: GoldMeasurementUnit }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "GoldUnits", id }],
    }),

    createGoldUnit: builder.mutation<GoldMeasurementUnit, CreateMeasurementUnitPayload>({
      query: (body) => ({
        url: "/gold/units",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: GoldMeasurementUnit }) => res.data,
      invalidatesTags: [{ type: "GoldUnits", id: "LIST" }],
    }),

    updateGoldUnit: builder.mutation<GoldMeasurementUnit, { id: string; data: Partial<CreateMeasurementUnitPayload> }>({
      query: ({ id, data }) => ({
        url: `/gold/units/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: GoldMeasurementUnit }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "GoldUnits", id },
        { type: "GoldUnits", id: "LIST" },
      ],
    }),

    toggleGoldUnitStatus: builder.mutation<GoldMeasurementUnit, { id: string; is_active: boolean }>({
      query: ({ id, is_active }) => ({
        url: `/gold/units/${id}/status`,
        method: "PATCH",
        body: { is_active },
      }),
      transformResponse: (res: { data: GoldMeasurementUnit }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "GoldUnits", id },
        { type: "GoldUnits", id: "LIST" },
      ],
    }),

    // ----------------------------------------------------
    // ASM Miners Registry
    // ----------------------------------------------------
    searchAsmCandidates: builder.query<
      AsmSearchCandidatesResponse,
      {
        national_id_number?: string;
        mining_license_number?: string;
        phone_number?: string;
        full_name?: string;
        search?: string;
      }
    >({
      query: (params) => ({
        url: "/gold/asm/search-candidates",
        params,
      }),
      transformResponse: (res: { data: AsmSearchCandidatesResponse }) => res.data,
      providesTags: [{ type: "AsmMiners", id: "SEARCH" }],
    }),

    getAsmMiners: builder.query<
      { items: AsmMiner[]; pagination: { total: number; page: number; limit: number; total_pages: number } },
      {
        search?: string;
        is_active?: boolean;
        region?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => ({
        url: "/gold/asm",
        params: params || undefined,
      }),
      transformResponse: (res: {
        data: AsmMiner[];
        pagination: { total: number; page: number; limit: number; total_pages: number };
      }) => ({
        items: res.data,
        pagination: res.pagination,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ asm_id }) => ({ type: "AsmMiners" as const, id: asm_id })),
              { type: "AsmMiners", id: "LIST" },
            ]
          : [{ type: "AsmMiners", id: "LIST" }],
    }),

    getAsmMinerById: builder.query<AsmMiner, string>({
      query: (id) => `/gold/asm/${id}`,
      transformResponse: (res: { data: AsmMiner }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "AsmMiners", id }],
    }),

    registerAsmMiner: builder.mutation<AsmMiner, RegisterAsmMinerPayload>({
      query: (body) => ({
        url: "/gold/asm",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: AsmMiner }) => res.data,
      invalidatesTags: [
        { type: "AsmMiners", id: "LIST" },
        { type: "AsmMiners", id: "SEARCH" },
      ],
    }),

    updateAsmMiner: builder.mutation<AsmMiner, { id: string; data: Partial<RegisterAsmMinerPayload> }>({
      query: ({ id, data }) => ({
        url: `/gold/asm/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (res: { data: AsmMiner }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "AsmMiners", id },
        { type: "AsmMiners", id: "LIST" },
        { type: "AsmMiners", id: "SEARCH" },
      ],
    }),

    toggleAsmMinerStatus: builder.mutation<AsmMiner, { id: string; is_active: boolean }>({
      query: ({ id, is_active }) => ({
        url: `/gold/asm/${id}/status`,
        method: "PATCH",
        body: { is_active },
      }),
      transformResponse: (res: { data: AsmMiner }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "AsmMiners", id },
        { type: "AsmMiners", id: "LIST" },
      ],
    }),

    // ----------------------------------------------------
    // Gold Purchases
    // ----------------------------------------------------
    getGoldPurchases: builder.query<
      { items: GoldPurchase[]; pagination: { total: number; page: number; limit: number; total_pages: number } },
      {
        purchasing_center_id?: string;
        seller_type?: string;
        company_id?: string;
        asm_id?: string;
        business_date?: string;
        date_from?: string;
        date_to?: string;
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => ({
        url: "/gold/purchases",
        params: params || undefined,
      }),
      transformResponse: (res: {
        data: GoldPurchase[];
        pagination: { total: number; page: number; limit: number; total_pages: number };
      }) => ({
        items: res.data,
        pagination: res.pagination,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ purchase_id }) => ({ type: "GoldPurchases" as const, id: purchase_id })),
              { type: "GoldPurchases", id: "LIST" },
            ]
          : [{ type: "GoldPurchases", id: "LIST" }],
    }),

    getGoldPurchaseById: builder.query<GoldPurchase, string>({
      query: (id) => `/gold/purchases/${id}`,
      transformResponse: (res: { data: GoldPurchase }) => res.data,
      providesTags: (_res, _err, id) => [{ type: "GoldPurchases", id }],
    }),

    recordGoldPurchase: builder.mutation<GoldPurchase, CreateGoldPurchasePayload>({
      query: (body) => ({
        url: "/gold/purchases",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: GoldPurchase }) => res.data,
      invalidatesTags: [
        { type: "GoldPurchases", id: "LIST" },
        { type: "GoldReports", id: "DAILY" },
        { type: "GoldReports", id: "LIST" },
        { type: "GoldOversight", id: "DASHBOARD" },
        { type: "PurchasingCenterDashboard", id: "CURRENT" },
      ],
    }),

    cancelGoldPurchase: builder.mutation<GoldPurchase, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/gold/purchases/${id}/cancel`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: (res: { data: GoldPurchase }) => res.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "GoldPurchases", id },
        { type: "GoldPurchases", id: "LIST" },
        { type: "GoldReports", id: "DAILY" },
        { type: "GoldReports", id: "LIST" },
        { type: "GoldOversight", id: "DASHBOARD" },
        { type: "PurchasingCenterDashboard", id: "CURRENT" },
      ],
    }),

    // ----------------------------------------------------
    // Daily Reports
    // ----------------------------------------------------
    getGoldDailyReport: builder.query<
      GoldDailyReportResponse,
      { purchasing_center_id?: string; business_date?: string }
    >({
      query: (params) => ({
        url: "/gold/reports/daily",
        params,
      }),
      transformResponse: (res: { data: GoldDailyReportResponse }) => res.data,
      providesTags: (_res, _err, arg) => [
        { type: "GoldReports", id: `${arg.purchasing_center_id || "CURRENT"}_${arg.business_date || "TODAY"}` },
        { type: "GoldReports", id: "DAILY" },
      ],
    }),

    submitGoldDailyReport: builder.mutation<
      GoldDailyReportResponse,
      { purchasing_center_id?: string; business_date: string; notes?: string }
    >({
      query: (body) => ({
        url: "/gold/reports/submit",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: GoldDailyReportResponse }) => res.data,
      invalidatesTags: [
        { type: "GoldReports", id: "DAILY" },
        { type: "GoldReports", id: "LIST" },
        { type: "GoldOversight", id: "DASHBOARD" },
        { type: "PurchasingCenterDashboard", id: "CURRENT" },
      ],
    }),

    getGoldHistoricalReports: builder.query<
      { items: GoldDailyReportRecord[]; pagination: { total: number; page: number; limit: number; total_pages: number } },
      {
        purchasing_center_id?: string;
        date_from?: string;
        date_to?: string;
        status?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => ({
        url: "/gold/reports",
        params: params || undefined,
      }),
      transformResponse: (res: {
        data: GoldDailyReportRecord[];
        pagination: { total: number; page: number; limit: number; total_pages: number };
      }) => ({
        items: res.data,
        pagination: res.pagination,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ report_id }) => ({ type: "GoldReports" as const, id: report_id })),
              { type: "GoldReports", id: "LIST" },
            ]
          : [{ type: "GoldReports", id: "LIST" }],
    }),

    // ----------------------------------------------------
    // Dashboards & Oversight
    // ----------------------------------------------------
    getGoldCenterDashboard: builder.query<
      PurchasingCenterDashboardData,
      { purchasing_center_id?: string; date_from?: string; date_to?: string } | void
    >({
      query: (params) => ({
        url: "/gold/dashboard",
        params: params || undefined,
      }),
      transformResponse: (res: { data: PurchasingCenterDashboardData }) => res.data,
      providesTags: (_res, _err, arg) => [
        { type: "PurchasingCenterDashboard", id: arg?.purchasing_center_id || "CURRENT" },
      ],
    }),

    getFederalGoldOversight: builder.query<
      FederalOversightDashboardData,
      { business_date?: string } | void
    >({
      query: (params) => ({
        url: "/gold/oversight-dashboard",
        params: params || undefined,
      }),
      transformResponse: (res: { data: FederalOversightDashboardData }) => res.data,
      providesTags: [{ type: "GoldOversight", id: "DASHBOARD" }],
    }),
  }),
});

export const {
  useGetGoldUnitsQuery,
  useGetGoldUnitByIdQuery,
  useCreateGoldUnitMutation,
  useUpdateGoldUnitMutation,
  useToggleGoldUnitStatusMutation,
  useSearchAsmCandidatesQuery,
  useLazySearchAsmCandidatesQuery,
  useGetAsmMinersQuery,
  useGetAsmMinerByIdQuery,
  useRegisterAsmMinerMutation,
  useUpdateAsmMinerMutation,
  useToggleAsmMinerStatusMutation,
  useGetGoldPurchasesQuery,
  useGetGoldPurchaseByIdQuery,
  useRecordGoldPurchaseMutation,
  useCancelGoldPurchaseMutation,
  useGetGoldDailyReportQuery,
  useSubmitGoldDailyReportMutation,
  useGetGoldHistoricalReportsQuery,
  useGetGoldCenterDashboardQuery,
  useGetFederalGoldOversightQuery,
} = goldApi;
