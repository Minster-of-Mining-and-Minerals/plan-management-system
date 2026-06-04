"use client";

import { useMemo, useState, useEffect } from "react";
import {
    useGetPlanHierarchyQuery,
    useDeletePlanNodeMutation,
    useGetPlanVersionByIdQuery,
} from "@/redux/api/planApi";
import { useGetPlanRuleForVersionQuery } from "@/redux/api/planRuleApi";
import { PlanNodeHierarchy, PlanNode } from "@/redux/types/plan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    ChevronLeft,
    LayoutGrid,
    ListTree,
    ChevronRight,
    Home,
} from "lucide-react";
import { CreatePlanNodeModal } from "./modals/CreatePlanNodeModal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    canAddChild,
    getMaxRuleDepth,
    getStepLabel,
} from "@/utils/planRuleUtils";
import { PlanNodeCardGrid } from "./components/PlanNodeCardGrid";
import { PlanHierarchyTree } from "./components/PlanHierarchyTree";

type ViewMode = "card" | "hierarchy";

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
    const { data: rule } = useGetPlanRuleForVersionQuery(versionId);
    const { data: hierarchy = [], isLoading, refetch } = useGetPlanHierarchyQuery(versionId);
    const [deleteNode] = useDeletePlanNodeMutation();

    const [viewMode, setViewMode] = useState<ViewMode>("card");
    const [pathIds, setPathIds] = useState<string[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState<PlanNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<PlanNode | null>(null);

    const maxDepth = getMaxRuleDepth(rule);
    const rootLabel = getStepLabel(rule, 1);
    const breadcrumbPath = useMemo(
        () => resolveBreadcrumbPath(hierarchy, pathIds),
        [hierarchy, pathIds]
    );

    useEffect(() => {
        setPathIds((prev) =>
            resolveBreadcrumbPath(hierarchy, prev).map((n) => n.plan_node_id)
        );
    }, [hierarchy]);
    const currentParent = breadcrumbPath.length > 0 ? breadcrumbPath[breadcrumbPath.length - 1] : null;
    const currentNodes = useMemo(
        () => getCurrentNodes(hierarchy, pathIds),
        [hierarchy, pathIds]
    );
    const currentLevel = currentParent ? currentParent.level + 1 : 1;
    const currentLevelLabel = getStepLabel(rule, currentLevel);
    const childLabel = currentLevelLabel;
    const canAddAtCurrentLevel = currentParent
        ? canAddChild(rule, currentParent)
        : canAddChild(rule, null);
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
        if (confirm("Are you sure you want to delete this node and all its children?")) {
            try {
                await deleteNode(nodeId).unwrap();
                toast.success("Node deleted successfully");
                setPathIds((prev) => prev.filter((id) => id !== nodeId));
                refetch();
            } catch (err: unknown) {
                const error = err as { data?: { message?: string } };
                toast.error(error.data?.message || "Failed to delete node");
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
                    ? `Start by adding the first ${rootLabel.toLowerCase()} to this plan version.`
                    : `Add a ${childLabel.toLowerCase()} under "${currentParent?.title}".`}
            </p>
            {canAddAtCurrentLevel && (
                <Button onClick={handleAddAtLevel} variant="outline">
                    Add {childLabel}
                </Button>
            )}
        </div>
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
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Plan Hierarchy: {version?.year} (v{version?.version_number})
                        </h1>
                        <div className="flex items-center gap-2 text-gray-500 flex-wrap">
                            <span>{version?.governmentStructure?.name || "Global Sector"}</span>
                            {rule && (
                                <>
                                    <span>·</span>
                                    <Badge variant="outline">{rule.name}</Badge>
                                    <span className="text-xs">({maxDepth} levels)</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

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
                    </div>
                    {canAddAtCurrentLevel && (
                        <Button onClick={handleAddAtLevel} className="gap-2">
                            <Plus className="h-4 w-4" /> Add {childLabel}
                        </Button>
                    )}
                </div>
            </div>

            {/* Breadcrumb navigation */}
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
                            className={`rounded-md px-2 py-1 transition-colors truncate max-w-[200px] ${
                                index === breadcrumbPath.length - 1
                                    ? "text-primary font-semibold bg-primary/5"
                                    : "text-gray-500 hover:text-primary hover:bg-gray-50"
                            }`}
                        >
                            {node.title}
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

            {/* Content */}
            {viewMode === "card" ? (
                currentNodes.length > 0 ? (
                    <PlanNodeCardGrid
                        nodes={currentNodes}
                        rule={rule}
                        onAddChild={handleAddChild}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                        onDrillDown={handleDrillDown}
                    />
                ) : (
                    emptyState
                )
            ) : isAtRoot && hierarchy.length > 0 ? (
                <PlanHierarchyTree
                    nodes={hierarchy}
                    rule={rule}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                    onDrillDown={handleDrillDown}
                    scoped={false}
                />
            ) : currentNodes.length > 0 ? (
                <PlanHierarchyTree
                    nodes={currentNodes}
                    rule={rule}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                    onDrillDown={handleDrillDown}
                    scoped
                />
            ) : (
                emptyState
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
