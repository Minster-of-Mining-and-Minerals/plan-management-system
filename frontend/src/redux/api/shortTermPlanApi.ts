import { baseApi } from "../baseApi";
import type {
  ShortTermPlan,
  ShortTermKpi,
  ShortTermKpiAssignment,
  ShortTermFrequency,
  ShortTermSubmissionType,
} from "../types/shortTermPlan";
import type { CalendarSystem } from "@/utils/calendarUtils";

export const shortTermPlanApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShortTermPlans: builder.query<
      ShortTermPlan[],
      { government_structure_id?: string; status?: string } | void
    >({
      query: (params) => ({
        url: "/short-term-plans",
        params: params || undefined,
      }),
      transformResponse: (res: { data: ShortTermPlan[] }) => res.data || [],
      providesTags: ["ShortTermPlan"],
    }),

    getShortTermPlanDetail: builder.query<
      ShortTermPlan,
      { planId: string; internal_structure_id?: string; assigned_user_id?: string }
    >({
      query: ({ planId, ...params }) => ({
        url: `/short-term-plans/${planId}`,
        params,
      }),
      transformResponse: (res: { data: ShortTermPlan }) => res.data,
      providesTags: (_res, _err, arg) => [{ type: "ShortTermPlan", id: arg.planId }],
    }),

    createShortTermPlan: builder.mutation<
      ShortTermPlan,
      {
        title: string;
        description?: string;
        government_structure_id?: string | null;
        calendar_system?: CalendarSystem;
        start_date: string;
        end_date: string;
        duration_months?: number;
        default_frequency?: ShortTermFrequency;
      }
    >({
      query: (body) => ({
        url: "/short-term-plans",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: ShortTermPlan }) => res.data,
      invalidatesTags: ["ShortTermPlan"],
    }),

    addShortTermKpi: builder.mutation<
      ShortTermKpi,
      {
        planId: string;
        code: string;
        title: string;
        unit: string;
        total_target?: number | null;
        target_mode?: "cumulative" | "milestone" | "continuous";
        reporting_frequency?: ShortTermFrequency;
        allow_narrative_only_updates?: boolean;
      }
    >({
      query: ({ planId, ...body }) => ({
        url: `/short-term-plans/${planId}/kpis`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: ShortTermKpi }) => res.data,
      invalidatesTags: (_res, _err, arg) => ["ShortTermPlan", { type: "ShortTermPlan", id: arg.planId }],
    }),

    assignShortTermKpi: builder.mutation<
      ShortTermKpiAssignment,
      {
        kpiId: string;
        planId: string;
        government_structure_id: string;
        internal_structure_id?: string | null;
        assigned_user_id?: string | null;
        assignee_label?: string;
        allocated_target?: number | null;
        period_targets?: Record<string, number | string>;
        reporting_frequency_override?: ShortTermFrequency | null;
      }
    >({
      query: ({ kpiId, planId: _planId, ...body }) => ({
        url: `/short-term-plans/kpis/${kpiId}/assign`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: ShortTermKpiAssignment }) => res.data,
      invalidatesTags: (_res, _err, arg) => ["ShortTermPlan", { type: "ShortTermPlan", id: arg.planId }],
    }),

    submitShortTermReport: builder.mutation<
      unknown,
      {
        assignmentId: string;
        planId: string;
        period_label: string;
        period_index?: number;
        submission_type: ShortTermSubmissionType;
        reported_actual?: number | null;
        narrative?: string;
      }
    >({
      query: ({ assignmentId, planId: _planId, ...body }) => ({
        url: `/short-term-plans/assignments/${assignmentId}/reports`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => ["ShortTermPlan", { type: "ShortTermPlan", id: arg.planId }],
    }),
  }),
});

export const {
  useGetShortTermPlansQuery,
  useGetShortTermPlanDetailQuery,
  useCreateShortTermPlanMutation,
  useAddShortTermKpiMutation,
  useAssignShortTermKpiMutation,
  useSubmitShortTermReportMutation,
} = shortTermPlanApi;
