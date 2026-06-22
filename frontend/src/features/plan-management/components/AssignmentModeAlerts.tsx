"use client";

import { PlanNodeAssignmentOptions } from "@/redux/types/plan";
import { cn } from "@/lib/utils";

interface AssignmentModeAlertsProps {
    options?: PlanNodeAssignmentOptions | null;
    className?: string;
}

export function AssignmentModeAlerts({ options, className }: AssignmentModeAlertsProps) {
    if (!options) return null;

    const isExclusive = options.assignment_sharing_mode === "exclusive";
    const hasActiveAssignment = (options.active_assignment_count ?? 0) > 0;

    return (
        <div className={cn("space-y-3", className)}>
            {isExclusive && hasActiveAssignment ? (
                <p className="break-words rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    Exclusive mode: assigning a new target will replace the current active assignment.
                    Previous assignments are kept in history.
                </p>
            ) : null}

            {options.assignment_sharing_mode === "shared" ? (
                <p className="break-words rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Shared mode: this node can hold multiple active assignments. Sharing mode is
                    independent of the parent node.
                </p>
            ) : null}

            {options.message && options.can_assign ? (
                <p className="break-words rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {options.message}
                </p>
            ) : null}
        </div>
    );
}
