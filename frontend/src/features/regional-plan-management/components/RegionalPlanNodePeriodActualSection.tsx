"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { RegionalPlanNode } from "@/redux/types/regionalPlan";
import type { PlanNode, PlanRule } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import {
  useUpdateRegionalPeriodActualMutation,
  useSubmitRegionalAchievementMutation,
  useApproveRegionalAchievementMutation,
  useRejectRegionalAchievementMutation,
  useValidateRegionalAchievementMutation,
  useRejectValidationRegionalAchievementMutation,
} from "@/redux/api/regionalPlanApi";
import { formatNodeWeight } from "@/utils/planRuleUtils";
import {
  canManuallyEnterAchievement,
  canRequestParentOverride,
  isWeightedTargetNode,
  resolveAchievementEntryMode,
} from "@/utils/planExecutionAchievementUtils";
import { actionFeedback } from "@/components/action-feedback";
import { cn } from "@/lib/utils";
import {
  resolvePlanAchievementStatus,
  planAchievementStatusLabelForDisplay,
  canEditPlanAchievementValue,
  isPendingPlanAchievementValidation,
  PLAN_ACHIEVEMENT_STATUS,
} from "@/utils/planAchievementWorkflowUtils";
import { planAchievementExecutorHint } from "@/utils/planAchievementHierarchyUtils";
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

const NARRATION_MAX = 1000;
const VARIANCE_EPSILON = 0.001;

function formatVarianceTypeLabel(
  varianceType: PlanNode["variance_type"]
): string | null {
  if (varianceType === "OVER") return "Over target";
  if (varianceType === "UNDER") return "Under target";
  if (varianceType === "ON_TARGET") return "On target";
  return null;
}

function scorePercentForDisplay(
  actual: number,
  target: number,
  allowOverAchievement: boolean
): number {
  const raw = Math.round((actual / target) * 100);
  return allowOverAchievement ? raw : Math.min(100, raw);
}

export interface RegionalPlanNodePeriodActualSectionProps {
  node: RegionalPlanNode | PlanNode;
  rule?: PlanRule | null;
  configuredUnits?: TargetUnit[];
  canEdit?: boolean;
  variant?: "card" | "compact" | "table";
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  focused?: boolean;
  regionId?: string;
  targetLabel?: string;
  versionKind?: string;
}

