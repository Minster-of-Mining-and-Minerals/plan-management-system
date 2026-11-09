import { baseApi } from "../baseApi";
import type {
  InspectionAnalyticsData,
  InspectionAnalyticsParams,
  InspectionSummary,
  InspectionStatusItem,
  InspectionCategoryItem,
  InspectionRegionItem,
  InspectionTeamItem,
  InspectionTrendItem,
} from "../types/inspectionAnalytics";

export const inspectionAnalyticsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getInspectionAnalytics: builder.query<
      InspectionAnalyticsData,
      InspectionAnalyticsParams | void
    >({
      query: (params) => ({
        url: "/inspection-analytics",
        params: params || undefined,
      }),
      transformResponse: (res: { data: InspectionAnalyticsData }) => res.data,
      providesTags: ["InspectionAnalytics"],
    }),

    getInspectionSummary: builder.query<
      InspectionSummary,
      InspectionAnalyticsParams | void
    >({
      query: (params) => ({
        url: "/inspection-analytics/summary",
        params: params || undefined,
      }),
      transformResponse: (res: { data: InspectionSummary }) => res.data,
      providesTags: ["InspectionAnalytics"],
    }),

    getInspectionStatusBreakdown: builder.query<
      InspectionStatusItem[],
      InspectionAnalyticsParams | void
    >({
      query: (params) => ({
        url: "/inspection-analytics/status",
        params: params || undefined,
      }),
      transformResponse: (res: { data: InspectionStatusItem[] }) => res.data,
      providesTags: ["InspectionAnalytics"],
    }),

    getInspectionCategoryBreakdown: builder.query<
      InspectionCategoryItem[],
      InspectionAnalyticsParams | void
    >({
      query: (params) => ({
        url: "/inspection-analytics/category",
        params: params || undefined,
      }),
      transformResponse: (res: { data: InspectionCategoryItem[] }) => res.data,
      providesTags: ["InspectionAnalytics"],
    }),

    getInspectionRegionalBreakdown: builder.query<
      InspectionRegionItem[],
      InspectionAnalyticsParams | void
    >({
      query: (params) => ({
        url: "/inspection-analytics/region",
        params: params || undefined,
      }),
      transformResponse: (res: { data: InspectionRegionItem[] }) => res.data,
      providesTags: ["InspectionAnalytics"],
    }),

    getInspectionTeamBreakdown: builder.query<
      InspectionTeamItem[],
      InspectionAnalyticsParams | void
    >({
      query: (params) => ({
        url: "/inspection-analytics/team",
        params: params || undefined,
      }),
      transformResponse: (res: { data: InspectionTeamItem[] }) => res.data,
      providesTags: ["InspectionAnalytics"],
    }),

    getInspectionTrends: builder.query<
      InspectionTrendItem[],
      InspectionAnalyticsParams | void
    >({
      query: (params) => ({
        url: "/inspection-analytics/trends",
        params: params || undefined,
      }),
      transformResponse: (res: { data: InspectionTrendItem[] }) => res.data,
      providesTags: ["InspectionAnalytics"],
    }),
  }),
});

export const {
  useGetInspectionAnalyticsQuery,
  useLazyGetInspectionAnalyticsQuery,
  useGetInspectionSummaryQuery,
  useGetInspectionStatusBreakdownQuery,
  useGetInspectionCategoryBreakdownQuery,
  useGetInspectionRegionalBreakdownQuery,
  useGetInspectionTeamBreakdownQuery,
  useGetInspectionTrendsQuery,
} = inspectionAnalyticsApi;

