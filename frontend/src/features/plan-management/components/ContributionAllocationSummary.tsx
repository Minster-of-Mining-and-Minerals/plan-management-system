"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanNode } from "@/redux/types/plan";
import { computeContributionAllocation, CONTRIBUTION_FIELD_LABEL } from "@/utils/planRuleUtils";
import { cn } from "@/lib/utils";

interface ContributionAllocationSummaryProps {
    children: Array<Pick<PlanNode, "contribution_weight" | "is_active">>;
    variant?: "card" | "compact" | "table" | "detail";
    className?: string;
    canDistribute?: boolean;
    isDistributing?: boolean;
    onDistributeEqually?: () => void;
}

export function ContributionAllocationSummary({
    children,
    variant = "compact",
    className,
    canDistribute = false,
    isDistributing = false,
    onDistributeEqually,
}: ContributionAllocationSummaryProps) {
    const allocation = computeContributionAllocation(children);

    if (allocation.childCount === 0) return null;

    const sumLabel = `${allocation.allocated}%`;
    const remainingLabel = `${allocation.remaining}%`;

    if (variant === "compact") {
        return (
            <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
                <Badge
                    variant="outline"
                    className={cn(
                        "py-0 h-4 text-[10px]",
                        allocation.isComplete
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-violet-50 text-violet-800 border-violet-200"
                    )}
                >
                    Children: {sumLabel} / {allocation.target}%
                </Badge>
                {!allocation.isComplete && (
                    <Badge variant="outline" className="py-0 h-4 text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                        Remaining: {remainingLabel}
                    </Badge>
                )}
                {allocation.missingCount > 0 && (
                    <Badge variant="outline" className="py-0 h-4 text-[10px] bg-red-50 text-red-700 border-red-200">
                        {allocation.missingCount} missing
                    </Badge>
                )}
                {canDistribute && onDistributeEqually && allocation.childCount > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        disabled={isDistributing}
                        onClick={(event) => {
                            event.stopPropagation();
                            onDistributeEqually();
                        }}
                    >
                        Split equally
                    </Button>
                )}
            </div>
        );
    }

    if (variant === "table") {
        return (
            <div className={cn("space-y-1 text-[11px] text-muted-foreground", className)}>
                <p>
                    {CONTRIBUTION_FIELD_LABEL} allocated:{" "}
                    <span
                        className={cn(
                            "font-medium",
                            allocation.isComplete ? "text-emerald-800" : "text-violet-800"
                        )}
                    >
                        {sumLabel}
                    </span>
                    <span className="text-gray-400"> / {allocation.target}%</span>
                </p>
                {!allocation.isComplete && (
                    <p>
                        Remaining: <span className="font-medium text-amber-800">{remainingLabel}</span>
                    </p>
                )}
                {canDistribute && onDistributeEqually && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        disabled={isDistributing}
                        onClick={(event) => {
                            event.stopPropagation();
                            onDistributeEqually();
                        }}
                    >
                        Split equally
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-2.5",
                className
            )}
        >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 mb-2">
                Child {CONTRIBUTION_FIELD_LABEL.toLowerCase()} allocation
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
                <div>
                    <p className="text-[10px] text-violet-700/90">Allocated</p>
                    <p className="font-semibold text-violet-950">{sumLabel}</p>
                </div>
                <div>
                    <p className="text-[10px] text-amber-700/90">Remaining</p>
                    <p className="font-semibold text-amber-950">{remainingLabel}</p>
                </div>
                <div>
                    <p className="text-[10px] text-slate-600">Children</p>
                    <p className="font-semibold text-slate-900">{allocation.childCount}</p>
                </div>
            </div>
            {canDistribute && onDistributeEqually && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8"
                    disabled={isDistributing}
                    onClick={onDistributeEqually}
                >
                    Split equally among children
                </Button>
            )}
        </div>
    );
}
