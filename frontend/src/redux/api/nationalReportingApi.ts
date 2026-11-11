import { baseApi } from "../baseApi";
import {
  NationalReportingRequirement,
  NationalReportingAssignment,
  RegionalRequirementMapping,
  NationalPublishedRecord,
  NationalDashboardSummary,
  UnitsCatalog,
  RegionNationalReportingConfig,
  DirectFormSubmissionPayload,
  SubmissionVersionHistoryResponse,
  TogglePeriodLockPayload,
} from "../types/nationalReporting";

export const nationalReportingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ================= Federal Endpoints =================
    getNationalRequirements: builder.query<
      NationalReportingRequirement[],
      { category?: string; is_active?: boolean | string; search?: string } | void
    >({
      query: (params) => ({
        url: "/national-reporting",
        params: params || {},
      }),
      transformResponse: (res: any) => res.data || [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ requirement_id }) => ({
                type: "NationalRequirement" as const,
                id: requirement_id,
              })),
              { type: "NationalRequirement", id: "LIST" },
            ]
          : [{ type: "NationalRequirement", id: "LIST" }],
    }),

    getNationalRequirementById: builder.query<NationalReportingRequirement, string>({
      query: (id) => `/national-reporting/${id}`,
      transformResponse: (res: any) => res.data,
      providesTags: (_res, _err, id) => [{ type: "NationalRequirement", id }],
    }),

    createNationalRequirement: builder.mutation<
      NationalReportingRequirement,
      Partial<NationalReportingRequirement>
    >({
      query: (body) => ({
        url: "/national-reporting",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "NationalRequirement", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    updateNationalRequirement: builder.mutation<
      NationalReportingRequirement,
      { id: string; data: Partial<NationalReportingRequirement> }
    >({
      query: ({ id, data }) => ({
        url: `/national-reporting/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "NationalRequirement", id },
        { type: "NationalRequirement", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    deleteNationalRequirement: builder.mutation<any, string>({
      query: (id) => ({
        url: `/national-reporting/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "NationalRequirement", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    assignRequirementToRegions: builder.mutation<
      NationalReportingAssignment[],
      {
        requirementId: string;
        regionIds: string[];
        isMandatory?: boolean;
        effectiveStartDate?: string | null;
        effectiveEndDate?: string | null;
        frequencyOverride?: string | null;
        notes?: string | null;
      }
    >({
      query: ({ requirementId, ...body }) => ({
        url: `/national-reporting/${requirementId}/assign`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "NationalRequirement", id: "LIST" },
        { type: "NationalAssignment", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    getNationalAssignments: builder.query<
      NationalReportingAssignment[],
      { requirement_id?: string; region_id?: string; status?: string } | void
    >({
      query: (params) => ({
        url: "/national-reporting/assignments",
        params: params || {},
      }),
      transformResponse: (res: any) => res.data || [],
      providesTags: [{ type: "NationalAssignment", id: "LIST" }],
    }),

    updateNationalAssignment: builder.mutation<
      NationalReportingAssignment,
      { assignmentId: string; data: Partial<NationalReportingAssignment> }
    >({
      query: ({ assignmentId, data }) => ({
        url: `/national-reporting/assignments/${assignmentId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: [
        { type: "NationalAssignment", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    togglePeriodLockOverride: builder.mutation<
      NationalReportingAssignment,
      TogglePeriodLockPayload
    >({
      query: ({ assignmentId, ...body }) => ({
        url: `/national-reporting/assignments/${assignmentId}/lock-override`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "NationalAssignment", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    getNationalPublishedRecords: builder.query<
      NationalPublishedRecord[],
      {
        requirement_id?: string;
        region_id?: string;
        reporting_year?: number;
        reporting_period_label?: string;
        status?: string;
        search?: string;
      } | void
    >({
      query: (params) => ({
        url: "/national-reporting/published-records",
        params: params || {},
      }),
      transformResponse: (res: any) => res.data || [],
      providesTags: [{ type: "NationalPublishedRecord", id: "LIST" }],
    }),

    getNationalPublishedRecordById: builder.query<NationalPublishedRecord, string>({
      query: (id) => `/national-reporting/published-records/${id}`,
      transformResponse: (res: any) => res.data,
      providesTags: (_res, _err, id) => [{ type: "NationalPublishedRecord", id }],
    }),

    requestNationalClarification: builder.mutation<
      NationalPublishedRecord,
      { recordId: string; notes: string }
    >({
      query: ({ recordId, notes }) => ({
        url: `/national-reporting/published-records/${recordId}/clarification`,
        method: "POST",
        body: { notes },
      }),
      invalidatesTags: (_res, _err, { recordId }) => [
        { type: "NationalPublishedRecord", id: recordId },
        { type: "NationalPublishedRecord", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    getNationalDashboardSummary: builder.query<
      NationalDashboardSummary,
      { reporting_year?: number; reporting_period_label?: string; region_id?: string } | void
    >({
      query: (params) => ({
        url: "/national-reporting/dashboard-summary",
        params: params || {},
      }),
      transformResponse: (res: any) => res.data,
      providesTags: ["NationalDashboard"],
    }),

    getNationalUnitsCatalog: builder.query<UnitsCatalog, void>({
      query: () => "/national-reporting/units-catalog",
      transformResponse: (res: any) => res.data,
    }),

    // ================= Regional Endpoints =================
    getRegionalAssignedRequirements: builder.query<
      NationalReportingAssignment[],
      { regionId: string }
    >({
      query: ({ regionId }) => `/regional/national-reporting/${regionId}/requirements`,
      transformResponse: (res: any) => res.data || [],
      providesTags: (_res, _err, { regionId }) => [
        { type: "NationalAssignment", id: `REGIONAL_${regionId}` },
      ],
    }),

    createRegionalPotentialMapping: builder.mutation<
      RegionalRequirementMapping,
      {
        regionId: string;
        assignmentId: string;
        regionalPlanNodeId: string;
        regionalPlanVersionId?: string | null;
        notes?: string | null;
        contributionRatio?: number;
      }
    >({
      query: ({ regionId, assignmentId, ...body }) => ({
        url: `/regional/national-reporting/${regionId}/assignments/${assignmentId}/potential-mapping`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, { regionId }) => [
        { type: "NationalAssignment", id: `REGIONAL_${regionId}` },
        { type: "NationalAssignment", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    confirmRegionalMapping: builder.mutation<
      RegionalRequirementMapping,
      {
        regionId: string;
        mappingId: string;
        executionPeriodVersionId: string;
        regionalPlanNodeId?: string | null;
      }
    >({
      query: ({ regionId, mappingId, ...body }) => ({
        url: `/regional/national-reporting/${regionId}/mappings/${mappingId}/confirm`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, { regionId }) => [
        { type: "NationalAssignment", id: `REGIONAL_${regionId}` },
        { type: "NationalAssignment", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    deleteRegionalMapping: builder.mutation<
      any,
      { regionId: string; mappingId: string }
    >({
      query: ({ regionId, mappingId }) => ({
        url: `/regional/national-reporting/${regionId}/mappings/${mappingId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, { regionId }) => [
        { type: "NationalAssignment", id: `REGIONAL_${regionId}` },
        { type: "NationalAssignment", id: "LIST" },
        "NationalDashboard",
      ],
    }),

    publishRegionalValidatedReport: builder.mutation<
      { success: boolean; publishedRecord: NationalPublishedRecord; receipt: any },
      {
        regionId: string;
        mappingId: string;
        narrativeOverride?: string | null;
      }
    >({
      query: ({ regionId, mappingId, ...body }) => ({
        url: `/regional/national-reporting/${regionId}/mappings/${mappingId}/publish`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, { regionId }) => [
        { type: "NationalAssignment", id: `REGIONAL_${regionId}` },
        { type: "NationalAssignment", id: "LIST" },
        { type: "NationalPublishedRecord", id: "LIST" },
        { type: "NationalPublishedRecord", id: `REGIONAL_${regionId}` },
        "NationalDashboard",
      ],
    }),

    getRegionalPublicationHistory: builder.query<
      NationalPublishedRecord[],
      { regionId: string; reporting_year?: number; status?: string }
    >({
      query: ({ regionId, ...params }) => ({
        url: `/regional/national-reporting/${regionId}/publications`,
        params,
      }),
      transformResponse: (res: any) => res.data || [],
      providesTags: (_res, _err, { regionId }) => [
        { type: "NationalPublishedRecord", id: `REGIONAL_${regionId}` },
      ],
    }),

    getRegionNationalReportingConfig: builder.query<
      RegionNationalReportingConfig,
      string
    >({
      query: (regionId) => `/regional/national-reporting/${regionId}/config`,
      transformResponse: (res: any) => res.data,
      providesTags: (_res, _err, regionId) => [
        { type: "NationalAssignment" as const, id: `CONFIG_${regionId}` },
      ],
    }),

    updateRegionNationalReportingConfig: builder.mutation<
      RegionNationalReportingConfig,
      { regionId: string; data: Partial<RegionNationalReportingConfig> }
    >({
      query: ({ regionId, data }) => ({
        url: `/national-reporting/regions/${regionId}/config`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_res, _err, { regionId }) => [
        { type: "NationalAssignment" as const, id: `CONFIG_${regionId}` },
        { type: "NationalAssignment" as const, id: `REGIONAL_${regionId}` },
        { type: "NationalAssignment" as const, id: "LIST" },
        "NationalDashboard",
      ],
    }),

    submitDirectFormReport: builder.mutation<
      { success: boolean; publishedRecord: NationalPublishedRecord; receipt: any },
      { regionId: string; data: DirectFormSubmissionPayload }
    >({
      query: ({ regionId, data }) => ({
        url: `/regional/national-reporting/${regionId}/direct-form-submissions`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_res, _err, { regionId }) => [
        { type: "NationalAssignment" as const, id: `REGIONAL_${regionId}` },
        { type: "NationalAssignment" as const, id: "LIST" },
        { type: "NationalPublishedRecord" as const, id: "LIST" },
        { type: "NationalPublishedRecord" as const, id: `REGIONAL_${regionId}` },
        "NationalDashboard",
      ],
    }),

    getSubmissionVersions: builder.query<
      SubmissionVersionHistoryResponse,
      {
        recordId?: string;
        requirementId?: string;
        regionId?: string;
        reportingYear?: number;
        reportingPeriodLabel?: string;
      }
    >({
      query: (params) => ({
        url: params.regionId
          ? `/regional/national-reporting/${params.regionId}/submissions/versions`
          : "/national-reporting/submissions/versions",
        params: {
          record_id: params.recordId,
          requirement_id: params.requirementId,
          region_id: params.regionId,
          reporting_year: params.reportingYear,
          reporting_period_label: params.reportingPeriodLabel,
        },
      }),
      transformResponse: (res: any) => res.data,
      providesTags: ["NationalPublishedRecord"],
    }),
  }),
});

export const {
  useGetNationalRequirementsQuery,
  useGetNationalRequirementByIdQuery,
  useCreateNationalRequirementMutation,
  useUpdateNationalRequirementMutation,
  useDeleteNationalRequirementMutation,
  useAssignRequirementToRegionsMutation,
  useGetNationalAssignmentsQuery,
  useUpdateNationalAssignmentMutation,
  useTogglePeriodLockOverrideMutation,
  useGetNationalPublishedRecordsQuery,
  useGetNationalPublishedRecordByIdQuery,
  useRequestNationalClarificationMutation,
  useGetNationalDashboardSummaryQuery,
  useGetNationalUnitsCatalogQuery,
  useGetRegionalAssignedRequirementsQuery,
  useCreateRegionalPotentialMappingMutation,
  useConfirmRegionalMappingMutation,
  useDeleteRegionalMappingMutation,
  usePublishRegionalValidatedReportMutation,
  useGetRegionalPublicationHistoryQuery,
  useGetRegionNationalReportingConfigQuery,
  useUpdateRegionNationalReportingConfigMutation,
  useSubmitDirectFormReportMutation,
  useGetSubmissionVersionsQuery,
  useLazyGetSubmissionVersionsQuery,
} = nationalReportingApi;

