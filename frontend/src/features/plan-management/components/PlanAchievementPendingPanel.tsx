"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";
import type { PlanNodeHierarchy } from "@/redux/types/plan";
import {
  useApproveAchievementMutation,
  useRejectAchievementMutation,
} from "@/redux/api/planApi";
import { actionFeedback } from "@/components/action-feedback";
import { formatNodeWeight } from "@/utils/planRuleUtils";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_APPROVE_ACHIEVEMENT_PERMISSIONS } from "@/utils/planPermissionUtils";
import { usePlanAchievementScope } from "@/hooks/usePlanAchievementScope";

type PlanAchievementPendingPanelProps = {
  pendingNodes: PlanNodeHierarchy[];
  hierarchyNumberMap?: Map<string, string>;
  configuredUnits?: TargetUnit[];
  onNavigateToNode?: (nodeId: string) => void;
  className?: string;
};

export function PlanAchievementPendingPanel({
  pendingNodes,
  hierarchyNumberMap,
  configuredUnits,
  onNavigateToNode,
  className,
}: PlanAchievementPendingPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [approveAchievement, { isLoading: isApproving }] = useApproveAchievementMutation();
  const [rejectAchievement, { isLoading: isRejecting }] = useRejectAchievementMutation();
  const { canApproveOnNode, isReady: scopeReady } = usePlanAchievementScope();
  const isSaving = isApproving || isRejecting;

  const scopedPendingNodes = useMemo(
    () =>
      scopeReady
        ? pendingNodes.filter((node) => canApproveOnNode(node.plan_node_id))
        : [],
    [pendingNodes, scopeReady, canApproveOnNode]
  );

  if (!scopeReady || scopedPendingNodes.length === 0) {
    return null;
  }

  const handleApprove = async (nodeId: string) => {
    try {
      await approveAchievement({ id: nodeId }).unwrap();
      actionFeedback.success("Achievement approved");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to approve achievement");
    }
  };

  const handleReject = async (nodeId: string) => {
    if (
      !(await actionFeedback.confirm("Reject this achievement submission?", {
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      await rejectAchievement({ id: nodeId }).unwrap();
      actionFeedback.success("Achievement rejected");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to reject achievement");
    }
  };

  return (
    <PermissionGuard requireAll={PLAN_APPROVE_ACHIEVEMENT_PERMISSIONS}>
      <div
        className={cn(
          "rounded-lg border border-amber-200 bg-amber-50/80 text-amber-950",
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
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          <span>Pending achievement approvals</span>
          <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-900 border-amber-200">
            {scopedPendingNodes.length}
          </Badge>
        </button>

        {expanded && (
          <ul className="divide-y divide-amber-200/80 border-t border-amber-200/80">
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
                    <p className="text-xs text-amber-900/80">
                      Submitted achievement: <span className="font-semibold">{actualLabel}</span>
                      {node.period_target != null && node.period_target > 0
                        ? ` of ${formatNodeWeight(
                            node.period_target,
                            node.weight_mode,
                            node.target_unit,
                            configuredUnits
                          )}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {onNavigateToNode && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-amber-900 hover:bg-amber-100"
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
                      onClick={() => void handleApprove(node.plan_node_id)}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-red-200 text-red-800 hover:bg-red-50"
                      disabled={isSaving}
                      onClick={() => void handleReject(node.plan_node_id)}
                    >
                      Reject
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
