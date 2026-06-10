"use client";

import React, { useState } from "react";
import { useGetInternalStructureByIdQuery, useReactivateInternalStructureMutation } from "@/redux/api/internalStructureApi";
import { Building, Users, Layers, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import UserTable from "@/features/user-management/UserTable";
import { Badge } from "@/components/ui/badge";
import { formatStatus } from "@/utils/statusFormatter";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import InternalStructureTable from "./InternalStructureTable";
import { ActionButton } from "@/types/tableLayout";
import { isStructureActive } from "@/utils/structureUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { actionFeedback } from "@/components/action-feedback";

interface InternalStructureDetailProps {
    id: string;
}

type TabType = "users" | "child_structures";

export default function InternalStructureDetail({ id }: InternalStructureDetailProps) {
    const router = useRouter();
    const { data: structure, isLoading, isError, refetch } = useGetInternalStructureByIdQuery(id);
    const [reactivateStructure, { isLoading: isReactivating }] = useReactivateInternalStructureMutation();
    const { can } = usePermissions();
    const canReactivate = can("INTERNAL_STRUCTURES:UPDATE");
    const [activeTab, setActiveTab] = useState<TabType>("users");

    // 🔹 Side Actions (replaces Tabs)
    const sideActions: ActionButton[] = [
        {
            label: "Users",
            icon: <Users className="h-4 w-4" />,
            variant: activeTab === "users" ? "default" : "outline",
            onClick: () => setActiveTab("users"),
        },
        {
            label: "Child Departments",
            icon: <Layers className="h-4 w-4" />,
            variant: activeTab === "child_structures" ? "default" : "outline",
            onClick: () => setActiveTab("child_structures"),
        },
    ];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4 bg-white p-6 rounded-lg border shadow-sm">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    if (isError || !structure) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-red-600">Error</h2>
                <p className="text-gray-500">Failed to load department details.</p>
                <Button variant="link" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        );
    }

    const isReadOnly =
        !isStructureActive(structure.is_active) ||
        !isStructureActive(structure.governmentStructure?.is_active);
    const isDepartmentInactive = !isStructureActive(structure.is_active);
    const canReactivateDepartment =
        canReactivate &&
        isDepartmentInactive &&
        isStructureActive(structure.governmentStructure?.is_active);

    const handleReactivate = async () => {
        if (await actionFeedback.confirm("Reactivate this department? Child departments stay inactive until reactivated individually.")) {
            try {
                await reactivateStructure(id).unwrap();
                await refetch();
                actionFeedback.success("Department reactivated successfully");
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                actionFeedback.error(error.data?.message || "Failed to reactivate department");
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-6 bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-golden-soft/20 rounded-xl">
                            <Layers className="h-8 w-8 text-golden-dark" />
                        </div>
                        <div className="space-y-1">
                            {/* Breadcrumb */}
                            <nav className="flex items-center space-x-1 text-sm text-gray-400">
                                <Link 
                                    href={`/government-structures/${structure.government_structure_id}`}
                                    className="hover:text-golden-dark transition-colors"
                                >
                                    Sector Structures
                                </Link>
                                {structure.governmentStructure && (
                                    <>
                                        <span className="text-gray-300">/</span>
                                        <Link 
                                            href={`/government-structures/${structure.government_structure_id}`}
                                            className="hover:text-golden-dark transition-colors flex items-center gap-1"
                                        >
                                            {structure.governmentStructure.name}
                                        </Link>
                                    </>
                                )}
                                {structure.parent && (
                                    <>
                                        <span className="text-gray-300">/</span>
                                        <Link 
                                            href={`/internal-structures/${structure.parent_id}`}
                                            className="hover:text-golden-dark transition-colors"
                                        >
                                            {structure.parent.name}
                                        </Link>
                                    </>
                                )}
                            </nav>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{structure.name}</h1>
                                <Badge variant={isReadOnly ? "secondary" : "default"}>
                                    {formatStatus(isReadOnly ? "Inactive" : "Active")}
                                </Badge>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">
                                LEVEL {structure.level} • DEPARTMENT
                            </p>
                            {isReadOnly && (
                                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                                    {isDepartmentInactive
                                        ? "This department is deactivated. You can view data only — changes are not allowed."
                                        : "This department belongs to a deactivated sector. You can view data only — changes are not allowed."}
                                    {canReactivateDepartment && " Use Reactivate to restore it."}
                                </p>
                            )}
                        </div>
                    </div>
                    {canReactivateDepartment && (
                        <Button
                            onClick={handleReactivate}
                            disabled={isReactivating}
                            className="shrink-0"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reactivate Department
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            {activeTab === "users" && (
                <UserTable 
                    internal_structure_node_id={id} 
                    sideActions={sideActions}
                    readOnly={isReadOnly}
                />
            )}

            {activeTab === "child_structures" && (
                <InternalStructureTable 
                    forced_government_structure_id={structure.government_structure_id}
                    forced_parent_id={id} 
                    hideLayout={true} 
                    sideActions={sideActions}
                    readOnly={isReadOnly}
                />
            )}
        </div>
    );
}
