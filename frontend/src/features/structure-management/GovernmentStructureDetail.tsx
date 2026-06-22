"use client";

import React, { useState } from "react";
import { useGetGovernmentStructureByIdQuery, useReactivateGovernmentStructureMutation } from "@/redux/api/governmentStructureApi";
import { Building, Users, Shield, Layers, RotateCcw, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import UserTable from "@/features/user-management/UserTable";
import InternalStructureTable from "./InternalStructureTable";
import PermissionGroupList from "../template/component/permissionGroupList/PermissionGroupList";
import RoleList from "../template/component/roleList/roleList";
import { withStructureQuery } from "@/utils/structureQueryUtils";
import { Badge } from "@/components/ui/badge";
import { formatStatus } from "@/utils/statusFormatter";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionButton } from "@/types/tableLayout";
import Link from "next/link";
import { isStructureActive } from "@/utils/structureUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { actionFeedback } from "@/components/action-feedback";

interface GovernmentStructureDetailProps {
    id: string;
}

type TabType = "users" | "roles" | "internal_structures" | "permission_groups";

export default function GovernmentStructureDetail({ id }: GovernmentStructureDetailProps) {
    const router = useRouter();
    const { data: structure, isLoading, isError, refetch } = useGetGovernmentStructureByIdQuery(id);
    const [reactivateStructure, { isLoading: isReactivating }] = useReactivateGovernmentStructureMutation();
    const { can } = usePermissions();
    const canReactivate = can("GOVERNMENT_STRUCTURES:UPDATE");
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
            label: "Roles",
            icon: <KeyRound className="h-4 w-4" />,
            variant: activeTab === "roles" ? "default" : "outline",
            onClick: () => setActiveTab("roles"),
        },
        {
            label: "Departments",
            icon: <Layers className="h-4 w-4" />,
            variant: activeTab === "internal_structures" ? "default" : "outline",
            onClick: () => setActiveTab("internal_structures"),
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
                <p className="text-gray-500">Failed to load sector structure details.</p>
                <Button variant="link" onClick={() => router.push("/government-structures")}>
                    Back to List
                </Button>
            </div>
        );
    }

    const isReadOnly = !isStructureActive(structure.is_active);

    const handleReactivate = async () => {
        if (await actionFeedback.confirm("Reactivate this sector? Child sectors stay inactive until reactivated individually.")) {
            try {
                await reactivateStructure(id).unwrap();
                await refetch();
                actionFeedback.success("Sector reactivated successfully");
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                actionFeedback.error(error.data?.message || "Failed to reactivate sector");
            }
        }
    };

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
                                href="/government-structures" 
                                className="hover:text-golden-dark transition-colors"
                            >
                                Sector Structures
                            </Link>
                            {structure.parent && (
                                <>
                                    <span className="text-gray-300">/</span>
                                    <Link 
                                        href={`/government-structures/${structure.parent_id}`}
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
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                            Level {structure.level} • Sector
                        </p>
                        {isReadOnly && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                                This sector is deactivated. You can view data only — changes are not allowed.
                                {canReactivate && " Use Reactivate to restore it."}
                            </p>
                        )}
                    </div>
                </div>
                {isReadOnly && canReactivate && (
                    <Button
                        onClick={handleReactivate}
                        disabled={isReactivating}
                        className="shrink-0"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reactivate Sector
                    </Button>
                )}
                {!isReadOnly && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <Button variant="outline" asChild>
                            <Link href={withStructureQuery("/users/list", id)}>
                                All Users
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={withStructureQuery("/users/roles", id)}>
                                All Roles
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            {activeTab === "users" && (
                <UserTable
                    government_structure_node_id={id}
                    sideActions={sideActions}
                    readOnly={isReadOnly}
                />
            )}

            {activeTab === "roles" && (
                <RoleList
                    government_structure_id={id}
                    hideLayout
                    sideActions={sideActions}
                    readOnly={isReadOnly}
                />
            )}

            {activeTab === "internal_structures" && (
                <InternalStructureTable
                    forced_government_structure_id={id}
                    hideLayout={true}
                    sideActions={sideActions}
                    readOnly={isReadOnly}
                />
            )}

            {activeTab === "permission_groups" && (
                <PermissionGroupList
                    government_structure_id={id}
                    hideLayout={true}
                    sideActions={sideActions}
                    readOnly={isReadOnly}
                />
            )}
        </div>
    );
}