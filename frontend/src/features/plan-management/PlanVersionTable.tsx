"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Trash, CheckCircle, PlayCircle, History } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import {
    useGetPlanVersionsQuery,
    useDeletePlanVersionMutation,
    useUpdatePlanVersionStatusMutation
} from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { formatStatus } from "@/utils/statusFormatter";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreatePlanVersionModal } from "./modals/CreatePlanVersionModal";
import {
  matchesMultiValueFilter,
  matchesSearchQuery,
} from "@/utils/tableUtils";

export default function PlanVersionTable() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState("");

    const [deleteVersion] = useDeletePlanVersionMutation();
    const [updateStatus] = useUpdatePlanVersionStatusMutation();
    const [selectedVersion, setSelectedVersion] = useState<PlanVersion | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);

    const columns: ColumnDef<PlanVersion>[] = [
        {
            accessorKey: "year",
            header: "Year",
            cell: ({ row }) => <span className="font-medium">{row.getValue("year")}</span>,
        },
        {
            accessorKey: "version_number",
            header: "Version",
            cell: ({ row }) => <div>v{row.getValue("version_number")}</div>,
        },
        {
            accessorKey: "governmentStructure",
            header: "Sector Structure",
            cell: ({ row }) => (
                <div className="text-primary font-medium">
                    {row.original.governmentStructure?.name || "Global"}
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                return (
                    <Badge className="text-white" status={status}>
                        {formatStatus(status)}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "created_at",
            header: "Created At",
            cell: ({ row }) => (
                <div className="text-gray-500 text-sm">
                    {new Date(row.original.created_at).toLocaleDateString()}
                </div>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button
                        onClick={() => router.push(`/plans/${row.original.plan_version_id}`)}
                        variant="ghost"
                        size="icon"
                        title="View Hierarchy"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {row.original.status === "draft" && (
                        <>
                            <Button
                                onClick={() => {
                                    setSelectedVersion(row.original);
                                    setModalOpen(true);
                                }}
                                variant="ghost"
                                size="icon"
                                title="Edit"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => handleStatusChange(row.original.plan_version_id, "active")}
                                variant="ghost"
                                size="icon"
                                className="text-green-500 hover:text-green-700"
                                title="Activate Plan"
                            >
                                <PlayCircle className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    {row.original.status === "active" && (
                        <Button
                            onClick={() => handleStatusChange(row.original.plan_version_id, "completed")}
                            variant="ghost"
                            size="icon"
                            className="text-blue-500 hover:text-blue-700"
                            title="Complete Plan"
                        >
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        onClick={() => handleDelete(row.original.plan_version_id)}
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

    const {
        data: response,
        isLoading,
        refetch,
    } = useGetPlanVersionsQuery({
        search: searchQuery,
    });


    const versions = response || [];

    console.log("versions", versions);

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this plan version?")) {
            try {
                await deleteVersion(id).unwrap();
                toast.success("Plan version deleted successfully");
            } catch (err: any) {
                toast.error(err.data?.message || "Failed to delete plan version");
            }
        }
    };

    const handleStatusChange = async (id: string, status: "active" | "completed") => {
        const message = status === "active"
            ? "Are you sure you want to activate this plan version? This will make it the current operational plan."
            : "Are you sure you want to mark this plan as completed?";

        if (confirm(message)) {
            try {
                await updateStatus({ id, data: { status } }).unwrap();
                toast.success(`Plan version marked as ${status}`);
            } catch (err: any) {
                toast.error(err.data?.message || `Failed to update status to ${status}`);
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
                { label: "Draft", value: "draft" },
                { label: "Active", value: "active" },
                { label: "Completed", value: "completed" },
            ],
        },
    ];

    const actions: ActionButton[] = [
        {
            label: "New Plan Version",
            icon: <Plus className="h-4 w-4" />,
            variant: "default",
            onClick: () => {
                setSelectedVersion(null);
                setModalOpen(true);
            },
        },
    ];

    const filteredData = versions.filter((item) => {
        if (!matchesMultiValueFilter(statusFilter, item.status)) return false;
        return matchesSearchQuery(searchQuery, [
            String(item.year),
            String(item.version_number),
            item.governmentStructure?.name,
            item.status,
        ]);
    });

    return (
        <>
            <TableLayout
                title="Plan Versions"
                description="Manage organizational plan versions and cycles"
                actions={actions}
                filters={filters}
                filterColumnsPerRow={1}
            >
                <DataTable
                    columns={columns}
                    data={filteredData}
                    isLoading={isLoading}
                    resetKey={`${searchQuery}-${statusFilter}`}
                />
            </TableLayout>
            <CreatePlanVersionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedVersion(null);
                }}
                version={selectedVersion}
            />
        </>
    );
}
