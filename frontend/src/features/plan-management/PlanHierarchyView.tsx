"use client";

import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import {
    useGetPlanHierarchyQuery,
    useDeletePlanNodeMutation,
    useGetPlanVersionByIdQuery,
    useGetAnnualTargetAllocationsQuery,
    useGetPeriodTargetAllocationsQuery,
    useReorderPlanNodesMutation,
    useUpdatePlanNodeMutation,
} from "@/redux/api/planApi";
import { useGetPlanRuleForVersionQuery } from "@/redux/api/planRuleApi";
import { PlanNodeHierarchy, PlanNode, AnnualTargetAllocation, PeriodTargetAllocation, PlanVersion } from "@/redux/types/plan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    ChevronLeft,
    LayoutGrid,
    ListTree,
    Table2,
    ChevronRight,
    Home,
    CalendarDays,
    Clock,
    ShieldCheck,
} from "lucide-react";
import { CreatePlanNodeModal } from "./modals/CreatePlanNodeModal";
import { actionFeedback } from "@/components/action-feedback";
import { useRouter, useSearchParams } from "next/navigation";
import {
    canAddChild,
    getMaxRuleDepth,
    getStepLabel,
    computeEqualContributionWeights,
    findContributionAllocationIssues,
} from "@/utils/planRuleUtils";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";
import { PlanNodeCardGrid } from "./components/PlanNodeCardGrid";
import { PlanHierarchyTree } from "./components/PlanHierarchyTree";
import { PlanHierarchyTableView } from "./components/PlanHierarchyTableView";
import { PlanDraftHeaderMeta } from "./components/PlanDraftHeaderMeta";
import { AnnualVersionsDashboard } from "./components/AnnualVersionsDashboard";
import { PlanReviewDashboard } from "./components/PlanReviewDashboard";
import { ExecutionPeriodsDashboard } from "./components/ExecutionPeriodsDashboard";
import { FinalizeExecutionPeriodsModal } from "./modals/FinalizeExecutionPeriodsModal";
import { usePlanVersionPlanningConfiguration } from "@/hooks/usePlanVersionPlanningConfiguration";
import { formatStatus } from "@/utils/statusFormatter";
import { canEditAnnualTargetForVersion, canEditPeriodTargetForVersion } from "@/utils/planDraftUtils";
import { getExecutionStatusLabel, canEditPeriodActualForVersion, resolvePlanVersionStatusLabel, resolveWorkflowDisplayStatus, resolveExecutionEvaluationStatus } from "@/utils/planExecutionUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
    PLAN_FINALIZE_PERMISSIONS,
    PLAN_REVIEW_DASHBOARD_ACCESS_PERMISSIONS,
    PLAN_REVIEW_RAISE_PERMISSIONS,
    PLAN_STRUCTURE_MUTATION_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import {
    canRaiseReviewIssue,
    formatReviewVersionLabel,
    hasBeenPublishedForReview,
    isPlanCorrectionsUnlocked,
    isPlanInActiveReview,
    isPlanUnderReview,
} from "@/utils/planReviewUtils";
import {
    canEditMasterPlanStructure,
    confirmFinalizedPlanStructureEdit,
    isEditingFinalizedMasterPlan,
} from "@/utils/planMasterEditUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import {
    resolveCompletionForVersion,
    resolveWorkflowStatusAppearance,
    treeHasEvaluableOrContributingProgress,
    versionHasRecordedActuals,
} from "@/utils/performanceColorUtils";
import { PerformanceColorBadge } from "./components/PerformanceColorBadge";
import { EvaluationStatusBadge } from "./components/EvaluationStatusBadge";
import {
    buildHierarchyNumberMap,
    buildSiblingReorderPayload,
    getHierarchyNumber,
} from "@/utils/planNodeOrderUtils";
import { PlanNodeHierarchyNumber } from "./components/PlanNodeHierarchyNumber";
import { PlanTreeAccessBanner } from "./components/PlanTreeAccessBanner";
import {
    PlanDetailHeaderSkeleton,
    PlanDetailLoadingPanel,
    PlanDetailPanelShell,
} from "./components/PlanDetailLoadingStates";
import { isOversightReadOnlyAccessRole } from "@/utils/planTreeAccessUtils";
import { PlanVersionSubNav } from "./components/PlanVersionSubNav";
import { cn } from "@/lib/utils";
import { PlanAchievementScopeProvider } from "@/hooks/usePlanAchievementScope";
import { PlanAchievementPendingPanel } from "./components/PlanAchievementPendingPanel";
import { PlanAchievementPendingValidationPanel } from "./components/PlanAchievementPendingValidationPanel";
import { PlanSectorPublishPanel } from "./components/PlanSectorPublishPanel";
import {
    collectPendingAchievementNodes,
    collectPendingValidationNodes,
} from "@/utils/planAchievementHierarchyUtils";

type ViewMode = "card" | "hierarchy" | "table";
type PlanDetailTab = "hierarchy" | "annual" | "periods" | "review";

function getCurrentNodes(
    hierarchy: PlanNodeHierarchy[],
    pathIds: string[]
): PlanNodeHierarchy[] {
    let nodes = hierarchy;
    for (const id of pathIds) {
        const found = nodes.find((n) => n.plan_node_id === id);
        if (!found) return [];
        nodes = found.children ?? [];
    }
    return nodes;
}

function resolveBreadcrumbPath(
    hierarchy: PlanNodeHierarchy[],
    pathIds: string[]
): PlanNodeHierarchy[] {
    const path: PlanNodeHierarchy[] = [];
    let nodes = hierarchy;
    for (const id of pathIds) {
        const found = nodes.find((n) => n.plan_node_id === id);
        if (!found) break;
        path.push(found);
        nodes = found.children ?? [];
    }
    return path;
}

