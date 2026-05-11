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
    useGetStructuresQuery,
    useDeleteStructureMutation
} from "@/redux/api/structureApi";
import { Structure } from "@/redux/types/structure";
import { formatStatus } from "@/utils/statusFormatter";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CreateStructureModal } from "./modals/CreateStructureModal";
import StructureHierarchyD3Tree from "./StructureHierarchy";

export default function StructureTable() {
    const [toggleHierarchyView, setToggleHierarchyView] = useState(false);
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();

    // Pagination states
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [deleteStructure] = useDeleteStructureMutation();
    const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);
    const [initialParentId, setInitialParentId] = useState<string | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);

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
                <div className="flex items-center gap-1">
                    <Button
                        onClick={() => router.push(`/structures/${row.original.structure_id}`)}
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
                        onClick={() => {
                            setSelectedStructure(null);
                            setInitialParentId(row.original.structure_id);
                            setModalOpen(true);
                        }}
                        variant="ghost"
                        size="icon"
                        title="Add Child"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => handleDelete(row.original.structure_id)}
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
    const userGovId = (session?.user?.structure && !Array.isArray(session.user.structure))
        ? session.user.structure.structure_id
        : undefined;

    const {
        data: structures = [],
        isLoading,
        isError,
        refetch,
    } = useGetStructuresQuery({
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
            label: "Add Structure",
            icon: <Plus className="h-4 w-4" />,
            variant: "default",
            onClick: () => {
                setSelectedStructure(null);
                setInitialParentId(null);
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
                title="Structure"
                description="Manage organizational hierarchy and structures"
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
                    <StructureHierarchyD3Tree data={filteredData} />
                )}
            </TableLayout>
            <CreateStructureModal
                isOpen={isModalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedStructure(null);
                    setInitialParentId(null);
                }}
                structure={selectedStructure}
                initialParentId={initialParentId}
            />
        </>
    );
}
