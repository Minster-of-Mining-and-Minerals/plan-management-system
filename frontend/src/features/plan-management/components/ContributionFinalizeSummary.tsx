"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanNode, PlanRule } from "@/redux/types/plan";
import { findContributionAllocationIssues } from "@/utils/planRuleUtils";
import { cn } from "@/lib/utils";

interface ContributionFinalizeSummaryProps {
    nodes: PlanNode[];
    rule?: PlanRule | null;
    className?: string;
}

export function ContributionFinalizeSummary({
    nodes,
    rule,
    className,
}: ContributionFinalizeSummaryProps) {
    const issues = findContributionAllocationIssues(nodes, rule);
    const hasContributionLevels = (rule?.steps ?? []).some(
        (step) => step.requires_contribution_weight
    );

    if (!hasContributionLevels) return null;

    if (issues.length === 0) {
        return (
            <div
                className={cn(
                    "rounded-lg border border-violet-200 bg-violet-50/80 p-4 space-y-2",
                    className
                )}
            >
                <div className="flex items-center gap-2 text-violet-900 font-medium text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Contribution weights complete
                </div>
                <p className="text-xs text-violet-800">
                    All sibling groups at weighted levels sum to 100%.
                </p>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2",
                className
            )}
        >
            <div className="flex items-center gap-2 font-medium text-amber-900 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Contribution weights incomplete
            </div>
            <ul className="space-y-2 text-xs text-amber-900">
                {issues.map((issue) => (
                    <li key={issue.parentId} className="flex flex-wrap items-center gap-2">
                        <span>
                            <span className="font-medium">{issue.parentTitle}</span>: children sum
                            to {issue.sum}% (need 100%)
                            {issue.missingCount > 0
                                ? ` · ${issue.missingCount} child${issue.missingCount === 1 ? "" : "ren"} missing contribution`
                                : ""}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                            {issue.childCount} children
                        </Badge>
                    </li>
                ))}
            </ul>
        </div>
    );
}
