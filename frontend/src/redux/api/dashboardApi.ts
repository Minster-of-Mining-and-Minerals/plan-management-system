import { baseApi } from "../baseApi";

export type DashboardSummary = {
  total_users: number;
  total_patients: number;
  active_departments: number;
  active_staff: number;
  appointments_today: number;
  payments_today_count: number;
  payments_today_amount: number;
  open_cashier_sessions: number;
};

export type DashboardStatsResponse = {
  success: boolean;
  message?: string;
  data: {
    summary: DashboardSummary;
    live_keys: string[];
    generated_at: string;
  };
};

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStatsResponse, void>({
      query: () => "/dashboard/stats",
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;
