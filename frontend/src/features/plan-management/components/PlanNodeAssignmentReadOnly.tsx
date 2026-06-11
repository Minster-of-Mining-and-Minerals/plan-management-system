"use client";

import type { ReactNode } from "react";
import { Building, Building2, User as UserIcon } from "lucide-react";
import { ExternalAssignment, InternalAssignment } from "@/redux/types/plan";
import { cn } from "@/lib/utils";

interface PlanNodeAssignmentReadOnlyProps {
    internalAssignments: InternalAssignment[];
    externalAssignments: ExternalAssignment[];
    isExternalMode: boolean;
    isLoading?: boolean;
    className?: string;
}

function AssignmentRow({
    icon,
    label,
    name,
}: {
    icon: ReactNode;
    label: string;
    name: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
            <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-primary border border-gray-100 shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {label}
                </p>
                <p className="font-semibold text-gray-900 truncate">{name}</p>
            </div>
        </div>
    );
}

export function PlanNodeAssignmentReadOnly({
    internalAssignments,
    externalAssignments,
    isExternalMode,
    isLoading = false,
    className,
}: PlanNodeAssignmentReadOnlyProps) {
    const activeInternal = internalAssignments.filter((item) => item.is_active);
    const activeExternal = externalAssignments.filter((item) => item.is_active);

    const rows = isExternalMode
        ? activeExternal
              .map((assignment) => assignment.governmentStructure?.name)
              .filter((name): name is string => Boolean(name))
              .map((name) => ({ type: "sector" as const, name }))
        : activeInternal
              .map((assignment) => {
                  if (assignment.user?.full_name) {
                      return { type: "user" as const, name: assignment.user.full_name };
                  }
                  if (assignment.internalStructure?.name) {
                      return {
                          type: "department" as const,
                          name: assignment.internalStructure.name,
                      };
                  }
                  return null;
              })
              .filter(
                  (
                      item
                  ): item is { type: "department" | "user"; name: string } => item !== null
              );

    return (
        <div
            className={cn(
                "w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-100",
                className
            )}
        >
            <div className="mb-4 px-2">
                <h3 className="text-xl font-bold text-golden-dark">Assignments</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Assignments are finalized in the strategic plan draft. This view is read-only.
                </p>
            </div>

            {isLoading ? (
                <p className="px-2 text-sm text-muted-foreground">Loading assignments...</p>
            ) : rows.length === 0 ? (
                <p className="px-2 text-sm text-gray-400 italic">No assignments defined.</p>
            ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                    {rows.map((row, index) => (
                        <AssignmentRow
                            key={`${row.type}-${row.name}-${index}`}
                            icon={
                                row.type === "sector" ? (
                                    <Building2 className="h-4 w-4" />
                                ) : row.type === "department" ? (
                                    <Building className="h-4 w-4" />
                                ) : (
                                    <UserIcon className="h-4 w-4" />
                                )
                            }
                            label={
                                row.type === "sector"
                                    ? "Sector"
                                    : row.type === "department"
                                      ? "Department"
                                      : "User"
                            }
                            name={row.name}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
