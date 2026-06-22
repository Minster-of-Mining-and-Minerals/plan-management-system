"use client";

import { MapPin, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanNodeAssignmentOptions } from "@/redux/types/plan";
import { cn } from "@/lib/utils";

interface PlanAssignmentScopeBannerProps {
    options?: PlanNodeAssignmentOptions | null;
    isLoading?: boolean;
    compact?: boolean;
    className?: string;
}

function formatAllowedTargets(options: PlanNodeAssignmentOptions): string {
    const targets: string[] = [];
    if (options.allow_sector) targets.push("Sectors");
    if (options.allow_department) targets.push("Departments");
    if (options.allow_user) targets.push("Users");
    if (options.allow_role) targets.push("Roles & Permission Groups");
    return targets.join(", ");
}

export function PlanAssignmentScopeBanner({
    options,
    isLoading = false,
    compact = false,
    className,
}: PlanAssignmentScopeBannerProps) {
    if (isLoading) {
        return <Skeleton className={cn("h-20 w-full rounded-xl", className)} />;
    }

    if (!options) {
        return null;
    }

    const allowedTargets = formatAllowedTargets(options);
    const scopeLabel =
        options.scope_label ||
        (options.assignment_mode === "external"
            ? "Plan sector and eligible child sectors"
            : null);

    return (
        <div
            className={cn(
                "rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white",
                compact ? "px-3 py-2.5" : "px-4 py-3",
                className
            )}
        >
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
                    <Target className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Assignment scope</p>

                    {scopeLabel ? (
                        <p className="flex items-start gap-1.5 text-sm text-slate-700">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="break-words">{scopeLabel}</span>
                        </p>
                    ) : null}

                    {allowedTargets ? (
                        <p className="text-xs text-slate-500">
                            Allowed targets: <span className="font-medium text-slate-700">{allowedTargets}</span>
                        </p>
                    ) : null}

                    {options.parent_context?.label ? (
                        <p className="text-xs text-slate-500">
                            Parent assignment:{" "}
                            <span className="font-medium text-slate-700">
                                {options.parent_context.label}
                            </span>{" "}
                            ({options.parent_context.type})
                        </p>
                    ) : null}

                    {!options.can_assign && options.message ? (
                        <p className="text-xs font-medium text-amber-700">{options.message}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
