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
    useGetInternalStructuresQuery,
    useDeleteInternalStructureMutation
} from "@/redux/api/internalStructureApi";
import { InternalStructure } from "@/redux/types/internalStructure";
import { formatStatus } from "@/utils/statusFormatter";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CreateInternalStructureModal } from "./modals/CreateInternalStructureModal";
import InternalHierarchyD3Tree from "./InternalStructureHierarchy";
import { matchesActiveInactiveFilter } from "@/utils/tableUtils";

export interface InternalStructureTableProps {
    sideActions?: ActionButton[];
    forced_government_structure_id?: string;
    forced_parent_id?: string;
    hideLayout?: boolean;
}

export default function InternalStructureTable({ forced_government_structure_id, forced_parent_id, hideLayout = false, sideActions }: InternalStructureTableProps) {
    const [toggleHierarchyView, setToggleHierarchyView] = useState(false);
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();

    const [statusFilter, setStatusFilter] = useState("");

    const [deleteStructure] = useDeleteInternalStructureMutation();
    const [selectedStructure, setSelectedStructure] = useState<InternalStructure | null>(null);
    const [initialParentId, setInitialParentId] = useState<string | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);

    const columns: ColumnDef<InternalStructure>[] = [
        {
            accessorKey: "name",
            header: "Department Name",
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
            header: "Parent Department",
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
                        onClick={() => router.push(`/internal-structures/${row.original.internal_structure_id}`)}
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
                            setInitialParentId(row.original.internal_structure_id);
                            setModalOpen(true);
                        }}
                        variant="ghost"
                        size="icon"
                        title="Add Child"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => handleDelete(row.original.internal_structure_id)}
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
    } = useGetInternalStructuresQuery({
        search: searchQuery,
        government_structure_id: forced_government_structure_id || userGovId,
        parent_id: forced_parent_id,
    });

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this department?")) {
            try {
                await deleteStructure(id).unwrap();
                toast.success("Department deleted successfully");
            } catch (err) {
                toast.error("Failed to delete department");
            }
        }
    };

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
            label: forced_parent_id ? "Add Child" : "Add Department",
            icon: <Plus className="h-4 w-4" />,
            variant: "default",
            onClick: () => {
                setSelectedStructure(null);
                setInitialParentId(forced_parent_id || null);
                setModalOpen(true);
            },
        },
    ];

    const filteredData = structures.filter((item) =>
        matchesActiveInactiveFilter(statusFilter, item.is_active)
    );

    return (
        <>
            <TableLayout
                title={hideLayout ? undefined : "Departments"}
                description={hideLayout ? undefined : "Manage departmental hierarchy and organization"}
                actions={actions}
                sideActions={sideActions}
                filters={filters}
                filterColumnsPerRow={1}
                showToggleHierarchyNode={true}
                toggleHierarchyNode={toggleHierarchyView}
                setToggleHierarchyNode={setToggleHierarchyView}
            >
                {!toggleHierarchyView ? (<DataTable
                    columns={columns}
                    data={filteredData}
                    isLoading={isLoading}
                    resetKey={`${searchQuery}-${statusFilter}-${toggleHierarchyView}-${forced_government_structure_id}-${forced_parent_id}`}
                />) : (
                    <InternalHierarchyD3Tree
                        data={filteredData}
                        type="internal"
                        governmentStructureId={forced_government_structure_id}
                    />
                )}
            </TableLayout>
            {isModalOpen && (
                <CreateInternalStructureModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedStructure(null);
                        setInitialParentId(null);
                    }}
                    structure={selectedStructure}
                    initialParentId={initialParentId}
                    forcedGovernmentStructureId={forced_government_structure_id}
                />
            )}
        </>
    );
}
