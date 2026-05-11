"use client";

import React, { useState } from "react";
import { useGetStructureByIdQuery } from "@/redux/api/structureApi";
import { Building, Users, Shield, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import UserTable from "@/features/user-management/UserTable";
import PermissionGroupList from "../template/component/permissionGroupList/PermissionGroupList";
import { Badge } from "@/components/ui/badge";
import { formatStatus } from "@/utils/statusFormatter";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionButton } from "@/types/tableLayout";
import Link from "next/link";

interface StructureDetailProps {
    id: string;
}

type TabType = "users" | "permission_groups";

export default function StructureDetail({ id }: StructureDetailProps) {
    const router = useRouter();
    const { data: structure, isLoading, isError } = useGetStructureByIdQuery(id);
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
            label: "Permission Groups",
            icon: <Shield className="h-4 w-4" />,
            variant: activeTab === "permission_groups" ? "default" : "outline",
            onClick: () => setActiveTab("permission_groups"),
        },
    ];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
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
                <p className="text-gray-500">Failed to load structure details.</p>
                <Button variant="link" onClick={() => router.push("/structures")}>
                    Back to List
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-golden-soft/20 rounded-xl">
                        <Building className="h-8 w-8 text-golden-dark" />
                    </div>
                    <div className="space-y-1">
                        {/* Breadcrumb */}
                        <nav className="flex items-center space-x-1 text-sm text-gray-400">
                            <Link 
                                href="/structures" 
                                className="hover:text-golden-dark transition-colors"
                            >
                                Structure Hierarchy
                            </Link>
                            {structure.parent && (
                                <>
                                    <span className="text-gray-300">/</span>
                                    <Link 
                                        href={`/structures/${structure.parent_id}`}
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
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                            Level {structure.level} • Structure
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeTab === "users" && (
                <UserTable
                    structure_id={id}
                    sideActions={sideActions}
                />
            )}


            {activeTab === "permission_groups" && (
                <PermissionGroupList
                    structure_id={id}
                    hideLayout={true}
                    sideActions={sideActions}
                />
            )}
        </div>
    );
}