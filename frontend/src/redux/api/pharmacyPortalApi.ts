import { baseApi } from "../baseApi";
import type {
  PharmacyPrescription,
  PharmacyDashboardStats,
} from "../types/pharmacy";

export const pharmacyPortalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPharmacyPortalProfile: builder.query<
      {
        user: { user_id: string; full_name: string; email: string };
        pharmacy: { pharmacy_id: string; pharmacy_name: string; pharmacy_code: string };
        portal_role: string;
      },
      void
    >({
      query: () => "/pharmacy-portal/me",
      transformResponse: (r: { data: unknown }) => r.data as {
        user: { user_id: string; full_name: string; email: string };
        pharmacy: { pharmacy_id: string; pharmacy_name: string; pharmacy_code: string };
        portal_role: string;
      },
    }),

    getPharmacyDashboard: builder.query<PharmacyDashboardStats, void>({
      query: () => "/pharmacy-portal/dashboard",
      transformResponse: (r: { data: PharmacyDashboardStats }) => r.data,
      providesTags: ["PharmacyPortal"],
    }),

    getPharmacyPortalPrescriptions: builder.query<
      PharmacyPrescription[],
      { queue?: boolean; pharmacy_status?: string; search?: string }
    >({
      query: (params) => ({
        url: "/pharmacy-portal/prescriptions",
        params: {
          ...params,
          queue: params.queue ? "true" : undefined,
        },
      }),
      transformResponse: (r: { data: PharmacyPrescription[] }) => r.data ?? [],
      providesTags: ["PharmacyPortal"],
    }),

    getPharmacyPortalPrescription: builder.query<PharmacyPrescription, string>({
      query: (id) => `/pharmacy-portal/prescriptions/${id}`,
      transformResponse: (r: { data: PharmacyPrescription }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "PharmacyPortal", id }],
    }),

    updatePharmacyPrescriptionWorkflow: builder.mutation<
      PharmacyPrescription,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/pharmacy-portal/prescriptions/${id}/workflow`,
        method: "PATCH",
        body,
      }),
      transformResponse: (r: { data: PharmacyPrescription }) => r.data,
      invalidatesTags: ["PharmacyPortal"],
    }),
  }),
});

export const {
  useGetPharmacyPortalProfileQuery,
  useGetPharmacyDashboardQuery,
  useGetPharmacyPortalPrescriptionsQuery,
  useGetPharmacyPortalPrescriptionQuery,
  useUpdatePharmacyPrescriptionWorkflowMutation,
} = pharmacyPortalApi;
