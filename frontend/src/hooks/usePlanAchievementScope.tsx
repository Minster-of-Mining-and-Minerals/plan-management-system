"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useGetPlanAchievementWorkflowScopeQuery } from "@/redux/api/planApi";
import { usePermissions } from "@/hooks/usePermissions";
import { PLAN_LIFECYCLE_PERMISSIONS } from "@/utils/planPermissionUtils";

export type PlanAchievementScopeValue = {
    canExecuteOnNode: (nodeId: string) => boolean;
    canApproveOnNode: (nodeId: string) => boolean;
    canValidateOnNode: (nodeId: string) => boolean;
    hasValidationGate: boolean;
    assignmentBypassActive: boolean;
    isLoading: boolean;
    isReady: boolean;
};

const defaultScope: PlanAchievementScopeValue = {
    canExecuteOnNode: () => false,
    canApproveOnNode: () => false,
    canValidateOnNode: () => false,
    hasValidationGate: false,
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
    const canValidateAchievement = can(PLAN_LIFECYCLE_PERMISSIONS.VALIDATE_APPROVAL);

    const { data, isLoading, isFetching } = useGetPlanAchievementWorkflowScopeQuery(versionId, {
        skip: !enabled,
    });

    const value = useMemo<PlanAchievementScopeValue>(() => {
        const executorIds = new Set(data?.executor_node_ids ?? []);
        const approverIds = new Set(data?.approver_node_ids ?? []);
        const validatorIds = new Set(data?.validator_node_ids ?? []);
        const assignmentBypassActive = Boolean(data?.assignment_bypass_active);
        const hasValidationGate = Boolean(data?.has_validation_gate);

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

        const canValidateOnNode = (nodeId: string) => {
            if (!hasValidationGate || !canValidateAchievement) {
                return false;
            }
            return validatorIds.has(nodeId);
        };

        return {
            canExecuteOnNode,
            canApproveOnNode,
            canValidateOnNode,
            hasValidationGate,
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
        canValidateAchievement,
    ]);

    return (
        <PlanAchievementScopeContext.Provider value={value}>
            {children}
        </PlanAchievementScopeContext.Provider>
    );
}
