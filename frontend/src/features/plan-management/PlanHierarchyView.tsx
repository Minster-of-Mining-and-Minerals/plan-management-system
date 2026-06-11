"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
    useGetPlanHierarchyQuery,
    useDeletePlanNodeMutation,
    useGetPlanVersionByIdQuery,
    useGetAnnualTargetAllocationsQuery,
    useReorderPlanNodesMutation,
} from "@/redux/api/planApi";
import { useGetPlanRuleForVersionQuery } from "@/redux/api/planRuleApi";
import { PlanNodeHierarchy, PlanNode, AnnualTargetAllocation } from "@/redux/types/plan";
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
} from "lucide-react";
import { CreatePlanNodeModal } from "./modals/CreatePlanNodeModal";
import { actionFeedback } from "@/components/action-feedback";
import { useRouter } from "next/navigation";
import {
    canAddChild,
    getMaxRuleDepth,
    getStepLabel,
} from "@/utils/planRuleUtils";
import { PlanNodeCardGrid } from "./components/PlanNodeCardGrid";
import { PlanHierarchyTree } from "./components/PlanHierarchyTree";
import { PlanHierarchyTableView } from "./components/PlanHierarchyTableView";
import { PlanDraftHeaderMeta } from "./components/PlanDraftHeaderMeta";
import { AnnualVersionsDashboard } from "./components/AnnualVersionsDashboard";
import { ExecutionPeriodsDashboard } from "./components/ExecutionPeriodsDashboard";
import { useGetPlanningConfigurationQuery } from "@/redux/api/planningConfigApi";
import { formatStatus } from "@/utils/statusFormatter";
import { canEditAnnualTargetForVersion } from "@/utils/planDraftUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import {
    resolveCompletionForEntity,
    resolveWorkflowStatusAppearance,
} from "@/utils/performanceColorUtils";
import { PerformanceColorBadge } from "./components/PerformanceColorBadge";
import {
    buildHierarchyNumberMap,
    buildSiblingReorderPayload,
    getHierarchyNumber,
    sortPlanNodes,
} from "@/utils/planNodeOrderUtils";
import { PlanNodeHierarchyNumber } from "./components/PlanNodeHierarchyNumber";

type ViewMode = "card" | "hierarchy" | "table";
type PlanDetailTab = "hierarchy" | "annual" | "periods";

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

