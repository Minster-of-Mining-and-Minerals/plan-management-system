"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useGetPlanAchievementWorkflowScopeQuery } from "@/redux/api/planApi";
import { usePermissions } from "@/hooks/usePermissions";
import { PLAN_LIFECYCLE_PERMISSIONS } from "@/utils/planPermissionUtils";

export type SectorPublishBranch = {
    external_assignment_id: string;
    government_structure_id: string;
    plan_node_id: string;
    has_gate: boolean;
    publish_status?: "pending" | "published" | "rejected";
    published_at?: string | null;
};

export type PlanAchievementScopeValue = {
    canExecuteOnNode: (nodeId: string) => boolean;
    canApproveOnNode: (nodeId: string) => boolean;
    canValidateOnNode: (nodeId: string) => boolean;
    canPublishSectorBranch: (externalAssignmentId: string) => boolean;
    hasValidationGate: boolean;
    hasSectorPublishGate: boolean;
    sectorPublishBranches: SectorPublishBranch[];
    publisherBranchIds: string[];
    assignmentBypassActive: boolean;
    isLoading: boolean;
    isReady: boolean;
};

const defaultScope: PlanAchievementScopeValue = {
    canExecuteOnNode: () => false,
    canApproveOnNode: () => false,
    canValidateOnNode: () => false,
    canPublishSectorBranch: () => false,
    hasValidationGate: false,
    hasSectorPublishGate: false,
    sectorPublishBranches: [],
    publisherBranchIds: [],
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
    const canPublishSectorAggregation = can(
        PLAN_LIFECYCLE_PERMISSIONS.PUBLISH_SECTOR_AGGREGATION
    );

    const { data, isLoading, isFetching } = useGetPlanAchievementWorkflowScopeQuery(versionId, {
        skip: !enabled,
    });

    const value = useMemo<PlanAchievementScopeValue>(() => {
        const executorIds = new Set(data?.executor_node_ids ?? []);
        const approverIds = new Set(data?.approver_node_ids ?? []);
        const validatorIds = new Set(data?.validator_node_ids ?? []);
        const publisherIds = new Set(data?.publisher_branch_ids ?? []);
        const assignmentBypassActive = Boolean(data?.assignment_bypass_active);
        const hasValidationGate = Boolean(data?.has_validation_gate);
        const hasSectorPublishGate = Boolean(data?.has_sector_publish_gate);
        const sectorPublishBranches = data?.sector_publish_branches ?? [];

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

        const canPublishSectorBranch = (externalAssignmentId: string) => {
            if (!hasSectorPublishGate || !canPublishSectorAggregation) {
                return false;
            }
            return publisherIds.has(externalAssignmentId);
        };

        return {
            canExecuteOnNode,
            canApproveOnNode,
            canValidateOnNode,
            canPublishSectorBranch,
            hasValidationGate,
            hasSectorPublishGate,
            sectorPublishBranches,
            publisherBranchIds: [...publisherIds],
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
        canPublishSectorAggregation,
    ]);

    return (
        <PlanAchievementScopeContext.Provider value={value}>
            {children}
        </PlanAchievementScopeContext.Provider>
    );
}