export function RegionalPlanNodePeriodActualSection({
  node,
  rule,
  configuredUnits,
  canEdit = false,
  variant = "card",
  className,
  onClick,
  focused = false,
  regionId: propRegionId,
  targetLabel,
  versionKind,
}: RegionalPlanNodePeriodActualSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const params = useParams<{ id?: string }>();
  const effectiveRegionId = propRegionId || params?.id || (node as any).region_id || "";

  const displayTargetTitle =
    targetLabel ||
    (versionKind === "annual"
      ? "Annual Target"
      : versionKind === "master"
      ? "Plan Target"
      : "Period Target");

  const nodeId =
    (node as RegionalPlanNode).regional_plan_node_id ||
    (node as PlanNode).plan_node_id;

  const { can } = usePermissions();
  const {
    canExecuteOnNode,
    canApproveOnNode,
    canValidateOnNode,
    hasValidationGate,
    isReady: scopeReady,
  } = useRegionalPlanAchievementScope();

  const [submitAchievement, { isLoading: isSubmitting }] =
    useSubmitRegionalAchievementMutation();
  const [approveAchievement, { isLoading: isApproving }] =
    useApproveRegionalAchievementMutation();
  const [rejectAchievement, { isLoading: isRejecting }] =
    useRejectRegionalAchievementMutation();
  const [validateAchievement, { isLoading: isValidating }] =
    useValidateRegionalAchievementMutation();
  const [rejectValidationAchievement, { isLoading: isValidationRejecting }] =
    useRejectValidationRegionalAchievementMutation();
  const [updatePeriodActual, { isLoading: isOverrideSaving }] =
    useUpdateRegionalPeriodActualMutation();

  const [periodActualInput, setPeriodActualInput] = useState("");
  const [narrationInput, setNarrationInput] = useState("");
  const [pendingOverride, setPendingOverride] = useState(false);
  const [isRevising, setIsRevising] = useState(false);

  // Rejection Dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isValidationRejectAction, setIsValidationRejectAction] = useState(false);

  const isSaving =
    isSubmitting ||
    isApproving ||
    isRejecting ||
    isValidating ||
    isValidationRejecting ||
    isOverrideSaving;

  const { roles } = useAuth();
  const isAdmin = Boolean(
    roles?.some((r) =>
      /admin|administrator/i.test(typeof r === "string" ? r : (r as any)?.name || "")
    )
  );

  const achievementStatus = resolvePlanAchievementStatus(node as any);

  const canExecuteAchievement =
    isAdmin ||
    can("REGIONAL_PLANS:EXECUTE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const canApproveAchievement =
    isAdmin ||
    can("REGIONAL_PLANS:APPROVE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:VALIDATE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const canValidateAchievementPermission =
    isAdmin ||
    can("REGIONAL_PLANS:VALIDATE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:APPROVE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:FINALIZE") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");

  const nodeWeightMode = (node as any).weight_mode;
  const entryMode = resolveAchievementEntryMode(node as any, rule);
  const isRollupEntry = entryMode === "rollup";
  const isParentOverride = entryMode === "parent_override";
  const canOverrideParent =
    can("REGIONAL_PLANS:OVERRIDE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const mayRequestOverride =
    canEdit && canOverrideParent && canRequestParentOverride(node as any, rule);
  const isEditingManual = isParentOverride || pendingOverride;
  const periodTarget = Number(node.period_target) || 0;
  const rollupTarget = Number((node as any).computed_period_target) || 0;
  const effectiveTarget =
    isRollupEntry && rollupTarget > 0
      ? rollupTarget
      : periodTarget > 0
      ? periodTarget
      : rollupTarget;

  const showSection =
    (isWeightedTargetNode(node as any, rule) &&
      (effectiveTarget > 0 || isRollupEntry || (node as any).has_contributing_data)) ||
    (isRollupEntry && (node as any).is_evaluable);

  const canEnterLeaf =
    canEdit &&
    canExecuteAchievement &&
    canManuallyEnterAchievement(node as any, rule) &&
    scopeReady &&
    canExecuteOnNode(nodeId);

  const canEnterManual =
    canEdit &&
    canExecuteAchievement &&
    isEditingManual &&
    periodTarget > 0 &&
    (isParentOverride || pendingOverride);

  const canEnter = canEnterLeaf || canEnterManual;
  const isEditableStatus = canEditPlanAchievementValue(achievementStatus) || isRevising;
  const canSubmitAchievement = canEnter && isEditableStatus;

  const showReopenEditAction =
    !isRevising &&
    canEnterLeaf &&
    periodTarget > 0 &&
    canEdit &&
    !isEditingManual &&
    (achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED ||
      achievementStatus === PLAN_ACHIEVEMENT_STATUS.VALIDATED);

  useEffect(() => {
    if (node.period_actual != null) {
      setPeriodActualInput(String(node.period_actual));
    } else {
      setPeriodActualInput("");
    }
    setNarrationInput((node as any).period_actual_narration ?? "");
  }, [node.period_actual, (node as any).period_actual_narration, nodeId]);

  useEffect(() => {
    setPendingOverride(false);
  }, [nodeId, (node as any).period_actual_override]);

  useEffect(() => {
    if (!focused || !sectionRef.current) {
      return;
    }
    sectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused, nodeId]);

  if ((node as any).achievement_mode === "annual") {
    return (
      <div className={cn("text-xs text-amber-800", className)} onClick={onClick}>
        This KPI uses annual achievement — enter it on the annual year view, not in a period.
      </div>
    );
  }

  const focusClassName = focused
    ? "ring-2 ring-primary ring-offset-2 shadow-md"
    : undefined;

  if (!showSection) {
    return null;
  }

  const periodTargetValue = formatNodeWeight(
    effectiveTarget,
    nodeWeightMode,
    node.target_unit,
    configuredUnits
  );

  const displayActualRaw = isRollupEntry
    ? (node as any).computed_period_actual != null
      ? Number((node as any).computed_period_actual)
      : null
    : node.period_actual != null
    ? Number(node.period_actual)
    : (node as any).computed_period_actual != null
    ? Number((node as any).computed_period_actual)
    : null;

  const periodActualValue =
    displayActualRaw != null
      ? formatNodeWeight(
          displayActualRaw,
          nodeWeightMode,
          node.target_unit,
          configuredUnits
        )
      : null;

  const allowOverAchievement =
    rule?.performance_scoring_policy === "ALLOW_OVER_ACHIEVEMENT";
  const draftActual =
    periodActualInput === "" ? null : Number(periodActualInput);
  const draftActualValid =
    draftActual != null && !Number.isNaN(draftActual) && draftActual >= 0;
  const narrationRequired =
    canSubmitAchievement &&
    draftActualValid &&
    effectiveTarget > 0 &&
    Math.abs((draftActual as number) - effectiveTarget) > VARIANCE_EPSILON;

  const achievementPercent =
    (node as any).execution_progress_percent ??
    (displayActualRaw != null && effectiveTarget > 0
      ? scorePercentForDisplay(
          displayActualRaw,
          effectiveTarget,
          allowOverAchievement
        )
      : null);

  const varianceTypeLabel = formatVarianceTypeLabel((node as any).variance_type ?? null);
  const showAchievementPercent =
    achievementPercent != null &&
    (isRollupEntry
      ? (node as any).is_evaluable || (node as any).has_contributing_data || displayActualRaw != null
      : node.period_actual != null || (node as any).period_actual_override);

  const handleSubmit = async () => {
    try {
      const val = periodActualInput === "" ? null : Number(periodActualInput);
      if (val != null && (Number.isNaN(val) || val < 0)) {
        actionFeedback.error("Achievement must be zero or greater");
        return;
      }
      if (
        val != null &&
        periodTarget > 0 &&
        Math.abs(val - periodTarget) > VARIANCE_EPSILON &&
        !narrationInput.trim()
      ) {
        actionFeedback.error(
          "Performance narration is required when actual achievement differs from the target."
        );
        return;
      }

      await submitAchievement({
        nodeId,
        region_id: effectiveRegionId,
        data: {
          period_actual: val == null ? undefined : val,
          narration: narrationInput.trim() || undefined,
        },
      }).unwrap();

      setIsRevising(false);
      actionFeedback.success(
        val == null ? "Achievement cleared" : "Achievement submitted for approval"
      );
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      actionFeedback.error(err.data?.message || err.message || "Failed to submit achievement");
    }
  };

  const handleApprove = async () => {
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

  const openRejectDialog = (isValidation: boolean) => {
    setIsValidationRejectAction(isValidation);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      actionFeedback.error("Please provide a reason for rejection");
      return;
    }

    try {
      if (isValidationRejectAction) {
        await rejectValidationAchievement({
          nodeId,
          region_id: effectiveRegionId,
          comment: rejectReason.trim(),
        }).unwrap();
        actionFeedback.success("Achievement returned to executor for correction");
      } else {
        await rejectAchievement({
          nodeId,
          region_id: effectiveRegionId,
          comment: rejectReason.trim(),
        }).unwrap();
        actionFeedback.success("Achievement rejected");
      }
      setRejectDialogOpen(false);
      setRejectReason("");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      actionFeedback.error(err.data?.message || err.message || "Failed to reject achievement");
    }
  };

  const handleValidate = async () => {
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

  const showLeafEditor = canEnterLeaf && periodTarget > 0 && canSubmitAchievement;
  const showManualEditor = canEnterManual && periodTarget > 0;
  const showApprovalActions =
    achievementStatus === PLAN_ACHIEVEMENT_STATUS.SUBMITTED &&
    canApproveAchievement &&
    scopeReady &&
    canApproveOnNode(nodeId) &&
    !isEditingManual;

  const showValidationActions =
    isPendingPlanAchievementValidation(achievementStatus) &&
    hasValidationGate &&
    canValidateAchievementPermission &&
    scopeReady &&
    canValidateOnNode(nodeId) &&
    !isEditingManual;

  const showExecutorAssignmentHint =
    scopeReady &&
    canEdit &&
    canExecuteAchievement &&
    canManuallyEnterAchievement(node as any, rule) &&
    !canExecuteOnNode(nodeId);

  const executorHint = planAchievementExecutorHint(achievementStatus, {
    canSubmit: canSubmitAchievement,
    isRollup: isRollupEntry && !isEditingManual,
    awaitingValidation:
      hasValidationGate && achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED,
  });

  const statusNotice =
    executorHint && !isEditingManual ? (
      <p
        className={cn(
          "text-xs rounded-md px-2 py-1.5 border",
          achievementStatus === PLAN_ACHIEVEMENT_STATUS.SUBMITTED &&
            "text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
          achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
            hasValidationGate &&
            "text-sky-800 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40",
          achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
            !hasValidationGate &&
            "text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
          achievementStatus === PLAN_ACHIEVEMENT_STATUS.VALIDATED &&
            "text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
          achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
            "text-red-800 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40",
          achievementStatus === PLAN_ACHIEVEMENT_STATUS.EMPTY &&
            "text-amber-900 bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800/30"
        )}
      >
        {executorHint}
      </p>
    ) : showExecutorAssignmentHint ? (
      <p className="text-xs rounded-md px-2 py-1.5 border text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800">
        You are not assigned to record achievement on this section.
      </p>
    ) : null;

  const workflowStatusBadge = (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] py-0 h-4 font-semibold",
        achievementStatus === PLAN_ACHIEVEMENT_STATUS.SUBMITTED &&
          "border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
        achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
          hasValidationGate &&
          "border-sky-300 text-sky-800 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
        achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
          !hasValidationGate &&
          "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
        achievementStatus === PLAN_ACHIEVEMENT_STATUS.VALIDATED &&
          "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
        achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
          "border-red-300 text-red-800 bg-red-50 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60",
        achievementStatus === PLAN_ACHIEVEMENT_STATUS.EMPTY &&
          "border-amber-200 text-amber-800 bg-amber-50/50 dark:bg-amber-950/30 dark:text-amber-300"
      )}
    >
      {planAchievementStatusLabelForDisplay(achievementStatus, {
        hasValidationGate,
      })}
    </Badge>
  );

  const approvalActions = showApprovalActions ? (
    <div className="flex flex-wrap gap-2" onClick={onClick}>
      <Button
        type="button"
        size="sm"
        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
        disabled={isSaving}
        onClick={(e) => {
          e.stopPropagation();
          void handleApprove();
        }}
      >
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        disabled={isSaving}
        onClick={(e) => {
          e.stopPropagation();
          openRejectDialog(false);
        }}
      >
        Reject
      </Button>
    </div>
  ) : null;

  const validationActions = showValidationActions ? (
    <div className="flex flex-wrap gap-2" onClick={onClick}>
      <Button
        type="button"
        size="sm"
        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
        disabled={isSaving}
        onClick={(e) => {
          e.stopPropagation();
          void handleValidate();
        }}
      >
        Validate & Lock
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        disabled={isSaving}
        onClick={(e) => {
          e.stopPropagation();
          openRejectDialog(true);
        }}
      >
        Send back
      </Button>
    </div>
  ) : null;

  const leafEditor = showLeafEditor ? (
    <div className="space-y-2" onClick={onClick}>
      <div
        className={cn(
          "flex gap-2",
          variant === "table"
            ? "flex-col sm:flex-row sm:items-end"
            : "flex-col sm:flex-row sm:items-end"
        )}
      >
        <div className="flex-1 space-y-1 min-w-0">
          {variant !== "table" && (
            <Label htmlFor={`period_actual_${nodeId}`} className="text-xs font-medium text-foreground">
              Achievement This Period
            </Label>
          )}
          <Input
            id={`period_actual_${nodeId}`}
            type="number"
            min={0}
            step="any"
            value={periodActualInput}
            onChange={(e) => setPeriodActualInput(e.target.value)}
            placeholder={`Target ${periodTarget}`}
            className={
              variant === "compact"
                ? "h-8 text-xs border-amber-300/80 focus-visible:ring-amber-500"
                : variant === "table"
                ? "h-8 text-sm border-amber-300/80 focus-visible:ring-amber-500"
                : "border-amber-300/80 focus-visible:ring-amber-500"
            }
          />
        </div>
        <Button
          size={variant === "compact" || variant === "table" ? "sm" : "default"}
          disabled={isSaving}
          onClick={(e) => {
            e.stopPropagation();
            void handleSubmit();
          }}
          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
        >
          {achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED || isRevising
            ? "Resubmit"
            : "Submit"}
        </Button>
        {isRevising && (
          <Button
            type="button"
            variant="ghost"
            size={variant === "compact" || variant === "table" ? "sm" : "default"}
            disabled={isSaving}
            onClick={(e) => {
              e.stopPropagation();
              setIsRevising(false);
              if (node.period_actual != null) {
                setPeriodActualInput(String(node.period_actual));
              } else {
                setPeriodActualInput("");
              }
              setNarrationInput((node as any).period_actual_narration ?? "");
            }}
          >
            Cancel
          </Button>
        )}
      </div>
      {(narrationRequired || narrationInput.trim().length > 0 || draftActualValid) && (
        <div className="space-y-1">
          <Label
            htmlFor={`period_actual_narration_${nodeId}`}
            className="text-xs text-muted-foreground"
          >
            Performance narration
            {narrationRequired ? " (required)" : " (optional)"}
          </Label>
          <Textarea
            id={`period_actual_narration_${nodeId}`}
            value={narrationInput}
            maxLength={NARRATION_MAX}
            onChange={(e) => setNarrationInput(e.target.value)}
            placeholder={
              narrationRequired
                ? "Explain why actual differs from the target"
                : "Optional note about this period's achievement"
            }
            className={cn(
              "min-h-[72px] text-xs border-amber-200/80 focus-visible:ring-amber-500",
              variant === "compact" && "min-h-[56px]"
            )}
            onClick={(e) => e.stopPropagation()}
          />
          <p className="text-[10px] text-muted-foreground">
            {narrationInput.trim().length}/{NARRATION_MAX}
          </p>
        </div>
      )}
    </div>
  ) : null;

  const handleSaveOverride = async () => {
    try {
      const val = periodActualInput === "" ? null : Number(periodActualInput);
      if (val != null && (Number.isNaN(val) || val < 0)) {
        actionFeedback.error("Achievement must be zero or greater");
        return;
      }
      await updatePeriodActual({
        nodeId,
        region_id: effectiveRegionId,
        data: {
          period_actual: val == null ? 0 : val,
          narration: narrationInput.trim() || undefined,
        },
      }).unwrap();
      setPendingOverride(false);
      actionFeedback.success("Period achievement saved");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      actionFeedback.error(err.data?.message || err.message || "Failed to save achievement");
    }
  };

  const handleRevertRollup = async () => {
    if (
      !(await actionFeedback.confirm(
        "Revert to rolled-up achievement from children? Any manual value on this node will be cleared.",
        { destructive: true }
      ))
    ) {
      return;
    }

    try {
      await updatePeriodActual({
        nodeId,
        region_id: effectiveRegionId,
        data: {
          period_actual: 0,
        },
      }).unwrap();
      setPendingOverride(false);
      setPeriodActualInput("");
      actionFeedback.success("Reverted to child rollup");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      actionFeedback.error(err.data?.message || err.message || "Failed to revert override");
    }
  };

  const overrideActions =
    mayRequestOverride || isParentOverride ? (
      <div className="flex flex-wrap gap-2" onClick={onClick}>
        {mayRequestOverride && !isEditingManual && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs border-amber-300 text-amber-900 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
            onClick={(e) => {
              e.stopPropagation();
              setPendingOverride(true);
            }}
          >
            Override rollup
          </Button>
        )}
        {isParentOverride && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
            disabled={isSaving}
            onClick={(e) => {
              e.stopPropagation();
              void handleRevertRollup();
            }}
          >
            Revert to rollup
          </Button>
        )}
      </div>
    ) : null;

  const reopenEditButton = showReopenEditAction ? (
    <div className="flex flex-wrap gap-2" onClick={onClick}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30 gap-1.5"
        onClick={(e) => {
          e.stopPropagation();
          setIsRevising(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit / Resubmit
      </Button>
    </div>
  ) : null;

  const manualEditor = showManualEditor ? (
    <div
      className={cn(
        "flex gap-2",
        variant === "table"
          ? "flex-col sm:flex-row sm:items-end"
          : "flex-col sm:flex-row sm:items-end"
      )}
      onClick={onClick}
    >
      <div className="flex-1 space-y-1 min-w-0">
        {variant !== "table" && (
          <Label htmlFor={`period_actual_${nodeId}`} className="text-xs font-medium text-foreground">
            Manual Override Achievement
          </Label>
        )}
        <Input
          id={`period_actual_${nodeId}`}
          type="number"
          min={0}
          step="any"
          value={periodActualInput}
          onChange={(e) => setPeriodActualInput(e.target.value)}
          placeholder={`Target ${periodTarget}`}
          className={
            variant === "compact"
              ? "h-8 text-xs border-amber-300 focus-visible:ring-amber-500"
              : variant === "table"
              ? "h-8 text-sm border-amber-300 focus-visible:ring-amber-500"
              : "border-amber-300 focus-visible:ring-amber-500"
          }
        />
      </div>
      <Button
        size={variant === "compact" || variant === "table" ? "sm" : "default"}
        disabled={isSaving}
        onClick={(e) => {
          e.stopPropagation();
          void handleSaveOverride();
        }}
        className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
      >
        Save
      </Button>
    </div>
  ) : null;

  const statusBadges = (
    <>
      {!isEditingManual && !isRollupEntry && workflowStatusBadge}
      {isRollupEntry && (
        <Badge variant="outline" className="text-[10px] py-0 h-4 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/40 dark:text-slate-300">
          Rolled up from children
        </Badge>
      )}
      {isEditingManual && (
        <Badge
          variant="outline"
          className="text-[10px] py-0 h-4 border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300"
        >
          Manual override
        </Badge>
      )}
      {achievementPercent != null && showAchievementPercent && (
        <Badge variant="outline" className="text-[10px] py-0 h-4 border-amber-200 text-amber-900 font-semibold bg-amber-50/70 dark:bg-amber-950/30 dark:text-amber-300">
          {achievementPercent}% of 100%
        </Badge>
      )}
      {varianceTypeLabel && showAchievementPercent && (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] py-0 h-4 font-medium",
            (node as any).variance_type === "OVER" &&
              "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
            (node as any).variance_type === "UNDER" &&
              "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
            (node as any).variance_type === "ON_TARGET" &&
              "border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/40 dark:text-slate-300"
          )}
        >
          {varianceTypeLabel}
          {(node as any).variance != null && (node as any).variance_type !== "ON_TARGET"
            ? ` (${(node as any).variance > 0 ? "+" : ""}${(node as any).variance})`
            : ""}
        </Badge>
      )}
      {!isEditingManual &&
        !isRollupEntry &&
        (node as any).period_actual_narration &&
        variant !== "table" && (
          <p className="text-[11px] text-muted-foreground w-full basis-full mt-0.5">
            {(node as any).period_actual_narration}
          </p>
        )}
    </>
  );

  const rejectionModal = (
    <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
      <DialogContent className="w-full max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base text-rose-600 font-bold">
            {isValidationRejectAction
              ? "Return Achievement to Executor"
              : "Reject Achievement Submission"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isValidationRejectAction
              ? "Provide the reason for returning this achievement. The assigned executor will be notified to revise and resubmit."
              : "Provide the reason for rejecting this achievement submission."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <Label htmlFor="regional-reject-comment" className="text-xs font-medium">
            Reason / Feedback <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            id="regional-reject-comment"
            placeholder="Explain why this achievement is rejected or what needs correction..."
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
            onClick={() => setRejectDialogOpen(false)}
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
  );

  if (variant === "compact") {
    return (
      <div
        ref={sectionRef}
        id="regional-plan-achievement-section"
        className={cn("space-y-2", focusClassName, className)}
        onClick={onClick}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge
            variant="secondary"
            className="text-[10px] py-0 h-4 bg-amber-50 text-amber-900 border-amber-200 font-medium"
          >
            {displayTargetTitle}: {periodTargetValue}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] py-0 h-4 font-medium",
              periodActualValue
                ? "bg-amber-100/70 text-amber-950 border-amber-300"
                : "bg-gray-50 text-gray-400 border-gray-100 italic"
            )}
          >
            Achieved: {periodActualValue ?? "Not recorded"}
          </Badge>
          {statusBadges}
        </div>
        {statusNotice}
        {achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
          (node as any).period_actual_rejection_comment && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
              {(node as any).period_actual_rejection_comment}
            </p>
          )}
        {overrideActions}
        {reopenEditButton}
        {approvalActions}
        {validationActions}
        {leafEditor}
        {manualEditor}
        {rejectionModal}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div
        ref={sectionRef}
        id="regional-plan-achievement-section"
        className={cn("space-y-2 min-w-[160px]", focusClassName, className)}
        onClick={onClick}
      >
        <span
          className={cn(
            "text-sm block",
            periodActualValue ? "text-foreground font-semibold" : "text-muted-foreground italic"
          )}
        >
          {periodActualValue ?? (isRollupEntry ? "—" : "Not recorded")}
        </span>
        {statusNotice}
        {overrideActions}
        {reopenEditButton}
        {approvalActions}
        {validationActions}
        {leafEditor}
        {manualEditor}
        {rejectionModal}
      </div>
    );
  }

  return (
    <div
      ref={sectionRef}
      id="regional-plan-achievement-section"
      className={cn(
        "rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-amber-50/20 to-white dark:from-amber-950/20 dark:via-background dark:to-background dark:border-amber-800/40 px-3.5 py-3 space-y-3",
        isRollupEntry && "border-slate-200 from-slate-50/90 dark:border-slate-800 dark:from-slate-900/30",
        isEditingManual && "border-amber-300 from-amber-50/90 dark:border-amber-700 dark:from-amber-950/40",
        focusClassName,
        className
      )}
      onClick={onClick}
    >
      <div className="flex flex-wrap gap-2">{statusBadges}</div>
      {statusNotice}
      {achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
        (node as any).period_actual_rejection_comment && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
            {(node as any).period_actual_rejection_comment}
          </p>
        )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            {displayTargetTitle}
          </p>
          <p
            className="mt-0.5 text-2xl font-bold leading-tight text-amber-950 dark:text-amber-100 truncate"
            title={periodTargetValue}
          >
            {periodTargetValue}
          </p>
        </div>
        <div className="min-w-0 sm:border-l sm:border-amber-200/60 sm:pl-3 dark:sm:border-amber-800/40">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            Achievement
          </p>
          <p
            className={cn(
              "mt-0.5 text-2xl font-bold leading-tight truncate",
              periodActualValue ? "text-amber-950 dark:text-amber-100" : "text-muted-foreground italic text-lg"
            )}
            title={periodActualValue ?? "Not recorded"}
          >
            {periodActualValue ?? (isRollupEntry ? "—" : "Not recorded")}
          </p>
          {achievementPercent != null && showAchievementPercent && (
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
              {achievementPercent}% of 100% performance
              {varianceTypeLabel ? ` · ${varianceTypeLabel}` : ""}
            </p>
          )}
          {(node as any).period_actual_narration && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {(node as any).period_actual_narration}
            </p>
          )}
        </div>
      </div>
      {overrideActions}
      {reopenEditButton}
      {approvalActions}
      {validationActions}
      {leafEditor}
      {manualEditor}
      {rejectionModal}
    </div>
  );
}

