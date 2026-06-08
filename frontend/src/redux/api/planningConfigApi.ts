import { baseApi } from "../baseApi";
import type {
  PlanningConfiguration,
  UpdatePlanningConfigurationPayload,
} from "../types/planningConfig";

export const planningConfigApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlanningConfiguration: builder.query<PlanningConfiguration, void>({
      query: () => "/plan/planning-config",
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

    restoreDefaultPlanningConfiguration: builder.mutation<PlanningConfiguration, void>({
      query: () => ({
        url: "/plan/planning-config/restore-defaults",
        method: "POST",
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
