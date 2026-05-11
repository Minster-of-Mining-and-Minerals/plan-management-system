"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import { Structure } from "@/redux/types/structure";
import { formatStatus } from "@/utils/statusFormatter";
import { useRouter } from "next/navigation";
import { useRemoveStructureFromGroupMutation } from "@/redux/api/permissionGroupApi";
import { toast } from "sonner";

export interface StructuresGroupListProps {
    sideActions?: ActionButton[];
    actions?: ActionButton[];
    structures: Structure[];
    groupId?: string;
    isLoading?: boolean;
}

export default function StructuresGroupList({ sideActions, actions, structures, groupId, isLoading }: StructuresGroupListProps) {
    const router = useRouter();

    // Pagination states
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [removeStructure, { isLoading: isRemoving }] = useRemoveStructureFromGroupMutation();

    const handleRemove = async (structureId: string) => {
        if (!groupId) return;
        if (confirm("Are you sure you want to remove this structure from the group?")) {
            try {
                await removeStructure({ permission_group_id: groupId, structure_id: structureId }).unwrap();
                toast.success("Structure removed from group");
            } catch (err: any) {
                toast.error(err?.data?.message || "Failed to remove structure");
            }
        }
    };

    const columns: ColumnDef<Structure>[] = [
        {
            accessorKey: "name",
            header: "Structure Name",
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
            header: "Parent Structure",
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
                    <Badge className="text-white" status={isActive ? "active" : "inactive"}>
                        {formatStatus(isActive ? "Active" : "Inactive")}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => router.push(`/structures/${row.original.structure_id}`)}
                        variant="ghost"
                        size="icon"
                        title="View Details"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {groupId && (
                        <Button
                            onClick={() => handleRemove(row.original.structure_id)}
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

    const handlePagination = (index: number, size: number) => {
        setPageIndex(index);
        setPageSize(size);
    };

    // Filters
    const [statusFilter, setStatusFilter] = useState("");

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
        if (statusFilter === "active") return item.is_active === true;
        if (statusFilter === "inactive") return item.is_active === false;
        return true;
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
                    totalPageCount={Math.ceil(filteredData.length / pageSize)}
                    handlePagination={handlePagination}
                    tablePageSize={pageSize}
                    currentIndex={pageIndex}
                    isLoading={isLoading || isRemoving}
                />
            </TableLayout>
        </div>
    );
} 
