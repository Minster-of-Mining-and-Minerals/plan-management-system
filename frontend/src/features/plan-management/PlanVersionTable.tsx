"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Trash, CheckCircle, Rocket, Copy } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import {
    useGetPlanVersionsQuery,
    useDeletePlanVersionMutation,
    useUpdatePlanVersionStatusMutation,
    useReopenFinalizedPlanForEditMutation,
} from "@/redux/api/planApi";
import { useEffectivePlanningConfiguration } from "@/hooks/useEffectivePlanningConfiguration";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import { PlanVersion } from "@/redux/types/plan";
import { formatStatus } from "@/utils/statusFormatter";
import {
    resolveCompletionForVersion,
} from "@/utils/performanceColorUtils";
import { PerformanceProgressBar } from "./components/PerformanceProgressBar";
import { PerformanceColorBadge } from "./components/PerformanceColorBadge";
import {
    formatDurationYears,
    formatPlanningPeriod,
    getPlanDraftDisplayName,
} from "@/utils/planDraftUtils";
import {
    canEditFinalizedMasterPlan,
    confirmReopenFinalizedPlanForEdit,
} from "@/utils/planMasterEditUtils";
import { isOversightReadOnlyAccessRole } from "@/utils/planTreeAccessUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";
import { useSearchParams, useRouter } from "next/navigation";
import { actionFeedback } from "@/components/action-feedback";
import { CreatePlanVersionModal } from "./modals/CreatePlanVersionModal";
import { FinalizePlanDraftModal } from "./modals/FinalizePlanDraftModal";
import { DuplicatePlanDraftModal } from "./modals/DuplicatePlanDraftModal";
import { PlanDocumentCountBadge } from "@/features/documents/components/PlanDocumentCountBadge";
import {
  matchesMultiValueFilter,
  matchesSearchQuery,
} from "@/utils/tableUtils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
  PLAN_PERMISSIONS,
  PLAN_COMPLETE_ANNUAL_PERMISSIONS,
  PLAN_COMPLETE_PERIOD_PERMISSIONS,
  PLAN_DRAFT_PUBLISH_PERMISSIONS,
  PLAN_FINALIZE_PERMISSIONS,
  PLAN_UPDATE_PERMISSIONS,
} from "@/utils/planPermissionUtils";

