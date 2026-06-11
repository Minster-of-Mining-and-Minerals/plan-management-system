"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import { GovernmentStructure } from "@/redux/types/governmentStructure";
import { formatStatus } from "@/utils/statusFormatter";
import { useRouter } from "next/navigation";
import { useRemoveStructureFromGroupMutation } from "@/redux/api/permissionGroupApi";
import { actionFeedback } from "@/components/action-feedback";
import { useSearchParams } from "next/navigation";
import { matchesActiveInactiveFilter, matchesSearchQuery } from "@/utils/tableUtils";

export interface GovernmentStructuresGroupListProps {
    sideActions?: ActionButton[];
    actions?: ActionButton[];
    structures: GovernmentStructure[];
    groupId?: string;
    isLoading?: boolean;
}

export default function GovernmentStructuresGroupList({ sideActions, actions, structures, groupId, isLoading }: GovernmentStructuresGroupListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const [statusFilter, setStatusFilter] = useState("");

    const [removeStructure, { isLoading: isRemoving }] = useRemoveStructureFromGroupMutation();

    const handleRemove = async (structureId: string) => {
        if (!groupId) return;
        if (await actionFeedback.confirm("Are you sure you want to remove this sector from the group?", { destructive: true })) {
            try {
                await removeStructure({ permission_group_id: groupId, government_structure_id: structureId }).unwrap();
                actionFeedback.success("Sector removed from group");
            } catch (err: any) {
                actionFeedback.error(err?.data?.message || "Failed to remove sector");
            }
        }
    };

    const columns: ColumnDef<GovernmentStructure>[] = [
        {
            accessorKey: "name",
            header: "Sector Name",
            cell: ({ row }) => (
                <span className="font-medium text-primary">
                    {row.getValue("name")}
                </span>
            ),
        },
        {
            accessorKey: "level",
            header: "Level",
            cell: ({ row }) => <div>Level {row.getValue("level")}</div>,
        },
        {
            accessorKey: "parent",
            header: "Parent Sector",
            cell: ({ row }) => (
                <div className="text-gray-500 italic">
                    {row.original.parent?.name || "N/A"}
                </div>
            ),
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.getValue("is_active") as boolean;
                return (
                    <ActiveStatusBadge isActive={isActive} />
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => router.push(`/structures/government/${row.original.government_structure_id}`)}
                        variant="ghost"
                        size="icon"
                        title="View Details"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {groupId && (
                        <Button
                            onClick={() => handleRemove(row.original.government_structure_id)}
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Remove from Group"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const filters: FilterField[] = [
        {
            key: "status",
            label: "Status",
            type: "multiselect",
            placeholder: "Select status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ],
        },
    ];

    const filteredData = structures.filter((item) => {
        if (!matchesActiveInactiveFilter(statusFilter, item.is_active)) return false;
        return matchesSearchQuery(searchQuery, [item.name]);
    });

    return (
        <div className="w-full">
            <TableLayout
                actions={actions}
                sideActions={sideActions}
                filters={filters}
                filterColumnsPerRow={1}
            >
                <DataTable
                    columns={columns}
                    data={filteredData}
                    isLoading={isLoading || isRemoving}
                    resetKey={`${searchQuery}-${statusFilter}-${groupId}-${structures.length}`}
                />
            </TableLayout>
        </div>
    );
} 
