"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import type { PlanNodeHierarchy, PlanNode } from "@/redux/types/plan";
import type { RegionalPlanNode } from "@/redux/types/regionalPlan";
import {
  useValidateRegionalAchievementMutation,
  useRejectValidationRegionalAchievementMutation,
} from "@/redux/api/regionalPlanApi";
import { actionFeedback } from "@/components/action-feedback";
import { formatNodeWeight } from "@/utils/planRuleUtils";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useRegionalPlanAchievementScope } from "../hooks/useRegionalPlanAchievementScope";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RegionalPlanAchievementPendingValidationPanelProps = {
  pendingNodes: (PlanNodeHierarchy | RegionalPlanNode | PlanNode)[];
  hierarchyNumberMap?: Map<string, string>;
  configuredUnits?: TargetUnit[];
  onNavigateToNode?: (nodeId: string) => void;
  className?: string;
  regionId?: string;
};

export function RegionalPlanAchievementPendingValidationPanel({
  pendingNodes,
  hierarchyNumberMap,
  configuredUnits,
  onNavigateToNode,
  className,
  regionId: propRegionId,
}: RegionalPlanAchievementPendingValidationPanelProps) {
  const params = useParams<{ id?: string }>();
  const effectiveRegionId = propRegionId || params?.id || "";

  const [expanded, setExpanded] = useState(true);
  const [validateAchievement, { isLoading: isValidating }] =
    useValidateRegionalAchievementMutation();
  const [rejectValidationAchievement, { isLoading: isRejecting }] =
    useRejectValidationRegionalAchievementMutation();

  const { canValidateOnNode, hasValidationGate, isReady: scopeReady } =
    useRegionalPlanAchievementScope();
  const { can } = usePermissions();
  const canValidate =
    can("REGIONAL_PLANS:VALIDATE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:FINALIZE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");

  // Rejection dialog
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isSaving = isValidating || isRejecting;

  const scopedPendingNodes = useMemo(
    () =>
      scopeReady && hasValidationGate && canValidate
        ? pendingNodes.filter((node) => {
            const id =
              (node as RegionalPlanNode).regional_plan_node_id ||
              (node as PlanNode).plan_node_id;
            return canValidateOnNode(id);
          })
        : [],
    [pendingNodes, scopeReady, hasValidationGate, canValidate, canValidateOnNode]
  );

  if (!scopeReady || !hasValidationGate || !canValidate || scopedPendingNodes.length === 0) {
    return null;
  }

  const handleValidate = async (nodeId: string) => {
    try {
      await validateAchievement({
        nodeId,
        region_id: effectiveRegionId,
      }).unwrap();
      actionFeedback.success("Achievement validated and locked");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      actionFeedback.error(err.data?.message || err.message || "Failed to validate achievement");
    }
  };

  const handleOpenReject = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedNodeId) return;
    if (!rejectReason.trim()) {
      actionFeedback.error("Please provide a reason for returning to executor");
      return;
    }

    try {
      await rejectValidationAchievement({
        nodeId: selectedNodeId,
        region_id: effectiveRegionId,
        comment: rejectReason.trim(),
      }).unwrap();
      actionFeedback.success("Achievement returned to executor for correction");
      setRejectModalOpen(false);
      setSelectedNodeId(null);
      setRejectReason("");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      actionFeedback.error(err.data?.message || err.message || "Failed to return achievement");
    }
  };

  return (
    <>
      <div
        className={cn(
          "rounded-lg border border-sky-300/80 bg-sky-50/90 text-sky-950 dark:bg-sky-950/30 dark:border-sky-800/60 dark:text-sky-200",
          className
        )}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
          )}
          <ShieldCheck className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
          <span className="font-semibold">Pending Regional Achievement Validations</span>
          <Badge
            variant="secondary"
            className="ml-1 bg-sky-200/80 text-sky-950 border-sky-300 dark:bg-sky-900/60 dark:text-sky-100"
          >
            {scopedPendingNodes.length}
          </Badge>
        </button>

        {expanded && (
          <ul className="divide-y divide-sky-200/80 border-t border-sky-200/80 dark:divide-sky-800/40 dark:border-sky-800/40">
            {scopedPendingNodes.map((node) => {
              const nodeId =
                (node as RegionalPlanNode).regional_plan_node_id ||
                (node as PlanNode).plan_node_id;
              const hierarchyNumber = hierarchyNumberMap?.get(nodeId);
              const actualLabel =
                node.period_actual != null
                  ? formatNodeWeight(
                      node.period_actual,
                      (node as any).weight_mode,
                      node.target_unit,
                      configuredUnits
                    )
                  : "—";

              return (
                <li
                  key={nodeId}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium truncate">
                      {hierarchyNumber ? `${hierarchyNumber} · ` : ""}
                      {node.title}
                    </p>
                    <p className="text-xs text-sky-900/80 dark:text-sky-300/80">
                      Approved achievement:{" "}
                      <span className="font-semibold text-sky-950 dark:text-sky-100">
                        {actualLabel}
                      </span>
                      {node.period_target != null && node.period_target > 0
                        ? ` of ${formatNodeWeight(
                            node.period_target,
                            (node as any).weight_mode,
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
                        className="h-8 text-xs text-sky-900 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/40"
                        onClick={() => onNavigateToNode(nodeId)}
                      >
                        View in tree
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
                      disabled={isSaving}
                      onClick={() => void handleValidate(nodeId)}
                    >
                      Validate & Lock
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      disabled={isSaving}
                      onClick={() => handleOpenReject(nodeId)}
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

      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base text-rose-600 font-bold">
              Return Achievement to Executor
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide feedback for why this achievement requires revision by the executor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="panel-validation-reject-comment" className="text-xs font-medium">
              Reason / Feedback <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="panel-validation-reject-comment"
              placeholder="Explain why this validation is rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              disabled={!rejectReason.trim() || isSaving}
            >
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
