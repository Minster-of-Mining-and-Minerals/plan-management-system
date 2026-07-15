import { baseApi } from "../baseApi";
import {
    PlanRule,
    CreatePlanRulePayload,
    UpdatePlanRulePayload,
    GetPlanRulesQueryParams,
} from "../types/plan";

export const planRuleApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getPlanRules: builder.query<PlanRule[], GetPlanRulesQueryParams | void>({
            query: (params) => {
                if (!params) return { url: "/plan/rules" };
                const cleanParams = Object.fromEntries(
                    Object.entries(params).filter(
                        ([, v]) => v !== "" && v !== null && v !== undefined
                    )
                );
                return Object.keys(cleanParams).length > 0
                    ? { url: "/plan/rules", params: cleanParams }
                    : { url: "/plan/rules" };
            },
            transformResponse: (response: { data?: PlanRule[] }): PlanRule[] =>
                response.data ?? [],
            providesTags: ["PlanRules"],
        }),

        getPlanRuleById: builder.query<PlanRule, string>({
            query: (id) => `/plan/rules/${id}`,
            transformResponse: (response: { data: PlanRule }): PlanRule => response.data,
            providesTags: (_r, _e, id) => [{ type: "PlanRules", id }],
        }),

        getPlanRuleForVersion: builder.query<PlanRule | null, string>({
            query: (versionId) => `/plan/versions/${versionId}/rule`,
            transformResponse: (response: { data: PlanRule | null }): PlanRule | null =>
                response.data ?? null,
            providesTags: (_r, _e, versionId) => [
                { type: "PlanRules", id: `version-${versionId}` },
            ],
        }),

        createPlanRule: builder.mutation<PlanRule, CreatePlanRulePayload>({
            query: (body) => ({
                url: "/plan/rules",
                method: "POST",
                body,
            }),
            transformResponse: (response: { data: PlanRule }): PlanRule => response.data,
            invalidatesTags: ["PlanRules"],
        }),

        updatePlanRule: builder.mutation<
            PlanRule,
            { id: string; data: UpdatePlanRulePayload }
        >({
            query: ({ id, data }) => ({
                url: `/plan/rules/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: { data: PlanRule }): PlanRule => response.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: "PlanRules", id },
                "PlanRules",
            ],
        }),

        updatePlanRuleForVersion: builder.mutation<
            PlanRule,
            { versionId: string; data: UpdatePlanRulePayload }
        >({
            query: ({ versionId, data }) => ({
                url: `/plan/versions/${versionId}/rule`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: { data: PlanRule }): PlanRule => response.data,
            invalidatesTags: (_r, _e, { versionId }) => [
                { type: "PlanRules", id: `version-${versionId}` },
                "PlanRules",
                { type: "PlanVersions", id: versionId },
                "PlanVersions",
            ],
        }),

        deletePlanRule: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/plan/rules/${id}`,
                method: "DELETE",
            }),
            transformResponse: (response: { message?: string }) => ({
                message: response.message ?? "Deleted",
            }),
            invalidatesTags: ["PlanRules"],
        }),
    }),
});

export const {
    useGetPlanRulesQuery,
    useGetPlanRuleByIdQuery,
    useGetPlanRuleForVersionQuery,
    useCreatePlanRuleMutation,
    useUpdatePlanRuleMutation,
    useUpdatePlanRuleForVersionMutation,
    useDeletePlanRuleMutation,
} = planRuleApi;
