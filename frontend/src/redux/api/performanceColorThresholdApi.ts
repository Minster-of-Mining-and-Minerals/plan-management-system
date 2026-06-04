import { baseApi } from "../baseApi";
import {
  PerformanceColorThreshold,
  CreatePerformanceColorThresholdPayload,
  UpdatePerformanceColorThresholdPayload,
  GetPerformanceColorThresholdsQueryParams,
  ResolvedPerformanceColor,
} from "../types/performanceColorThreshold";

export const performanceColorThresholdApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPerformanceColorThresholds: builder.query<
      PerformanceColorThreshold[],
      GetPerformanceColorThresholdsQueryParams | void
    >({
      query: (params) => {
        if (!params) return { url: "/performance-color-thresholds" };
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== "" && v !== null && v !== undefined
          )
        );
        return Object.keys(cleanParams).length > 0
          ? { url: "/performance-color-thresholds", params: cleanParams }
          : { url: "/performance-color-thresholds" };
      },
      transformResponse: (response: { data?: PerformanceColorThreshold[] }) =>
        response.data ?? [],
      providesTags: ["PerformanceColorThresholds"],
    }),

    getPerformanceColorThresholdById: builder.query<PerformanceColorThreshold, string>({
      query: (id) => `/performance-color-thresholds/${id}`,
      transformResponse: (response: { data: PerformanceColorThreshold }) => response.data,
      providesTags: (_r, _e, id) => [{ type: "PerformanceColorThresholds", id }],
    }),

    resolvePerformanceColor: builder.query<ResolvedPerformanceColor, number>({
      query: (percentage) => ({
        url: "/performance-color-thresholds/resolve",
        params: { percentage },
      }),
      transformResponse: (response: { data: ResolvedPerformanceColor }) => response.data,
    }),

    createPerformanceColorThreshold: builder.mutation<
      PerformanceColorThreshold,
      CreatePerformanceColorThresholdPayload
    >({
      query: (body) => ({
        url: "/performance-color-thresholds",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: PerformanceColorThreshold }) => response.data,
      invalidatesTags: ["PerformanceColorThresholds"],
    }),

    updatePerformanceColorThreshold: builder.mutation<
      PerformanceColorThreshold,
      { id: string; data: UpdatePerformanceColorThresholdPayload }
    >({
      query: ({ id, data }) => ({
        url: `/performance-color-thresholds/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { data: PerformanceColorThreshold }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "PerformanceColorThresholds", id },
        "PerformanceColorThresholds",
      ],
    }),

    deletePerformanceColorThreshold: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/performance-color-thresholds/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: { message?: string }) => ({
        message: response.message ?? "Deleted",
      }),
      invalidatesTags: ["PerformanceColorThresholds"],
    }),
  }),
});

export const {
  useGetPerformanceColorThresholdsQuery,
  useGetPerformanceColorThresholdByIdQuery,
  useResolvePerformanceColorQuery,
  useCreatePerformanceColorThresholdMutation,
  useUpdatePerformanceColorThresholdMutation,
  useDeletePerformanceColorThresholdMutation,
} = performanceColorThresholdApi;
