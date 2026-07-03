"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import type { PlanNodeHierarchy } from "@/redux/types/plan";
import {
  useValidateAchievementMutation,
  useRejectValidationAchievementMutation,
} from "@/redux/api/planApi";
import { actionFeedback } from "@/components/action-feedback";
import { formatNodeWeight } from "@/utils/planRuleUtils";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_VALIDATE_APPROVAL_PERMISSIONS } from "@/utils/planPermissionUtils";
import { usePlanAchievementScope } from "@/hooks/usePlanAchievementScope";

type PlanAchievementPendingValidationPanelProps = {
  pendingNodes: PlanNodeHierarchy[];
  hierarchyNumberMap?: Map<string, string>;
  configuredUnits?: TargetUnit[];
  onNavigateToNode?: (nodeId: string) => void;
  className?: string;
};

export function PlanAchievementPendingValidationPanel({
  pendingNodes,
  hierarchyNumberMap,
  configuredUnits,
  onNavigateToNode,
  className,
}: PlanAchievementPendingValidationPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [validateAchievement, { isLoading: isValidating }] =
    useValidateAchievementMutation();
  const [rejectValidationAchievement, { isLoading: isRejecting }] =
    useRejectValidationAchievementMutation();
  const { canValidateOnNode, hasValidationGate, isReady: scopeReady } =
    usePlanAchievementScope();
  const isSaving = isValidating || isRejecting;

  const scopedPendingNodes = useMemo(
    () =>
      scopeReady && hasValidationGate
        ? pendingNodes.filter((node) => canValidateOnNode(node.plan_node_id))
        : [],
    [pendingNodes, scopeReady, hasValidationGate, canValidateOnNode]
  );

  if (!scopeReady || !hasValidationGate || scopedPendingNodes.length === 0) {
    return null;
  }

  const handleValidate = async (nodeId: string) => {
    try {
      await validateAchievement({ id: nodeId }).unwrap();
      actionFeedback.success("Achievement validated");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to validate achievement");
    }
  };

  const handleReject = async (nodeId: string) => {
    if (
      !(await actionFeedback.confirm(
        "Reject this achievement at validation? The executor will need to update and resubmit.",
        { destructive: true }
      ))
    ) {
      return;
    }

    try {
      await rejectValidationAchievement({ id: nodeId }).unwrap();
      actionFeedback.success("Achievement sent back to executor");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to reject validation");
    }
  };

  return (
    <PermissionGuard requireAll={PLAN_VALIDATE_APPROVAL_PERMISSIONS}>
      <div
        className={cn(
          "rounded-lg border border-sky-200 bg-sky-50/80 text-sky-950",
          className
        )}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>Pending achievement validation</span>
          <Badge variant="secondary" className="ml-1 bg-sky-100 text-sky-900 border-sky-200">
            {scopedPendingNodes.length}
          </Badge>
        </button>

        {expanded && (
          <ul className="divide-y divide-sky-200/80 border-t border-sky-200/80">
            {scopedPendingNodes.map((node) => {
              const hierarchyNumber = hierarchyNumberMap?.get(node.plan_node_id);
              const actualLabel =
                node.period_actual != null
                  ? formatNodeWeight(
                      node.period_actual,
                      node.weight_mode,
                      node.target_unit,
                      configuredUnits
                    )
                  : "—";

              return (
                <li
                  key={node.plan_node_id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium truncate">
                      {hierarchyNumber ? `${hierarchyNumber} · ` : ""}
                      {node.title}
                    </p>
                    <p className="text-xs text-sky-900/80">
                      Execution-approved achievement:{" "}
                      <span className="font-semibold">{actualLabel}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {onNavigateToNode && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-sky-900 hover:bg-sky-100"
                        onClick={() => onNavigateToNode(node.plan_node_id)}
                      >
                        View in tree
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={isSaving}
                      onClick={() => void handleValidate(node.plan_node_id)}
                    >
                      Validate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-red-200 text-red-800 hover:bg-red-50"
                      disabled={isSaving}
                      onClick={() => void handleReject(node.plan_node_id)}
                    >
                      Send back
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PermissionGuard>
  );
}
