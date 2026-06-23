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
  useUpdatePlanningConfigurationMutation,
  useRestoreDefaultPlanningConfigurationMutation,
} = planningConfigApi;
