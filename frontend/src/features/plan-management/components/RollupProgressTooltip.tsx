"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlanNode, PlanNodeHierarchy, PlanRule } from "@/redux/types/plan";
import { buildRollupTooltipLines } from "@/utils/planRuleUtils";
import { cn } from "@/lib/utils";

interface RollupProgressTooltipProps {
    rule?: PlanRule | null;
    node: PlanNode | PlanNodeHierarchy;
    childrenNodes?: PlanNode[] | PlanNodeHierarchy[];
    enabled?: boolean;
    className?: string;
    children: ReactNode;
}

export function RollupProgressTooltip({
    rule,
    node,
    childrenNodes = [],
    enabled = true,
    className,
    children,
}: RollupProgressTooltipProps) {
    const activeChildren = childrenNodes.filter((child) => child.is_active !== false);
    const lines = buildRollupTooltipLines(rule, node, activeChildren as PlanNode[]);

    if (!enabled || activeChildren.length === 0 || lines.length === 0) {
        return <>{children}</>;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className={cn("inline-flex items-center gap-1", className)}>{children}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-left whitespace-pre-line p-3">
                <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-80" />
                    <div className="space-y-1">
                        {lines.map((line) => (
                            <p key={line}>{line}</p>
                        ))}
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
