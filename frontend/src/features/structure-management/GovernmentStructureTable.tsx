"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Trash } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import {
    useGetGovernmentStructuresQuery,
    useDeleteGovernmentStructureMutation
} from "@/redux/api/governmentStructureApi";
import { GovernmentStructure } from "@/redux/types/governmentStructure";
import { formatStatus } from "@/utils/statusFormatter";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CreateGovernmentStructureModal } from "./modals/CreateGovernmentStructureModal";
import GovernmentHierarchyD3Tree from "./GovernmentStructureHierarchy";

export default function GovernmentStructureTable() {
    const [toggleHierarchyView, setToggleHierarchyView] = useState(false);
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();

    // Pagination states
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [deleteStructure] = useDeleteGovernmentStructureMutation();
    const [selectedStructure, setSelectedStructure] = useState<GovernmentStructure | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);

    const columns: ColumnDef<GovernmentStructure>[] = [
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
                <div className="flex items-center gap-1">
                    <Button
                        onClick={() => router.push(`/structures/government/${row.original.government_structure_id}`)}
                        variant="ghost"
                        size="icon"
                        title="View Details"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => {
                            setSelectedStructure(row.original);
                            setModalOpen(true);
                        }}
                        variant="ghost"
                        size="icon"
                        title="Edit"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => handleDelete(row.original.government_structure_id)}
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const { data: session } = useSession();
    const userGovId = (session?.user?.government_structure && !Array.isArray(session.user.government_structure))
        ? session.user.government_structure.government_structure_id
        : undefined;

    const {
        data: structures = [],
        isLoading,
        isError,
        refetch,
    } = useGetGovernmentStructuresQuery({
        search: searchQuery,
        parent_id: userGovId,
    });

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to deactivate this structure?")) {
            try {
                await deleteStructure(id).unwrap();
                toast.success("Structure deactivated successfully");
            } catch (err) {
                toast.error("Failed to deactivate structure");
            }
        }
    };

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

    // Actions
    const actions: ActionButton[] = [
        {
            label: "New Structure",
            icon: <Plus className="h-4 w-4" />,
            variant: "default",
            onClick: () => {
                setSelectedStructure(null);
                setModalOpen(true);
            },
        },
    ];

    const filteredData = structures.filter((item) => {
        if (statusFilter === "active") return item.is_active === true;
        if (statusFilter === "inactive") return item.is_active === false;
        return true;
    });

    return (
        <>
            <TableLayout
                title="Government Structure"
                description="Manage government organizational hierarchy and structures"
                actions={actions}
                filters={filters}
                filterColumnsPerRow={1}
                showToggleHierarchyNode={true}
                toggleHierarchyNode={toggleHierarchyView}
                setToggleHierarchyNode={setToggleHierarchyView}
            >
                {!toggleHierarchyView ? (
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        totalPageCount={Math.ceil(filteredData.length / pageSize)}
                        handlePagination={handlePagination}
                        tablePageSize={pageSize}
                        currentIndex={pageIndex}
                    />
                ) : (
                    <GovernmentHierarchyD3Tree data={filteredData} type="government" />
                )}
            </TableLayout>
            <CreateGovernmentStructureModal
                isOpen={isModalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedStructure(null);
                }}
                structure={selectedStructure}
            />
        </>
    );
}
