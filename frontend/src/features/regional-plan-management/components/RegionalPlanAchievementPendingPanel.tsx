"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";
import type { PlanNodeHierarchy, PlanNode } from "@/redux/types/plan";
import type { RegionalPlanNode } from "@/redux/types/regionalPlan";
import {
  useApproveRegionalAchievementMutation,
  useRejectRegionalAchievementMutation,
} from "@/redux/api/regionalPlanApi";
import { actionFeedback } from "@/components/action-feedback";
import { formatNodeWeight } from "@/utils/planRuleUtils";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
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

type RegionalPlanAchievementPendingPanelProps = {
  pendingNodes: (PlanNodeHierarchy | RegionalPlanNode | PlanNode)[];
  hierarchyNumberMap?: Map<string, string>;
  configuredUnits?: TargetUnit[];
  onNavigateToNode?: (nodeId: string) => void;
  className?: string;
  regionId?: string;
};

export function RegionalPlanAchievementPendingPanel({
  pendingNodes,
  hierarchyNumberMap,
  configuredUnits,
  onNavigateToNode,
  className,
  regionId: propRegionId,
}: RegionalPlanAchievementPendingPanelProps) {
  const params = useParams<{ id?: string }>();
  const effectiveRegionId = propRegionId || params?.id || "";

  const [expanded, setExpanded] = useState(true);
  const [approveAchievement, { isLoading: isApproving }] =
    useApproveRegionalAchievementMutation();
  const [rejectAchievement, { isLoading: isRejecting }] =
    useRejectRegionalAchievementMutation();

  const { canApproveOnNode, isReady: scopeReady } =
    useRegionalPlanAchievementScope();
  const { can } = usePermissions();
  const { roles } = useAuth();
  const isAdmin = Boolean(
    roles?.some((r) =>
      /admin|administrator/i.test(typeof r === "string" ? r : (r as any)?.name || "")
    )
  );
  const canApprove =
    isAdmin ||
    can("REGIONAL_PLANS:APPROVE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:VALIDATE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");

  // Rejection dialog
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isSaving = isApproving || isRejecting;

  const scopedPendingNodes = useMemo(
    () =>
      scopeReady && canApprove
        ? pendingNodes.filter((node) => {
            const id =
              (node as RegionalPlanNode).regional_plan_node_id ||
              (node as PlanNode).plan_node_id;
            return canApproveOnNode(id);
          })
        : [],
    [pendingNodes, scopeReady, canApprove, canApproveOnNode]
  );

  if (!scopeReady || !canApprove || scopedPendingNodes.length === 0) {
    return null;
  }

  const handleApprove = async (nodeId: string) => {
    try {
      await approveAchievement({
        nodeId,
        region_id: effectiveRegionId,
      }).unwrap();
      actionFeedback.success("Achievement approved and forwarded for validation");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      actionFeedback.error(err.data?.message || err.message || "Failed to approve achievement");
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
      actionFeedback.error("Please provide a reason for rejection");
      return;
    }

    try {
      await rejectAchievement({
        nodeId: selectedNodeId,
        region_id: effectiveRegionId,
        comment: rejectReason.trim(),
      }).unwrap();
      actionFeedback.success("Achievement rejected");
      setRejectModalOpen(false);
      setSelectedNodeId(null);
      setRejectReason("");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      actionFeedback.error(err.data?.message || err.message || "Failed to reject achievement");
    }
  };

  return (
    <>
      <div
        className={cn(
          "rounded-lg border border-amber-300/80 bg-amber-50/90 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-200",
          className
        )}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          )}
          <ClipboardCheck className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span className="font-semibold">Pending Regional Achievement Approvals</span>
          <Badge
            variant="secondary"
            className="ml-1 bg-amber-200/80 text-amber-950 border-amber-300 dark:bg-amber-900/60 dark:text-amber-100"
          >
            {scopedPendingNodes.length}
          </Badge>
        </button>

        {expanded && (
          <ul className="divide-y divide-amber-200/80 border-t border-amber-200/80 dark:divide-amber-800/40 dark:border-amber-800/40">
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
                    <p className="text-xs text-amber-900/80 dark:text-amber-300/80">
                      Submitted achievement:{" "}
                      <span className="font-semibold text-amber-950 dark:text-amber-100">
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
                        className="h-8 text-xs text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
                        onClick={() => onNavigateToNode(nodeId)}
                      >
                        View in tree
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                      disabled={isSaving}
                      onClick={() => void handleApprove(nodeId)}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      disabled={isSaving}
                      onClick={() => handleOpenReject(nodeId)}
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

      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="w-full max-w-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-rose-600 font-bold">
              Reject Achievement Submission
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide feedback for why this achievement submission is being rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="panel-reject-comment" className="text-xs font-medium">
              Reason / Feedback <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="panel-reject-comment"
              placeholder="Explain why this achievement is rejected..."
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
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

