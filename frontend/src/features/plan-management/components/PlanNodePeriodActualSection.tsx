"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlanNode, PlanRule } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { useUpdatePeriodActualMutation, useSubmitAchievementMutation, useApproveAchievementMutation, useRejectAchievementMutation } from "@/redux/api/planApi";
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
} from "@/utils/planPermissionUtils";
import {
    resolvePlanAchievementStatus,
    planAchievementStatusLabel,
    isPendingPlanAchievement,
    PLAN_ACHIEVEMENT_STATUS,
} from "@/utils/planAchievementWorkflowUtils";
import { planAchievementExecutorHint } from "@/utils/planAchievementHierarchyUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanAchievementScope } from "@/hooks/usePlanAchievementScope";

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
    const { canExecuteOnNode, canApproveOnNode, isReady: scopeReady } = usePlanAchievementScope();
    const [submitAchievement, { isLoading: isSubmitting }] = useSubmitAchievementMutation();
    const [approveAchievement, { isLoading: isApproving }] = useApproveAchievementMutation();
    const [rejectAchievement, { isLoading: isRejecting }] = useRejectAchievementMutation();
    const [updatePeriodActual, { isLoading: isOverrideSaving }] = useUpdatePeriodActualMutation();
    const [periodActualInput, setPeriodActualInput] = useState("");
    const [pendingOverride, setPendingOverride] = useState(false);

    const isSaving = isSubmitting || isApproving || isRejecting || isOverrideSaving;
    const achievementStatus = resolvePlanAchievementStatus(node);
    const canExecuteAchievement = can(PLAN_LIFECYCLE_PERMISSIONS.EXECUTE_ACHIEVEMENT);
    const canApproveAchievement = can(PLAN_LIFECYCLE_PERMISSIONS.APPROVE_ACHIEVEMENT);

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
        canEnter &&
        !isPendingPlanAchievement(achievementStatus) &&
        achievementStatus !== PLAN_ACHIEVEMENT_STATUS.APPROVED;

    useEffect(() => {
        if (node.period_actual != null) {
            setPeriodActualInput(String(node.period_actual));
        } else {
            setPeriodActualInput("");
        }
    }, [node.period_actual, node.plan_node_id]);

    useEffect(() => {
        setPendingOverride(false);
    }, [node.plan_node_id, node.period_actual_override]);

    useEffect(() => {
        if (!focused || !sectionRef.current) {
            return;
        }
        sectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [focused, node.plan_node_id]);

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

    const achievementPercent =
        node.execution_progress_percent ??
        (displayActualRaw != null && effectiveTarget > 0
            ? Math.min(100, Math.round((displayActualRaw / effectiveTarget) * 100))
            : null);
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
            if (val != null && val > periodTarget + 0.001) {
                actionFeedback.error(`Achievement cannot exceed the period target (${periodTarget})`);
                return;
            }
            await submitAchievement({
                id: node.plan_node_id,
                period_actual: val,
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

    const showLeafEditor = canEnterLeaf && periodTarget > 0 && canSubmitAchievement;
    const showManualEditor = canEnterManual && periodTarget > 0;
    const showApprovalActions =
        achievementStatus === PLAN_ACHIEVEMENT_STATUS.SUBMITTED &&
        canApproveAchievement &&
        scopeReady &&
        canApproveOnNode(node.plan_node_id) &&
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
    });

    const statusNotice =
        executorHint && !isEditingManual ? (
            <p
                className={cn(
                    "text-xs rounded-md px-2 py-1.5 border",
                    achievementStatus === PLAN_ACHIEVEMENT_STATUS.SUBMITTED &&
                        "text-amber-800 bg-amber-50 border-amber-100",
                    achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
                        "text-red-800 bg-red-50 border-red-100",
                    achievementStatus === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
                        "text-emerald-800 bg-emerald-50 border-emerald-100",
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
                    "border-emerald-200 text-emerald-800 bg-emerald-50",
                achievementStatus === PLAN_ACHIEVEMENT_STATUS.REJECTED &&
                    "border-red-200 text-red-800 bg-red-50",
                achievementStatus === PLAN_ACHIEVEMENT_STATUS.EMPTY &&
                    "border-gray-200 text-gray-600 bg-gray-50"
            )}
        >
            {planAchievementStatusLabel(achievementStatus)}
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

    const leafEditor =
        showLeafEditor ? (
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
                            Achievement This Period
                        </Label>
                    )}
                    <Input
                        id={`period_actual_${node.plan_node_id}`}
                        type="number"
                        min={0}
                        max={periodTarget}
                        step="any"
                        value={periodActualInput}
                        onChange={(e) => setPeriodActualInput(e.target.value)}
                        placeholder={`Up to ${periodTarget}`}
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
        ) : null;

    const handleSaveOverride = async () => {
        try {
            const val = periodActualInput === "" ? null : Number(periodActualInput);
            if (val != null && (Number.isNaN(val) || val < 0)) {
                actionFeedback.error("Achievement must be zero or greater");
                return;
            }
            if (val != null && val > periodTarget + 0.001) {
                actionFeedback.error(`Achievement cannot exceed the period target (${periodTarget})`);
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
                        max={periodTarget}
                        step="any"
                        value={periodActualInput}
                        onChange={(e) => setPeriodActualInput(e.target.value)}
                        placeholder={`Up to ${periodTarget}`}
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
                        <p className="text-xs text-violet-700 mt-1">{achievementPercent}% of target</p>
                    )}
                </div>
            </div>
            {overrideActions}
            {approvalActions}
            {leafEditor}
            {manualEditor}
        </div>
    );
}
