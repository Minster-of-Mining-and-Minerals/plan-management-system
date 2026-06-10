"use client";

import { cn } from "@/lib/utils";

interface PlanNodeHierarchyNumberProps {
    value: string;
    className?: string;
    size?: "sm" | "md" | "lg";
}

function depthFromNumber(value: string): number {
    return value.split(".").length;
}

export function PlanNodeHierarchyNumber({
    value,
    className,
    size = "md",
}: PlanNodeHierarchyNumberProps) {
    const depth = depthFromNumber(value);

    return (
        <span
            className={cn(
                "inline-flex items-center justify-center shrink-0 font-mono font-semibold tabular-nums tracking-tight",
                "rounded-md border shadow-sm",
                depth === 1 &&
                    "bg-primary/10 text-primary border-primary/20",
                depth === 2 &&
                    "bg-sky-50 text-sky-800 border-sky-200/80",
                depth >= 3 &&
                    "bg-slate-50 text-slate-700 border-slate-200/80",
                size === "sm" && "text-[10px] px-1.5 py-0.5 min-h-[1.25rem]",
                size === "md" && "text-xs px-2 py-0.5 min-h-[1.375rem]",
                size === "lg" && "text-sm px-2.5 py-1 min-h-[1.625rem]",
                className
            )}
            title={`Outline ${value}`}
        >
            {value}
        </span>
    );
}
