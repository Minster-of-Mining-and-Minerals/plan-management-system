"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PlanNode, PlanRule } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import {
    useSubmitAnnualAchievementMutation,
    useApproveAnnualAchievementMutation,
    useRejectAnnualAchievementMutation,
    useValidateAnnualAchievementMutation,
    useRejectValidationAnnualAchievementMutation,
} from "@/redux/api/planApi";
import { formatNodeWeight, stepRequiresWeight } from "@/utils/planRuleUtils";
import { actionFeedback } from "@/components/action-feedback";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
    PLAN_LIFECYCLE_PERMISSIONS,
    PLAN_EXECUTE_ACHIEVEMENT_PERMISSIONS,
    PLAN_APPROVE_ACHIEVEMENT_PERMISSIONS,
    PLAN_VALIDATE_APPROVAL_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import {
    resolveAnnualPlanAchievementStatus,
    planAchievementStatusLabelForDisplay,
    canEditPlanAchievementValue,
    isPendingPlanAchievementValidation,
    PLAN_ACHIEVEMENT_STATUS,
} from "@/utils/planAchievementWorkflowUtils";
import { canSetPeriodTargetOnNode } from "@/utils/planAchievementHierarchyUtils";
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

interface PlanNodeAnnualActualSectionProps {
    node: PlanNode;
    rule?: PlanRule | null;
    configuredUnits?: TargetUnit[];
    canEdit?: boolean;
    variant?: "card" | "compact";
    className?: string;
}

