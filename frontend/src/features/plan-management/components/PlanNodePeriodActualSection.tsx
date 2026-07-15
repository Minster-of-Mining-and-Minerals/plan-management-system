"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PlanNode, PlanRule } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { useUpdatePeriodActualMutation, useSubmitAchievementMutation, useApproveAchievementMutation, useRejectAchievementMutation, useValidateAchievementMutation, useRejectValidationAchievementMutation } from "@/redux/api/planApi";
import { formatNodeWeight } from "@/utils/planRuleUtils";
import {
    canManuallyEnterAchievement,
    canRequestParentOverride,
    isWeightedTargetNode,
    resolveAchievementEntryMode,
} from "@/utils/planExecutionAchievementUtils";
import { actionFeedback } from "@/components/action-feedback";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
    PLAN_LIFECYCLE_PERMISSIONS,
    PLAN_OVERRIDE_PARENT_ACHIEVEMENT_PERMISSIONS,
    PLAN_EXECUTE_ACHIEVEMENT_PERMISSIONS,
    PLAN_APPROVE_ACHIEVEMENT_PERMISSIONS,
    PLAN_VALIDATE_APPROVAL_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import {
    resolvePlanAchievementStatus,
    planAchievementStatusLabelForDisplay,
    canEditPlanAchievementValue,
    isPendingPlanAchievementValidation,
    PLAN_ACHIEVEMENT_STATUS,
} from "@/utils/planAchievementWorkflowUtils";
import { planAchievementExecutorHint } from "@/utils/planAchievementHierarchyUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanAchievementScope } from "@/hooks/usePlanAchievementScope";

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

interface PlanNodePeriodActualSectionProps {
    node: PlanNode;
    rule?: PlanRule | null;
    configuredUnits?: TargetUnit[];
    canEdit?: boolean;
    variant?: "card" | "compact" | "table";
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
    focused?: boolean;
}

