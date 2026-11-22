"use strict";

import { baseApi } from "../baseApi";
import type {
  ProductionItem,
  ProductionReportingFrequency,
  TargetPeriodNode,
  CompanyProductionTarget,
  CompanyProductionAssignment,
  CompanyProductionReport,
  CompanyProductionTargetApprovalHistory,
  CompanyProductionReportingAssignment,
  ProductionDetailBundle,
  ProductionPerformance,
  CompanyProductionTargetAmendment,
  TargetAmendmentComparison,
  FederalProductionDashboard,
  CompanyProductionDashboard,
  TargetAlignedReportingHierarchyResponse,
  DailyReportingMatrixResponse,
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
        url: "/production/config/items",
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
        url: `/production/config/items/${id}`,
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: ProductionItem }) =>
        response.data,
      providesTags: (result, error, id) => [{ type: "ProductionItems", id }],
    }),

    createProductionItem: builder.mutation<ProductionItem, Partial<ProductionItem> & { supported_units?: any[] }>({
      query: (body) => ({
        url: "/production/config/items",
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
        url: `/production/config/items/${id}`,
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
        url: `/production/config/items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ProductionItems", id: "LIST" }],
    }),

    convertQuantity: builder.mutation<
      { convertedQuantity: number; conversionFactor: number },
      { quantity: number; fromUnitId: string; toUnitId: string; productionItemId: string }
    >({
      query: (body) => ({
        url: "/production/config/convert-quantity",
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
        url: "/production/config/frequencies",
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: ProductionReportingFrequency[] }) =>
        response.data,
      providesTags: [{ type: "ProductionFrequencies", id: "LIST" }],
    }),

    createFrequency: builder.mutation<ProductionReportingFrequency, Partial<ProductionReportingFrequency>>({
      query: (body) => ({
        url: "/production/config/frequencies",
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
        url: `/production/config/frequencies/${id}`,
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
        url: "/production/config/target-periods",
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
      { company_id?: string; license_id?: string; production_item_id?: string; is_active?: boolean | string } | void
    >({
      query: (params) => ({
        url: "/production/company/assignments",
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
        url: `/production/company/assignments/${id}`,
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionAssignment }) =>
        response.data,
      providesTags: (result, error, id) => [{ type: "CompanyProductionAssignments", id }],
    }),

    createAssignment: builder.mutation<CompanyProductionAssignment, Partial<CompanyProductionAssignment>>({
      query: (body) => ({
        url: "/production/company/assignments",
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
        url: `/production/company/assignments/${id}`,
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
        url: `/production/company/assignments/${id}/targets`,
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
        url: `/production/company/assignments/${id}/targets`,
        method: "GET",
        params: version ? { version } : {},
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionTarget[] }) =>
        response.data,
      providesTags: (result, error, { id }) => [{ type: "CompanyProductionTargets", id }],
    }),

    getProductionDetail: builder.query<ProductionDetailBundle, string>({
      query: (id) => ({
        url: `/production/company/assignments/${id}/detail`,
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: ProductionDetailBundle }) =>
        response.data,
      providesTags: (result, error, id) => [
        { type: "CompanyProductionAssignments", id },
        { type: "CompanyProductionTargets", id },
      ],
    }),

    saveTargetProposal: builder.mutation<
      any,
      {
        id: string;
        annual_target: number;
        period_type?: string;
        period_allocations: TargetPeriodNode[];
        submission_notes?: string;
        auto_submit?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/production/company/assignments/${id}/propose-targets`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: any }) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: "CompanyProductionAssignments", id },
        { type: "CompanyProductionTargets", id },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    submitTargetProposal: builder.mutation<
      any,
      { id: string; version_number?: number; submission_notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/production/company/assignments/${id}/submit-targets`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: any }) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: "CompanyProductionAssignments", id },
        { type: "CompanyProductionTargets", id },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    reviewTargetProposal: builder.mutation<
      any,
      { id: string; version_number?: number; decision: string; review_comments?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/production/company/assignments/${id}/review-targets`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: any }) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: "CompanyProductionAssignments", id },
        { type: "CompanyProductionTargets", id },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    getApprovalHistory: builder.query<
      CompanyProductionTargetApprovalHistory[],
      { id: string; version?: number | string }
    >({
      query: ({ id, version }) => ({
        url: `/production/company/assignments/${id}/approval-history`,
        method: "GET",
        params: version ? { version } : {},
      }),
      transformResponse: (response: {
        success: boolean;
        data: CompanyProductionTargetApprovalHistory[];
      }) => response.data,
      providesTags: (result, error, { id }) => [{ type: "CompanyProductionTargets", id }],
    }),

    // ------------------------------------------------------------------
    // Target Amendments Workflow
    // ------------------------------------------------------------------
    submitTargetAmendment: builder.mutation<
      TargetAmendmentComparison,
      {
        id: string;
        proposed_annual_target: number;
        period_allocations: TargetPeriodNode[];
        amendment_reason: string;
        effective_date?: string;
        submission_notes?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/production/company/assignments/${id}/amendments`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { success: boolean; data: TargetAmendmentComparison }) =>
        response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: "CompanyProductionAssignments", id },
        { type: "CompanyProductionTargets", id },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    getAmendmentComparison: builder.query<
      TargetAmendmentComparison,
      { id?: string; amendmentId?: string }
    >({
      query: ({ id, amendmentId }) => ({
        url: id
          ? `/production/company/assignments/${id}/amendments/comparison`
          : `/production/company/amendments/${amendmentId}/comparison`,
        method: "GET",
        params: amendmentId ? { amendment_id: amendmentId } : {},
      }),
      transformResponse: (response: { success: boolean; data: TargetAmendmentComparison }) =>
        response.data,
      providesTags: (result, error, arg) => [
        { type: "CompanyProductionTargets", id: arg.id || arg.amendmentId },
      ],
    }),

    listTargetAmendments: builder.query<
      CompanyProductionTargetAmendment[],
      { id?: string; company_id?: string; status?: string } | void
    >({
      query: (params) => ({
        url: params && params.id
          ? `/production/company/assignments/${params.id}/amendments`
          : "/production/company/amendments",
        method: "GET",
        params: params || {},
      }),
      transformResponse: (response: {
        success: boolean;
        data: CompanyProductionTargetAmendment[];
      }) => response.data,
      providesTags: ["CompanyProductionTargets"],
    }),

    reviewTargetAmendment: builder.mutation<
      TargetAmendmentComparison,
      {
        amendmentId: string;
        decision: "amendment_approved" | "amendment_rejected" | "amendment_revision_requested";
        review_comments?: string;
        effective_date?: string;
        assignmentId?: string;
      }
    >({
      query: ({ amendmentId, decision, review_comments, effective_date }) => ({
        url: `/production/company/amendments/${amendmentId}/review`,
        method: "POST",
        body: { decision, review_comments, effective_date },
      }),
      transformResponse: (response: { success: boolean; data: TargetAmendmentComparison }) =>
        response.data,
      invalidatesTags: (result, error, { assignmentId }) => [
        { type: "CompanyProductionAssignments", id: assignmentId || "LIST" },
        { type: "CompanyProductionTargets" },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    reviseTargetAmendment: builder.mutation<
      TargetAmendmentComparison,
      {
        amendmentId: string;
        proposed_annual_target: number;
        period_allocations: TargetPeriodNode[];
        amendment_reason: string;
        effective_date?: string;
        submission_notes?: string;
        assignmentId?: string;
      }
    >({
      query: ({ amendmentId, ...body }) => ({
        url: `/production/company/amendments/${amendmentId}/revise`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: { success: boolean; data: TargetAmendmentComparison }) =>
        response.data,
      invalidatesTags: (result, error, { assignmentId }) => [
        { type: "CompanyProductionAssignments", id: assignmentId || "LIST" },
        { type: "CompanyProductionTargets" },
        { type: "ProductionDashboard", id: "FEDERAL" },
        { type: "ProductionDashboard", id: "COMPANY" },
      ],
    }),

    getReportingResponsibilities: builder.query<CompanyProductionReportingAssignment[], string>({
      query: (id) => ({
        url: `/production/company/assignments/${id}/responsibilities`,
        method: "GET",
      }),
      transformResponse: (response: {
        success: boolean;
        data: CompanyProductionReportingAssignment[];
      }) => response.data,
      providesTags: (result, error, id) => [{ type: "CompanyProductionAssignments", id }],
    }),

    manageReportingResponsibilities: builder.mutation<
      CompanyProductionReportingAssignment[],
      { id: string; responsibilities: any[] }
    >({
      query: ({ id, responsibilities }) => ({
        url: `/production/company/assignments/${id}/responsibilities`,
        method: "POST",
        body: { responsibilities },
      }),
      transformResponse: (response: {
        success: boolean;
        data: CompanyProductionReportingAssignment[];
      }) => response.data,
      invalidatesTags: (result, error, { id }) => [{ type: "CompanyProductionAssignments", id }],
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
        url: "/production/company/reports",
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
        url: `/production/company/reports/${id}`,
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: CompanyProductionReport }) =>
        response.data,
      providesTags: (result, error, id) => [{ type: "CompanyProductionReports", id }],
    }),

    submitReport: builder.mutation<CompanyProductionReport, Partial<CompanyProductionReport>>({
      query: (body) => ({
        url: "/production/company/reports",
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
        url: `/production/company/reports/${id}`,
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
        url: `/production/company/reports/${id}/review`,
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
        url: "/production/company/performance",
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
        url: "/production/company/dashboard/federal",
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
        url: `/production/company/dashboard/company/${companyId}`,
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

    getReportingHierarchy: builder.query<
      TargetAlignedReportingHierarchyResponse,
      { assignmentId: string; year?: number }
    >({
      query: ({ assignmentId, year }) => ({
        url: `/production/company/assignments/${assignmentId}/reporting-hierarchy`,
        method: "GET",
        params: year ? { year } : {},
      }),
      transformResponse: (response: {
        success: boolean;
        data: TargetAlignedReportingHierarchyResponse;
      }) => response.data,
      providesTags: (result, error, { assignmentId }) => [
        { type: "CompanyProductionReports", id: `HIERARCHY_${assignmentId}` },
        { type: "CompanyProductionAssignments", id: assignmentId },
      ],
    }),

    getDailyReportingMatrix: builder.query<
      DailyReportingMatrixResponse,
      { assignmentId: string; month: string }
    >({
      query: ({ assignmentId, month }) => ({
        url: `/production/company/assignments/${assignmentId}/daily-matrix`,
        method: "GET",
        params: { month },
      }),
      transformResponse: (response: {
        success: boolean;
        data: DailyReportingMatrixResponse;
      }) => response.data,
      providesTags: (result, error, { assignmentId, month }) => [
        { type: "CompanyProductionReports", id: `MATRIX_${assignmentId}_${month}` },
      ],
    }),

    getMeasurementUnits: builder.query<any[], void>({
      query: () => ({
        url: "/gold/units",
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
  useGetProductionDetailQuery,
  useSaveTargetProposalMutation,
  useSubmitTargetProposalMutation,
  useReviewTargetProposalMutation,
  useGetApprovalHistoryQuery,
  useSubmitTargetAmendmentMutation,
  useGetAmendmentComparisonQuery,
  useListTargetAmendmentsQuery,
  useReviewTargetAmendmentMutation,
  useReviseTargetAmendmentMutation,
  useGetReportingResponsibilitiesQuery,
  useManageReportingResponsibilitiesMutation,
  useGetReportsQuery,
  useGetReportByIdQuery,
  useSubmitReportMutation,
  useUpdateReportMutation,
  useReviewReportMutation,
  useGetProductionPerformanceQuery,
  useGetFederalProductionDashboardQuery,
  useGetCompanyProductionDashboardQuery,
  useGetReportingHierarchyQuery,
  useGetDailyReportingMatrixQuery,
  useGetMeasurementUnitsQuery,
} = productionApi;