export function PlanNodeAnnualActualSection({
    node,
    rule,
    configuredUnits,
    canEdit = false,
    variant = "card",
    className,
}: PlanNodeAnnualActualSectionProps) {
    const { can } = usePermissions();
    const {
        canExecuteOnNode,
        canApproveOnNode,
        canValidateOnNode,
        hasValidationGate,
        isReady: scopeReady,
    } = usePlanAchievementScope();
    const [submitAnnualAchievement, { isLoading: isSubmitting }] =
        useSubmitAnnualAchievementMutation();
    const [approveAnnualAchievement, { isLoading: isApproving }] =
        useApproveAnnualAchievementMutation();
    const [rejectAnnualAchievement, { isLoading: isRejecting }] =
        useRejectAnnualAchievementMutation();
    const [validateAnnualAchievement, { isLoading: isValidating }] =
        useValidateAnnualAchievementMutation();
    const [rejectValidationAnnualAchievement, { isLoading: isValidationRejecting }] =
        useRejectValidationAnnualAchievementMutation();
    const [annualActualInput, setAnnualActualInput] = useState("");
    const [narrationInput, setNarrationInput] = useState("");

    const isSaving =
        isSubmitting || isApproving || isRejecting || isValidating || isValidationRejecting;
    const status = resolveAnnualPlanAchievementStatus(node);
    const canExecuteAchievement = can(PLAN_LIFECYCLE_PERMISSIONS.EXECUTE_ACHIEVEMENT);
    const canApproveAchievement = can(PLAN_LIFECYCLE_PERMISSIONS.APPROVE_ACHIEVEMENT);
    const canValidateAchievementPermission = can(PLAN_LIFECYCLE_PERMISSIONS.VALIDATE_APPROVAL);

    const annualTarget = Number(node.annual_target) || 0;
    const requiresWeight = stepRequiresWeight(rule, node.level);
    const isLeaf = canSetPeriodTargetOnNode(node);
    const isAnnualMode = node.achievement_mode === "annual";

    useEffect(() => {
        if (node.annual_actual != null) {
            setAnnualActualInput(String(node.annual_actual));
        } else {
            setAnnualActualInput("");
        }
        setNarrationInput(node.annual_actual_narration ?? "");
    }, [node.annual_actual, node.annual_actual_narration, node.plan_node_id]);

    if (!isAnnualMode || !requiresWeight || annualTarget <= 0 || !isLeaf) {
        return null;
    }

    const canEditValue =
        canEdit &&
        canExecuteAchievement &&
        scopeReady &&
        canExecuteOnNode(node.plan_node_id) &&
        canEditPlanAchievementValue(status);

    const canApproveHere =
        canEdit &&
        canApproveAchievement &&
        scopeReady &&
        canApproveOnNode(node.plan_node_id) &&
        status === PLAN_ACHIEVEMENT_STATUS.SUBMITTED;

    const canValidateHere =
        canEdit &&
        hasValidationGate &&
        canValidateAchievementPermission &&
        scopeReady &&
        canValidateOnNode(node.plan_node_id) &&
        isPendingPlanAchievementValidation(status);

    const targetLabel = formatNodeWeight(
        annualTarget,
        node.weight_mode,
        node.target_unit,
        configuredUnits
    );
    const actualLabel =
        node.annual_actual != null
            ? formatNodeWeight(
                  node.annual_actual,
                  node.weight_mode,
                  node.target_unit,
                  configuredUnits
              )
            : null;

    const draftActual =
        annualActualInput === "" ? null : Number(annualActualInput);
    const draftActualValid =
        draftActual != null && !Number.isNaN(draftActual) && draftActual >= 0;
    const narrationRequired =
        canEditValue &&
        draftActualValid &&
        Math.abs((draftActual as number) - annualTarget) > VARIANCE_EPSILON;
    const varianceTypeLabel = formatVarianceTypeLabel(node.variance_type ?? null);
    const performancePercent = node.execution_progress_percent ?? null;

    const handleSubmit = async () => {
        try {
            const val = annualActualInput === "" ? null : Number(annualActualInput);
            if (val != null && (Number.isNaN(val) || val < 0)) {
                actionFeedback.error("Achievement must be zero or greater");
                return;
            }
            if (
                val != null &&
                Math.abs(val - annualTarget) > VARIANCE_EPSILON &&
                !narrationInput.trim()
            ) {
                actionFeedback.error(
                    "Performance narration is required when actual achievement differs from the target."
                );
                return;
            }
            await submitAnnualAchievement({
                id: node.plan_node_id,
                annual_actual: val,
                narration: narrationInput.trim() || null,
            }).unwrap();
            actionFeedback.success(
                val == null ? "Annual achievement cleared" : "Annual achievement submitted"
            );
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to submit annual achievement");
        }
    };

    const body = (
        <div className={cn("space-y-2", className)}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge
                    variant="outline"
                    className="text-[10px] py-0 h-4 bg-amber-50 text-amber-800 border-amber-200"
                >
                    Annual achievement
                </Badge>
                <Badge variant="secondary" className="text-[10px] py-0 h-4">
                    Target: {targetLabel}
                </Badge>
                <Badge
                    variant="secondary"
                    className={cn(
                        "text-[10px] py-0 h-4",
                        actualLabel
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-gray-50 text-gray-400 italic"
                    )}
                >
                    Actual: {actualLabel ?? "Not set"}
                </Badge>
                {performancePercent != null && (
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                        {performancePercent}%
                    </Badge>
                )}
                {varianceTypeLabel && (
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
                <Badge variant="outline" className="text-[10px] py-0 h-4">
                    {planAchievementStatusLabelForDisplay(status, {
                        hasValidationGate,
                    })}
                </Badge>
            </div>

            {!canEditValue && node.annual_actual_narration && (
                <p className="text-xs text-muted-foreground">{node.annual_actual_narration}</p>
            )}

            {canEditValue && (
                <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor={`annual_actual_${node.plan_node_id}`} className="text-xs">
                                Set annual achievement
                            </Label>
                            <Input
                                id={`annual_actual_${node.plan_node_id}`}
                                type="number"
                                min={0}
                                step="any"
                                value={annualActualInput}
                                onChange={(e) => setAnnualActualInput(e.target.value)}
                                placeholder={`Target ${annualTarget}`}
                                className={variant === "compact" ? "h-8 text-xs" : ""}
                            />
                        </div>
                        <PermissionGuard requireAll={PLAN_EXECUTE_ACHIEVEMENT_PERMISSIONS}>
                            <Button
                                size={variant === "compact" ? "sm" : "default"}
                                disabled={isSaving}
                                onClick={() => void handleSubmit()}
                            >
                                Submit
                            </Button>
                        </PermissionGuard>
                    </div>
                    {(narrationRequired ||
                        narrationInput.trim().length > 0 ||
                        draftActualValid) && (
                        <div className="space-y-1">
                            <Label
                                htmlFor={`annual_actual_narration_${node.plan_node_id}`}
                                className="text-xs"
                            >
                                Performance narration
                                {narrationRequired ? " (required)" : " (optional)"}
                            </Label>
                            <Textarea
                                id={`annual_actual_narration_${node.plan_node_id}`}
                                value={narrationInput}
                                maxLength={NARRATION_MAX}
                                onChange={(e) => setNarrationInput(e.target.value)}
                                placeholder={
                                    narrationRequired
                                        ? "Explain why actual differs from the annual target"
                                        : "Optional note about this year's achievement"
                                }
                                className="min-h-[72px] text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                {narrationInput.trim().length}/{NARRATION_MAX}
                            </p>
                        </div>
                    )}
                </div>
            )}
            {canApproveHere && (
                <div className="flex flex-wrap gap-2">
                    <PermissionGuard requireAll={PLAN_APPROVE_ACHIEVEMENT_PERMISSIONS}>
                        <Button
                            size="sm"
                            disabled={isSaving}
                            onClick={async () => {
                                try {
                                    await approveAnnualAchievement({
                                        id: node.plan_node_id,
                                    }).unwrap();
                                    actionFeedback.success("Annual achievement approved");
                                } catch (error: unknown) {
                                    const err = error as { data?: { message?: string } };
                                    actionFeedback.error(
                                        err.data?.message || "Failed to approve"
                                    );
                                }
                            }}
                        >
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={isSaving}
                            onClick={async () => {
                                try {
                                    await rejectAnnualAchievement({
                                        id: node.plan_node_id,
                                        comment: "Rejected",
                                    }).unwrap();
                                    actionFeedback.success("Annual achievement rejected");
                                } catch (error: unknown) {
                                    const err = error as { data?: { message?: string } };
                                    actionFeedback.error(
                                        err.data?.message || "Failed to reject"
                                    );
                                }
                            }}
                        >
                            Reject
                        </Button>
                    </PermissionGuard>
                </div>
            )}

            {canValidateHere && (
                <div className="flex flex-wrap gap-2">
                    <PermissionGuard requireAll={PLAN_VALIDATE_APPROVAL_PERMISSIONS}>
                        <Button
                            size="sm"
                            disabled={isSaving}
                            onClick={async () => {
                                try {
                                    await validateAnnualAchievement({
                                        id: node.plan_node_id,
                                    }).unwrap();
                                    actionFeedback.success("Annual achievement validated");
                                } catch (error: unknown) {
                                    const err = error as { data?: { message?: string } };
                                    actionFeedback.error(
                                        err.data?.message || "Failed to validate"
                                    );
                                }
                            }}
                        >
                            Validate
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={isSaving}
                            onClick={async () => {
                                try {
                                    await rejectValidationAnnualAchievement({
                                        id: node.plan_node_id,
                                        comment: "Validation rejected",
                                    }).unwrap();
                                    actionFeedback.success("Validation rejected");
                                } catch (error: unknown) {
                                    const err = error as { data?: { message?: string } };
                                    actionFeedback.error(
                                        err.data?.message || "Failed to reject validation"
                                    );
                                }
                            }}
                        >
                            Reject validation
                        </Button>
                    </PermissionGuard>
                </div>
            )}
        </div>
    );

    if (variant === "compact") {
        return body;
    }

    return (
        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white px-3.5 py-3">
            {body}
        </div>
    );
}
