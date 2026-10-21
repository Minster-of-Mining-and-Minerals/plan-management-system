"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    useGetPlanNodeByIdQuery,
    useGetPlanVersionByIdQuery,
    useGetAnnualTargetAllocationsQuery,
    useUpdateAnnualTargetMutation,
    useUpdatePeriodTargetMutation,
} from "@/redux/api/planApi";
import { useGetPlanRuleForVersionQuery } from "@/redux/api/planRuleApi";
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
import { Input } from "@/components/ui/input";
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
    Shield,
} from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { AssignInternalModal } from "./modals/AssignInternalModal";
import { AssignExternalModal } from "./modals/AssignExternalModal";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { InternalAssignment, ExternalAssignment } from "@/redux/types/plan";
import { ActionButton } from "@/types/tableLayout";
import { PlanDraftHeaderMeta } from "./components/PlanDraftHeaderMeta";
import { PlanNodeAssignmentReadOnly } from "./components/PlanNodeAssignmentReadOnly";
import { PlanAssignmentScopeBanner } from "./components/PlanAssignmentScopeBanner";
import { AssignmentModeAlerts } from "./components/AssignmentModeAlerts";
import { AnnualTargetAllocationSummary } from "./components/AnnualTargetAllocationSummary";
import { ContributionAllocationSummary } from "./components/ContributionAllocationSummary";
import { PlanNodeContributionBadge } from "./components/PlanNodeContributionBadge";
import { usePlanVersionPlanningConfiguration } from "@/hooks/usePlanVersionPlanningConfiguration";
import {
    formatNodeTarget,
    stepRequiresContributionWeight,
    childLevelRequiresContribution,
} from "@/utils/planRuleUtils";
import { canEditAnnualTargetForVersion, canEditPeriodTargetForVersion, resolveLiveDraftTarget } from "@/utils/planDraftUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
    PLAN_ASSIGNMENT_CREATE_PERMISSIONS,
    PLAN_ASSIGNMENT_DELETE_PERMISSIONS,
    PLAN_REVIEW_RAISE_PERMISSIONS,
    PLAN_UPDATE_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import {
    canEditMasterPlanStructure,
    confirmFinalizedPlanStructureEdit,
    isEditingFinalizedMasterPlan,
} from "@/utils/planMasterEditUtils";
import { RaiseIssueButton } from "./components/RaiseIssueButton";
import { canRaiseReviewIssue, planNodeTypeToIssueEntityType } from "@/utils/planReviewUtils";
import { formatPlanAssignmentButtonLabel } from "@/utils/planAssignmentUtils";
import { PlanNodePeriodActualSection } from "./components/PlanNodePeriodActualSection";
import { canEditPeriodActualForVersion } from "@/utils/planExecutionUtils";
import { PlanAchievementScopeProvider } from "@/hooks/usePlanAchievementScope";
import { PeriodTargetReallocationReportingProvider } from "@/hooks/usePeriodTargetReallocationReporting";

interface PlanNodeDetailViewProps {
    versionId: string;
    nodeId: string;
    mode?: "draft" | "review";
}

