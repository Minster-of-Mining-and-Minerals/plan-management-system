"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PlanDetailHeaderSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center gap-4", className)}>
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
                <div className="h-7 w-64 max-w-full rounded bg-muted animate-pulse" />
                <div className="h-4 w-48 max-w-full rounded bg-muted animate-pulse" />
                <div className="flex gap-2">
                    <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
                    <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                </div>
            </div>
        </div>
    );
}

interface PlanDetailLoadingPanelProps {
    variant?: "cards" | "hierarchy";
    count?: number;
    className?: string;
}

export function PlanDetailLoadingPanel({
    variant = "cards",
    count = 4,
    className,
}: PlanDetailLoadingPanelProps) {
    if (variant === "hierarchy") {
        return (
            <div className={cn("space-y-4", className)}>
                <div className="h-10 w-full max-w-xl rounded-lg bg-muted animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {Array.from({ length: count }, (_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-5 space-y-3">
                                <div className="h-10 w-10 rounded-xl bg-muted" />
                                <div className="h-5 w-3/4 rounded bg-muted" />
                                <div className="h-4 w-full rounded bg-muted" />
                                <div className="h-2 w-full rounded-full bg-muted" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "grid gap-4 sm:grid-cols-2",
                count > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3",
                className
            )}
        >
            {Array.from({ length: count }, (_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader>
                        <div className="h-5 w-24 rounded bg-muted" />
                        <div className="h-4 w-full rounded bg-muted mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-2 w-full rounded-full bg-muted" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function PlanDetailPanelShell({
    children,
    toolbar,
    className,
}: {
    children: ReactNode;
    toolbar?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden",
                className
            )}
        >
            {toolbar ? (
                <div className="flex items-center justify-end px-4 py-3 border-b border-gray-100">
                    {toolbar}
                </div>
            ) : null}
            <div className="p-4 sm:p-6 space-y-6">{children}</div>
        </div>
    );
}