function flattenHierarchyNodes(nodes: PlanNodeHierarchy[]): PlanNode[] {
    const flat: PlanNode[] = [];
    const walk = (node: PlanNodeHierarchy) => {
        flat.push(node);
        (node.children ?? []).forEach(walk);
    };
    nodes.forEach(walk);
    return flat;
}

export default function PlanHierarchyView({
    versionId,
    mode = "draft",
}: {
    versionId: string;
    mode?: "draft" | "review";
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: version, isLoading: isVersionLoading, isError: isVersionError, refetch: refetchVersion } =
        useGetPlanVersionByIdQuery(versionId);
    const masterVersionId =
        version?.live_master_version_id ??
        (version?.version_kind === "master"
            ? version.plan_version_id
            : version?.version_kind === "annual"
              ? version.parent_plan_version_id
              : null);
    const annualParentId =
        version?.version_kind === "execution_period"
            ? version.parent_plan_version_id
            : null;
    const { data: annualParentVersion } = useGetPlanVersionByIdQuery(annualParentId!, {
        skip: !annualParentId,
    });
    const resolvedMasterVersionId =
        version?.live_master_version_id ??
        (version?.version_kind === "master"
            ? version.plan_version_id
            : version?.version_kind === "annual"
              ? version.parent_plan_version_id
              : version?.version_kind === "execution_period"
                ? annualParentVersion?.parent_plan_version_id ?? null
                : null);
    const { data: masterVersion } = useGetPlanVersionByIdQuery(resolvedMasterVersionId!, {
        skip: !resolvedMasterVersionId,
    });
    const { config: planningConfig } = usePlanVersionPlanningConfiguration(
        version,
        masterVersion
    );
    const thresholds = usePerformanceColorThresholds();
    const { can, canAny } = usePermissions();

    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const view = searchParams.get("view");
        return view === "hierarchy" || view === "table" ? view : "card";
    });
    const [activeTab, setActiveTab] = useState<PlanDetailTab>(() => {
        const tab = searchParams.get("tab");
        return tab === "annual" || tab === "periods" || tab === "review" ? tab : "hierarchy";
    });
    const [pathIds, setPathIds] = useState<string[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [finalizeExecutionPeriodOpen, setFinalizeExecutionPeriodOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState<PlanNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<PlanNode | null>(null);
    const appliedDefaultTabForVersion = useRef<string | null>(null);

    const isReviewMode = mode === "review";
    const isAnnualVersion = version?.version_kind === "annual";
    const isExecutionPeriod = version?.version_kind === "execution_period";

    const awaitingMasterForAnnual =
        isAnnualVersion && !!resolvedMasterVersionId && masterVersion === undefined;
    const awaitingAnnualParentForPeriod =
        isExecutionPeriod && !!annualParentId && annualParentVersion === undefined;

    const effectiveMasterVersion =
        version?.version_kind === "master" ? version : masterVersion;
    const masterReviewStatus = effectiveMasterVersion?.review_status;
    const annualTargetsFinalized = Boolean(
        version?.version_kind === "master"
            ? version?.annual_targets_finalized_at
            : masterVersion?.annual_targets_finalized_at
    );
    const periodsInitializedGlobally = Boolean(
        version?.version_kind === "master"
            ? version?.period_subdivision_mode
            : masterVersion?.period_subdivision_mode ?? version?.period_subdivision_mode
    );
    const showAnnualDashboard =
        version?.version_kind === "master" &&
        (version?.status === "finalized" ||
            (version?.annualVersions && version.annualVersions.length > 0) ||
            (isReviewMode && Boolean(masterReviewStatus)));
    const showPeriodDashboard =
        isAnnualVersion && annualTargetsFinalized && periodsInitializedGlobally;

    const willDefaultToNonHierarchyTab = Boolean(
        version &&
            !isReviewMode &&
            appliedDefaultTabForVersion.current !== versionId &&
            ((version.version_kind === "master" && version.status === "finalized") ||
                (version.version_kind === "annual" &&
                    !awaitingMasterForAnnual &&
                    (masterVersion?.period_subdivision_mode ?? version.period_subdivision_mode)))
    );

    const shouldFetchHierarchy = useMemo(() => {
        if (!versionId || !version) return false;
        if (awaitingMasterForAnnual || awaitingAnnualParentForPeriod) return false;
        if (willDefaultToNonHierarchyTab) return false;
        if (showAnnualDashboard || showPeriodDashboard) {
            return activeTab === "hierarchy";
        }
        return true;
    }, [
        versionId,
        version,
        awaitingMasterForAnnual,
        awaitingAnnualParentForPeriod,
        willDefaultToNonHierarchyTab,
        showAnnualDashboard,
        showPeriodDashboard,
        activeTab,
    ]);

    const { data: rule } = useGetPlanRuleForVersionQuery(versionId, {
        skip: !shouldFetchHierarchy,
    });
    const {
        data: hierarchy = [],
        isLoading: isHierarchyLoading,
        refetch,
    } = useGetPlanHierarchyQuery(versionId, { skip: !shouldFetchHierarchy });
    const [deleteNode] = useDeletePlanNodeMutation();
    const [updateNode, { isLoading: isDistributingContribution }] = useUpdatePlanNodeMutation();
    const [reorderNodes, { isLoading: isReordering }] = useReorderPlanNodesMutation();

    const maxDepth = getMaxRuleDepth(rule);
    const rootLabel = getStepLabel(rule, 1);
    const breadcrumbPath = useMemo(
        () => resolveBreadcrumbPath(hierarchy, pathIds),
        [hierarchy, pathIds]
    );

    useEffect(() => {
        setPathIds((prev) => {
            const next = resolveBreadcrumbPath(hierarchy, prev).map((n) => n.plan_node_id);
            if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
                return prev;
            }
            return next;
        });
    }, [hierarchy]);

    const currentParent = breadcrumbPath.length > 0 ? breadcrumbPath[breadcrumbPath.length - 1] : null;
    const currentNodes = useMemo(
        () => getCurrentNodes(hierarchy, pathIds),
        [hierarchy, pathIds]
    );
    const hierarchyNumberMap = useMemo(
        () => buildHierarchyNumberMap(hierarchy),
        [hierarchy]
    );
    const currentLevel = currentParent ? currentParent.level + 1 : 1;
    const currentLevelLabel = getStepLabel(rule, currentLevel);
    const childLabel = currentLevelLabel;

    const planningStructureId = effectiveMasterVersion?.government_structure_id;
    const plansBasePath = isReviewMode ? "/plans/review" : "/plans";

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (params.get("tab") === activeTab && params.get("view") === viewMode) {
            return;
        }
        params.set("tab", activeTab);
        params.set("view", viewMode);
        router.replace(`${plansBasePath}/${versionId}?${params.toString()}`, { scroll: false });
    }, [activeTab, viewMode, versionId, plansBasePath, router, searchParams]);

    const showRaiseIssue =
        isReviewMode &&
        canRaiseReviewIssue(effectiveMasterVersion) &&
        canAny(PLAN_REVIEW_RAISE_PERMISSIONS);
    const showReviewTab =
        isReviewMode &&
        hasBeenPublishedForReview(effectiveMasterVersion) &&
        canAny(PLAN_REVIEW_DASHBOARD_ACCESS_PERMISSIONS);
    const isMasterDraft =
        version?.version_kind === "master" && version?.status === "draft";
    const isEditingFinalizedMaster =
        !isReviewMode && isEditingFinalizedMasterPlan(version, can);
    const planAccessRole =
        effectiveMasterVersion?.access_role ?? version?.access_role;
    const treeAccessMode =
        effectiveMasterVersion?.tree_access_mode ?? version?.tree_access_mode;
    const isOversightReadOnly = isOversightReadOnlyAccessRole(planAccessRole);
    const canEditMasterStructure =
        canEditMasterPlanStructure(version, can) && !isOversightReadOnly;
    const isReadOnlyHierarchy = !canEditMasterStructure;
    const canEditContribution = isMasterDraft && canEditMasterStructure;
    const flatHierarchyNodes = useMemo(
        () => flattenHierarchyNodes(hierarchy),
        [hierarchy]
    );
    const contributionIssues = useMemo(
        () => findContributionAllocationIssues(flatHierarchyNodes, rule),
        [flatHierarchyNodes, rule]
    );
    const hideAssignments = isAnnualVersion;
    const showAnnualTargets = isAnnualVersion;
    const periodTargetsFinalized = Boolean(
        isExecutionPeriod
            ? annualParentVersion?.period_targets_finalized_at
            : isAnnualVersion
              ? version?.period_targets_finalized_at
              : false
    );
    const processStarted = Boolean(effectiveMasterVersion?.process_started_at);
    const pendingApprovalNodes = useMemo(
        () => (isExecutionPeriod && processStarted ? collectPendingAchievementNodes(hierarchy) : []),
        [hierarchy, isExecutionPeriod, processStarted]
    );
    const pendingValidationNodes = useMemo(
        () => (isExecutionPeriod && processStarted ? collectPendingValidationNodes(hierarchy) : []),
        [hierarchy, isExecutionPeriod, processStarted]
    );
    const showPeriodTargets = isExecutionPeriod && !processStarted;
    const showPeriodActuals = isExecutionPeriod && processStarted;
    const isExecutionSnapshotView = Boolean(version?.execution_snapshot_of_version_id);
    const executionPeriodLocked =
        isExecutionPeriod &&
        processStarted &&
        (version?.execution_status === "locked" || version?.execution_access?.is_locked);
    const executionAnnualLocked =
        isAnnualVersion &&
        processStarted &&
        (version?.execution_status === "locked" || version?.execution_access?.is_locked);
    const executionAnnualOpen =
        isAnnualVersion && processStarted && version?.execution_status === "open";
    const executionPeriodOpen =
        isExecutionPeriod && processStarted && version?.execution_status === "open";
    const canEditAnnualTarget = canEditAnnualTargetForVersion(
        version,
        annualTargetsFinalized,
        masterReviewStatus
    );
    const canEditPeriodTarget = canEditPeriodTargetForVersion(
        version,
        periodTargetsFinalized,
        masterReviewStatus
    );
    const canEditPeriodActual = canEditPeriodActualForVersion(version, processStarted);

    useEffect(() => {
        appliedDefaultTabForVersion.current = null;
    }, [versionId]);

    useLayoutEffect(() => {
        if (!version || appliedDefaultTabForVersion.current === versionId) {
            return;
        }

        if (version.version_kind === "annual" && resolvedMasterVersionId && masterVersion === undefined) {
            return;
        }

        if (version.version_kind === "execution_period" && annualParentId && annualParentVersion === undefined) {
            return;
        }

        if (isReviewMode) {
            setActiveTab("hierarchy");
            appliedDefaultTabForVersion.current = versionId;
            return;
        }

        if (version.version_kind === "master" && version.status === "finalized") {
            setActiveTab("annual");
        } else if (
            version.version_kind === "annual" &&
            (masterVersion?.period_subdivision_mode ?? version.period_subdivision_mode)
        ) {
            setActiveTab("periods");
        } else {
            setActiveTab("hierarchy");
        }

        appliedDefaultTabForVersion.current = versionId;
    }, [version, versionId, masterVersion, resolvedMasterVersionId, annualParentId, annualParentVersion, showReviewTab, isReviewMode]);

    const shouldFetchAnnualAllocations =
        shouldFetchHierarchy && isAnnualVersion && !annualTargetsFinalized;
    const { data: annualAllocationList = [] } = useGetAnnualTargetAllocationsQuery(versionId, {
        skip: !shouldFetchAnnualAllocations,
    });
    const annualTargetAllocations = useMemo(() => {
        const map: Record<string, AnnualTargetAllocation> = {};
        for (const item of annualAllocationList) {
            map[item.plan_node_id] = item;
        }
        return map;
    }, [annualAllocationList]);

    const shouldFetchPeriodAllocations =
        shouldFetchHierarchy && isExecutionPeriod && !periodTargetsFinalized;
    const { data: periodAllocationList = [] } = useGetPeriodTargetAllocationsQuery(versionId, {
        skip: !shouldFetchPeriodAllocations,
    });
    const periodTargetAllocations = useMemo(() => {
        const map: Record<string, PeriodTargetAllocation> = {};
        for (const item of periodAllocationList) {
            map[item.plan_node_id] = item;
        }
        return map;
    }, [periodAllocationList]);

    const periodHasRecordedActuals = useMemo(
        () =>
            versionHasRecordedActuals(version ?? {}) ||
            version?.execution_is_evaluable === true ||
            treeHasEvaluableOrContributingProgress(hierarchy),
        [version, hierarchy]
    );

    const versionProgress = version
        ? resolveCompletionForVersion(
              thresholds,
              version,
              processStarted,
              periodHasRecordedActuals
          )
        : null;

    const versionPlanningStatusLabel = (v: Pick<PlanVersion, "status">) =>
        formatStatus(v?.status ?? "draft");

    const versionStatusAppearance = version
        ? resolveWorkflowStatusAppearance(thresholds, {
              status: resolveWorkflowDisplayStatus(version, processStarted),
              isLocked:
                  processStarted &&
                  (version.execution_status === "locked" ||
                      version.execution_access?.is_locked ||
                      false),
              progress: versionProgress ?? undefined,
              statusLabel: resolvePlanVersionStatusLabel(
                  version,
                  processStarted,
                  versionPlanningStatusLabel
              ),
              useAchievementColors:
                  (versionProgress?.visible ?? false) &&
                  version.execution_status !== "completed",
          })
        : null;

    const versionEvaluationStatus = version
        ? resolveExecutionEvaluationStatus(version, processStarted)
        : null;

    const canAddAtCurrentLevel =
        canEditMasterStructure &&
        (currentParent ? canAddChild(rule, currentParent) : canAddChild(rule, null));
    const isAtRoot = breadcrumbPath.length === 0;

    const confirmIfFinalizedEdit = async (actionLabel: string) => {
        if (!isEditingFinalizedMaster) return true;
        return confirmFinalizedPlanStructureEdit(actionLabel);
    };

    const handleAddAtLevel = async () => {
        if (!(await confirmIfFinalizedEdit("Adding a node"))) return;
        setSelectedParent(currentParent);
        setSelectedNode(null);
        setModalOpen(true);
    };

    const handleAddChild = async (parent: PlanNode) => {
        if (!(await confirmIfFinalizedEdit("Adding a child node"))) return;
        setSelectedParent(parent);
        setSelectedNode(null);
        setModalOpen(true);
    };

    const handleEdit = async (node: PlanNode) => {
        if (!(await confirmIfFinalizedEdit("Editing a node"))) return;
        setSelectedNode(node);
        setSelectedParent(null);
        setModalOpen(true);
    };

    const handleDelete = async (nodeId: string) => {
        if (!(await confirmIfFinalizedEdit("Deleting a node"))) return;
        if (await actionFeedback.confirm("Are you sure you want to delete this node and all its children?", { destructive: true })) {
            try {
                await deleteNode(nodeId).unwrap();
                actionFeedback.success("Node deleted successfully");
                setPathIds((prev) => prev.filter((id) => id !== nodeId));
                refetch();
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                actionFeedback.error(error.data?.message || "Failed to delete node");
            }
        }
    };

    const handleDistributeContributionEqually = async (
        _parent: PlanNode,
        children: PlanNode[]
    ) => {
        const activeChildren = children.filter((child) => child.is_active !== false);
        if (activeChildren.length === 0) return;
        if (!(await confirmIfFinalizedEdit("Distributing contribution weights"))) return;

        const weights = computeEqualContributionWeights(activeChildren.length);
        try {
            await Promise.all(
                activeChildren.map((child, index) =>
                    updateNode({
                        id: child.plan_node_id,
                        data: { contribution_weight: weights[index] },
                    }).unwrap()
                )
            );
            actionFeedback.success("Contribution weights distributed equally among children");
            refetch();
        } catch (error: unknown) {
            actionFeedback.error(getApiErrorMessage(error, "Failed to distribute contribution weights"));
        }
    };

    const handleDrillDown = (node: PlanNodeHierarchy) => {
        if (node.children?.length) {
            setPathIds((prev) => [...prev, node.plan_node_id]);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index < 0) {
            setPathIds([]);
        } else {
            setPathIds((prev) => prev.slice(0, index + 1));
        }
    };

    const handleViewDetails = (nodeId: string) => {
        router.push(`${plansBasePath}/${versionId}/nodes/${nodeId}`);
    };

    const handleMoveNode = async (
        nodeId: string,
        direction: "up" | "down",
        siblings: PlanNode[]
    ) => {
        if (isReadOnlyHierarchy) return;
        if (!(await confirmIfFinalizedEdit("Reordering nodes"))) return;

        const payload = buildSiblingReorderPayload(siblings, nodeId, direction);
        if (!payload) return;

        try {
            await reorderNodes(payload).unwrap();
            refetch();
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            actionFeedback.error(error.data?.message || "Failed to reorder nodes");
        }
    };

    const isBootstrappingRelatedVersions =
        awaitingMasterForAnnual || awaitingAnnualParentForPeriod;

    const emptyState = (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-gray-400" />
            </div>
            {treeAccessMode === "none" || (hierarchy.length === 0 && isOversightReadOnly) ? (
                <>
                    <h3 className="text-lg font-semibold text-gray-900">No visible nodes</h3>
                    <p className="text-gray-500 mb-6">
                        Your current access does not include any nodes in this plan hierarchy.
                    </p>
                </>
            ) : (
                <>
                    <h3 className="text-lg font-semibold text-gray-900">No {childLabel.toLowerCase()} yet</h3>
                    <p className="text-gray-500 mb-6">
                        {isAtRoot
                            ? `Start by adding the first ${rootLabel.toLowerCase()} to this plan draft.`
                            : `Add a ${childLabel.toLowerCase()} under "${currentParent?.title}".`}
                    </p>
                    {canAddAtCurrentLevel && (
                        <PermissionGuard requireAny={PLAN_STRUCTURE_MUTATION_PERMISSIONS}>
                            <Button
                                onClick={handleAddAtLevel}
                                variant={isEditingFinalizedMaster ? "destructive" : "outline"}
                            >
                                Add {childLabel}
                            </Button>
                        </PermissionGuard>
                    )}
                </>
            )}
        </div>
    );

    const hierarchyToolbar = (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                <Button
                    variant={viewMode === "card" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2 h-8"
                    onClick={() => setViewMode("card")}
                >
                    <LayoutGrid className="h-4 w-4" />
                    Cards
                </Button>
                <Button
                    variant={viewMode === "hierarchy" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2 h-8"
                    onClick={() => setViewMode("hierarchy")}
                >
                    <ListTree className="h-4 w-4" />
                    Hierarchy
                </Button>
                <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2 h-8"
                    onClick={() => {
                        setPathIds([]);
                        setViewMode("table");
                    }}
                >
                    <Table2 className="h-4 w-4" />
                    Table
                </Button>
            </div>
            {canAddAtCurrentLevel && (
                <PermissionGuard requireAny={PLAN_STRUCTURE_MUTATION_PERMISSIONS}>
                    <Button
                        onClick={handleAddAtLevel}
                        variant={isEditingFinalizedMaster ? "destructive" : "default"}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" /> Add {childLabel}
                    </Button>
                </PermissionGuard>
            )}
        </div>
    );

    const detailTabToggle = showAnnualDashboard ? (
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 flex-wrap">
            <Button
                variant={activeTab === "hierarchy" ? "default" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => setActiveTab("hierarchy")}
            >
                <ListTree className="h-4 w-4" />
                Plan Hierarchy
            </Button>
            <Button
                variant={activeTab === "annual" ? "default" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => setActiveTab("annual")}
            >
                <CalendarDays className="h-4 w-4" />
                Annual Execution
            </Button>
            {showReviewTab && (
                <Button
                    variant={activeTab === "review" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2 h-8"
                    onClick={() => setActiveTab("review")}
                >
                    <ShieldCheck className="h-4 w-4" />
                    Review Dashboard
                </Button>
            )}
        </div>
    ) : showPeriodDashboard ? (
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <Button
                variant={activeTab === "hierarchy" ? "default" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => setActiveTab("hierarchy")}
            >
                <ListTree className="h-4 w-4" />
                Plan Hierarchy
            </Button>
            <Button
                variant={activeTab === "periods" ? "default" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => setActiveTab("periods")}
            >
                <Clock className="h-4 w-4" />
                Execution Periods
            </Button>
        </div>
    ) : null;

    const hierarchyBody = isHierarchyLoading ? (
        <PlanDetailLoadingPanel variant="hierarchy" />
    ) : (
        <>
            {(treeAccessMode || planAccessRole) && (
                <PlanTreeAccessBanner
                    treeAccessMode={treeAccessMode}
                    accessRole={planAccessRole}
                    hierarchyEmpty={hierarchy.length === 0}
                />
            )}

            {isEditingFinalizedMaster && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    You are editing a finalized strategic plan. Changes affect annual and period
                    versions. Each action requires confirmation.
                </div>
            )}

            {isMasterDraft && contributionIssues.length > 0 && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 space-y-2">
                    <p className="font-medium">Contribution weights need attention before finalize</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                        {contributionIssues.slice(0, 5).map((issue) => (
                            <li key={issue.parentId}>
                                <span className="font-medium">{issue.parentTitle}</span>: children
                                sum to {issue.sum}% (need 100%)
                                {issue.missingCount > 0
                                    ? ` · ${issue.missingCount} missing value${issue.missingCount === 1 ? "" : "s"}`
                                    : ""}
                            </li>
                        ))}
                    </ul>
                    {contributionIssues.length > 5 && (
                        <p className="text-xs text-violet-800">
                            +{contributionIssues.length - 5} more parent group
                            {contributionIssues.length - 5 === 1 ? "" : "s"} with incomplete allocation
                        </p>
                    )}
                </div>
            )}

            {isReviewMode && isPlanUnderReview(masterReviewStatus) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    This is the full published review version. Browse the strategic plan, annual
                    execution, and execution periods, then raise issues where needed.
                </div>
            )}

            {!isReviewMode && isPlanUnderReview(masterReviewStatus) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    This plan is under review. All content is read-only here. Reviewers should use
                    Plan Review in the sidebar to browse assigned sections and raise issues.
                </div>
            )}

            {isPlanCorrectionsUnlocked(masterReviewStatus) && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                    Review corrections are unlocked. Apply approved changes, then republish for
                    review when ready.
                </div>
            )}

            {processStarted && version?.version_kind === "master" && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            Process started
                            {version.process_started_at
                                ? ` on ${new Date(version.process_started_at).toLocaleDateString()}`
                                : ""}
                            . Execution version{" "}
                            {version.active_execution_snapshot_id ? "is active" : "pending"} —
                            use the Annual Execution tab to work through each year in order.
                        </p>
                        {versionProgress?.visible && (
                            <div className="flex items-center gap-2 shrink-0">
                                <PerformanceColorBadge
                                    color={versionProgress.color}
                                    label={`${versionProgress.percent}% plan achievement`}
                                    variant="tint"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isReadOnlyHierarchy && version?.status === "finalized" && showAnnualDashboard && !isEditingFinalizedMaster && !isPlanInActiveReview(effectiveMasterVersion) && !processStarted && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    Strategic draft is finalized. Use the Annual Execution tab to distribute annual
                    targets across years (total must match the draft), then finalize annual execution.
                </div>
            )}

            {isReadOnlyHierarchy && isAnnualVersion && showPeriodDashboard && !periodsInitializedGlobally && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    Annual execution is finalized. On the strategic plan&apos;s Annual Execution tab,
                    use Initialize Execution Periods once — the same subdivision applies to all years.
                </div>
            )}

            {isAnnualVersion && processStarted && (
                <div
                    className={cn(
                        "rounded-lg border px-4 py-3 text-sm",
                        executionAnnualOpen
                            ? "border-green-200 bg-green-50 text-green-900"
                            : executionAnnualLocked
                              ? "border-slate-200 bg-slate-50 text-slate-800"
                              : "border-blue-200 bg-blue-50 text-blue-900"
                    )}
                >
                    Annual execution —{" "}
                    {resolvePlanVersionStatusLabel(
                        version,
                        processStarted,
                        versionPlanningStatusLabel
                    )}
                    .
                    {executionAnnualLocked
                        ? " This year is view-only until the previous year is completed."
                        : executionAnnualOpen
                          ? " Open execution periods below to record achievements."
                          : " This year is completed."}
                </div>
            )}

            {isExecutionPeriod && processStarted && (
                <div
                    className={cn(
                        "rounded-lg border px-4 py-3 text-sm",
                        executionPeriodOpen
                            ? "border-green-200 bg-green-50 text-green-900"
                            : executionPeriodLocked
                              ? "border-slate-200 bg-slate-50 text-slate-800"
                              : "border-blue-200 bg-blue-50 text-blue-900"
                    )}
                >
                    {isExecutionSnapshotView
                        ? "Execution version"
                        : "Planning version"}{" "}
                    — {getExecutionStatusLabel(version?.execution_status)}.
                    {executionPeriodLocked
                        ? " This period is view-only until the previous period is completed."
                        : executionPeriodOpen
                          ? " Record achievement on assigned leaf nodes, then submit for approval where required."
                          : " This period is completed."}
                </div>
            )}

            {isExecutionPeriod && processStarted && (
                <div className="space-y-3">
                    <PlanSectorPublishPanel versionId={versionId} />
                    <PlanAchievementPendingPanel
                        pendingNodes={pendingApprovalNodes}
                        hierarchyNumberMap={hierarchyNumberMap}
                        configuredUnits={planningConfig?.target_units}
                        onNavigateToNode={handleViewDetails}
                    />
                    <PlanAchievementPendingValidationPanel
                        pendingNodes={pendingValidationNodes}
                        hierarchyNumberMap={hierarchyNumberMap}
                        configuredUnits={planningConfig?.target_units}
                        onNavigateToNode={handleViewDetails}
                    />
                </div>
            )}

            {isReadOnlyHierarchy && isExecutionPeriod && !processStarted && !periodTargetsFinalized && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    Set period targets so totals match this year&apos;s annual targets. Divisible KPIs
                    need a share in every period; lump KPIs may place the full target in the delivery
                    period(s). Finalize execution period from the annual plan when this year is ready.
                </div>
            )}

            {isReadOnlyHierarchy && isAnnualVersion && showPeriodDashboard && periodsInitializedGlobally && !periodTargetsFinalized && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    Open each execution period, set period targets so totals match annual targets
                    (lump KPIs may use fewer periods), then use Finalize Execution Period for this
                    year.
                </div>
            )}

            {isReadOnlyHierarchy && isAnnualVersion && showPeriodDashboard && periodTargetsFinalized && version?.period_targets_finalized_at && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                    Execution period finalized for {version.planning_year ?? version.year} on{" "}
                    {new Date(version.period_targets_finalized_at).toLocaleDateString()}.
                </div>
            )}

            {/* Breadcrumb navigation (card & tree drill-down; table shows all strategic sections) */}
            {viewMode !== "table" && (
            <nav className="flex items-center gap-1 flex-wrap text-sm bg-white rounded-xl border border-gray-100 px-4 py-3">
                <button
                    type="button"
                    onClick={() => handleBreadcrumbClick(-1)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
                        isAtRoot
                            ? "text-primary font-semibold bg-primary/5"
                            : "text-gray-500 hover:text-primary hover:bg-gray-50"
                    }`}
                >
                    <Home className="h-3.5 w-3.5" />
                    {rootLabel}
                </button>
                {breadcrumbPath.map((node, index) => (
                    <span key={node.plan_node_id} className="inline-flex items-center gap-1">
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                        <button
                            type="button"
                            onClick={() => handleBreadcrumbClick(index)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors max-w-[240px] ${
                                index === breadcrumbPath.length - 1
                                    ? "text-primary font-semibold bg-primary/5"
                                    : "text-gray-500 hover:text-primary hover:bg-gray-50"
                            }`}
                        >
                            {getHierarchyNumber(hierarchyNumberMap, node.plan_node_id) && (
                                <PlanNodeHierarchyNumber
                                    value={
                                        getHierarchyNumber(
                                            hierarchyNumberMap,
                                            node.plan_node_id
                                        )!
                                    }
                                    size="sm"
                                />
                            )}
                            <span className="truncate">{node.title}</span>
                        </button>
                    </span>
                ))}
                {!isAtRoot && (
                    <>
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                        <span className="text-gray-400 px-2 py-1">{currentLevelLabel}</span>
                    </>
                )}
            </nav>
            )}

            {/* Content */}
            {viewMode === "table" ? (
                hierarchy.length > 0 ? (
                    <PlanHierarchyTableView
                        roots={hierarchy}
                        hierarchyNumberMap={hierarchyNumberMap}
                        rule={rule}
                        rootLabel={rootLabel}
                        governmentStructureId={planningStructureId}
                        onAddChild={handleAddChild}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                        onMoveNode={handleMoveNode}
                        isReordering={isReordering}
                        readOnly={isReadOnlyHierarchy}
                        dangerMode={isEditingFinalizedMaster}
                        showRaiseIssue={showRaiseIssue}
                        hideAssignments={hideAssignments}
                        showAnnualTargets={showAnnualTargets}
                        showPeriodTargets={showPeriodTargets}
                        showPeriodActuals={showPeriodActuals}
                        canEditPeriodActual={canEditPeriodActual}
                        useExecutionCompletion={showPeriodActuals}
                        processStarted={processStarted}
                        periodHasRecordedActuals={periodHasRecordedActuals}
                        canEditAnnualTarget={canEditAnnualTarget}
                        canEditPeriodTarget={canEditPeriodTarget}
                        annualTargetAllocations={annualTargetAllocations}
                        periodTargetAllocations={periodTargetAllocations}
                        canEditContribution={canEditContribution}
                        onDistributeContributionEqually={handleDistributeContributionEqually}
                        isDistributingContribution={isDistributingContribution}
                    />
                ) : (
                    emptyState
                )
            ) : viewMode === "card" ? (
                currentNodes.length > 0 ? (
                    <PlanNodeCardGrid
                        nodes={currentNodes}
                        hierarchyNumberMap={hierarchyNumberMap}
                        rule={rule}
                        governmentStructureId={planningStructureId}
                        showDualTargets={isAnnualVersion || isExecutionPeriod}
                        showAnnualTargets={showAnnualTargets}
                        showPeriodTargets={showPeriodTargets}
                        showPeriodActuals={showPeriodActuals}
                        canEditPeriodActual={canEditPeriodActual}
                        useExecutionCompletion={showPeriodActuals}
                        processStarted={processStarted}
                        periodHasRecordedActuals={periodHasRecordedActuals}
                        hideAssignments={hideAssignments}
                        canEditAnnualTarget={canEditAnnualTarget}
                        canEditPeriodTarget={canEditPeriodTarget}
                        annualTargetAllocations={annualTargetAllocations}
                        periodTargetAllocations={periodTargetAllocations}
                        canEditContribution={canEditContribution}
                        onDistributeContributionEqually={handleDistributeContributionEqually}
                        isDistributingContribution={isDistributingContribution}
                        onAddChild={handleAddChild}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                        onDrillDown={handleDrillDown}
                        onMoveNode={(nodeId, direction) =>
                            handleMoveNode(nodeId, direction, currentNodes)
                        }
                        isReordering={isReordering}
                        readOnly={isReadOnlyHierarchy}
                        dangerMode={isEditingFinalizedMaster}
                        showRaiseIssue={showRaiseIssue}
                    />
                ) : (
                    emptyState
                )
            ) : isAtRoot && hierarchy.length > 0 ? (
                <PlanHierarchyTree
                    nodes={hierarchy}
                    hierarchyNumberMap={hierarchyNumberMap}
                    rule={rule}
                    governmentStructureId={planningStructureId}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                    onDrillDown={handleDrillDown}
                    onMoveNode={handleMoveNode}
                    isReordering={isReordering}
                    scoped={false}
                    readOnly={isReadOnlyHierarchy}
                    dangerMode={isEditingFinalizedMaster}
                    showRaiseIssue={showRaiseIssue}
                    hideAssignments={hideAssignments}
                    showAnnualTargets={showAnnualTargets}
                    showPeriodTargets={showPeriodTargets}
                    showPeriodActuals={showPeriodActuals}
                    canEditPeriodActual={canEditPeriodActual}
                    useExecutionCompletion={showPeriodActuals}
                    processStarted={processStarted}
                    periodHasRecordedActuals={periodHasRecordedActuals}
                    canEditAnnualTarget={canEditAnnualTarget}
                    canEditPeriodTarget={canEditPeriodTarget}
                    annualTargetAllocations={annualTargetAllocations}
                    periodTargetAllocations={periodTargetAllocations}
                    canEditContribution={canEditContribution}
                    onDistributeContributionEqually={handleDistributeContributionEqually}
                    isDistributingContribution={isDistributingContribution}
                />
            ) : currentNodes.length > 0 ? (
                <PlanHierarchyTree
                    nodes={currentNodes}
                    hierarchyNumberMap={hierarchyNumberMap}
                    rule={rule}
                    governmentStructureId={planningStructureId}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                    onDrillDown={handleDrillDown}
                    onMoveNode={handleMoveNode}
                    isReordering={isReordering}
                    scoped
                    readOnly={isReadOnlyHierarchy}
                    dangerMode={isEditingFinalizedMaster}
                    showRaiseIssue={showRaiseIssue}
                    hideAssignments={hideAssignments}
                    showAnnualTargets={showAnnualTargets}
                    showPeriodTargets={showPeriodTargets}
                    showPeriodActuals={showPeriodActuals}
                    canEditPeriodActual={canEditPeriodActual}
                    useExecutionCompletion={showPeriodActuals}
                    processStarted={processStarted}
                    periodHasRecordedActuals={periodHasRecordedActuals}
                    canEditAnnualTarget={canEditAnnualTarget}
                    canEditPeriodTarget={canEditPeriodTarget}
                    annualTargetAllocations={annualTargetAllocations}
                    periodTargetAllocations={periodTargetAllocations}
                    canEditContribution={canEditContribution}
                    onDistributeContributionEqually={handleDistributeContributionEqually}
                    isDistributingContribution={isDistributingContribution}
                />
            ) : (
                emptyState
            )}
        </>
    );

    if (isVersionError) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
                    <p className="text-destructive font-medium">Failed to load this plan version.</p>
                    <p className="text-muted-foreground text-sm">
                        The plan may not exist or you may not have access.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.push(plansBasePath)}>
                            Back to plans
                        </Button>
                        <Button onClick={() => refetchVersion()}>Retry</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PlanAchievementScopeProvider
            versionId={versionId}
            enabled={Boolean(isExecutionPeriod && processStarted)}
        >
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(plansBasePath)}
                        className="rounded-full shrink-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        {isVersionLoading && !version ? (
                            <PlanDetailHeaderSkeleton />
                        ) : (
                            <>
                                <PlanDraftHeaderMeta version={version} config={planningConfig} />
                                {version && versionStatusAppearance && (
                                    <div className="flex items-center gap-2 flex-wrap mt-1">
                                        <PerformanceColorBadge
                                            color={versionStatusAppearance.color}
                                            label={versionStatusAppearance.label}
                                            variant="solid"
                                        />
                                        {versionProgress?.visible && (
                                            <Badge
                                                variant="outline"
                                                style={{
                                                    borderColor: `${versionProgress.color}55`,
                                                    color: versionProgress.color,
                                                }}
                                            >
                                                {versionProgress.percent}% achievement
                                            </Badge>
                                        )}
                                        {processStarted && versionEvaluationStatus && (
                                            <EvaluationStatusBadge
                                                status={versionEvaluationStatus}
                                            />
                                        )}
                                        {version.version_kind === "execution_period" && version.period_label && (
                                            <Badge variant="outline">{version.period_label}</Badge>
                                        )}
                                        {masterReviewStatus && (
                                            <Badge variant="outline" className="capitalize border-amber-200 bg-amber-50 text-amber-800">
                                                {masterReviewStatus.replace(/_/g, " ")}
                                            </Badge>
                                        )}
                                        {isReviewMode && version?.review_version_number && (
                                            <Badge variant="outline" className="font-mono text-xs border-blue-200 bg-blue-50 text-blue-800">
                                                {formatReviewVersionLabel(version.review_version_number)}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                                {rule && (
                                    <div className="flex items-center gap-2 text-gray-500 flex-wrap mt-1">
                                        <Badge variant="outline">{rule.name}</Badge>
                                        <span className="text-xs">({maxDepth} levels)</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <PlanVersionSubNav
                        versionId={versionId}
                        mode={isReviewMode ? "review" : "draft"}
                    />
                    {(!showAnnualDashboard && !showPeriodDashboard || activeTab === "hierarchy") &&
                        hierarchyToolbar}
                </div>
            </div>

            {isBootstrappingRelatedVersions ? (
                <PlanDetailPanelShell
                    toolbar={
                        awaitingMasterForAnnual && !isReviewMode ? (
                            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 h-8"
                                    disabled
                                >
                                    <ListTree className="h-4 w-4" />
                                    Plan Hierarchy
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-2 h-8"
                                    disabled
                                >
                                    <Clock className="h-4 w-4" />
                                    Execution Periods
                                </Button>
                            </div>
                        ) : (
                            detailTabToggle
                        )
                    }
                >
                    <PlanDetailLoadingPanel
                        variant="cards"
                        count={isAnnualVersion ? 4 : 3}
                    />
                </PlanDetailPanelShell>
            ) : showAnnualDashboard ? (
                <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-end px-4 py-3 border-b border-gray-100">
                        {detailTabToggle}
                    </div>
                    <div className="p-4 sm:p-6 space-y-6">
                        {activeTab === "annual" ? (
                            version && (
                                <AnnualVersionsDashboard masterVersion={version} mode={mode} />
                            )
                        ) : activeTab === "review" && resolvedMasterVersionId ? (
                            <PlanReviewDashboard masterVersionId={resolvedMasterVersionId} />
                        ) : (
                            hierarchyBody
                        )}
                    </div>
                </div>
            ) : showPeriodDashboard ? (
                <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-100 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {periodsInitializedGlobally &&
                                !periodTargetsFinalized && (
                                    <PermissionGuard requireAll={PLAN_FINALIZE_PERMISSIONS}>
                                        <Button
                                            className="gap-2"
                                            onClick={() => setFinalizeExecutionPeriodOpen(true)}
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            Finalize Execution Period
                                        </Button>
                                    </PermissionGuard>
                                )}
                        </div>
                        {detailTabToggle}
                    </div>
                    <div className="p-4 sm:p-6 space-y-6">
                        {activeTab === "periods" ? (
                            version && (
                                <ExecutionPeriodsDashboard
                                    annualVersion={version}
                                    masterVersion={masterVersion ?? undefined}
                                    mode={mode}
                                />
                            )
                        ) : (
                            hierarchyBody
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">{hierarchyBody}</div>
            )}

            <CreatePlanNodeModal
                isOpen={isModalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedParent(null);
                    setSelectedNode(null);
                    refetch();
                }}
                planVersionId={versionId}
                parentNode={selectedParent}
                node={selectedNode}
            />

            {version && isAnnualVersion && (
                <FinalizeExecutionPeriodsModal
                    key={version.plan_version_id}
                    isOpen={finalizeExecutionPeriodOpen}
                    onClose={() => setFinalizeExecutionPeriodOpen(false)}
                    annualVersion={version}
                    onSuccess={() => {
                        refetch();
                        refetchVersion();
                    }}
                />
            )}
        </div>
        </PlanAchievementScopeProvider>
    );
}