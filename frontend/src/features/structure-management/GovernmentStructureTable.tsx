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
    useGetGovernmentStructuresQuery,
    useDeleteGovernmentStructureMutation,
    useReactivateGovernmentStructureMutation,
} from "@/redux/api/governmentStructureApi";
import { GovernmentStructure } from "@/redux/types/governmentStructure";
import { CreateGovernmentStructureModal } from "./modals/CreateGovernmentStructureModal";
import GovernmentHierarchyD3Tree from "./GovernmentStructureHierarchy";
import { SectorLogo } from "@/components/common/SectorLogo";
import { useSearchParams, useRouter } from "next/navigation";
import { actionFeedback } from "@/components/action-feedback";
import { matchesActiveInactiveFilter } from "@/utils/tableUtils";
import { isStructureActive } from "@/utils/structureUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { useGovernmentStructureListParams } from "@/hooks/useGovernmentStructureListParams";
import { useStructureScope } from "@/hooks/useStructureScope";

export default function GovernmentStructureTable() {
    const [toggleHierarchyView, setToggleHierarchyView] = useState(false);
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();

    const [statusFilter, setStatusFilter] = useState("");

    const [deleteStructure] = useDeleteGovernmentStructureMutation();
    const [reactivateStructure] = useReactivateGovernmentStructureMutation();
    const { can } = usePermissions();
    const canUpdate = can("GOVERNMENT_STRUCTURES:UPDATE");
    const canDelete = can("GOVERNMENT_STRUCTURES:DELETE");
    const [selectedStructure, setSelectedStructure] = useState<GovernmentStructure | null>(null);
    const [initialParentId, setInitialParentId] = useState<string | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);

    const { isSuperAdmin } = useStructureScope();
    const listParams = useGovernmentStructureListParams({
        ...(searchQuery ? { search: searchQuery } : {}),
    });

    const {
        data: structures = [],
        isLoading,
        refetch,
    } = useGetGovernmentStructuresQuery(listParams.params, {
        skip: listParams.skip,
    });

    const handleDelete = async (id: string) => {
        if (await actionFeedback.confirm("Are you sure you want to deactivate this sector?", { destructive: true })) {
            try {
                await deleteStructure(id).unwrap();
                await refetch();
                actionFeedback.success("Sector deactivated successfully");
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                actionFeedback.error(error.data?.message || "Failed to deactivate sector");
            }
        }
    };

    const handleReactivate = async (id: string) => {
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

    const columns: ColumnDef<GovernmentStructure>[] = [
        {
            id: "logo",
            header: "",
            cell: ({ row }) => (
                <SectorLogo
                    name={row.original.name}
                    logoPath={row.original.logo_path}
                    size="sm"
                />
            ),
        },
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
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            onClick={() => router.push(`/government-structures/${row.original.government_structure_id}`)}
                            variant="ghost"
                            size="icon"
                            title="View Details"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        {isActive && canUpdate && (
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
                                        setInitialParentId(row.original.government_structure_id);
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
                        {isActive && canDelete && (
                            <Button
                                onClick={() => handleDelete(row.original.government_structure_id)}
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700"
                                title="Deactivate"
                            >
                                <Trash className="h-4 w-4" />
                            </Button>
                        )}
                        {!isActive && canUpdate && (
                            <Button
                                onClick={() => handleReactivate(row.original.government_structure_id)}
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

    const actions: ActionButton[] = isSuperAdmin
        ? [
              {
                  label: "Add Sector",
                  icon: <Plus className="h-4 w-4" />,
                  variant: "default",
                  permissions: ["GOVERNMENT_STRUCTURES:CREATE"],
                  onClick: () => {
                      setSelectedStructure(null);
                      setInitialParentId(null);
                      setModalOpen(true);
                  },
              },
          ]
        : [];

    const filteredData = structures.filter((item) =>
        matchesActiveInactiveFilter(statusFilter, isStructureActive(item.is_active))
    );

    return (
        <>
            <TableLayout
                title="Sector Structures"
                description="Manage sector organizational hierarchy"
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
                        isLoading={isLoading}
                        resetKey={`${searchQuery}-${statusFilter}-${toggleHierarchyView}`}
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
                    setInitialParentId(null);
                }}
                structure={selectedStructure}
                initialParentId={initialParentId}
            />
        </>
    );
}
