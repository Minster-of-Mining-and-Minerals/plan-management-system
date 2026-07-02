"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useGetPlanAchievementWorkflowScopeQuery } from "@/redux/api/planApi";
import { usePermissions } from "@/hooks/usePermissions";
import { PLAN_LIFECYCLE_PERMISSIONS } from "@/utils/planPermissionUtils";

export type PlanAchievementScopeValue = {
    canExecuteOnNode: (nodeId: string) => boolean;
    canApproveOnNode: (nodeId: string) => boolean;
    assignmentBypassActive: boolean;
    isLoading: boolean;
    isReady: boolean;
};

const defaultScope: PlanAchievementScopeValue = {
    canExecuteOnNode: () => false,
    canApproveOnNode: () => false,
    assignmentBypassActive: false,
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
    const { can } = usePermissions();
    const canExecuteAchievement = can(PLAN_LIFECYCLE_PERMISSIONS.EXECUTE_ACHIEVEMENT);
    const canApproveAchievement = can(PLAN_LIFECYCLE_PERMISSIONS.APPROVE_ACHIEVEMENT);

    const { data, isLoading, isFetching } = useGetPlanAchievementWorkflowScopeQuery(versionId, {
        skip: !enabled,
    });

    const value = useMemo<PlanAchievementScopeValue>(() => {
        const executorIds = new Set(data?.executor_node_ids ?? []);
        const approverIds = new Set(data?.approver_node_ids ?? []);
        const assignmentBypassActive = Boolean(data?.assignment_bypass_active);

        const canExecuteOnNode = (nodeId: string) => {
            if (assignmentBypassActive && canExecuteAchievement) {
                return true;
            }
            return executorIds.has(nodeId);
        };

        const canApproveOnNode = (nodeId: string) => {
            if (assignmentBypassActive && canApproveAchievement) {
                return true;
            }
            return approverIds.has(nodeId);
        };

        return {
            canExecuteOnNode,
            canApproveOnNode,
            assignmentBypassActive,
            isLoading: enabled && (isLoading || isFetching),
            isReady: !enabled || Boolean(data),
        };
    }, [
        data,
        enabled,
        isLoading,
        isFetching,
        canExecuteAchievement,
        canApproveAchievement,
    ]);

    return (
        <PlanAchievementScopeContext.Provider value={value}>
            {children}
        </PlanAchievementScopeContext.Provider>
    );
}
