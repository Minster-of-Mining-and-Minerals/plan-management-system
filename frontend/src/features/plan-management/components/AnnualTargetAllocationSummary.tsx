"use client";

import { Badge } from "@/components/ui/badge";
import { AnnualTargetAllocation, PlanNode, PlanRuleWeightMode } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { formatNodeWeight } from "@/utils/planRuleUtils";
import { cn } from "@/lib/utils";

interface AnnualTargetAllocationSummaryProps {
    allocation: AnnualTargetAllocation;
    node: Pick<PlanNode, "weight_mode" | "target_unit">;
    configuredUnits?: TargetUnit[];
    inputValue?: string;
    variant?: "card" | "compact" | "table" | "detail";
    className?: string;
}

function formatAllocationValue(
    value: number,
    weightMode: PlanRuleWeightMode | null | undefined,
    targetUnit: string | null | undefined,
    configuredUnits?: TargetUnit[]
): string {
    return formatNodeWeight(value, weightMode, targetUnit, configuredUnits);
}

export function AnnualTargetAllocationSummary({
    allocation,
    node,
    configuredUnits,
    inputValue,
    variant = "card",
    className,
}: AnnualTargetAllocationSummaryProps) {
    const { weight_mode: weightMode, target_unit: targetUnit } = node;

    const parsedInput =
        inputValue !== undefined && inputValue !== "" ? Number(inputValue) : null;
    const hasValidInput = parsedInput != null && !Number.isNaN(parsedInput);
    const projectedOverall =
        hasValidInput && parsedInput != null
            ? Math.max(0, allocation.draft_target - allocation.allocated_other_years - parsedInput)
            : allocation.remaining_overall;
    const exceedsAvailable =
        hasValidInput &&
        parsedInput != null &&
        parsedInput > allocation.remaining_for_this_year + 0.001;

    const occupiedLabel = formatAllocationValue(
        allocation.allocated_other_years,
        weightMode,
        targetUnit,
        configuredUnits
    );
    const availableLabel = formatAllocationValue(
        allocation.remaining_for_this_year,
        weightMode,
        targetUnit,
        configuredUnits
    );
    const unallocatedLabel = formatAllocationValue(
        projectedOverall,
        weightMode,
        targetUnit,
        configuredUnits
    );
    const draftLabel = formatAllocationValue(
        allocation.draft_target,
        weightMode,
        targetUnit,
        configuredUnits
    );

    if (variant === "compact") {
        return (
            <div className={cn("flex flex-wrap gap-1.5 text-[10px]", className)}>
                <Badge variant="outline" className="py-0 h-4 bg-amber-50 text-amber-800 border-amber-200">
                    Occupied: {occupiedLabel}
                </Badge>
                <Badge variant="outline" className="py-0 h-4 bg-sky-50 text-sky-800 border-sky-200">
                    Available: {availableLabel}
                </Badge>
                <Badge
                    variant="outline"
                    className={cn(
                        "py-0 h-4",
                        projectedOverall <= 0.001
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-violet-50 text-violet-800 border-violet-200"
                    )}
                >
                    Left: {unallocatedLabel}
                </Badge>
                {exceedsAvailable && (
                    <Badge variant="outline" className="py-0 h-4 bg-red-50 text-red-700 border-red-200">
                        Exceeds available
                    </Badge>
                )}
            </div>
        );
    }

    if (variant === "table") {
        return (
            <div className={cn("space-y-1 text-[11px] text-muted-foreground", className)}>
                <p>
                    Occupied (other years):{" "}
                    <span className="font-medium text-amber-800">{occupiedLabel}</span>
                    <span className="text-gray-400"> / {draftLabel} draft target</span>
                </p>
                <p>
                    Available this year:{" "}
                    <span className="font-medium text-sky-800">{availableLabel}</span>
                </p>
                <p>
                    Unallocated overall:{" "}
                    <span
                        className={cn(
                            "font-medium",
                            projectedOverall <= 0.001 ? "text-emerald-800" : "text-violet-800",
                            exceedsAvailable && "text-red-700"
                        )}
                    >
                        {unallocatedLabel}
                    </span>
                </p>
            </div>
        );
    }

    const gridClass =
        variant === "detail"
            ? "grid grid-cols-1 gap-2 sm:grid-cols-3"
            : "grid grid-cols-1 gap-2 sm:grid-cols-3";

    return (
        <div
            className={cn(
                "rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5",
                className
            )}
        >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Draft allocation ({draftLabel} total)
            </p>
            <div className={gridClass}>
                <div>
                    <p className="text-[10px] text-amber-700/90">Occupied (other years)</p>
                    <p className="text-sm font-semibold text-amber-950">{occupiedLabel}</p>
                </div>
                <div>
                    <p className="text-[10px] text-sky-700/90">Available this year</p>
                    <p className="text-sm font-semibold text-sky-950">{availableLabel}</p>
                </div>
                <div>
                    <p className="text-[10px] text-violet-700/90">Unallocated overall</p>
                    <p
                        className={cn(
                            "text-sm font-semibold",
                            projectedOverall <= 0.001 ? "text-emerald-950" : "text-violet-950",
                            exceedsAvailable && "text-red-700"
                        )}
                    >
                        {unallocatedLabel}
                    </p>
                </div>
            </div>
            {exceedsAvailable && (
                <p className="mt-2 text-xs text-red-700">
                    This value exceeds the {availableLabel} available for this year.
                </p>
            )}
        </div>
    );
}
