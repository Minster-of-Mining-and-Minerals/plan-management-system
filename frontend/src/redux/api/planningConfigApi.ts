import { baseApi } from "../baseApi";
import type {
  PlanningConfiguration,
  PlanningConfigurationQuery,
  RestorePlanningConfigurationPayload,
  UpdatePlanningConfigurationPayload,
} from "../types/planningConfig";

export const planningConfigApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlanningConfiguration: builder.query<
      PlanningConfiguration,
      PlanningConfigurationQuery | void
    >({
      query: (params) => {
        if (!params?.government_structure_id) {
          return "/plan/planning-config";
        }
        return {
          url: "/plan/planning-config",
          params: { government_structure_id: params.government_structure_id },
        };
      },
      transformResponse: (response: { data: PlanningConfiguration }) => response.data,
      providesTags: ["PlanningConfiguration"],
    }),

    getPlanningConfigurationForVersion: builder.query<PlanningConfiguration, string>({
      query: (versionId) => `/plan/versions/${versionId}/planning-config`,
      transformResponse: (response: { data: PlanningConfiguration }) => response.data,
      providesTags: (_r, _e, versionId) => [
        { type: "PlanningConfiguration", id: `version-${versionId}` },
      ],
    }),

    updatePlanningConfigurationForVersion: builder.mutation<
      PlanningConfiguration,
      { versionId: string; data: UpdatePlanningConfigurationPayload }
    >({
      query: ({ versionId, data }) => ({
        url: `/plan/versions/${versionId}/planning-config`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { data: PlanningConfiguration }) => response.data,
      invalidatesTags: (_r, _e, { versionId }) => [
        { type: "PlanningConfiguration", id: `version-${versionId}` },
        "PlanningConfiguration",
      ],
    }),

    updatePlanningConfiguration: builder.mutation<
      PlanningConfiguration,
      UpdatePlanningConfigurationPayload
    >({
      query: (body) => ({
        url: "/plan/planning-config",
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: PlanningConfiguration }) => response.data,
      invalidatesTags: ["PlanningConfiguration"],
    }),

    restoreDefaultPlanningConfiguration: builder.mutation<
      PlanningConfiguration,
      RestorePlanningConfigurationPayload | void
    >({
      query: (body) => ({
        url: "/plan/planning-config/restore-defaults",
        method: "POST",
        body: body ?? {},
      }),
      transformResponse: (response: { data: PlanningConfiguration }) => response.data,
      invalidatesTags: ["PlanningConfiguration"],
    }),
  }),
});

export const {
  useGetPlanningConfigurationQuery,
  useGetPlanningConfigurationForVersionQuery,
  useUpdatePlanningConfigurationMutation,
  useUpdatePlanningConfigurationForVersionMutation,
  useRestoreDefaultPlanningConfigurationMutation,
} = planningConfigApi;
