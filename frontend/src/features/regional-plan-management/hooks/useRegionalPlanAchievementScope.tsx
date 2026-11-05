"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useGetRegionalPlanAchievementWorkflowScopeQuery } from "@/redux/api/regionalPlanApi";
import { usePermissions } from "@/hooks/usePermissions";

export type RegionalPlanAchievementScopeValue = {
  canExecuteOnNode: (nodeId: string) => boolean;
  canApproveOnNode: (nodeId: string) => boolean;
  canValidateOnNode: (nodeId: string) => boolean;
  hasValidationGate: boolean;
  assignmentBypassActive: boolean;
  isLoading: boolean;
  isReady: boolean;
};

const defaultScope: RegionalPlanAchievementScopeValue = {
  canExecuteOnNode: () => false,
  canApproveOnNode: () => false,
  canValidateOnNode: () => false,
  hasValidationGate: false,
  assignmentBypassActive: false,
  isLoading: false,
  isReady: false,
};

export const RegionalPlanAchievementScopeContext =
  createContext<RegionalPlanAchievementScopeValue>(defaultScope);

export function useRegionalPlanAchievementScope(): RegionalPlanAchievementScopeValue {
  return useContext(RegionalPlanAchievementScopeContext);
}

export function RegionalPlanAchievementScopeProvider({
  versionId,
  regionId,
  enabled = true,
  children,
}: {
  versionId: string;
  regionId?: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  const { can } = usePermissions();
  const canExecuteAchievement =
    can("REGIONAL_PLANS:EXECUTE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const canApproveAchievement =
    can("REGIONAL_PLANS:APPROVE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const canValidateAchievement =
    can("REGIONAL_PLANS:VALIDATE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:FINALIZE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");

  const { data, isLoading, isFetching } = useGetRegionalPlanAchievementWorkflowScopeQuery(
    { versionId, region_id: regionId },
    { skip: !enabled || !versionId }
  );

  const value = useMemo<RegionalPlanAchievementScopeValue>(() => {
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
      if (!canValidateAchievement) {
        return false;
      }
      if (assignmentBypassActive) {
        return true;
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
    <RegionalPlanAchievementScopeContext.Provider value={value}>
      {children}
    </RegionalPlanAchievementScopeContext.Provider>
  );
}

