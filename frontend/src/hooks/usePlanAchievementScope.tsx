"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useGetPlanAchievementWorkflowScopeQuery } from "@/redux/api/planApi";

export type PlanAchievementScopeValue = {
    canExecuteOnNode: (nodeId: string) => boolean;
    canApproveOnNode: (nodeId: string) => boolean;
    isLoading: boolean;
    isReady: boolean;
};

const defaultScope: PlanAchievementScopeValue = {
    canExecuteOnNode: () => false,
    canApproveOnNode: () => false,
    isLoading: false,
    isReady: false,
};

export const PlanAchievementScopeContext =
    createContext<PlanAchievementScopeValue>(defaultScope);

export function usePlanAchievementScope(): PlanAchievementScopeValue {
    return useContext(PlanAchievementScopeContext);
}

export function PlanAchievementScopeProvider({
    versionId,
    enabled,
    children,
}: {
    versionId: string;
    enabled: boolean;
    children: ReactNode;
}) {
    const { data, isLoading, isFetching } = useGetPlanAchievementWorkflowScopeQuery(versionId, {
        skip: !enabled,
    });

    const value = useMemo<PlanAchievementScopeValue>(() => {
        const executorIds = new Set(data?.executor_node_ids ?? []);
        const approverIds = new Set(data?.approver_node_ids ?? []);

        return {
            canExecuteOnNode: (nodeId: string) => executorIds.has(nodeId),
            canApproveOnNode: (nodeId: string) => approverIds.has(nodeId),
            isLoading: enabled && (isLoading || isFetching),
            isReady: !enabled || Boolean(data),
        };
    }, [data, enabled, isLoading, isFetching]);

    return (
        <PlanAchievementScopeContext.Provider value={value}>
            {children}
        </PlanAchievementScopeContext.Provider>
    );
}
