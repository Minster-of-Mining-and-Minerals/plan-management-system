"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanNodeOrderControlsProps {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    disabled?: boolean;
    size?: "sm" | "md";
    className?: string;
}

export function PlanNodeOrderControls({
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    disabled = false,
    size = "md",
    className,
}: PlanNodeOrderControlsProps) {
    const iconClass = size === "sm" ? "h-7 w-7" : "h-8 w-8";
    const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

    return (
        <div
            className={cn("flex items-center gap-0.5", className)}
            onClick={(e) => e.stopPropagation()}
        >
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(iconClass, "text-gray-500 hover:text-gray-800")}
                title="Move up"
                disabled={disabled || !canMoveUp}
                onClick={onMoveUp}
            >
                <ArrowUp className={iconSize} />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(iconClass, "text-gray-500 hover:text-gray-800")}
                title="Move down"
                disabled={disabled || !canMoveDown}
                onClick={onMoveDown}
            >
                <ArrowDown className={iconSize} />
            </Button>
        </div>
    );
}
