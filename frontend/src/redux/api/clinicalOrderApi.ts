import { baseApi } from "../baseApi";

export type OrderType = "LABORATORY" | "RADIOLOGY" | "PROCEDURE" | "REFERRAL" | "GENERAL";
export type OrderPriority = "ROUTINE" | "URGENT" | "STAT";
export type OrderStatus = "SUBMITTED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type ClinicalOrderItem = {
  name: string;
  code?: string;
  notes?: string;
};

export type ClinicalOrderResult = {
  result_id: string;
  order_id: string;
  recorded_by: string;
  verified_by?: string | null;
  verification_status: "DRAFT" | "VERIFIED" | "FINAL";
  result_summary?: string | null;
  result_data?: Record<string, any> | null;
  recorded_at: string;
  recordedByUser?: {
    user_id: string;
    full_name: string;
  };
};

export type ClinicalOrder = {
  order_id: string;
  appointment_id: string;
  patient_id: string;
  ordered_by: string;
  assigned_department_id?: string | null;
  assigned_staff_id?: string | null;
  order_type: OrderType;
  priority: OrderPriority;
  status: OrderStatus;
  title: string;
  clinical_reason?: string | null;
  cancellation_reason?: string | null;
  laboratory_status?: string | null;
  order_items?: ClinicalOrderItem[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
  orderedByUser?: {
    user_id: string;
    full_name: string;
  };
  assignedStaff?: {
    user_id: string;
    full_name: string;
  } | null;
  department?: {
    department_id: string;
    name: string;
  } | null;
  result?: ClinicalOrderResult | null;
};

export type CreateClinicalOrderPayload = {
  appointment_id: string;
  patient_id?: string;
  order_type: OrderType;
  priority: OrderPriority;
  title: string;
  clinical_reason?: string;
  order_items?: ClinicalOrderItem[];
  assigned_department_id?: string;
  notes?: string;
};

export type RecordOrderResultPayload = {
  result_summary: string;
  result_data?: Record<string, any>;
  verification_status?: "DRAFT" | "VERIFIED" | "FINAL";
};

export const clinicalOrderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createClinicalOrder: builder.mutation<ClinicalOrder, CreateClinicalOrderPayload>({
      query: (data) => ({
        url: "/orders",
        method: "POST",
        body: data,
      }),
      transformResponse: (r: { data: ClinicalOrder }) => r.data,
      invalidatesTags: (_r, _e, { appointment_id }) => [
        { type: "StaffAppointment", id: appointment_id },
        { type: "ClinicalOrder", id: "LIST" },
      ],
    }),

    getClinicalOrder: builder.query<ClinicalOrder, string>({
      query: (orderId) => `/orders/${orderId}`,
      transformResponse: (r: { data: ClinicalOrder }) => r.data,
      providesTags: (_r, _e, orderId) => [{ type: "ClinicalOrder", id: orderId }],
    }),

    listEncounterOrders: builder.query<ClinicalOrder[], string>({
      query: (appointmentId) => `/orders/encounter/${appointmentId}`,
      transformResponse: (r: { data: ClinicalOrder[] }) => r.data,
      providesTags: (_r, _e, appointmentId) => [
        { type: "StaffAppointment", id: appointmentId },
        { type: "ClinicalOrder", id: `encounter-${appointmentId}` },
      ],
    }),

    listDepartmentQueue: builder.query<
      ClinicalOrder[],
      { departmentId: string; status?: OrderStatus; order_type?: OrderType }
    >({
      query: ({ departmentId, status, order_type }) => ({
        url: `/orders/department/${departmentId}`,
        params: { status, order_type },
      }),
      transformResponse: (r: { data: ClinicalOrder[] }) => r.data,
      providesTags: [{ type: "ClinicalOrder", id: "DEPT_QUEUE" }],
    }),

    acceptClinicalOrder: builder.mutation<ClinicalOrder, string>({
      query: (orderId) => ({
        url: `/orders/${orderId}/accept`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: ClinicalOrder }) => r.data,
      invalidatesTags: (_r, _e, orderId) => [
        { type: "ClinicalOrder", id: orderId },
        { type: "ClinicalOrder", id: "DEPT_QUEUE" },
      ],
    }),

    recordOrderResult: builder.mutation<
      ClinicalOrder,
      { orderId: string; payload: RecordOrderResultPayload }
    >({
      query: ({ orderId, payload }) => ({
        url: `/orders/${orderId}/result`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (r: { data: ClinicalOrder }) => r.data,
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "ClinicalOrder", id: orderId },
        { type: "ClinicalOrder", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useCreateClinicalOrderMutation,
  useGetClinicalOrderQuery,
  useListEncounterOrdersQuery,
  useListDepartmentQueueQuery,
  useAcceptClinicalOrderMutation,
  useRecordOrderResultMutation,
} = clinicalOrderApi;
