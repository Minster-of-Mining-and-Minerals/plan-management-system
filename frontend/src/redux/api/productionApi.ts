"use strict";

import { baseApi } from "../baseApi";
import type {
  ProductionItem,
  ProductionReportingFrequency,
  TargetPeriodNode,
  CompanyProductionTarget,
  CompanyProductionAssignment,
  CompanyProductionReport,
  ProductionPerformance,
  FederalProductionDashboard,
  CompanyProductionDashboard,
} from "../types/production";

export const productionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ------------------------------------------------------------------
    // Production Items
    // ------------------------------------------------------------------
    getProductionItems: builder.query<
      ProductionItem[],
      { is_active?: boolean | string; category?: string; search?: string } | void
    >({
      query: (params) => ({
        url: "/api/production/config/items",
        method: "GET",
        params: params || {},
      }),
      transformResponse: (response: { success: boolean; data: ProductionItem[] }) =>
        response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ production_item_id }) => ({
                type: "ProductionItems" as const,
                id: production_item_id,
              })),
              { type: "ProductionItems", id: "LIST" },
            ]
          : [{ type: "ProductionItems", id: "LIST" }],
    }),

    getProductionItemById: builder.query<ProductionItem, string>({
      query: (id) => ({
        url: `/api/production/config/items/${id}`,
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: ProductionItem }) =>
        response.data,
      providesTags: (result, error, id) => [{ type: "ProductionItems", id }],
    }),

    createProductionItem: builder.mutation<ProductionItem, Partial<ProductionItem> & { supported_units?: any[] }>({
      query: (body) => ({
        url: "/api/production/config/items",
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: ProductionItem }) =>
        response.data,
      invalidatesTags: [{ type: "ProductionItems", id: "LIST" }],
    }),

    updateProductionItem: builder.mutation<
      ProductionItem,
      { id: string; data: Partial<ProductionItem> & { supported_units?: any[] } }
    >({
      query: ({ id, data }) => ({
        url: `/api/production/config/items/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { success: boolean; data: ProductionItem }) =>
        response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: "ProductionItems", id },
        { type: "ProductionItems", id: "LIST" },
      ],
    }),

    deleteProductionItem: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/api/production/config/items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ProductionItems", id: "LIST" }],
    }),

    convertQuantity: builder.mutation<
      { convertedQuantity: number; conversionFactor: number },
      { quantity: number; fromUnitId: string; toUnitId: string; productionItemId: string }
    >({
      query: (body) => ({
        url: "/api/production/config/convert-quantity",
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: { convertedQuantity: number; conversionFactor: number } }) =>
        response.data,
    }),

    // ------------------------------------------------------------------
    // Frequencies & Periods
    // ------------------------------------------------------------------
    getFrequencies: builder.query<ProductionReportingFrequency[], void>({
      query: () => ({
        url: "/api/production/config/frequencies",
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: ProductionReportingFrequency[] }) =>
        response.data,
      providesTags: [{ type: "ProductionFrequencies", id: "LIST" }],
    }),

    createFrequency: builder.mutation<ProductionReportingFrequency, Partial<ProductionReportingFrequency>>({
      query: (body) => ({
        url: "/api/production/config/frequencies",
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: ProductionReportingFrequency }) =>
        response.data,
      invalidatesTags: [{ type: "ProductionFrequencies", id: "LIST" }],
    }),

    updateFrequency: builder.mutation<
      ProductionReportingFrequency,
      { id: string; data: Partial<ProductionReportingFrequency> }
    >({
      query: ({ id, data }) => ({
        url: `/api/production/config/frequencies/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { success: boolean; data: ProductionReportingFrequency }) =>
        response.data,
      invalidatesTags: [{ type: "ProductionFrequencies", id: "LIST" }],
    }),

    getTargetPeriods: builder.query<
      TargetPeriodNode[],
      { year: number | string; allocationDepth?: string; startDate?: string; endDate?: string }
    >({
      query: (params) => ({
        url: "/api/production/config/target-periods",
        method: "GET",
        params,
      }),
      transformResponse: (response: { success: boolean; data: TargetPeriodNode[] }) =>
        response.data,
    }),

    // ------------------------------------------------------------------
    // Company Production Assignments & Targets
    // ------------------------------------------------------------------
    getAssignments: builder.query<
      CompanyProductionAssignment[],
      { company_id?: string; production_item_id?: string; is_active?: boolean | string } | void
    >({
      query: (params) => ({
        url: "/api/production/company/assignments",
        method: "GET",
        params: params || {},
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionAssignment[] }) =>
        response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ assignment_id }) => ({
                type: "CompanyProductionAssignments" as const,
                id: assignment_id,
              })),
              { type: "CompanyProductionAssignments", id: "LIST" },
            ]
          : [{ type: "CompanyProductionAssignments", id: "LIST" }],
    }),

    getAssignmentById: builder.query<CompanyProductionAssignment, string>({
      query: (id) => ({
        url: `/api/production/company/assignments/${id}`,
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionAssignment }) =>
        response.data,
      providesTags: (result, error, id) => [{ type: "CompanyProductionAssignments", id }],
    }),

    createAssignment: builder.mutation<CompanyProductionAssignment, Partial<CompanyProductionAssignment>>({
      query: (body) => ({
        url: "/api/production/company/assignments",
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionAssignment }) =>
        response.data,
      invalidatesTags: [
        { type: "CompanyProductionAssignments", id: "LIST" },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    updateAssignment: builder.mutation<
      CompanyProductionAssignment,
      { id: string; data: Partial<CompanyProductionAssignment> }
    >({
      query: ({ id, data }) => ({
        url: `/api/production/company/assignments/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionAssignment }) =>
        response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: "CompanyProductionAssignments", id },
        { type: "CompanyProductionAssignments", id: "LIST" },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    saveTargetHierarchy: builder.mutation<
      CompanyProductionTarget[],
      { id: string; targets: TargetPeriodNode[]; revision_reason?: string }
    >({
      query: ({ id, targets, revision_reason }) => ({
        url: `/api/production/company/assignments/${id}/targets`,
        method: "POST",
        body: { targets, revision_reason },
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionTarget[] }) =>
        response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: "CompanyProductionTargets", id },
        { type: "CompanyProductionAssignments", id },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    getTargetsByAssignment: builder.query<
      CompanyProductionTarget[],
      { id: string; version?: number | string }
    >({
      query: ({ id, version }) => ({
        url: `/api/production/company/assignments/${id}/targets`,
        method: "GET",
        params: version ? { version } : {},
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionTarget[] }) =>
        response.data,
      providesTags: (result, error, { id }) => [{ type: "CompanyProductionTargets", id }],
    }),

    // ------------------------------------------------------------------
    // Production Reports
    // ------------------------------------------------------------------
    getReports: builder.query<
      { reports: CompanyProductionReport[]; total: number; page: number; totalPages: number },
      {
        company_id?: string;
        production_item_id?: string;
        assignment_id?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => ({
        url: "/api/production/company/reports",
        method: "GET",
        params: params || {},
      }),
      transformResponse: (response: {
        success: boolean;
        data: CompanyProductionReport[];
        pagination: { total: number; page: number; totalPages: number };
      }) => ({
        reports: response.data,
        total: response.pagination.total,
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
      }),
      providesTags: [{ type: "CompanyProductionReports", id: "LIST" }],
    }),

    getReportById: builder.query<CompanyProductionReport, string>({
      query: (id) => ({
        url: `/api/production/company/reports/${id}`,
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionReport }) =>
        response.data,
      providesTags: (result, error, id) => [{ type: "CompanyProductionReports", id }],
    }),

    submitReport: builder.mutation<CompanyProductionReport, Partial<CompanyProductionReport>>({
      query: (body) => ({
        url: "/api/production/company/reports",
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionReport }) =>
        response.data,
      invalidatesTags: [
        { type: "CompanyProductionReports", id: "LIST" },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    updateReport: builder.mutation<
      CompanyProductionReport,
      { id: string; data: Partial<CompanyProductionReport> }
    >({
      query: ({ id, data }) => ({
        url: `/api/production/company/reports/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionReport }) =>
        response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: "CompanyProductionReports", id },
        { type: "CompanyProductionReports", id: "LIST" },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    reviewReport: builder.mutation<
      CompanyProductionReport,
      { id: string; action: "approved" | "rejected"; review_comments?: string }
    >({
      query: ({ id, action, review_comments }) => ({
        url: `/api/production/company/reports/${id}/review`,
        method: "POST",
        body: { action, review_comments },
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionReport }) =>
        response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: "CompanyProductionReports", id },
        { type: "CompanyProductionReports", id: "LIST" },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    // ------------------------------------------------------------------
    // Dashboards & Performance Engine
    // ------------------------------------------------------------------
    getProductionPerformance: builder.query<
      ProductionPerformance,
      {
        company_id?: string;
        production_item_id: string;
        start_date?: string;
        end_date?: string;
        period_type?: string;
        period_label?: string;
      }
    >({
      query: (params) => ({
        url: "/api/production/company/performance",
        method: "GET",
        params,
      }),
      transformResponse: (response: { success: boolean; data: ProductionPerformance }) =>
        response.data,
      providesTags: [{ type: "ProductionDashboard", id: "PERFORMANCE" }],
    }),

    getFederalProductionDashboard: builder.query<
      FederalProductionDashboard,
      {
        company_id?: string;
        production_item_id?: string;
        start_date?: string;
        end_date?: string;
        period_label?: string;
      } | void
    >({
      query: (params) => ({
        url: "/api/production/company/dashboard/federal",
        method: "GET",
        params: params || {},
      }),
      transformResponse: (response: { success: boolean; data: FederalProductionDashboard }) =>
        response.data,
      providesTags: [{ type: "ProductionDashboard", id: "FEDERAL" }],
    }),

    getCompanyProductionDashboard: builder.query<
      CompanyProductionDashboard,
      { companyId: string; start_date?: string; end_date?: string; period_label?: string }
    >({
      query: ({ companyId, ...params }) => ({
        url: `/api/production/company/dashboard/company/${companyId}`,
        method: "GET",
        params,
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionDashboard }) =>
        response.data,
      providesTags: (result, error, { companyId }) => [
        { type: "ProductionDashboard", id: `COMPANY_${companyId}` },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    getMeasurementUnits: builder.query<any[], void>({
      query: () => ({
        url: "/api/gold/units",
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: any[] }) => response.data,
    }),
  }),
});

export const {
  useGetProductionItemsQuery,
  useGetProductionItemByIdQuery,
  useCreateProductionItemMutation,
  useUpdateProductionItemMutation,
  useDeleteProductionItemMutation,
  useConvertQuantityMutation,
  useGetFrequenciesQuery,
  useCreateFrequencyMutation,
  useUpdateFrequencyMutation,
  useGetTargetPeriodsQuery,
  useGetAssignmentsQuery,
  useGetAssignmentByIdQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useSaveTargetHierarchyMutation,
  useGetTargetsByAssignmentQuery,
  useGetReportsQuery,
  useGetReportByIdQuery,
  useSubmitReportMutation,
  useUpdateReportMutation,
  useReviewReportMutation,
  useGetProductionPerformanceQuery,
  useGetFederalProductionDashboardQuery,
  useGetCompanyProductionDashboardQuery,
  useGetMeasurementUnitsQuery,
} = productionApi;
