"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AnnualTargetAllocation, PlanNode, PlanRule } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { useUpdateAnnualTargetMutation } from "@/redux/api/planApi";
import {
    formatNodeTarget,
    formatNodeWeight,
    stepRequiresWeight,
} from "@/utils/planRuleUtils";
import { resolveLiveDraftTarget } from "@/utils/planDraftUtils";
import { actionFeedback } from "@/components/action-feedback";
import { AnnualTargetAllocationSummary } from "./AnnualTargetAllocationSummary";
import { cn } from "@/lib/utils";

interface PlanNodeAnnualTargetSectionProps {
    node: PlanNode;
    rule?: PlanRule | null;
    configuredUnits?: TargetUnit[];
    allocation?: AnnualTargetAllocation | null;
    canEdit?: boolean;
    variant?: "card" | "compact" | "table";
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
}

export function PlanNodeAnnualTargetSection({
    node,
    rule,
    configuredUnits,
    allocation,
    canEdit = false,
    variant = "card",
    className,
    onClick,
}: PlanNodeAnnualTargetSectionProps) {
    const [updateAnnualTarget, { isLoading: isSaving }] = useUpdateAnnualTargetMutation();
    const [annualTargetInput, setAnnualTargetInput] = useState("");

    const nodeWeightMode = node.weight_mode;
    const requiresWeight = stepRequiresWeight(rule, node.level);
    const liveDraftTarget = resolveLiveDraftTarget(node, allocation);
    const hasDraftTarget = requiresWeight && liveDraftTarget > 0;

    useEffect(() => {
        if (node.annual_target != null) {
            setAnnualTargetInput(String(node.annual_target));
        } else {
            setAnnualTargetInput("");
        }
    }, [node.annual_target, node.plan_node_id]);

    if (!hasDraftTarget) {
        return null;
    }

    const draftTargetValue = formatNodeWeight(
        liveDraftTarget,
        nodeWeightMode,
        node.target_unit,
        configuredUnits
    );
    const annualTargetValue =
        node.annual_target != null && node.annual_target > 0
            ? formatNodeWeight(
                  node.annual_target,
                  nodeWeightMode,
                  node.target_unit,
                  configuredUnits
              )
            : null;

    const allocationSummary = allocation ? (
        <AnnualTargetAllocationSummary
            allocation={allocation}
            node={node}
            configuredUnits={configuredUnits}
            inputValue={canEdit ? annualTargetInput : undefined}
            variant={variant === "table" ? "table" : variant === "compact" ? "compact" : "card"}
        />
    ) : null;

    const handleSave = async () => {
        try {
            const val =
                annualTargetInput === "" ? null : Number(annualTargetInput);
            if (val != null && (Number.isNaN(val) || val <= 0)) {
                actionFeedback.error("Annual target must be greater than 0");
                return;
            }
            await updateAnnualTarget({
                id: node.plan_node_id,
                annual_target: val,
            }).unwrap();
            actionFeedback.success("Annual target saved");
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to save annual target");
        }
    };

    const editor = canEdit ? (
        <div
            className={cn(
                "flex gap-2",
                variant === "table" ? "flex-col sm:flex-row sm:items-end" : "flex-col sm:flex-row sm:items-end"
            )}
            onClick={onClick}
        >
            <div className="flex-1 space-y-1 min-w-0">
                {variant !== "table" && (
                    <Label htmlFor={`annual_target_${node.plan_node_id}`} className="text-xs">
                        Set Annual Target
                    </Label>
                )}
                <Input
                    id={`annual_target_${node.plan_node_id}`}
                    type="number"
                    min={0.0001}
                    step="any"
                    value={annualTargetInput}
                    onChange={(e) => setAnnualTargetInput(e.target.value)}
                    placeholder={
                        allocation
                            ? `Up to ${allocation.remaining_for_this_year}`
                            : "Enter annual allocation"
                    }
                    className={variant === "compact" ? "h-8 text-xs" : variant === "table" ? "h-8 text-sm" : ""}
                />
            </div>
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
        </div>
    ) : null;

    if (variant === "compact") {
        return (
            <div className={cn("space-y-2", className)} onClick={onClick}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                        variant="secondary"
                        className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100"
                    >
                        Draft Target:{" "}
                        {formatNodeTarget(
                            liveDraftTarget,
                            nodeWeightMode,
                            node.target_unit,
                            configuredUnits
                        )}
                    </Badge>
                    <Badge
                        variant="secondary"
                        className={cn(
                            "text-[10px] py-0 h-4",
                            annualTargetValue
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-gray-50 text-gray-400 border-gray-100 italic"
                        )}
                    >
                        Annual Target: {annualTargetValue ?? "Not set"}
                    </Badge>
                </div>
                {allocationSummary}
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
                        annualTargetValue ? "text-gray-900 font-medium" : "text-gray-400 italic"
                    )}
                >
                    {annualTargetValue ?? "Not yet defined"}
                </span>
                {allocationSummary}
                {editor}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white px-3.5 py-3 space-y-3",
                className
            )}
            onClick={onClick}
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80">
                        Draft Target
                    </p>
                    <p
                        className="mt-0.5 text-2xl font-bold leading-tight text-blue-950 truncate"
                        title={draftTargetValue}
                    >
                        {draftTargetValue}
                    </p>
                </div>
                <div className="min-w-0 sm:border-l sm:border-blue-100 sm:pl-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">
                        Annual Target
                    </p>
                    <p
                        className={cn(
                            "mt-0.5 text-2xl font-bold leading-tight truncate",
                            annualTargetValue
                                ? "text-emerald-950"
                                : "text-gray-400 italic text-lg"
                        )}
                        title={annualTargetValue ?? "Not yet defined"}
                    >
                        {annualTargetValue ?? "Not yet defined"}
                    </p>
                </div>
            </div>
            {allocationSummary}
            {editor}
        </div>
    );
}
