import { baseApi } from "../baseApi";
import type {
  AppointmentBillingContext,
  AppointmentBillingEntry,
  BillingService,
} from "../types/billing";

export const appointmentBillingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppointmentBilling: builder.query<AppointmentBillingContext, string>({
      query: (appointmentId) => `/appointment-billing/${appointmentId}`,
      transformResponse: (r: { data: AppointmentBillingContext }) => r.data,
      providesTags: (_r, _e, appointmentId) => [
        { type: "AppointmentBilling", id: appointmentId },
      ],
    }),

    listAppointmentBillingServices: builder.query<
      BillingService[],
      { department_id?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/appointment-billing/services/active",
        params: params || undefined,
      }),
      transformResponse: (r: { data: BillingService[] }) => r.data ?? [],
    }),

    createAppointmentBillingEntry: builder.mutation<
      AppointmentBillingEntry,
      { appointmentId: string; body: Record<string, unknown> }
    >({
      query: ({ appointmentId, body }) => ({
        url: `/appointment-billing/${appointmentId}/entries`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: AppointmentBillingEntry }) => r.data,
      invalidatesTags: (_r, _e, { appointmentId }) => [
        { type: "AppointmentBilling", id: appointmentId },
      ],
    }),

    updateAppointmentBillingEntry: builder.mutation<
      AppointmentBillingEntry,
      { entryId: string; appointmentId: string; body: Record<string, unknown> }
    >({
      query: ({ entryId, body }) => ({
        url: `/appointment-billing/entries/${entryId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (r: { data: AppointmentBillingEntry }) => r.data,
      invalidatesTags: (_r, _e, { appointmentId }) => [
        { type: "AppointmentBilling", id: appointmentId },
      ],
    }),

    cancelAppointmentBillingEntry: builder.mutation<
      { entry_id: string },
      { entryId: string; appointmentId: string }
    >({
      query: ({ entryId }) => ({
        url: `/appointment-billing/entries/${entryId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { appointmentId }) => [
        { type: "AppointmentBilling", id: appointmentId },
      ],
    }),

    sendAppointmentToCashier: builder.mutation<
      import("../types/billing").BillingCollectionRequest,
      { appointmentId: string; note?: string; source?: string }
    >({
      query: ({ appointmentId, note, source }) => ({
        url: `/appointment-billing/${appointmentId}/send-to-cashier`,
        method: "POST",
        body: {
          ...(note ? { note } : {}),
          ...(source ? { source } : {}),
        },
      }),
      transformResponse: (r: {
        data: import("../types/billing").BillingCollectionRequest;
      }) => r.data,
      invalidatesTags: (_r, _e, { appointmentId }) => [
        { type: "AppointmentBilling", id: appointmentId },
        "CashierQueue",
        "Notification",
      ],
    }),
  }),
});

export const {
  useGetAppointmentBillingQuery,
  useListAppointmentBillingServicesQuery,
  useCreateAppointmentBillingEntryMutation,
  useUpdateAppointmentBillingEntryMutation,
  useCancelAppointmentBillingEntryMutation,
  useSendAppointmentToCashierMutation,
} = appointmentBillingApi;