export default function PlanVersionTable() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState("");
    const { can } = usePermissions();

    const { config } = useEffectivePlanningConfiguration();
    const thresholds = usePerformanceColorThresholds();
    const [deleteVersion] = useDeletePlanVersionMutation();
    const [updateStatus] = useUpdatePlanVersionStatusMutation();
    const [reopenForEdit, { isLoading: isReopening }] = useReopenFinalizedPlanForEditMutation();
    const [selectedVersion, setSelectedVersion] = useState<PlanVersion | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [finalizeVersion, setFinalizeVersion] = useState<PlanVersion | null>(null);
    const [duplicateVersion, setDuplicateVersion] = useState<PlanVersion | null>(null);

    const draftLabel = config.draft_entity_label_singular;
    const draftsLabel = config.draft_entity_label_plural;

    const handleEditVersion = async (version: PlanVersion) => {
        if (isOversightReadOnlyAccessRole(version.access_role)) {
            return;
        }

        if (version.status === "draft") {
            setSelectedVersion(version);
            setModalOpen(true);
            return;
        }

        if (!canEditFinalizedMasterPlan(version, can)) {
            return;
        }

        if (!(await confirmReopenFinalizedPlanForEdit())) {
            return;
        }

        try {
            const reopened = await reopenForEdit(version.plan_version_id).unwrap();
            actionFeedback.success(
                `${draftLabel} reopened for editing. Complete all validation steps again.`
            );
            setSelectedVersion(reopened);
            setModalOpen(true);
        } catch (err: unknown) {
            actionFeedback.error(getApiErrorMessage(err, `Failed to reopen ${draftLabel.toLowerCase()}`));
        }
    };

    const columns: ColumnDef<PlanVersion>[] = [
        {
            accessorKey: "draft_name",
            header: "Draft Name",
            meta: {
                headerClassName: "w-[28%] max-w-[280px]",
                cellClassName: "max-w-0 overflow-hidden !whitespace-normal",
            },
            cell: ({ row }) => {
                const name = getPlanDraftDisplayName(row.original);
                return (
                    <span
                        className="font-medium text-primary block truncate"
                        title={name}
                    >
                        {name}
                    </span>
                );
            },
        },
        {
            id: "planning_period",
            header: config.planning_period_label,
            meta: {
                headerClassName: "w-[18%]",
                cellClassName: "max-w-0 overflow-hidden !whitespace-normal",
            },
            cell: ({ row }) => (
                <span className="text-gray-700 block truncate" title={formatPlanningPeriod(row.original)}>
                    {formatPlanningPeriod(row.original)}
                </span>
            ),
        },
        {
            id: "duration",
            header: config.duration_label,
            meta: {
                headerClassName: "w-[12%] whitespace-nowrap",
                cellClassName: "whitespace-nowrap",
            },
            cell: ({ row }) => (
                <span className="text-gray-600">
                    {formatDurationYears(row.original.planning_duration_years)}
                </span>
            ),
        },
        {
            id: "access",
            header: "Access",
            meta: {
                headerClassName: "w-[12%] whitespace-nowrap",
                cellClassName: "whitespace-nowrap",
            },
            cell: ({ row }) => {
                const role = row.original.access_role ?? "participant";
                if (role === "participant") {
                    return (
                        <Badge variant="secondary" className="text-xs">
                            Participant
                        </Badge>
                    );
                }
                if (role === "oversight") {
                    return (
                        <Badge variant="default" className="text-xs">
                            Sector scope
                        </Badge>
                    );
                }
                if (role === "global") {
                    return (
                        <Badge variant="default" className="text-xs">
                            Full plan
                        </Badge>
                    );
                }
                return (
                    <Badge variant="outline" className="text-xs">
                        Owner
                    </Badge>
                );
            },
        },
        {
            id: "documents",
            header: "Documents",
            meta: {
                headerClassName: "w-[10%] whitespace-nowrap text-center",
                cellClassName: "whitespace-nowrap text-center",
            },
            cell: ({ row }) => (
                <PlanDocumentCountBadge planVersionId={row.original.plan_version_id} />
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            meta: {
                headerClassName: "w-[10%] whitespace-nowrap",
                cellClassName: "whitespace-nowrap",
            },
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                return (
                    <Badge variant="outline" className="capitalize">
                        {formatStatus(status)}
                    </Badge>
                );
            },
        },
        {
            id: "achievement",
            header: "Achievement",
            meta: {
                headerClassName: "w-[14%] min-w-[120px]",
                cellClassName: "max-w-0 overflow-hidden",
            },
            cell: ({ row }) => {
                const version = row.original;
                const processStarted = Boolean(version.process_started_at);
                const progress = resolveCompletionForVersion(
                    thresholds,
                    version,
                    processStarted
                );

                if (!progress.visible) {
                    return (
                        <span className="text-sm text-muted-foreground">
                            {processStarted ? "—" : "Not started"}
                        </span>
                    );
                }

                return (
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <PerformanceColorBadge
                                color={progress.color}
                                label={`${progress.percent}%`}
                                variant="tint"
                                className="text-xs"
                            />
                            {version.active_planning_year != null && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                    Yr {version.active_planning_year}
                                </span>
                            )}
                        </div>
                        <PerformanceProgressBar
                            value={progress.percent}
                            color={progress.color}
                            className="h-1.5"
                        />
                    </div>
                );
            },
        },
        {
            accessorKey: "created_at",
            header: "Created Date",
            meta: {
                headerClassName: "w-[12%] whitespace-nowrap",
                cellClassName: "whitespace-nowrap",
            },
            cell: ({ row }) => (
                <div className="text-gray-500 text-sm">
                    {new Date(row.original.created_at).toLocaleDateString()}
                </div>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            meta: {
                headerClassName: "w-[16%] whitespace-nowrap",
                cellClassName: "whitespace-nowrap",
            },
            cell: ({ row }) => {
                const isReadOnlyAccess = isOversightReadOnlyAccessRole(
                    row.original.access_role
                );

                return (
                <div className="flex items-center gap-1">
                    <PermissionGuard requireAll={[PLAN_PERMISSIONS.READ]}>
                        <Button
                            onClick={() => router.push(`/plans/${row.original.plan_version_id}`)}
                            variant="ghost"
                            size="icon"
                            title="View Hierarchy"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    </PermissionGuard>
                    {row.original.status === "draft" && !isReadOnlyAccess && (
                        <>
                            <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
                                <Button
                                    onClick={() => handleEditVersion(row.original)}
                                    variant="ghost"
                                    size="icon"
                                    title="Edit"
                                    disabled={isReopening}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </PermissionGuard>
                            <PermissionGuard requireAll={PLAN_FINALIZE_PERMISSIONS}>
                                <Button
                                    onClick={() => setFinalizeVersion(row.original)}
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-600 hover:text-green-800"
                                    title="Finalize Draft"
                                >
                                    <Rocket className="h-4 w-4" />
                                </Button>
                            </PermissionGuard>
                        </>
                    )}
                    {canEditFinalizedMasterPlan(row.original, can) && !isReadOnlyAccess && (
                        <PermissionGuard requireAll={[PLAN_PERMISSIONS.EDIT_FINALIZED]}>
                            <Button
                                onClick={() => handleEditVersion(row.original)}
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Reopen for editing (restarts validation process)"
                                disabled={isReopening}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        </PermissionGuard>
                    )}
                    {row.original.status === "active" && row.original.version_kind === "annual" && (
                        <PermissionGuard requireAll={PLAN_COMPLETE_ANNUAL_PERMISSIONS}>
                            <Button
                                onClick={() => handleStatusChange(row.original.plan_version_id, "completed")}
                                variant="ghost"
                                size="icon"
                                className="text-blue-500 hover:text-blue-700"
                                title="Complete Plan"
                            >
                                <CheckCircle className="h-4 w-4" />
                            </Button>
                        </PermissionGuard>
                    )}
                    {row.original.status === "active" && row.original.version_kind === "execution_period" && (
                        <PermissionGuard requireAll={PLAN_COMPLETE_PERIOD_PERMISSIONS}>
                            <Button
                                onClick={() => handleStatusChange(row.original.plan_version_id, "completed")}
                                variant="ghost"
                                size="icon"
                                className="text-blue-500 hover:text-blue-700"
                                title="Complete Period"
                            >
                                <CheckCircle className="h-4 w-4" />
                            </Button>
                        </PermissionGuard>
                    )}
                    <PermissionGuard requireAll={PLAN_DRAFT_PUBLISH_PERMISSIONS}>
                        {!isReadOnlyAccess ? (
                        <Button
                            onClick={() => setDuplicateVersion(row.original)}
                            variant="ghost"
                            size="icon"
                            title={`Duplicate ${draftLabel.toLowerCase()}`}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                        ) : null}
                    </PermissionGuard>
                    {!isReadOnlyAccess && (
                    <PermissionGuard requireAll={[PLAN_PERMISSIONS.DELETE]}>
                        <Button
                            onClick={() => handleDelete(row.original.plan_version_id)}
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                        >
                            <Trash className="h-4 w-4" />
                        </Button>
                    </PermissionGuard>
                    )}
                </div>
                );
            },
        },
    ];

    const {
        data: response,
        isLoading,
    } = useGetPlanVersionsQuery({
        search: searchQuery,
        version_kind: "master",
        view: "summary",
    });

    const versions = response || [];

    const handleDelete = async (id: string) => {
        if (await actionFeedback.confirm(`Are you sure you want to delete this ${draftLabel.toLowerCase()}?`, { destructive: true })) {
            try {
                await deleteVersion(id).unwrap();
                actionFeedback.success(`${draftLabel} deleted successfully`);
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                actionFeedback.error(error.data?.message || `Failed to delete ${draftLabel.toLowerCase()}`);
            }
        }
    };

    const handleStatusChange = async (id: string, status: "active" | "completed") => {
        const message = status === "active"
            ? `Are you sure you want to activate this ${draftLabel.toLowerCase()}? This will make it the current operational plan.`
            : "Are you sure you want to mark this plan as completed?";

        if (await actionFeedback.confirm(message)) {
            try {
                await updateStatus({ id, data: { status } }).unwrap();
                actionFeedback.success(`${draftLabel} marked as ${status}`);
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                actionFeedback.error(error.data?.message || `Failed to update status to ${status}`);
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
            permissions: [...PLAN_DRAFT_PUBLISH_PERMISSIONS],
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
                    tableClassName="table-fixed w-full"
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
            {duplicateVersion && (
                <DuplicatePlanDraftModal
                    isOpen={!!duplicateVersion}
                    onClose={() => setDuplicateVersion(null)}
                    version={duplicateVersion}
                    draftLabel={draftLabel}
                />
            )}
        </>
    );
}