export default function PlanHierarchyView({ versionId }: { versionId: string }) {
    const router = useRouter();
    const { data: version } = useGetPlanVersionByIdQuery(versionId);
    const masterVersionId =
        version?.version_kind === "master"
            ? version.plan_version_id
            : version?.version_kind === "annual"
              ? version.parent_plan_version_id
              : version?.version_kind === "execution_period"
                ? null
                : null;
    const annualParentId =
        version?.version_kind === "execution_period"
            ? version.parent_plan_version_id
            : null;
    const { data: masterVersion } = useGetPlanVersionByIdQuery(masterVersionId!, {
        skip: !masterVersionId,
    });
    const { data: annualParentVersion } = useGetPlanVersionByIdQuery(annualParentId!, {
        skip: !annualParentId,
    });
    const { data: planningConfig } = useGetPlanningConfigurationQuery();
    const { data: rule } = useGetPlanRuleForVersionQuery(versionId);
    const { data: hierarchy = [], isLoading, refetch } = useGetPlanHierarchyQuery(versionId);
    const [deleteNode] = useDeletePlanNodeMutation();
    const [reorderNodes, { isLoading: isReordering }] = useReorderPlanNodesMutation();
    const thresholds = usePerformanceColorThresholds();

    const [viewMode, setViewMode] = useState<ViewMode>("card");
    const [activeTab, setActiveTab] = useState<PlanDetailTab>("hierarchy");
    const [pathIds, setPathIds] = useState<string[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState<PlanNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<PlanNode | null>(null);
    const appliedDefaultTabForVersion = useRef<string | null>(null);

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
        () => sortPlanNodes(getCurrentNodes(hierarchy, pathIds)),
        [hierarchy, pathIds]
    );
    const hierarchyNumberMap = useMemo(
        () => buildHierarchyNumberMap(hierarchy),
        [hierarchy]
    );
    const currentLevel = currentParent ? currentParent.level + 1 : 1;
    const currentLevelLabel = getStepLabel(rule, currentLevel);
    const childLabel = currentLevelLabel;

    const isMasterDraft =
        version?.version_kind === "master" && version?.status === "draft";
    const isAnnualVersion = version?.version_kind === "annual";
    const isExecutionPeriod = version?.version_kind === "execution_period";
    const isReadOnlyHierarchy = !isMasterDraft;
    const hideAssignments = isAnnualVersion;
    const showAnnualTargets = isAnnualVersion;
    const annualTargetsFinalized = Boolean(
        version?.version_kind === "master"
            ? version?.annual_targets_finalized_at
            : masterVersion?.annual_targets_finalized_at
    );
    const periodTargetsFinalized = Boolean(
        version?.version_kind === "annual"
            ? version?.period_targets_finalized_at
            : annualParentVersion?.period_targets_finalized_at
    );
    const periodsInitializedGlobally = Boolean(
        version?.version_kind === "master"
            ? version?.period_subdivision_mode
            : masterVersion?.period_subdivision_mode ?? version?.period_subdivision_mode
    );
    const canEditAnnualTarget = canEditAnnualTargetForVersion(version, annualTargetsFinalized);
    const showAnnualDashboard =
        version?.version_kind === "master" &&
        (version?.status === "finalized" ||
            (version?.annualVersions && version.annualVersions.length > 0));
    const showPeriodDashboard =
        isAnnualVersion && annualTargetsFinalized && periodsInitializedGlobally;

    useEffect(() => {
        appliedDefaultTabForVersion.current = null;
    }, [versionId]);

    useEffect(() => {
        if (!version || appliedDefaultTabForVersion.current === versionId) {
            return;
        }

        if (version.version_kind === "annual" && masterVersionId && masterVersion === undefined) {
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
    }, [version, versionId, masterVersion, masterVersionId]);

    const shouldFetchAnnualAllocations = isAnnualVersion && !annualTargetsFinalized;
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

    const versionStatusAppearance = version
        ? resolveWorkflowStatusAppearance(thresholds, {
              status: version.status ?? "draft",
              isLocked: false,
              progressPercent: resolveCompletionForEntity(
                  thresholds,
                  version.plan_version_id
              ).percent,
              statusLabel: formatStatus(version.status),
          })
        : null;

    const canAddAtCurrentLevel =
        isMasterDraft &&
        (currentParent ? canAddChild(rule, currentParent) : canAddChild(rule, null));
    const isAtRoot = breadcrumbPath.length === 0;

    const handleAddAtLevel = () => {
        setSelectedParent(currentParent);
        setSelectedNode(null);
        setModalOpen(true);
    };

    const handleAddChild = (parent: PlanNode) => {
        setSelectedParent(parent);
        setSelectedNode(null);
        setModalOpen(true);
    };

    const handleEdit = (node: PlanNode) => {
        setSelectedNode(node);
        setSelectedParent(null);
        setModalOpen(true);
    };

    const handleDelete = async (nodeId: string) => {
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
        router.push(`/plans/${versionId}/nodes/${nodeId}`);
    };

    const handleMoveNode = async (
        nodeId: string,
        direction: "up" | "down",
        siblings: PlanNode[]
    ) => {
        if (isReadOnlyHierarchy) return;

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

    if (isLoading) {
        return <div className="p-8 text-center">Loading hierarchy...</div>;
    }

    const emptyState = (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No {childLabel.toLowerCase()} yet</h3>
            <p className="text-gray-500 mb-6">
                {isAtRoot
                    ? `Start by adding the first ${rootLabel.toLowerCase()} to this plan draft.`
                    : `Add a ${childLabel.toLowerCase()} under "${currentParent?.title}".`}
            </p>
            {canAddAtCurrentLevel && (
                <Button onClick={handleAddAtLevel} variant="outline">
                    Add {childLabel}
                </Button>
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
                <Button onClick={handleAddAtLevel} className="gap-2">
                    <Plus className="h-4 w-4" /> Add {childLabel}
                </Button>
            )}
        </div>
    );

    const detailTabToggle = showAnnualDashboard ? (
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
                variant={activeTab === "annual" ? "default" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => setActiveTab("annual")}
            >
                <CalendarDays className="h-4 w-4" />
                Annual Execution
            </Button>
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

    const hierarchyBody = (
        <>
            {isReadOnlyHierarchy && version?.status === "finalized" && showAnnualDashboard && (
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

            {isReadOnlyHierarchy && isAnnualVersion && showPeriodDashboard && periodsInitializedGlobally && !periodTargetsFinalized && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    Adjust period targets in the hierarchy so totals match annual targets, then finalize
                    from the Execution Periods tab.
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
                sortPlanNodes(hierarchy).length > 0 ? (
                    <PlanHierarchyTableView
                        roots={hierarchy}
                        hierarchyNumberMap={hierarchyNumberMap}
                        rule={rule}
                        rootLabel={rootLabel}
                        onAddChild={handleAddChild}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                        onMoveNode={handleMoveNode}
                        isReordering={isReordering}
                        readOnly={isReadOnlyHierarchy}
                        hideAssignments={hideAssignments}
                        showAnnualTargets={showAnnualTargets}
                        canEditAnnualTarget={canEditAnnualTarget}
                        annualTargetAllocations={annualTargetAllocations}
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
                        showDualTargets={isAnnualVersion || isExecutionPeriod}
                        hideAssignments={hideAssignments}
                        canEditAnnualTarget={canEditAnnualTarget}
                        annualTargetAllocations={annualTargetAllocations}
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
                    />
                ) : (
                    emptyState
                )
            ) : isAtRoot && hierarchy.length > 0 ? (
                <PlanHierarchyTree
                    nodes={hierarchy}
                    hierarchyNumberMap={hierarchyNumberMap}
                    rule={rule}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                    onDrillDown={handleDrillDown}
                    onMoveNode={handleMoveNode}
                    isReordering={isReordering}
                    scoped={false}
                    readOnly={isReadOnlyHierarchy}
                    hideAssignments={hideAssignments}
                    showAnnualTargets={showAnnualTargets}
                    canEditAnnualTarget={canEditAnnualTarget}
                    annualTargetAllocations={annualTargetAllocations}
                />
            ) : currentNodes.length > 0 ? (
                <PlanHierarchyTree
                    nodes={currentNodes}
                    hierarchyNumberMap={hierarchyNumberMap}
                    rule={rule}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                    onDrillDown={handleDrillDown}
                    onMoveNode={handleMoveNode}
                    isReordering={isReordering}
                    scoped
                    readOnly={isReadOnlyHierarchy}
                    hideAssignments={hideAssignments}
                    showAnnualTargets={showAnnualTargets}
                    canEditAnnualTarget={canEditAnnualTarget}
                    annualTargetAllocations={annualTargetAllocations}
                />
            ) : (
                emptyState
            )}
        </>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push("/plans")}
                        className="rounded-full shrink-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <PlanDraftHeaderMeta version={version} config={planningConfig} />
                        {version && versionStatusAppearance && (
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                                <PerformanceColorBadge
                                    color={versionStatusAppearance.color}
                                    label={versionStatusAppearance.label}
                                    variant="solid"
                                />
                                {version.version_kind === "execution_period" && version.period_label && (
                                    <Badge variant="outline">{version.period_label}</Badge>
                                )}
                            </div>
                        )}
                        {rule && (
                            <div className="flex items-center gap-2 text-gray-500 flex-wrap mt-1">
                                <Badge variant="outline">{rule.name}</Badge>
                                <span className="text-xs">({maxDepth} levels)</span>
                            </div>
                        )}
                    </div>
                </div>

                {(!showAnnualDashboard && !showPeriodDashboard || activeTab === "hierarchy") && hierarchyToolbar}
            </div>

            {showAnnualDashboard ? (
                <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-end px-4 py-3 border-b border-gray-100">
                        {detailTabToggle}
                    </div>
                    <div className="p-4 sm:p-6 space-y-6">
                        {activeTab === "annual" ? (
                            version && <AnnualVersionsDashboard masterVersion={version} />
                        ) : (
                            hierarchyBody
                        )}
                    </div>
                </div>
            ) : showPeriodDashboard ? (
                <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-end px-4 py-3 border-b border-gray-100">
                        {detailTabToggle}
                    </div>
                    <div className="p-4 sm:p-6 space-y-6">
                        {activeTab === "periods" ? (
                            version && <ExecutionPeriodsDashboard annualVersion={version} />
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
        </div>
    );
}
