"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlanNode, PlanRule } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { useUpdatePeriodActualMutation } from "@/redux/api/planApi";
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
    PLAN_UPDATE_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import { usePermissions } from "@/hooks/usePermissions";

interface PlanNodePeriodActualSectionProps {
    node: PlanNode;
    rule?: PlanRule | null;
    configuredUnits?: TargetUnit[];
    canEdit?: boolean;
    variant?: "card" | "compact" | "table";
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
}

export function PlanNodePeriodActualSection({
    node,
    rule,
    configuredUnits,
    canEdit = false,
    variant = "card",
    className,
    onClick,
}: PlanNodePeriodActualSectionProps) {
    const { can } = usePermissions();
    const [updatePeriodActual, { isLoading: isSaving }] = useUpdatePeriodActualMutation();
    const [periodActualInput, setPeriodActualInput] = useState("");
    const [pendingOverride, setPendingOverride] = useState(false);

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
        isWeightedTargetNode(node, rule) &&
        (effectiveTarget > 0 || isRollupEntry || node.has_contributing_data);
    const canEnterLeaf = canEdit && canManuallyEnterAchievement(node, rule);
    const canEnterManual =
        canEdit && isEditingManual && periodTarget > 0 && (isParentOverride || pendingOverride);
    const canEnter = canEnterLeaf || canEnterManual;

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
            ? node.has_contributing_data || displayActualRaw != null
            : node.period_actual != null || node.period_actual_override);

    const handleSave = async () => {
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

    const editor =
        canEnter && periodTarget > 0 ? (
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
                            {isEditingManual
                                ? "Manual Override Achievement"
                                : "Achievement This Period"}
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
                <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
                    <Button
                        size={variant === "compact" || variant === "table" ? "sm" : "default"}
                        disabled={isSaving}
                        onClick={(e) => {
                            e.stopPropagation();
                            void handleSave();
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
            <div className={cn("space-y-2", className)} onClick={onClick}>
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
                {overrideActions}
                {editor}
            </div>
        );
    }

    if (variant === "table") {
        return (
            <div className={cn("space-y-2 min-w-[160px]", className)} onClick={onClick}>
                <span
                    className={cn(
                        "text-sm block",
                        periodActualValue ? "text-gray-900 font-medium" : "text-gray-400 italic"
                    )}
                >
                    {periodActualValue ?? (isRollupEntry ? "—" : "Not recorded")}
                </span>
                {overrideActions}
                {editor}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/90 to-white px-3.5 py-3 space-y-3",
                isRollupEntry && "border-slate-200 from-slate-50/90",
                isEditingManual && "border-amber-200 from-amber-50/90",
                className
            )}
            onClick={onClick}
        >
            <div className="flex flex-wrap gap-2">{statusBadges}</div>
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
            {editor}
        </div>
    );
}
