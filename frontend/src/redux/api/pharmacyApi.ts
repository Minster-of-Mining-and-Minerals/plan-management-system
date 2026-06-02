import { baseApi } from "../baseApi";
import type {
  Pharmacy,
  PharmacyUser,
  PharmacyPrescription,
  PatientPrescriptionForSend,
} from "../types/pharmacy";

export const pharmacyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPharmacies: builder.query<Pharmacy[], void>({
      query: () => "/pharmacies",
      transformResponse: (r: { data: Pharmacy[] }) => r.data ?? [],
      providesTags: ["Pharmacy"],
    }),

    getPharmacyById: builder.query<Pharmacy, string>({
      query: (id) => `/pharmacies/${id}`,
      transformResponse: (r: { data: Pharmacy }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "Pharmacy", id }],
    }),

    getActivePharmacies: builder.query<Pharmacy[], void>({
      query: () => "/pharmacies/active",
      transformResponse: (r: { data: Pharmacy[] }) => r.data ?? [],
    }),

    createPharmacy: builder.mutation<Pharmacy, Partial<Pharmacy>>({
      query: (body) => ({ url: "/pharmacies", method: "POST", body }),
      transformResponse: (r: { data: Pharmacy }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    updatePharmacy: builder.mutation<
      Pharmacy,
      { id: string; body: Partial<Pharmacy> }
    >({
      query: ({ id, body }) => ({
        url: `/pharmacies/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: Pharmacy }) => r.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "Pharmacy", id }, "Pharmacy"],
    }),

    togglePharmacyStatus: builder.mutation<Pharmacy, string>({
      query: (id) => ({ url: `/pharmacies/${id}/status`, method: "PATCH" }),
      transformResponse: (r: { data: Pharmacy }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    deletePharmacy: builder.mutation<void, string>({
      query: (id) => ({ url: `/pharmacies/${id}`, method: "DELETE" }),
      invalidatesTags: ["Pharmacy"],
    }),

    createPharmacyUser: builder.mutation<
      PharmacyUser,
      { pharmacyId: string; body: Record<string, unknown> }
    >({
      query: ({ pharmacyId, body }) => ({
        url: `/pharmacies/${pharmacyId}/users`,
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: PharmacyUser }) => r.data,
      invalidatesTags: (_r, _e, { pharmacyId }) => [
        { type: "Pharmacy", id: pharmacyId },
      ],
    }),

    updatePharmacyUser: builder.mutation<
      PharmacyUser,
      { userId: string; body: Record<string, unknown> }
    >({
      query: ({ userId, body }) => ({
        url: `/pharmacies/users/${userId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: PharmacyUser }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    togglePharmacyUserStatus: builder.mutation<PharmacyUser, string>({
      query: (userId) => ({
        url: `/pharmacies/users/${userId}/status`,
        method: "PATCH",
      }),
      transformResponse: (r: { data: PharmacyUser }) => r.data,
      invalidatesTags: ["Pharmacy"],
    }),

    sendPrescriptionToPharmacy: builder.mutation<
      PharmacyPrescription,
      { prescription_id: string; pharmacy_id: string }
    >({
      query: (body) => ({
        url: "/pharmacies/prescriptions/send",
        method: "POST",
        body,
      }),
      transformResponse: (r: { data: PharmacyPrescription }) => r.data,
      invalidatesTags: ["PharmacyPrescription"],
    }),

    getPatientPrescriptionsForSend: builder.query<
      PatientPrescriptionForSend[],
      string
    >({
      query: (patientId) => `/pharmacies/patients/${patientId}/prescriptions`,
      transformResponse: (r: { data: PatientPrescriptionForSend[] }) =>
        r.data ?? [],
      providesTags: (_r, _e, patientId) => [
        { type: "PharmacyPrescription", id: `patient-${patientId}` },
      ],
    }),
  }),
});

export const {
  useGetPharmaciesQuery,
  useGetPharmacyByIdQuery,
  useGetActivePharmaciesQuery,
  useCreatePharmacyMutation,
  useUpdatePharmacyMutation,
  useTogglePharmacyStatusMutation,
  useDeletePharmacyMutation,
  useCreatePharmacyUserMutation,
  useUpdatePharmacyUserMutation,
  useTogglePharmacyUserStatusMutation,
  useSendPrescriptionToPharmacyMutation,
  useGetPatientPrescriptionsForSendQuery,
} = pharmacyApi;
