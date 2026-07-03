"use client";

import { Badge } from "@/components/ui/badge";
import { formatNodeContribution } from "@/utils/planRuleUtils";
import { cn } from "@/lib/utils";

interface PlanNodeContributionBadgeProps {
    contributionWeight?: number | null;
    className?: string;
    missing?: boolean;
}

export function PlanNodeContributionBadge({
    contributionWeight,
    className,
    missing = false,
}: PlanNodeContributionBadgeProps) {
    const value = Number(contributionWeight) || 0;
    const label =
        value > 0 ? formatNodeContribution(value) : missing ? "Contribution: required" : "";

    if (!label) return null;

    return (
        <Badge
            variant="secondary"
            className={cn(
                "text-[10px] py-0 h-4 shrink-0 border",
                missing
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-violet-50 text-violet-800 border-violet-100",
                className
            )}
        >
            {label}
        </Badge>
    );
}
