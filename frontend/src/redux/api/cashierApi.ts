import { baseApi } from "../baseApi";
import type {
  CashierAccountDetail,
  CashierQueueResponse,
  CashierReceipt,
  CashierSession,
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
      invalidatesTags: ["CashierSession"],
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
        "StaffAppointment",
        { type: "CashierAccount", id: accountId },
        "AppointmentBilling",
      ],
    }),

    getCashierReceipt: builder.query<CashierReceipt, string>({
      query: (paymentId) => `/finance/cashier/payments/${paymentId}/receipt`,
      transformResponse: (r: { data: CashierReceipt }) => r.data,
    }),
  }),
});

export const {
  useGetCurrentCashierSessionQuery,
  useOpenCashierSessionMutation,
  useCloseCashierSessionMutation,
  useGetCashierQueueQuery,
  useGetCashierAccountQuery,
  useRecordCashierPaymentMutation,
  useVoidCashierPaymentMutation,
  useGetCashierReceiptQuery,
  useLazyGetCashierReceiptQuery,
} = cashierApi;