export function PlanNodePeriodActualSection({
    node,
    rule,
    configuredUnits,
    canEdit = false,
    variant = "card",
    className,
    onClick,
    focused = false,
}: PlanNodePeriodActualSectionProps) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { can } = usePermissions();
    const { canExecuteOnNode, canApproveOnNode, canValidateOnNode, hasValidationGate, isReady: scopeReady } = usePlanAchievementScope();
    const [submitAchievement, { isLoading: isSubmitting }] = useSubmitAchievementMutation();
    const [approveAchievement, { isLoading: isApproving }] = useApproveAchievementMutation();
    const [rejectAchievement, { isLoading: isRejecting }] = useRejectAchievementMutation();
    const [validateAchievement, { isLoading: isValidating }] = useValidateAchievementMutation();
    const [rejectValidationAchievement, { isLoading: isValidationRejecting }] =
        useRejectValidationAchievementMutation();
    const [updatePeriodActual, { isLoading: isOverrideSaving }] = useUpdatePeriodActualMutation();
    const [periodActualInput, setPeriodActualInput] = useState("");
    const [narrationInput, setNarrationInput] = useState("");
    const [pendingOverride, setPendingOverride] = useState(false);

    const isSaving = isSubmitting || isApproving || isRejecting || isValidating || isValidationRejecting || isOverrideSaving;
    const achievementStatus = resolvePlanAchievementStatus(node);
    const canExecuteAchievement = can(PLAN_LIFECYCLE_PERMISSIONS.EXECUTE_ACHIEVEMENT);
    const canApproveAchievement = can(PLAN_LIFECYCLE_PERMISSIONS.APPROVE_ACHIEVEMENT);
    const canValidateAchievementPermission = can(PLAN_LIFECYCLE_PERMISSIONS.VALIDATE_APPROVAL);

    const nodeWeightMode = node.weight_mode;
    const entryMode = resolveAchievementEntryMode(node, rule);
    const isRollupEntry = entryMode === "rollup";
    const isParentOverride = entryMode === "parent_override";
    const canOverrideParent = can(PLAN_LIFECYCLE_PERMISSIONS.OVERRIDE_PARENT_ACHIEVEMENT);
    const mayRequestOverride =
        canEdit && canOverrideParent && canRequestParentOverride(node, rule);
    const isEditingManual = isParentOverride || pendingOverride;
    const periodTarget = Number(node.period_target) || 0;
    const rollupTarget = Number(node.computed_period_target) || 0;
    const effectiveTarget =
        isRollupEntry && rollupTarget > 0
            ? rollupTarget
            : periodTarget > 0
              ? periodTarget
              : rollupTarget;
    const showSection =
        (isWeightedTargetNode(node, rule) &&
            (effectiveTarget > 0 || isRollupEntry || node.has_contributing_data)) ||
        (isRollupEntry && node.is_evaluable);
    const canEnterLeaf =
        canEdit &&
        canExecuteAchievement &&
        canManuallyEnterAchievement(node, rule) &&
        scopeReady &&
        canExecuteOnNode(node.plan_node_id);
    const canEnterManual =
        canEdit &&
        canExecuteAchievement &&
        isEditingManual &&
        periodTarget > 0 &&
        (isParentOverride || pendingOverride);
    const canEnter = canEnterLeaf || canEnterManual;
    const canSubmitAchievement =
        canEnter && canEditPlanAchievementValue(achievementStatus);

    useEffect(() => {
        if (node.period_actual != null) {
            setPeriodActualInput(String(node.period_actual));
        } else {
            setPeriodActualInput("");
        }
        setNarrationInput(node.period_actual_narration ?? "");
    }, [node.period_actual, node.period_actual_narration, node.plan_node_id]);

    useEffect(() => {
        setPendingOverride(false);
    }, [node.plan_node_id, node.period_actual_override]);

    useEffect(() => {
        if (!focused || !sectionRef.current) {
            return;
        }
        sectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [focused, node.plan_node_id]);

    if (node.achievement_mode === "annual") {
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
        ? node.computed_period_actual != null
            ? Number(node.computed_period_actual)
            : null
        : node.period_actual != null
          ? Number(node.period_actual)
          : node.computed_period_actual != null
            ? Number(node.computed_period_actual)
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
        node.execution_progress_percent ??
        (displayActualRaw != null && effectiveTarget > 0
            ? scorePercentForDisplay(
                  displayActualRaw,
                  effectiveTarget,
                  allowOverAchievement
              )
            : null);
    const varianceTypeLabel = formatVarianceTypeLabel(node.variance_type ?? null);
    const showAchievementPercent =
        achievementPercent != null &&
        (isRollupEntry
            ? node.is_evaluable || node.has_contributing_data || displayActualRaw != null
            : node.period_actual != null || node.period_actual_override);

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
                id: node.plan_node_id,
                period_actual: val,
                narration: narrationInput.trim() || null,
            }).unwrap();
            actionFeedback.success(
                val == null ? "Achievement cleared" : "Achievement submitted for approval"
            );
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to submit achievement");
        }
    };

    const handleApprove = async () => {
        try {
            await approveAchievement({ id: node.plan_node_id }).unwrap();
            actionFeedback.success("Achievement approved");
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to approve achievement");
        }
    };

    const handleReject = async () => {
        if (
            !(await actionFeedback.confirm("Reject this achievement submission?", {
                destructive: true,
            }))
        ) {
            return;
        }

        try {
            await rejectAchievement({ id: node.plan_node_id }).unwrap();
            actionFeedback.success("Achievement rejected");
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to reject achievement");
        }
    };

    const handleValidate = async () => {
        try {
            await validateAchievement({ id: node.plan_node_id }).unwrap();
            actionFeedback.success("Achievement validated");
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to validate achievement");
        }
    };

    const handleValidationReject = async () => {
        if (
            !(await actionFeedback.confirm(
                "Send this achievement back to the executor? They will need to update and resubmit.",
                { destructive: true }
            ))
        ) {
            return;
        }

        try {
            await rejectValidationAchievement({ id: node.plan_node_id }).unwrap();
            actionFeedback.success("Achievement sent back to executor");
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to reject validation");
        }
    };

    const showLeafEditor = canEnterLeaf && periodTarget > 0 && canSubmitAchievement;
    const showManualEditor = canEnterManual && periodTarget > 0;
    const showApprovalActions =
        achievementStatus === PLAN_ACHIEVEMENT_STATUS.SUBMITTED &&
        canApproveAchievement &&
        scopeReady &&
        canApproveOnNode(node.plan_node_id) &&
        !isEditingManual;

    const showValidationActions =
        isPendingPlanAchievementValidation(achievementStatus) &&
        hasValidationGate &&
        canValidateAchievementPermission &&
        scopeReady &&
        canValidateOnNode(node.plan_node_id) &&
        !isEditingManual;

    const showExecutorAssignmentHint =
        scopeReady &&
        canEdit &&
        canExecuteAchievement &&
        canManuallyEnterAchievement(node, rule) &&
        !canExecuteOnNode(node.plan_node_id);

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
                        "text-amber-800 bg-amber-50 border-amber-100",
                    achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
                        hasValidationGate &&
                        "text-sky-800 bg-sky-50 border-sky-100",
                    achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
                        !hasValidationGate &&
                        "text-emerald-800 bg-emerald-50 border-emerald-100",
                    achievementStatus === PLAN_ACHIEVEMENT_STATUS.VALIDATED &&
                        "text-emerald-800 bg-emerald-50 border-emerald-100",
                    achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
                        "text-red-800 bg-red-50 border-red-100",
                    achievementStatus === PLAN_ACHIEVEMENT_STATUS.EMPTY &&
                        "text-violet-800 bg-violet-50 border-violet-100"
                )}
            >
                {executorHint}
            </p>
        ) : showExecutorAssignmentHint ? (
            <p className="text-xs rounded-md px-2 py-1.5 border text-slate-700 bg-slate-50 border-slate-200">
                You are not assigned to record achievement on this section.
            </p>
        ) : null;

    const workflowStatusBadge = (
        <Badge
            variant="outline"
            className={cn(
                "text-[10px] py-0 h-4",
                achievementStatus === PLAN_ACHIEVEMENT_STATUS.SUBMITTED &&
                    "border-amber-200 text-amber-800 bg-amber-50",
                achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
                    hasValidationGate &&
                    "border-sky-200 text-sky-800 bg-sky-50",
                achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
                    !hasValidationGate &&
                    "border-emerald-200 text-emerald-800 bg-emerald-50",
                achievementStatus === PLAN_ACHIEVEMENT_STATUS.VALIDATED &&
                    "border-emerald-200 text-emerald-800 bg-emerald-50",
                achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
                    "border-red-200 text-red-800 bg-red-50",
                achievementStatus === PLAN_ACHIEVEMENT_STATUS.EMPTY &&
                    "border-gray-200 text-gray-600 bg-gray-50"
            )}
        >
            {planAchievementStatusLabelForDisplay(achievementStatus, {
                hasValidationGate,
            })}
        </Badge>
    );

    const approvalActions = showApprovalActions ? (
        <div className="flex flex-wrap gap-2" onClick={onClick}>
            <PermissionGuard requireAll={PLAN_APPROVE_ACHIEVEMENT_PERMISSIONS}>
                <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
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
                    className="h-8 text-xs border-red-200 text-red-800 hover:bg-red-50"
                    disabled={isSaving}
                    onClick={(e) => {
                        e.stopPropagation();
                        void handleReject();
                    }}
                >
                    Reject
                </Button>
            </PermissionGuard>
        </div>
    ) : null;

    const validationActions = showValidationActions ? (
        <div className="flex flex-wrap gap-2" onClick={onClick}>
            <PermissionGuard requireAll={PLAN_VALIDATE_APPROVAL_PERMISSIONS}>
                <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={isSaving}
                    onClick={(e) => {
                        e.stopPropagation();
                        void handleValidate();
                    }}
                >
                    Validate
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-red-200 text-red-800 hover:bg-red-50"
                    disabled={isSaving}
                    onClick={(e) => {
                        e.stopPropagation();
                        void handleValidationReject();
                    }}
                >
                    Send back
                </Button>
            </PermissionGuard>
        </div>
    ) : null;

    const leafEditor =
        showLeafEditor ? (
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
                            <Label htmlFor={`period_actual_${node.plan_node_id}`} className="text-xs">
                                Achievement This Period
                            </Label>
                        )}
                        <Input
                            id={`period_actual_${node.plan_node_id}`}
                            type="number"
                            min={0}
                            step="any"
                            value={periodActualInput}
                            onChange={(e) => setPeriodActualInput(e.target.value)}
                            placeholder={`Target ${periodTarget}`}
                            className={
                                variant === "compact"
                                    ? "h-8 text-xs"
                                    : variant === "table"
                                      ? "h-8 text-sm"
                                      : ""
                            }
                        />
                    </div>
                    <PermissionGuard requireAll={PLAN_EXECUTE_ACHIEVEMENT_PERMISSIONS}>
                        <Button
                            size={variant === "compact" || variant === "table" ? "sm" : "default"}
                            disabled={isSaving}
                            onClick={(e) => {
                                e.stopPropagation();
                                void handleSubmit();
                            }}
                            className="shrink-0"
                        >
                            {achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED
                                ? "Resubmit"
                                : "Submit"}
                        </Button>
                    </PermissionGuard>
                </div>
                {(narrationRequired || narrationInput.trim().length > 0 || draftActualValid) && (
                    <div className="space-y-1">
                        <Label
                            htmlFor={`period_actual_narration_${node.plan_node_id}`}
                            className="text-xs"
                        >
                            Performance narration
                            {narrationRequired ? " (required)" : " (optional)"}
                        </Label>
                        <Textarea
                            id={`period_actual_narration_${node.plan_node_id}`}
                            value={narrationInput}
                            maxLength={NARRATION_MAX}
                            onChange={(e) => setNarrationInput(e.target.value)}
                            placeholder={
                                narrationRequired
                                    ? "Explain why actual differs from the target"
                                    : "Optional note about this period's achievement"
                            }
                            className={cn(
                                "min-h-[72px] text-xs",
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
                id: node.plan_node_id,
                period_actual: val,
                ...(pendingOverride && !isParentOverride ? { use_parent_override: true } : {}),
            }).unwrap();
            setPendingOverride(false);
            actionFeedback.success("Period achievement saved");
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to save achievement");
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
                id: node.plan_node_id,
                period_actual: null,
                clear_parent_override: true,
            }).unwrap();
            setPendingOverride(false);
            setPeriodActualInput("");
            actionFeedback.success("Reverted to child rollup");
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to revert override");
        }
    };

    const overrideActions =
        mayRequestOverride || isParentOverride ? (
            <div className="flex flex-wrap gap-2" onClick={onClick}>
                {mayRequestOverride && !isEditingManual && (
                    <PermissionGuard requireAll={PLAN_OVERRIDE_PARENT_ACHIEVEMENT_PERMISSIONS}>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-amber-200 text-amber-900 hover:bg-amber-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPendingOverride(true);
                            }}
                        >
                            Override rollup
                        </Button>
                    </PermissionGuard>
                )}
                {isParentOverride && (
                    <PermissionGuard requireAll={PLAN_OVERRIDE_PARENT_ACHIEVEMENT_PERMISSIONS}>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-amber-800 hover:bg-amber-50"
                            disabled={isSaving}
                            onClick={(e) => {
                                e.stopPropagation();
                                void handleRevertRollup();
                            }}
                        >
                            Revert to rollup
                        </Button>
                    </PermissionGuard>
                )}
            </div>
        ) : null;

    const manualEditor =
        showManualEditor ? (
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
                        <Label htmlFor={`period_actual_${node.plan_node_id}`} className="text-xs">
                            Manual Override Achievement
                        </Label>
                    )}
                    <Input
                        id={`period_actual_${node.plan_node_id}`}
                        type="number"
                        min={0}
                        step="any"
                        value={periodActualInput}
                        onChange={(e) => setPeriodActualInput(e.target.value)}
                        placeholder={`Target ${periodTarget}`}
                        className={
                            variant === "compact"
                                ? "h-8 text-xs"
                                : variant === "table"
                                  ? "h-8 text-sm"
                                  : ""
                        }
                    />
                </div>
                <PermissionGuard requireAll={PLAN_OVERRIDE_PARENT_ACHIEVEMENT_PERMISSIONS}>
                    <Button
                        size={variant === "compact" || variant === "table" ? "sm" : "default"}
                        disabled={isSaving}
                        onClick={(e) => {
                            e.stopPropagation();
                            void handleSaveOverride();
                        }}
                        className="shrink-0"
                    >
                        Save
                    </Button>
                </PermissionGuard>
            </div>
        ) : null;

    const statusBadges = (
        <>
            {!isEditingManual && !isRollupEntry && workflowStatusBadge}
            {isRollupEntry && (
                <Badge variant="outline" className="text-[10px] py-0 h-4">
                    Rolled up from children
                </Badge>
            )}
            {isEditingManual && (
                <Badge
                    variant="outline"
                    className="text-[10px] py-0 h-4 border-amber-200 text-amber-800"
                >
                    Manual override
                </Badge>
            )}
            {achievementPercent != null && showAchievementPercent && (
                <Badge variant="outline" className="text-[10px] py-0 h-4">
                    {achievementPercent}%
                </Badge>
            )}
            {varianceTypeLabel && showAchievementPercent && (
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[10px] py-0 h-4",
                        node.variance_type === "OVER" &&
                            "border-emerald-200 text-emerald-800 bg-emerald-50",
                        node.variance_type === "UNDER" &&
                            "border-amber-200 text-amber-800 bg-amber-50",
                        node.variance_type === "ON_TARGET" &&
                            "border-slate-200 text-slate-700 bg-slate-50"
                    )}
                >
                    {varianceTypeLabel}
                    {node.variance != null && node.variance_type !== "ON_TARGET"
                        ? ` (${node.variance > 0 ? "+" : ""}${node.variance})`
                        : ""}
                </Badge>
            )}
            {!isEditingManual &&
                !isRollupEntry &&
                node.period_actual_narration &&
                variant !== "table" && (
                    <p className="text-[11px] text-muted-foreground w-full basis-full">
                        {node.period_actual_narration}
                    </p>
                )}
        </>
    );

    if (variant === "compact") {
        return (
            <div
                ref={sectionRef}
                id="plan-achievement-section"
                className={cn("space-y-2", focusClassName, className)}
                onClick={onClick}
            >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                        variant="secondary"
                        className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-100"
                    >
                        Target: {periodTargetValue}
                    </Badge>
                    <Badge
                        variant="secondary"
                        className={cn(
                            "text-[10px] py-0 h-4",
                            periodActualValue
                                ? "bg-violet-50 text-violet-700 border-violet-100"
                                : "bg-gray-50 text-gray-400 border-gray-100 italic"
                        )}
                    >
                        Achieved: {periodActualValue ?? "Not recorded"}
                    </Badge>
                    {statusBadges}
                </div>
                {statusNotice}
                {achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
                    node.period_actual_rejection_comment && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
                            {node.period_actual_rejection_comment}
                        </p>
                    )}
                {overrideActions}
                {approvalActions}
                {validationActions}
                {leafEditor}
                {manualEditor}
            </div>
        );
    }

    if (variant === "table") {
        return (
            <div
                ref={sectionRef}
                id="plan-achievement-section"
                className={cn("space-y-2 min-w-[160px]", focusClassName, className)}
                onClick={onClick}
            >
                <span
                    className={cn(
                        "text-sm block",
                        periodActualValue ? "text-gray-900 font-medium" : "text-gray-400 italic"
                    )}
                >
                    {periodActualValue ?? (isRollupEntry ? "—" : "Not recorded")}
                </span>
                {statusNotice}
                {overrideActions}
                {approvalActions}
                {validationActions}
                {leafEditor}
                {manualEditor}
            </div>
        );
    }

    return (
        <div
            ref={sectionRef}
            id="plan-achievement-section"
            className={cn(
                "rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/90 to-white px-3.5 py-3 space-y-3",
                isRollupEntry && "border-slate-200 from-slate-50/90",
                isEditingManual && "border-amber-200 from-amber-50/90",
                focusClassName,
                className
            )}
            onClick={onClick}
        >
            <div className="flex flex-wrap gap-2">{statusBadges}</div>
            {statusNotice}
            {achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
                node.period_actual_rejection_comment && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
                        {node.period_actual_rejection_comment}
                    </p>
                )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">
                        Period Target
                    </p>
                    <p
                        className="mt-0.5 text-2xl font-bold leading-tight text-emerald-950 truncate"
                        title={periodTargetValue}
                    >
                        {periodTargetValue}
                    </p>
                </div>
                <div className="min-w-0 sm:border-l sm:border-violet-100 sm:pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700/80">
                        Achievement
                    </p>
                    <p
                        className={cn(
                            "mt-0.5 text-2xl font-bold leading-tight truncate",
                            periodActualValue ? "text-violet-950" : "text-gray-400 italic text-lg"
                        )}
                        title={periodActualValue ?? "Not recorded"}
                    >
                        {periodActualValue ?? (isRollupEntry ? "—" : "Not recorded")}
                    </p>
                    {achievementPercent != null && showAchievementPercent && (
                        <p className="text-xs text-violet-700 mt-1">
                            {achievementPercent}% performance
                            {varianceTypeLabel ? ` · ${varianceTypeLabel}` : ""}
                        </p>
                    )}
                    {node.period_actual_narration && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                            {node.period_actual_narration}
                        </p>
                    )}
                </div>
            </div>
            {overrideActions}
            {approvalActions}
            {validationActions}
            {leafEditor}
            {manualEditor}
        </div>
    );
}
