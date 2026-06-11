"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Trash, RotateCcw } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import {
    useGetInternalStructuresQuery,
    useDeleteInternalStructureMutation,
    useReactivateInternalStructureMutation,
} from "@/redux/api/internalStructureApi";
import { InternalStructure } from "@/redux/types/internalStructure";
import { formatStatus } from "@/utils/statusFormatter";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { actionFeedback } from "@/components/action-feedback";
import { CreateInternalStructureModal } from "./modals/CreateInternalStructureModal";
import InternalHierarchyD3Tree from "./InternalStructureHierarchy";
import { matchesActiveInactiveFilter } from "@/utils/tableUtils";
import { isStructureActive } from "@/utils/structureUtils";
import { usePermissions } from "@/hooks/usePermissions";

export interface InternalStructureTableProps {
    sideActions?: ActionButton[];
    forced_government_structure_id?: string;
    forced_parent_id?: string;
    hideLayout?: boolean;
    readOnly?: boolean;
}

export default function InternalStructureTable({
    forced_government_structure_id,
    forced_parent_id,
    hideLayout = false,
    sideActions,
    readOnly = false,
}: InternalStructureTableProps) {
    const [toggleHierarchyView, setToggleHierarchyView] = useState(false);
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();

    const [statusFilter, setStatusFilter] = useState("");

    const [deleteStructure] = useDeleteInternalStructureMutation();
    const [reactivateStructure] = useReactivateInternalStructureMutation();
    const { can } = usePermissions();
    const canUpdate = can("INTERNAL_STRUCTURES:UPDATE");
    const canDelete = can("INTERNAL_STRUCTURES:DELETE");
    const [selectedStructure, setSelectedStructure] = useState<InternalStructure | null>(null);
    const [initialParentId, setInitialParentId] = useState<string | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);

    const { data: session } = useSession();
    const userGovId = (session?.user?.government_structure && !Array.isArray(session.user.government_structure))
        ? session.user.government_structure.government_structure_id
        : undefined;

    const {
        data: structures = [],
        isLoading,
        refetch,
    } = useGetInternalStructuresQuery({
        search: searchQuery,
        government_structure_id: forced_government_structure_id || userGovId,
        parent_id: forced_parent_id,
    });

    const handleDelete = async (id: string) => {
        if (await actionFeedback.confirm("Are you sure you want to deactivate this department?", { destructive: true })) {
            try {
                await deleteStructure(id).unwrap();
                await refetch();
                actionFeedback.success("Department deactivated successfully");
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                actionFeedback.error(error.data?.message || "Failed to deactivate department");
            }
        }
    };

    const handleReactivate = async (id: string) => {
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
                const isActive = isStructureActive(row.original.is_active);
                return (
                    <ActiveStatusBadge isActive={isActive} />
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const isActive = isStructureActive(row.original.is_active);
                const canModify = !readOnly && isActive && canUpdate;
                const canDeactivate = !readOnly && isActive && canDelete;
                const canReactivate = !readOnly && !isActive && canUpdate;
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            onClick={() => router.push(`/internal-structures/${row.original.internal_structure_id}`)}
                            variant="ghost"
                            size="icon"
                            title="View Details"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        {canModify && (
                            <>
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
                            </>
                        )}
                        {canDeactivate && (
                            <Button
                                onClick={() => handleDelete(row.original.internal_structure_id)}
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700"
                                title="Deactivate"
                            >
                                <Trash className="h-4 w-4" />
                            </Button>
                        )}
                        {canReactivate && (
                            <Button
                                onClick={() => handleReactivate(row.original.internal_structure_id)}
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-800"
                                title="Reactivate"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            },
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

    // Actions
    const actions: ActionButton[] = readOnly
        ? []
        : [
            {
                label: forced_parent_id ? "Add Child" : "Add Department",
                icon: <Plus className="h-4 w-4" />,
                variant: "default",
                permissions: ["INTERNAL_STRUCTURES:CREATE"],
                onClick: () => {
                    setSelectedStructure(null);
                    setInitialParentId(forced_parent_id || null);
                    setModalOpen(true);
                },
            },
        ];

    const filteredData = structures.filter((item) =>
        matchesActiveInactiveFilter(statusFilter, isStructureActive(item.is_active))
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
