import { baseApi } from "../baseApi";
import type {
  CashierAccountDetail,
  CashierPaymentLedgerResponse,
  CashierQueueResponse,
  CashierReceipt,
  CashierServingClaim,
  CashierSession,
  CashierSessionSummary,
  PaymentMethod,
} from "../types/cashier";

export const cashierApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentCashierSession: builder.query<CashierSession | null, void>({
      query: () => "/finance/cashier/sessions/current",
      transformResponse: (r: { data: CashierSession | null }) => r.data ?? null,
      providesTags: ["CashierSession"],
    }),

    openCashierSession: builder.mutation<
      CashierSession,
      { opening_float?: number }
    >({
      query: (body) => ({
        url: "/finance/cashier/sessions/open",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: CashierSession }) => r.data,
      invalidatesTags: ["CashierSession"],
    }),

    closeCashierSession: builder.mutation<
      CashierSession,
      { sessionId: string; counted_cash_total: number; close_notes?: string }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/finance/cashier/sessions/${sessionId}/close`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: CashierSession }) => r.data,
      invalidatesTags: [
        "CashierSession",
        "CashierQueue",
        "CashierPaymentsToday",
        "CashierPaymentHistory",
        "FinanceCollections",
      ],
    }),

    getCashierSessionSummary: builder.query<CashierSessionSummary, string>({
      query: (sessionId) => `/finance/cashier/sessions/${sessionId}/summary`,
      transformResponse: (r: { data: CashierSessionSummary }) => r.data,
      providesTags: ["CashierSession"],
    }),

    getCashierQueue: builder.query<
      CashierQueueResponse,
      { search?: string; schedule_date?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/finance/cashier/queue",
        params,
      }),
      transformResponse: (r: { data: CashierQueueResponse }) => r.data,
      providesTags: ["CashierQueue"],
    }),

    getCashierAccount: builder.query<CashierAccountDetail, string>({
      query: (accountId) => `/finance/cashier/accounts/${accountId}`,
      transformResponse: (r: { data: CashierAccountDetail }) => r.data,
      providesTags: (_r, _e, accountId) => [
        { type: "CashierAccount", id: accountId },
      ],
    }),

    takeCashierAccount: builder.mutation<
      CashierServingClaim,
      { accountId: string }
    >({
      query: ({ accountId }) => ({
        url: `/finance/cashier/accounts/${accountId}/take`,
        method: "POST",
      }),
      transformResponse: (r: { data: CashierServingClaim }) => r.data,
      invalidatesTags: (_r, _e, { accountId }) => [
        "CashierQueue",
        { type: "CashierAccount", id: accountId },
      ],
    }),

    releaseCashierAccount: builder.mutation<
      { released: boolean },
      { accountId: string }
    >({
      query: ({ accountId }) => ({
        url: `/finance/cashier/accounts/${accountId}/release`,
        method: "POST",
      }),
      transformResponse: (r: { data: { released: boolean } }) => r.data,
      invalidatesTags: (_r, _e, { accountId }) => [
        "CashierQueue",
        { type: "CashierAccount", id: accountId },
      ],
    }),

    forceReleaseCashierAccount: builder.mutation<
      { released: boolean },
      { accountId: string }
    >({
      query: ({ accountId }) => ({
        url: `/finance/cashier/accounts/${accountId}/force-release`,
        method: "POST",
      }),
      transformResponse: (r: { data: { released: boolean } }) => r.data,
      invalidatesTags: (_r, _e, { accountId }) => [
        "CashierQueue",
        { type: "CashierAccount", id: accountId },
      ],
    }),

    recordCashierPayment: builder.mutation<
      CashierReceipt,
      {
        accountId: string;
        body: {
          amount?: number;
          reference_note?: string;
          client_reference?: string;
          tenders: Array<{
            method: PaymentMethod;
            amount: number;
            reference?: string;
            provider?: string;
          }>;
        };
      }
    >({
      query: ({ accountId, body }) => ({
        url: `/finance/cashier/accounts/${accountId}/payments`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: CashierReceipt }) => r.data,
      invalidatesTags: (_r, _e, { accountId }) => [
        "CashierQueue",
        "CashierSession",
        "CashierPaymentsToday",
        "CashierPaymentHistory",
        "FinanceCollections",
        "StaffAppointment",
        { type: "CashierAccount", id: accountId },
        "AppointmentBilling",
      ],
    }),

    voidCashierPayment: builder.mutation<
      { payment_id: string; voided: boolean },
      { paymentId: string; reason: string; accountId: string }
    >({
      query: ({ paymentId, reason }) => ({
        url: `/finance/cashier/payments/${paymentId}/void`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { accountId }) => [
        "CashierQueue",
        "CashierPaymentsToday",
        "CashierPaymentHistory",
        "FinanceCollections",
        "StaffAppointment",
        { type: "CashierAccount", id: accountId },
        "AppointmentBilling",
      ],
    }),

    getCashierReceipt: builder.query<CashierReceipt, string>({
      query: (paymentId) => `/finance/cashier/payments/${paymentId}/receipt`,
      transformResponse: (r: { data: CashierReceipt }) => r.data,
    }),

    getCashierPaymentsToday: builder.query<
      CashierPaymentLedgerResponse,
      { search?: string; date?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/finance/cashier/payments/today",
        params,
      }),
      transformResponse: (r: { data: CashierPaymentLedgerResponse }) => r.data,
      providesTags: ["CashierPaymentsToday"],
    }),

    getCashierPaymentHistory: builder.query<
      CashierPaymentLedgerResponse,
      {
        search?: string;
        from_date?: string;
        to_date?: string;
        cashier_user_id?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: "/finance/cashier/payments",
        params,
      }),
      transformResponse: (r: { data: CashierPaymentLedgerResponse }) => r.data,
      providesTags: ["CashierPaymentHistory"],
    }),

    getFinanceCollections: builder.query<
      CashierPaymentLedgerResponse,
      {
        search?: string;
        from_date?: string;
        to_date?: string;
        cashier_user_id?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: "/finance/cashier/collections",
        params,
      }),
      transformResponse: (r: { data: CashierPaymentLedgerResponse }) => r.data,
      providesTags: ["FinanceCollections"],
    }),
  }),
});

export const {
  useGetCurrentCashierSessionQuery,
  useOpenCashierSessionMutation,
  useCloseCashierSessionMutation,
  useGetCashierSessionSummaryQuery,
  useLazyGetCashierSessionSummaryQuery,
  useGetCashierQueueQuery,
  useGetCashierAccountQuery,
  useTakeCashierAccountMutation,
  useReleaseCashierAccountMutation,
  useForceReleaseCashierAccountMutation,
  useRecordCashierPaymentMutation,
  useVoidCashierPaymentMutation,
  useGetCashierReceiptQuery,
  useLazyGetCashierReceiptQuery,
  useGetCashierPaymentsTodayQuery,
  useGetCashierPaymentHistoryQuery,
  useGetFinanceCollectionsQuery,
} = cashierApi;