export default function PlanNodeDetailView({
    versionId,
    nodeId,
    mode = "draft",
}: PlanNodeDetailViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const focusAchievement = searchParams.get("focus") === "achievement";

    const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");
    const [showHistory, setShowHistory] = useState(false);

    const { data: version } = useGetPlanVersionByIdQuery(versionId);
    const annualParentId =
        version?.version_kind === "execution_period" ? version.parent_plan_version_id : null;
    const { data: annualParentVersion } = useGetPlanVersionByIdQuery(annualParentId!, {
        skip: !annualParentId,
    });
    const resolvedMasterVersionId =
        version?.version_kind === "master"
            ? version.plan_version_id
            : version?.version_kind === "annual"
              ? version.parent_plan_version_id
              : version?.version_kind === "execution_period"
                ? annualParentVersion?.parent_plan_version_id ?? null
                : null;
    const { data: masterVersion } = useGetPlanVersionByIdQuery(resolvedMasterVersionId!, {
        skip: !resolvedMasterVersionId,
    });
    const { config: planningConfig } = usePlanVersionPlanningConfiguration(
        version,
        masterVersion
    );
    const [updateAnnualTarget, { isLoading: isSavingTarget }] = useUpdateAnnualTargetMutation();
    const [updatePeriodTarget, { isLoading: isSavingPeriodTarget }] = useUpdatePeriodTargetMutation();
    const [annualTargetInput, setAnnualTargetInput] = useState("");
    const [periodTargetInput, setPeriodTargetInput] = useState("");
    const { data: node, isLoading: isNodeLoading } = useGetPlanNodeByIdQuery(nodeId);
    const childNodes = useMemo(
        () => (node?.children ?? []).filter((child: any) => child.is_active !== false),
        [node?.children]
    );
    const { data: internalAssignments = [], isLoading: isInternalLoading } =
        useGetInternalAssignmentsByNodeQuery({ nodeId, includeInactive: showHistory });
    const { data: externalAssignments = [], isLoading: isExternalLoading } =
        useGetExternalAssignmentsByNodeQuery({ nodeId, includeInactive: showHistory });
    const { data: assignmentOptions, isLoading: isOptionsLoading } =
        useGetPlanNodeAssignmentOptionsQuery({ nodeId });

    const isExternalMode = assignmentOptions?.assignment_mode === "external";
    const showInternalTab = !isExternalMode;
    const showExternalTab = isExternalMode;
    const readOnlyExternalMode =
        externalAssignments.some((item) => item.is_active) &&
        !internalAssignments.some((item) => item.is_active)
            ? true
            : internalAssignments.some((item) => item.is_active)
              ? false
              : isExternalMode;
    const sharingMode = node?.assignment_sharing_mode ?? assignmentOptions?.assignment_sharing_mode ?? "exclusive";
    const activeCount = assignmentOptions?.active_assignment_count ?? 0;
    const isExclusive = sharingMode === "exclusive";

    useEffect(() => {
        if (assignmentOptions) {
            setActiveTab(assignmentOptions.assignment_mode === "external" ? "external" : "internal");
        }
    }, [assignmentOptions?.assignment_mode, nodeId]);

    useEffect(() => {
        if (node?.annual_target != null) {
            setAnnualTargetInput(String(node.annual_target));
        } else {
            setAnnualTargetInput("");
        }
    }, [node?.annual_target, nodeId]);

    useEffect(() => {
        if (node?.period_target != null) {
            setPeriodTargetInput(String(node.period_target));
        } else {
            setPeriodTargetInput("");
        }
    }, [node?.period_target, nodeId]);

    const { can, canAny } = usePermissions();

    const effectiveMasterVersion =
        version?.version_kind === "master" ? version : masterVersion;
    const masterReviewStatus = effectiveMasterVersion?.review_status;
    const isReviewMode = mode === "review";
    const plansBasePath = isReviewMode ? "/plans/review" : "/plans";
    const showRaiseIssue =
        isReviewMode &&
        canRaiseReviewIssue(effectiveMasterVersion) &&
        canAny(PLAN_REVIEW_RAISE_PERMISSIONS);

    const annualTargetsFinalized = Boolean(masterVersion?.annual_targets_finalized_at);
    const periodTargetsFinalized = Boolean(
        version?.version_kind === "execution_period"
            ? annualParentVersion?.period_targets_finalized_at
            : version?.version_kind === "annual"
              ? version?.period_targets_finalized_at
              : masterVersion?.period_targets_finalized_at
    );

    const { data: annualAllocationList = [] } = useGetAnnualTargetAllocationsQuery(versionId, {
        skip: version?.version_kind !== "annual" || annualTargetsFinalized,
    });
    const annualAllocation = annualAllocationList.find((item) => item.plan_node_id === nodeId);
    const liveDraftTarget = node ? resolveLiveDraftTarget(node, annualAllocation) : 0;

    const canAllocateAnnualTarget =
        canEditAnnualTargetForVersion(version, annualTargetsFinalized, masterReviewStatus) &&
        node &&
        liveDraftTarget > 0;

    const canAllocatePeriodTarget =
        canEditPeriodTargetForVersion(version, periodTargetsFinalized, masterReviewStatus) &&
        node &&
        (node.annual_target ?? 0) > 0;

    const canEditMasterStructure = canEditMasterPlanStructure(version, can);
    const isEditingFinalizedMaster =
        !isReviewMode && isEditingFinalizedMasterPlan(version, can);
    const isExecutionVersion =
        version?.version_kind === "annual" ||
        version?.version_kind === "execution_period";
    const isExecutionPeriod = version?.version_kind === "execution_period";
    const processStarted = Boolean(masterVersion?.process_started_at);
    const showPeriodActuals = isExecutionPeriod && processStarted;
    const canEditPeriodActual = canEditPeriodActualForVersion(version, processStarted);
    const { data: rule } = useGetPlanRuleForVersionQuery(versionId, {
        skip: !showPeriodActuals,
    });

    const [deleteInternal, { isLoading: isDeletingInternal }] = useDeleteInternalAssignmentMutation();
    const [deleteExternal, { isLoading: isDeletingExternal }] = useDeleteExternalAssignmentMutation();

    const [isInternalModalOpen, setInternalModalOpen] = useState(false);
    const [isExternalModalOpen, setExternalModalOpen] = useState(false);

    const assignmentRows =
        activeTab === "internal" ? internalAssignments : externalAssignments;

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

    const confirmIfFinalizedEdit = async (actionLabel: string) => {
        if (!isEditingFinalizedMaster) return true;
        return confirmFinalizedPlanStructureEdit(actionLabel);
    };

    const handleDeleteInternal = async (id: string) => {
        if (!(await confirmIfFinalizedEdit("Removing an assignment"))) return;
        if (await actionFeedback.confirm("Are you sure you want to remove this internal assignment?", { destructive: true })) {
            try {
                await deleteInternal({ id, nodeId }).unwrap();
                actionFeedback.success("Assignment removed");
            } catch (error: unknown) {
                const err = error as { data?: { message?: string } };
                actionFeedback.error(err.data?.message || "Failed to remove assignment");
            }
        }
    };

    const handleDeleteExternal = async (id: string) => {
        if (!(await confirmIfFinalizedEdit("Removing an assignment"))) return;
        if (await actionFeedback.confirm("Are you sure you want to remove this external assignment?", { destructive: true })) {
            try {
                await deleteExternal({ id, nodeId }).unwrap();
                actionFeedback.success("Assignment removed");
            } catch (error: unknown) {
                const err = error as { data?: { message?: string } };
                actionFeedback.error(err.data?.message || "Failed to remove assignment");
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
            cell: ({ row }) => {
                const isUser = !!row.original.user_id;
                const isRole = !!row.original.role_id;
                const isPermissionGroup = !!row.original.permission_group_id;
                const label =
                    row.original.user?.full_name ||
                    row.original.internalStructure?.name ||
                    row.original.role?.name ||
                    row.original.permissionGroup?.name ||
                    "—";
                const typeLabel = isUser
                    ? "User"
                    : isRole
                      ? "Role"
                      : isPermissionGroup
                        ? "Permission Group"
                        : "Department";
                const Icon = isUser ? UserIcon : isRole || isPermissionGroup ? Shield : Building;

                return (
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-primary border border-gray-100">
                            <Icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{label}</p>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                {typeLabel}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            id: "branch",
            header: "Branch",
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <GitBranch className="h-3.5 w-3.5" />
                    {row.original.branch_label ?? "—"}
                </div>
            ),
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
                    <PermissionGuard requireAny={PLAN_ASSIGNMENT_DELETE_PERMISSIONS}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-red-500"
                            onClick={() => handleDeleteInternal(row.original.internal_assignment_id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </PermissionGuard>
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
                    <PermissionGuard requireAny={PLAN_ASSIGNMENT_DELETE_PERMISSIONS}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-red-500"
                            onClick={() => handleDeleteExternal(row.original.external_assignment_id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </PermissionGuard>
                ) : null
            )
        }
    ];

    const assignLabel = formatPlanAssignmentButtonLabel(node?.type, {
        reassign: isExclusive && activeCount > 0,
    });

    const sideActions: ActionButton[] = [
        ...(showInternalTab
            ? [{
                label: `Internal (${internalAssignments.filter((a) => a.is_active).length})`,
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

    const actions: ActionButton[] = assignmentOptions?.can_assign && canEditMasterStructure
        ? [{
            label: assignLabel,
            icon: <UserPlus className="h-4 w-4" />,
            variant: isEditingFinalizedMaster ? "destructive" as const : "default" as const,
            permissions: [...PLAN_ASSIGNMENT_CREATE_PERMISSIONS],
            onClick: async () => {
                if (!(await confirmIfFinalizedEdit("Adding an assignment"))) return;
                if (activeTab === "internal") {
                    setInternalModalOpen(true);
                } else {
                    setExternalModalOpen(true);
                }
            },
        }]
        : [];

    if (isNodeLoading) {
        return <div className="p-8 text-center">Loading node details...</div>;
    }

    if (!node) {
        return <div className="p-8 text-center text-red-500">Node not found</div>;
    }

    return (
        <PlanAchievementScopeProvider
            versionId={versionId}
            enabled={showPeriodActuals}
        >
        <PeriodTargetReallocationReportingProvider
            versionId={versionId}
            enabled={showPeriodActuals}
        >
        <div className="space-y-6 px-6 ">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(`${plansBasePath}/${versionId}`)}
                        className="rounded-full"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Node Details</h1>
                        <PlanDraftHeaderMeta
                            version={version}
                            config={planningConfig}
                            showSector
                            compact
                        />
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
                                {showRaiseIssue && (
                                    <RaiseIssueButton
                                        entityType={planNodeTypeToIssueEntityType(node.type)}
                                        entityId={node.plan_node_id}
                                        size="sm"
                                        variant="outline"
                                    />
                                )}
                                <Badge variant="outline" className="uppercase font-bold text-[10px]">
                                    {getTypeLabel(node.type)}
                                </Badge>
                                {version?.version_kind === "master" && node.weight > 0 && (
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                                        Draft Target:{" "}
                                        {formatNodeTarget(
                                            node.weight,
                                            node.weight_mode,
                                            node.target_unit,
                                            planningConfig?.target_units
                                        )}
                                    </Badge>
                                )}
                                {version?.version_kind === "annual" && liveDraftTarget > 0 && (
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                                        Draft Target:{" "}
                                        {formatNodeTarget(
                                            liveDraftTarget,
                                            node.weight_mode,
                                            node.target_unit,
                                            planningConfig?.target_units
                                        )}
                                    </Badge>
                                )}
                                {version?.version_kind === "execution_period" &&
                                    (node.annual_target ?? 0) > 0 && (
                                        <>
                                            <Badge
                                                variant="secondary"
                                                className="bg-blue-50 text-blue-700 border-blue-100 font-bold"
                                            >
                                                Annual Target:{" "}
                                                {formatNodeTarget(
                                                    node.annual_target ?? 0,
                                                    node.weight_mode,
                                                    node.target_unit,
                                                    planningConfig?.target_units
                                                )}
                                            </Badge>
                                            {node.period_target != null && node.period_target > 0 && (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold"
                                                >
                                                    Period Target:{" "}
                                                    {formatNodeTarget(
                                                        node.period_target,
                                                        node.weight_mode,
                                                        node.target_unit,
                                                        planningConfig?.target_units
                                                    )}
                                                </Badge>
                                            )}
                                        </>
                                    )}
                                {stepRequiresContributionWeight(rule, node.level) && (
                                    <PlanNodeContributionBadge
                                        contributionWeight={node.contribution_weight}
                                        missing={
                                            !node.contribution_weight || node.contribution_weight <= 0
                                        }
                                        className="font-bold"
                                    />
                                )}
                                {canEditMasterStructure && (
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
                                )}
                            </div>
                            <p className="text-gray-600 leading-relaxed">
                                {node.description || "No description provided."}
                            </p>
                            {childLevelRequiresContribution(rule, childNodes) && (
                                <ContributionAllocationSummary
                                    children={childNodes}
                                    variant="detail"
                                    className="mt-4"
                                />
                            )}
                            {version?.version_kind === "annual" && liveDraftTarget > 0 && (
                                <div className="mt-4 rounded-lg border bg-muted/20 p-4 space-y-3">
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Draft Target: </span>
                                            <span className="font-semibold">
                                                {formatNodeTarget(
                                            liveDraftTarget,
                                            node.weight_mode,
                                            node.target_unit,
                                            planningConfig?.target_units
                                        )}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Annual Target: </span>
                                            <span className="font-semibold">
                                                {node.annual_target != null && node.annual_target > 0
                                                    ? formatNodeTarget(
                                                          node.annual_target,
                                                          node.weight_mode,
                                                          node.target_unit,
                                                          planningConfig?.target_units
                                                      )
                                                    : "Not yet defined"}
                                            </span>
                                        </div>
                                    </div>
                                    {annualAllocation && (
                                        <AnnualTargetAllocationSummary
                                            allocation={annualAllocation}
                                            node={node}
                                            configuredUnits={planningConfig?.target_units}
                                            inputValue={
                                                canAllocateAnnualTarget ? annualTargetInput : undefined
                                            }
                                            variant="detail"
                                        />
                                    )}
                                    {canAllocateAnnualTarget && (
                                        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="annual_target">Set Annual Target</Label>
                                                <Input
                                                    id="annual_target"
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    value={annualTargetInput}
                                                    onChange={(e) => setAnnualTargetInput(e.target.value)}
                                                    placeholder={
                                                        annualAllocation
                                                            ? `Up to ${annualAllocation.remaining_for_this_year}`
                                                            : "Enter annual allocation"
                                                    }
                                                />
                                            </div>
                                            <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
                                                <Button
                                                    disabled={isSavingTarget}
                                                    onClick={async () => {
                                                        try {
                                                            const val =
                                                                annualTargetInput === ""
                                                                    ? null
                                                                    : Number(annualTargetInput);
                                                            await updateAnnualTarget({
                                                                id: node.plan_node_id,
                                                                annual_target: val,
                                                            }).unwrap();
                                                            actionFeedback.success("Annual target saved");
                                                        } catch (error: unknown) {
                                                            const err = error as { data?: { message?: string } };
                                                            actionFeedback.error(err.data?.message || "Failed to save");
                                                        }
                                                    }}
                                                >
                                                    Save Annual Target
                                                </Button>
                                            </PermissionGuard>
                                        </div>
                                    )}
                                </div>
                            )}
                            {version?.version_kind === "execution_period" && (node.annual_target ?? 0) > 0 && (
                                <div className="mt-4 rounded-lg border bg-muted/20 p-4 space-y-3">
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Annual Target: </span>
                                            <span className="font-semibold">
                                                {formatNodeTarget(
                                                    node.annual_target ?? 0,
                                                    node.weight_mode,
                                                    node.target_unit,
                                                    planningConfig?.target_units
                                                )}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">
                                                Period Target:{" "}
                                            </span>
                                            <span className="font-semibold">
                                                {node.period_target != null && node.period_target > 0
                                                    ? formatNodeTarget(
                                                          node.period_target,
                                                          node.weight_mode,
                                                          node.target_unit,
                                                          planningConfig?.target_units
                                                      )
                                                    : "Not yet defined"}
                                            </span>
                                        </div>
                                    </div>
                                    {canAllocatePeriodTarget && (
                                        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="period_target">Set Period Target</Label>
                                                <Input
                                                    id="period_target"
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    value={periodTargetInput}
                                                    onChange={(e) => setPeriodTargetInput(e.target.value)}
                                                    placeholder="Enter period allocation"
                                                />
                                                {node.target_allocation_mode === "lump" &&
                                                    (node.annual_target ?? 0) > 0 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-0 text-xs"
                                                            onClick={() =>
                                                                setPeriodTargetInput(
                                                                    String(node.annual_target)
                                                                )
                                                            }
                                                        >
                                                            Use full annual target
                                                        </Button>
                                                    )}
                                            </div>
                                            <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
                                                <Button
                                                    disabled={isSavingPeriodTarget}
                                                    onClick={async () => {
                                                        try {
                                                            const val =
                                                                periodTargetInput === ""
                                                                    ? null
                                                                    : Number(periodTargetInput);
                                                            await updatePeriodTarget({
                                                                id: node.plan_node_id,
                                                                period_target: val,
                                                            }).unwrap();
                                                            actionFeedback.success("Period target saved");
                                                        } catch (error: unknown) {
                                                            const err = error as { data?: { message?: string } };
                                                            actionFeedback.error(err.data?.message || "Failed to save");
                                                        }
                                                    }}
                                                >
                                                    Save Period Target
                                                </Button>
                                            </PermissionGuard>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {showPeriodActuals && (
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 px-1">Period Achievement</h3>
                    <PlanNodePeriodActualSection
                        node={node}
                        rule={rule}
                        configuredUnits={planningConfig?.target_units}
                        canEdit={canEditPeriodActual}
                        variant="card"
                        focused={focusAchievement}
                    />
                </div>
            )}

            {canEditMasterStructure && (
            <div className={`w-full bg-white rounded-3xl p-6 shadow-sm border ${isEditingFinalizedMaster ? "border-destructive/30" : "border-gray-100"}`}>
                {isEditingFinalizedMaster && (
                    <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        This node belongs to a finalized strategic plan. Assignment changes require
                        confirmation and propagate to annual versions.
                    </div>
                )}
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

                <div className="mb-4 space-y-3 px-2">
                    <PlanAssignmentScopeBanner
                        options={assignmentOptions}
                        isLoading={isOptionsLoading}
                    />
                    <AssignmentModeAlerts options={assignmentOptions} />
                </div>

                <TableLayout
                    actions={actions}
                    sideActions={sideActions}
                    filterColumnsPerRow={1}
                >
                    <DataTable<InternalAssignment | ExternalAssignment, unknown>
                        columns={
                            (activeTab === "internal"
                                ? internalColumns
                                : externalColumns) as ColumnDef<
                                InternalAssignment | ExternalAssignment,
                                unknown
                            >[]
                        }
                        data={assignmentRows}
                        isLoading={isInternalLoading || isExternalLoading || isDeletingInternal || isDeletingExternal || isOptionsLoading}
                        resetKey={`${activeTab}-${showHistory}-${assignmentRows.length}`}
                    />
                </TableLayout>
            </div>
            )}

            {isExecutionVersion && (
                <PlanNodeAssignmentReadOnly
                    internalAssignments={internalAssignments}
                    externalAssignments={externalAssignments}
                    isExternalMode={readOnlyExternalMode}
                    isLoading={isInternalLoading || isExternalLoading}
                />
            )}

            {canEditMasterStructure && (
            <>
            <AssignInternalModal
                isOpen={isInternalModalOpen}
                onClose={() => setInternalModalOpen(false)}
                planNodeId={nodeId}
                nodeType={node?.type}
            />
            <AssignExternalModal
                isOpen={isExternalModalOpen}
                onClose={() => setExternalModalOpen(false)}
                planNodeId={nodeId}
                nodeType={node?.type}
            />
            </>
            )}
        </div>
        </PeriodTargetReallocationReportingProvider>
        </PlanAchievementScopeProvider>
    );
}
