"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Trash, CheckCircle, Rocket } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import {
    useGetPlanVersionsQuery,
    useDeletePlanVersionMutation,
    useUpdatePlanVersionStatusMutation
} from "@/redux/api/planApi";
import { useGetPlanningConfigurationQuery } from "@/redux/api/planningConfigApi";
import { PlanVersion } from "@/redux/types/plan";
import { DEFAULT_PLANNING_CONFIGURATION } from "@/redux/types/planningConfig";
import { formatStatus } from "@/utils/statusFormatter";
import {
    formatDurationYears,
    formatPlanningPeriod,
    getPlanDraftDisplayName,
} from "@/utils/planDraftUtils";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreatePlanVersionModal } from "./modals/CreatePlanVersionModal";
import { FinalizePlanDraftModal } from "./modals/FinalizePlanDraftModal";
import {
  matchesMultiValueFilter,
  matchesSearchQuery,
} from "@/utils/tableUtils";

export default function PlanVersionTable() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState("");

    const { data: config = DEFAULT_PLANNING_CONFIGURATION } = useGetPlanningConfigurationQuery();
    const [deleteVersion] = useDeletePlanVersionMutation();
    const [updateStatus] = useUpdatePlanVersionStatusMutation();
    const [selectedVersion, setSelectedVersion] = useState<PlanVersion | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [finalizeVersion, setFinalizeVersion] = useState<PlanVersion | null>(null);

    const draftLabel = config.draft_entity_label_singular;
    const draftsLabel = config.draft_entity_label_plural;

    const columns: ColumnDef<PlanVersion>[] = [
        {
            accessorKey: "draft_name",
            header: "Draft Name",
            cell: ({ row }) => (
                <span className="font-medium text-primary">
                    {getPlanDraftDisplayName(row.original)}
                </span>
            ),
        },
        {
            id: "planning_period",
            header: config.planning_period_label,
            cell: ({ row }) => (
                <span className="text-gray-700">
                    {formatPlanningPeriod(row.original)}
                </span>
            ),
        },
        {
            id: "duration",
            header: config.duration_label,
            cell: ({ row }) => (
                <span className="text-gray-600">
                    {formatDurationYears(row.original.planning_duration_years)}
                </span>
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
            header: "Created Date",
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
                                onClick={() => setFinalizeVersion(row.original)}
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-800"
                                title="Finalize Draft"
                            >
                                <Rocket className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    {row.original.status === "active" && row.original.version_kind === "annual" && (
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
    } = useGetPlanVersionsQuery({
        search: searchQuery,
        version_kind: "master",
    });

    const versions = response || [];

    const handleDelete = async (id: string) => {
        if (confirm(`Are you sure you want to delete this ${draftLabel.toLowerCase()}?`)) {
            try {
                await deleteVersion(id).unwrap();
                toast.success(`${draftLabel} deleted successfully`);
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                toast.error(error.data?.message || `Failed to delete ${draftLabel.toLowerCase()}`);
            }
        }
    };

    const handleStatusChange = async (id: string, status: "active" | "completed") => {
        const message = status === "active"
            ? `Are you sure you want to activate this ${draftLabel.toLowerCase()}? This will make it the current operational plan.`
            : "Are you sure you want to mark this plan as completed?";

        if (confirm(message)) {
            try {
                await updateStatus({ id, data: { status } }).unwrap();
                toast.success(`${draftLabel} marked as ${status}`);
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                toast.error(error.data?.message || `Failed to update status to ${status}`);
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
                { label: "Finalized", value: "finalized" },
                { label: "Active", value: "active" },
                { label: "Completed", value: "completed" },
            ],
        },
    ];

    const actions: ActionButton[] = [
        {
            label: config.create_action_label,
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
            item.draft_name,
            formatPlanningPeriod(item),
            formatDurationYears(item.planning_duration_years),
            item.status,
        ]);
    });

    return (
        <>
            <TableLayout
                title={draftsLabel}
                description={`Manage organizational ${draftsLabel.toLowerCase()} and planning periods`}
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
            {finalizeVersion && (
                <FinalizePlanDraftModal
                    isOpen={!!finalizeVersion}
                    onClose={() => setFinalizeVersion(null)}
                    version={finalizeVersion}
                />
            )}
        </>
    );
}
