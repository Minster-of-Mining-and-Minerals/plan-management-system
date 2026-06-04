"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    useGetPlanNodeByIdQuery,
    useGetPlanVersionByIdQuery,
} from "@/redux/api/planApi";
import {
    useGetInternalAssignmentsByNodeQuery,
    useGetExternalAssignmentsByNodeQuery,
    useDeleteInternalAssignmentMutation,
    useDeleteExternalAssignmentMutation,
    useGetPlanNodeAssignmentOptionsQuery,
} from "@/redux/api/planAssignmentApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    ChevronLeft,
    Users,
    Building2,
    Trash2,
    Flag,
    Target,
    BarChart3,
    CheckSquare,
    User as UserIcon,
    Building,
    UserPlus,
    GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { AssignInternalModal } from "./modals/AssignInternalModal";
import { AssignExternalModal } from "./modals/AssignExternalModal";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { InternalAssignment, ExternalAssignment } from "@/redux/types/plan";
import { ActionButton } from "@/types/tableLayout";

interface PlanNodeDetailViewProps {
    versionId: string;
    nodeId: string;
}

export default function PlanNodeDetailView({ versionId, nodeId }: PlanNodeDetailViewProps) {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");
    const [showHistory, setShowHistory] = useState(false);

    const { data: version } = useGetPlanVersionByIdQuery(versionId);
    const { data: node, isLoading: isNodeLoading } = useGetPlanNodeByIdQuery(nodeId);
    const { data: internalAssignments = [], isLoading: isInternalLoading } =
        useGetInternalAssignmentsByNodeQuery({ nodeId, includeInactive: showHistory });
    const { data: externalAssignments = [], isLoading: isExternalLoading } =
        useGetExternalAssignmentsByNodeQuery({ nodeId, includeInactive: showHistory });
    const { data: assignmentOptions, isLoading: isOptionsLoading } =
        useGetPlanNodeAssignmentOptionsQuery({ nodeId });

    const isExternalMode = assignmentOptions?.assignment_mode === "external";
    const showInternalTab = !isExternalMode;
    const showExternalTab = isExternalMode;
    const sharingMode = node?.assignment_sharing_mode ?? assignmentOptions?.assignment_sharing_mode ?? "exclusive";
    const activeCount = assignmentOptions?.active_assignment_count ?? 0;
    const isExclusive = sharingMode === "exclusive";

    useEffect(() => {
        if (assignmentOptions) {
            setActiveTab(assignmentOptions.assignment_mode === "external" ? "external" : "internal");
        }
    }, [assignmentOptions?.assignment_mode, nodeId]);

    const [deleteInternal, { isLoading: isDeletingInternal }] = useDeleteInternalAssignmentMutation();
    const [deleteExternal, { isLoading: isDeletingExternal }] = useDeleteExternalAssignmentMutation();

    const [isInternalModalOpen, setInternalModalOpen] = useState(false);
    const [isExternalModalOpen, setExternalModalOpen] = useState(false);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "strategic": return <Flag className="h-5 w-5 text-purple-500" />;
            case "goal": return <Target className="h-5 w-5 text-blue-500" />;
            case "kpi": return <BarChart3 className="h-5 w-5 text-green-500" />;
            case "task": return <CheckSquare className="h-5 w-5 text-orange-500" />;
            default: return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "strategic": return "Strategic Focus Area";
            case "goal": return "Goal";
            case "kpi": return "KPI / Indicator";
            case "task": return "Activity / Task";
            default: return type;
        }
    };

    const handleDeleteInternal = async (id: string) => {
        if (confirm("Are you sure you want to remove this internal assignment?")) {
            try {
                await deleteInternal({ id, nodeId }).unwrap();
                toast.success("Assignment removed");
            } catch (error: unknown) {
                const err = error as { data?: { message?: string } };
                toast.error(err.data?.message || "Failed to remove assignment");
            }
        }
    };

    const handleDeleteExternal = async (id: string) => {
        if (confirm("Are you sure you want to remove this external assignment?")) {
            try {
                await deleteExternal({ id, nodeId }).unwrap();
                toast.success("Assignment removed");
            } catch (error: unknown) {
                const err = error as { data?: { message?: string } };
                toast.error(err.data?.message || "Failed to remove assignment");
            }
        }
    };

    const statusBadge = (isActive: boolean) => (
        <Badge
            variant={isActive ? "default" : "outline"}
            className={
                isActive
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-gray-50 text-gray-500 border-gray-200"
            }
        >
            {isActive ? "Active" : "Replaced"}
        </Badge>
    );

    const internalColumns: ColumnDef<InternalAssignment>[] = [
        {
            id: "entity",
            header: "Assigned To",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-primary border border-gray-100">
                        {row.original.user_id ? <UserIcon className="h-4 w-4" /> : <Building className="h-4 w-4" />}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">
                            {row.original.user?.full_name || row.original.internalStructure?.name}
                        </p>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                            {row.original.user_id ? "User" : "Department"}
                        </span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: "action.name",
            header: "Action / Responsibility",
            cell: ({ row }) => (
                <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100">
                    {row.original.action?.name}
                </Badge>
            )
        },
        {
            id: "status",
            header: "Status",
            cell: ({ row }) => statusBadge(row.original.is_active),
        },
        {
            accessorKey: "created_at",
            header: "Assigned Date",
            cell: ({ row }) => (
                <span className="text-gray-500 text-sm">
                    {new Date(row.original.created_at).toLocaleDateString()}
                </span>
            )
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                row.original.is_active ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => handleDeleteInternal(row.original.internal_assignment_id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                ) : null
            )
        }
    ];

    const externalColumns: ColumnDef<ExternalAssignment>[] = [
        {
            accessorKey: "governmentStructure.name",
            header: "Sector Structure",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                        <Building2 className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-gray-900">
                        {row.original.governmentStructure?.name}
                    </span>
                </div>
            )
        },
        {
            accessorKey: "is_visible",
            header: "Visibility",
            cell: ({ row }) => (
                <Badge variant={row.original.is_visible ? "default" : "outline"} className={row.original.is_visible ? "bg-green-50 text-green-700 border-green-100" : ""}>
                    {row.original.is_visible ? "Visible" : "Hidden"}
                </Badge>
            )
        },
        {
            accessorKey: "requires_report",
            header: "Reporting",
            cell: ({ row }) => (
                <Badge variant={row.original.requires_report ? "default" : "outline"} className={row.original.requires_report ? "bg-blue-50 text-blue-700 border-blue-100" : ""}>
                    {row.original.requires_report ? "Mandatory" : "Optional"}
                </Badge>
            )
        },
        {
            id: "status",
            header: "Status",
            cell: ({ row }) => statusBadge(row.original.is_active),
        },
        {
            accessorKey: "created_at",
            header: "Assigned Date",
            cell: ({ row }) => (
                <span className="text-gray-500 text-sm">
                    {new Date(row.original.created_at).toLocaleDateString()}
                </span>
            )
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                row.original.is_active ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => handleDeleteExternal(row.original.external_assignment_id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                ) : null
            )
        }
    ];

    const assignLabel = (() => {
        if (activeTab === "external") {
            return isExclusive && activeCount > 0 ? "Reassign Sector" : "Assign Sector";
        }
        return isExclusive && activeCount > 0 ? "Reassign User/Department" : "Assign User/Department";
    })();

    const sideActions: ActionButton[] = [
        ...(showInternalTab
            ? [{
                label: `Users & Departments (${internalAssignments.filter((a) => a.is_active).length})`,
                icon: <Users className="h-4 w-4" />,
                variant: activeTab === "internal" ? "default" as const : "outline" as const,
                onClick: () => setActiveTab("internal"),
            }]
            : []),
        ...(showExternalTab
            ? [{
                label: `Sector (${externalAssignments.filter((a) => a.is_active).length})`,
                icon: <Building2 className="h-4 w-4" />,
                variant: activeTab === "external" ? "default" as const : "outline" as const,
                onClick: () => setActiveTab("external"),
            }]
            : []),
    ];

    const actions: ActionButton[] = assignmentOptions?.can_assign
        ? [{
            label: assignLabel,
            icon: <UserPlus className="h-4 w-4" />,
            variant: "default" as const,
            onClick: () => activeTab === "internal" ? setInternalModalOpen(true) : setExternalModalOpen(true),
        }]
        : [];

    if (isNodeLoading) {
        return <div className="p-8 text-center">Loading node details...</div>;
    }

    if (!node) {
        return <div className="p-8 text-center text-red-500">Node not found</div>;
    }

    return (
        <div className="space-y-6 px-6 ">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(`/plans/${versionId}`)}
                        className="rounded-full"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Node Details</h1>
                        <p className="text-gray-500">
                            {version?.year} (v{version?.version_number}) &bull; {version?.governmentStructure?.name || "Global"}
                        </p>
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <div className="h-2 bg-primary" />
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-primary/5">
                            {getTypeIcon(node.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-bold text-gray-900">{node.title}</h2>
                                <Badge variant="outline" className="uppercase font-bold text-[10px]">
                                    {getTypeLabel(node.type)}
                                </Badge>
                                {node.weight > 0 && (
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                                        Weight: {node.weight}%
                                    </Badge>
                                )}
                                <Badge
                                    variant="outline"
                                    className={
                                        sharingMode === "shared"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-slate-50 text-slate-700 border-slate-200"
                                    }
                                >
                                    <GitBranch className="h-3 w-3 mr-1" />
                                    {sharingMode === "shared" ? "Shared" : "Exclusive"}
                                </Badge>
                            </div>
                            <p className="text-gray-600 leading-relaxed">
                                {node.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xl font-bold text-golden-dark">Assignments</h3>
                    <div className="flex items-center gap-2">
                        <Switch
                            id="show-history"
                            checked={showHistory}
                            onCheckedChange={setShowHistory}
                        />
                        <Label htmlFor="show-history" className="text-sm text-muted-foreground cursor-pointer">
                            Show assignment history
                        </Label>
                    </div>
                </div>

                {assignmentOptions?.message && !assignmentOptions.can_assign && (
                    <div className="mb-4 mx-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {assignmentOptions.message}
                    </div>
                )}

                {assignmentOptions?.in_user_branch && assignmentOptions.can_assign && (
                    <div className="mb-4 mx-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        User branch active: deeper levels can only be assigned to users within this sector.
                    </div>
                )}

                {sharingMode === "shared" && (
                    <div className="mb-4 mx-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Shared mode: multiple active assignments are allowed. Each branch can expand independently.
                    </div>
                )}

                <TableLayout
                    actions={actions}
                    sideActions={sideActions}
                    filterColumnsPerRow={1}
                >
                    <DataTable
                        columns={activeTab === "internal" ? internalColumns : externalColumns}
                        data={activeTab === "internal" ? internalAssignments : externalAssignments}
                        totalPageCount={1}
                        handlePagination={() => {}}
                        tablePageSize={100}
                        currentIndex={0}
                        isLoading={isInternalLoading || isExternalLoading || isDeletingInternal || isDeletingExternal || isOptionsLoading}
                    />
                </TableLayout>
            </div>

            <AssignInternalModal
                isOpen={isInternalModalOpen}
                onClose={() => setInternalModalOpen(false)}
                planNodeId={nodeId}
            />
            <AssignExternalModal
                isOpen={isExternalModalOpen}
                onClose={() => setExternalModalOpen(false)}
                planNodeId={nodeId}
            />
        </div>
    );
}
