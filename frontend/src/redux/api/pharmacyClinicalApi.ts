import { baseApi } from "../baseApi";

export type PharmacyClinicalOrderStatus =
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type PharmacyDispensingStatus =
  | "PENDING_FORWARD"
  | "FORWARDED"
  | "RECEIVED"
  | "REVIEWING"
  | "PREPARING"
  | "WAITING_DOCTOR_APPROVAL"
  | "SUBSTITUTION_REQUIRED"
  | "PARTIALLY_DISPENSED"
  | "DISPENSED"
  | "COMPLETED"
  | "CANCELLED"
  | "UNAVAILABLE"
  | "REJECTED";

export type PharmacyClinicalOrderHistory = {
  history_id: string;
  order_id: string;
  previous_status?: string | null;
  new_status: string;
  changed_by: string;
  change_reason?: string | null;
  created_at: string;
};

export type PharmacyClinicalResult = {
  result_id: string;
  order_id: string;
  recorded_by: string;
  verified_by?: string | null;
  verification_status: string;
  result_summary: string;
  result_data?: {
    result_type: string;
    pharmacy_id?: string;
    pharmacy_name?: string;
    pharmacist_id?: string;
    fulfillment_reference?: string;
    dispensed_date?: string;
    medications_dispensed?: Array<{
      item_name: string;
      dosage?: string;
      frequency?: string;
      quantity_requested?: string;
      quantity_dispensed?: string;
      status?: string;
      substitution_notes?: string | null;
    }>;
  };
  recorded_at: string;
  verified_at?: string | null;
  recordedByUser?: { user_id: string; full_name: string };
  verifiedByUser?: { user_id: string; full_name: string };
};

export type PharmacyClinicalOrder = {
  order_id: string;
  appointment_id: string;
  patient_id: string;
  ordered_by: string;
  prescription_id?: string | null;
  order_type: "PHARMACY";
  priority: string;
  status: PharmacyClinicalOrderStatus;
  pharmacy_status: PharmacyDispensingStatus;
  title: string;
  order_items?: any[];
  clinical_reason?: string | null;
  created_at: string;
  updated_at: string;
  prescription?: any;
  statusHistory?: PharmacyClinicalOrderHistory[];
  result?: PharmacyClinicalResult | null;
  patient?: { user_id: string; full_name: string };
  orderedByUser?: { user_id: string; full_name: string };
};

export type ForwardPharmacyPayload = {
  orderId: string;
  pharmacy_id: string;
};

export type RequestDoctorApprovalPayload = {
  orderId: string;
  substitution_notes: string;
};

export const pharmacyClinicalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createPharmacyOrder: builder.mutation<PharmacyClinicalOrder, string>({
      query: (prescription_id) => ({
        url: "/pharmacies/clinical-orders",
        method: "POST",
        body: { prescription_id },
      }),
      transformResponse: (r: { data: PharmacyClinicalOrder }) => r.data,
      invalidatesTags: [{ type: "ClinicalOrder", id: "LIST" }],
    }),

    forwardPrescription: builder.mutation<{ order: PharmacyClinicalOrder; forward: any }, ForwardPharmacyPayload>({
      query: ({ orderId, pharmacy_id }) => ({
        url: `/pharmacies/clinical-orders/${orderId}/forward`,
        method: "POST",
        body: { pharmacy_id },
      }),
      transformResponse: (r: { data: { order: PharmacyClinicalOrder; forward: any } }) => r.data,
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "ClinicalOrder", id: orderId },
        { type: "ClinicalOrder", id: "LIST" },
      ],
    }),

    getPharmacyOrderStatus: builder.query<PharmacyClinicalOrder, string>({
      query: (orderId) => `/pharmacies/clinical-orders/${orderId}/status`,
      transformResponse: (r: { data: PharmacyClinicalOrder }) => r.data,
      providesTags: (_r, _e, orderId) => [{ type: "ClinicalOrder", id: orderId }],
    }),

    getPharmacyClinicalResult: builder.query<PharmacyClinicalResult | null, string>({
      query: (orderId) => `/pharmacies/clinical-orders/${orderId}/result`,
      transformResponse: (r: { data: PharmacyClinicalResult | null }) => r.data,
      providesTags: (_r, _e, orderId) => [{ type: "ClinicalOrder", id: `result-${orderId}` }],
    }),

    getPatientPharmacyHistory: builder.query<PharmacyClinicalOrder[], string>({
      query: (patientId) => `/pharmacies/patients/${patientId}/pharmacy-history`,
      transformResponse: (r: { data: PharmacyClinicalOrder[] }) => r.data,
      providesTags: (_r, _e, patientId) => [{ type: "ClinicalOrder", id: `patient-pharmacy-${patientId}` }],
    }),

    getPrescriptionVersionHistory: builder.query<any, string>({
      query: (prescriptionId) => `/pharmacies/prescriptions/${prescriptionId}/version-history`,
      transformResponse: (r: { data: any }) => r.data,
    }),

    requestDoctorApproval: builder.mutation<PharmacyClinicalOrder, RequestDoctorApprovalPayload>({
      query: ({ orderId, substitution_notes }) => ({
        url: `/pharmacies/clinical-orders/${orderId}/request-doctor-approval`,
        method: "POST",
        body: { substitution_notes },
      }),
      transformResponse: (r: { data: PharmacyClinicalOrder }) => r.data,
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "ClinicalOrder", id: orderId }],
    }),
  }),
});

export const {
  useCreatePharmacyOrderMutation,
  useForwardPrescriptionMutation,
  useGetPharmacyOrderStatusQuery,
  useGetPharmacyClinicalResultQuery,
  useGetPatientPharmacyHistoryQuery,
  useGetPrescriptionVersionHistoryQuery,
  useRequestDoctorApprovalMutation,
} = pharmacyClinicalApi;
