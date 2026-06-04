"use client";

import React, { useState } from "react";
import { useGetInternalStructureByIdQuery } from "@/redux/api/internalStructureApi";
import { Building, Users, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import UserTable from "@/features/user-management/UserTable";
import { Badge } from "@/components/ui/badge";
import { formatStatus } from "@/utils/statusFormatter";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import InternalStructureTable from "./InternalStructureTable";
import { ActionButton } from "@/types/tableLayout";

interface InternalStructureDetailProps {
    id: string;
}

type TabType = "users" | "child_structures";

export default function InternalStructureDetail({ id }: InternalStructureDetailProps) {
    const router = useRouter();
    const { data: structure, isLoading, isError } = useGetInternalStructureByIdQuery(id);
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
                                <Badge variant={structure.is_active ? "default" : "secondary"}>
                                    {formatStatus(structure.is_active ? "Active" : "Inactive")}
                                </Badge>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">
                                LEVEL {structure.level} • DEPARTMENT
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeTab === "users" && (
                <UserTable 
                    internal_structure_node_id={id} 
                    sideActions={sideActions}
                />
            )}

            {activeTab === "child_structures" && (
                <InternalStructureTable 
                    forced_government_structure_id={structure.government_structure_id}
                    forced_parent_id={id} 
                    hideLayout={true} 
                    sideActions={sideActions}
                />
            )}
        </div>
    );
}
