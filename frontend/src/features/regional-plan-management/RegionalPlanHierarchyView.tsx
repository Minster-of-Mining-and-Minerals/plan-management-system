"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  GitBranch,
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Target,
  Search,
  BarChart3,
  Calendar,
  CalendarDays,
  Lock,
  Unlock,
  ListTree,
  LayoutGrid,
  Table2,
  Home,
  Sliders,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetRegionalPlanHierarchyQuery,
  useCreateRegionalPlanNodeMutation,
  useUpdateRegionalPlanNodeMutation,
  useDeleteRegionalPlanNodeMutation,
  useReorderRegionalPlanNodesMutation,
  useGetRegionalAnnualVersionsQuery,
  useGetRegionalExecutionPeriodsQuery,
  useInitializeRegionalExecutionPeriodsMutation,
  useFinalizeRegionalAnnualExecutionMutation,
  useFinalizeRegionalPeriodTargetsMutation,
  useFinalizeRegionalPlanDraftMutation,
  useGetRegionalDraftFinalizationReadinessQuery,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanNode, RegionalPlanVersion } from "@/redux/types/regionalPlan";
import type { PlanNode, PlanNodeHierarchy } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import {
  getStepLabel,
  getMaxRuleDepth,
  canAddChild,
} from "@/utils/planRuleUtils";
import {
  buildHierarchyNumberMap,
  buildSiblingReorderPayload,
  getHierarchyNumber,
} from "@/utils/planNodeOrderUtils";
import { RegionalPlanVersionSubNav } from "./components/RegionalPlanVersionSubNav";
import { CreateRegionalPlanNodeModal } from "./modals/CreateRegionalPlanNodeModal";
import { PlanNodeCardGrid } from "@/features/plan-management/components/PlanNodeCardGrid";
import { PlanHierarchyTree } from "@/features/plan-management/components/PlanHierarchyTree";
import { PlanHierarchyTableView } from "@/features/plan-management/components/PlanHierarchyTableView";
import { PlanNodeHierarchyNumber } from "@/features/plan-management/components/PlanNodeHierarchyNumber";

type ViewMode = "card" | "hierarchy" | "table";
type HierarchyTab = "hierarchy" | "annual" | "periods";

export function RegionalPlanHierarchyView() {
  const router = useRouter();
  const params = useParams<{ id: string; versionId: string }>();
  const searchParams = useSearchParams();
  const regionId = params?.id;
  const versionId = params?.versionId;
  const { can } = usePermissions();

  const [activeTab, setActiveTab] = useState<HierarchyTab>("hierarchy");
  const [viewMode, setViewMode] = useState<ViewMode>("hierarchy");
  const [search, setSearch] = useState("");
  const [pathIds, setPathIds] = useState<string[]>([]);

  // Modals state
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [parentNodeForCreate, setParentNodeForCreate] = useState<RegionalPlanNode | null>(null);
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<RegionalPlanNode | null>(null);

  // Period initialization modal
  const [isInitPeriodsOpen, setIsInitPeriodsOpen] = useState(false);
  const [subdivisionMode, setSubdivisionMode] = useState<"quarterly" | "semi_annual" | "monthly" | "custom">("quarterly");
  const [customPeriods, setCustomPeriods] = useState<Array<{ label: string }>>([
    { label: "Quarter 1" },
    { label: "Quarter 2" },
    { label: "Quarter 3" },
    { label: "Quarter 4" },
  ]);

  // Queries
  const {
    data: hierarchyData,
    isLoading,
    isFetching,
    refetch,
  } = useGetRegionalPlanHierarchyQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId }
  );

  const { data: annualVersions = [], refetch: refetchAnnuals } = useGetRegionalAnnualVersionsQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId }
  );

  const { data: executionPeriods = [], refetch: refetchPeriods } = useGetRegionalExecutionPeriodsQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId }
  );

  // Mutations
  const [deleteNode] = useDeleteRegionalPlanNodeMutation();
  const [reorderRegionalNodes, { isLoading: isReordering }] = useReorderRegionalPlanNodesMutation();
  const [initPeriods, { isLoading: isInitializingPeriods }] = useInitializeRegionalExecutionPeriodsMutation();
  const [finalizeAnnual, { isLoading: isFinalizingAnnual }] = useFinalizeRegionalAnnualExecutionMutation();
  const [finalizePeriods, { isLoading: isFinalizingPeriods }] = useFinalizeRegionalPeriodTargetsMutation();
  const [finalizeDraft, { isLoading: isFinalizingDraft }] = useFinalizeRegionalPlanDraftMutation();

  const { data: readiness, refetch: refetchReadiness } = useGetRegionalDraftFinalizationReadinessQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId }
  );

  // Permission flags
  const canUpdatePlan = can("REGIONAL_PLANS:UPDATE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
  const canFinalize = can("REGIONAL_PLANS:FINALIZE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");

  const plan = hierarchyData?.version;
  const rawNodes = hierarchyData?.nodes || [];

  // Sync subdivision mode from configuration if available
  useEffect(() => {
    if (plan?.planningConfiguration?.breakdown_mode) {
      setSubdivisionMode(plan.planningConfiguration.breakdown_mode as any);
    }
  }, [plan]);

  // Tab switching from URL
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl === "annual") {
      setActiveTab("annual");
    } else if (tabFromUrl === "periods") {
      setActiveTab("periods");
    } else if (tabFromUrl === "hierarchy") {
      setActiveTab("hierarchy");
    }
  }, [searchParams]);

  // Build tree hierarchy and map to PlanNodeHierarchy
  const { treeRoots, rawNodeMap } = useMemo(() => {
    const rawMap = new Map<string, RegionalPlanNode>();
    rawNodes.forEach((n) => rawMap.set(n.regional_plan_node_id, n));

    const childrenByParent = new Map<string, RegionalPlanNode[]>();
    rawNodes.forEach((node) => {
      if (node.parent_id) {
        const list = childrenByParent.get(node.parent_id) || [];
        list.push(node);
        childrenByParent.set(node.parent_id, list);
      }
    });

    function mapNodeToHierarchy(n: RegionalPlanNode): PlanNodeHierarchy {
      const childNodes = childrenByParent.get(n.regional_plan_node_id) || [];
      const mappedChildren = childNodes.map(mapNodeToHierarchy);
      const { parent: _unusedParent, internalAssignments: _unusedIA, ...restNode } = n;

      const mappedInternalAssignments = ((n.internalAssignments as any) || []).map((assignment: any) => ({
        ...assignment,
        internalStructure:
          assignment.internalStructure ||
          assignment.department ||
          (assignment.regional_structure_id ? { name: assignment.department?.name } : undefined),
        department: assignment.department || assignment.internalStructure,
        user:
          assignment.user ||
          assignment.assignedUser ||
          (assignment.assigned_user_id ? { full_name: assignment.assignedUser?.full_name } : undefined),
        assignedUser: assignment.assignedUser || assignment.user,
      }));

      return {
        ...restNode,
        parent: undefined,
        internalAssignments: mappedInternalAssignments,
        plan_node_id: n.regional_plan_node_id,
        plan_version_id: n.regional_plan_version_id,
        parent_id: n.parent_id || null,
        type: (n.type || "kpi") as any,
        title: n.title,
        description: n.description || null,
        weight: Number(n.weight) || 0,
        weight_mode: (n.weight_mode || null) as any,
        contribution_weight: n.contribution_weight != null ? Number(n.contribution_weight) : null,
        target_unit: n.target_unit || null,
        target_allocation_mode: (n.target_allocation_mode || null) as any,
        achievement_mode: (n.achievement_mode || null) as any,
        level: n.level,
        order: n.order,
        is_active: n.is_active,
        assignment_sharing_mode: (n.assignment_sharing_mode || "exclusive") as any,
        annual_target: n.annual_target != null ? Number(n.annual_target) : null,
        period_target: n.period_target != null ? Number(n.period_target) : null,
        period_actual: n.period_actual != null ? Number(n.period_actual) : null,
        period_actual_status: (n.period_actual_status || "empty") as any,
        execution_progress_percent: n.execution_progress_percent != null ? Number(n.execution_progress_percent) : null,
        computed_period_actual: (n as any).computed_period_actual != null ? Number((n as any).computed_period_actual) : null,
        computed_period_target: (n as any).computed_period_target != null ? Number((n as any).computed_period_target) : null,
        created_at: (n as any).created_at || "",
        updated_at: (n as any).updated_at || "",
        deleted_at: null,
        children: mappedChildren,
        has_children: mappedChildren.length > 0,
        child_count: mappedChildren.length,
      };
    }

    const roots = rawNodes.filter((n) => !n.parent_id || !rawMap.has(n.parent_id));
    const mappedRoots = roots.map(mapNodeToHierarchy);

    return { treeRoots: mappedRoots, rawNodeMap: rawMap };
  }, [rawNodes]);

  const hierarchyNumberMap = useMemo(() => {
    return buildHierarchyNumberMap(treeRoots);
  }, [treeRoots]);

  const configuredUnits: TargetUnit[] = useMemo(() => {
    const raw = plan?.planningConfiguration?.target_units;
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map((u: any, i: number) => {
      if (typeof u === "string") {
        return { id: u.toLowerCase().replace(/\s+/g, "_"), label: u, symbol: u };
      }
      return {
        id: u.id || `unit-${i}`,
        label: u.label || `Unit ${i + 1}`,
        symbol: u.symbol || u.label,
      };
    });
  }, [plan?.planningConfiguration?.target_units]);

  // Current level nodes for cards view
  const currentNodes = useMemo(() => {
    let nodes = treeRoots;
    for (const id of pathIds) {
      const found = nodes.find((n) => n.plan_node_id === id);
      if (!found) return [];
      nodes = (found.children as PlanNodeHierarchy[]) ?? [];
    }
    return search.trim()
      ? nodes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
      : nodes;
  }, [treeRoots, pathIds, search]);

  // Breadcrumbs path
  const breadcrumbPath = useMemo(() => {
    const path: PlanNodeHierarchy[] = [];
    let nodes = treeRoots;
    for (const id of pathIds) {
      const found = nodes.find((n) => n.plan_node_id === id);
      if (!found) break;
      path.push(found);
      nodes = (found.children as PlanNodeHierarchy[]) ?? [];
    }
    return path;
  }, [treeRoots, pathIds]);

  const isAtRoot = breadcrumbPath.length === 0;
  const currentParentNode = breadcrumbPath.length > 0 ? breadcrumbPath[breadcrumbPath.length - 1] : null;
  const currentParentRegionalNode = currentParentNode ? rawNodeMap.get(currentParentNode.plan_node_id) || null : null;
  const currentLevel = currentParentNode ? currentParentNode.level + 1 : 1;
  const currentChildLabel = getStepLabel(plan?.planRule, currentLevel);
  const rootLabel = getStepLabel(plan?.planRule, 1);

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setPathIds([]);
    } else {
      setPathIds(pathIds.slice(0, index + 1));
    }
  };

  const handleDrillDown = (node: PlanNodeHierarchy) => {
    setPathIds((prev) => [...prev, node.plan_node_id]);
  };

  // Open Create Modal
  const openCreateModal = (parent: RegionalPlanNode | null = null) => {
    setParentNodeForCreate(parent);
    setSelectedNodeForEdit(null);
    setIsNodeModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (node: RegionalPlanNode) => {
    setSelectedNodeForEdit(node);
    setParentNodeForCreate(null);
    setIsNodeModalOpen(true);
  };

  const handleAddChild = (parent: PlanNode) => {
    const regionalParent = rawNodeMap.get(parent.plan_node_id) || null;
    openCreateModal(regionalParent);
  };

  const handleEdit = (node: PlanNode) => {
    const regionalNode = rawNodeMap.get(node.plan_node_id) || null;
    if (regionalNode) {
      openEditModal(regionalNode);
    }
  };

  const handleDelete = async (id: string) => {
    const targetNode = rawNodeMap.get(id);
    if (!confirm(`Are you sure you want to delete "${targetNode?.title || "this node"}" and any subordinate nodes?`)) return;

    try {
      await deleteNode({ id, region_id: regionId! }).unwrap();
      actionFeedback.success("Node deleted successfully");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to delete node");
    }
  };

  const handleViewDetails = (nodeId: string) => {
    router.push(`/regions/${regionId}/plans/${versionId}/nodes/${nodeId}`);
  };

  const handleMoveNode = async (
    nodeId: string,
    direction: "up" | "down",
    siblings: PlanNode[]
  ) => {
    const payload = buildSiblingReorderPayload(siblings, nodeId, direction);
    if (!payload) return;
    try {
      const ordered_node_ids = payload.nodeOrders.map((no) => no.plan_node_id);
      await reorderRegionalNodes({
        versionId: versionId!,
        region_id: regionId!,
        ordered_node_ids,
      }).unwrap();
      actionFeedback.success("Node reordered successfully");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to reorder nodes");
    }
  };

  const handleFinalizeAnnual = async () => {
    try {
      await finalizeAnnual({ id: versionId!, region_id: regionId! }).unwrap();
      actionFeedback.success("Annual targets finalized successfully!");
      refetch();
      refetchAnnuals();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to finalize annual targets");
    }
  };

  const handleFinalizePeriods = async () => {
    try {
      await finalizePeriods({ id: versionId!, region_id: regionId! }).unwrap();
      actionFeedback.success("Execution period targets finalized successfully!");
      refetch();
      refetchPeriods();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to finalize period targets");
    }
  };

  const handleInitializePeriods = async () => {
    try {
      await initPeriods({
        id: versionId!,
        region_id: regionId!,
        subdivision_mode: subdivisionMode,
        custom_periods: subdivisionMode === "custom" ? customPeriods : undefined,
      }).unwrap();
      actionFeedback.success("Execution periods generated successfully!");
      setIsInitPeriodsOpen(false);
      refetch();
      refetchPeriods();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to initialize execution periods");
    }
  };

  const handleFinalizeDraft = async () => {
    try {
      await finalizeDraft({ id: versionId!, region_id: regionId! }).unwrap();
      actionFeedback.success("Strategic plan draft finalized successfully! Annual execution is ready.");
      refetch();
      refetchAnnuals();
      refetchPeriods();
      refetchReadiness();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to finalize plan draft");
    }
  };

  if (isLoading || !plan) return <Loading01 />;

  const isMasterPlan = plan.version_kind === "master";
  const isAnnualPlan = plan.version_kind === "annual";
  const showAnnualDashboard = isMasterPlan && (plan.status === "finalized" || annualVersions.length > 0);
  const showPeriodDashboard = isAnnualPlan;

  const detailTabToggle = showAnnualDashboard ? (
    <div className="inline-flex rounded-lg border border-border bg-card p-1 flex-wrap shadow-2xs">
      <Button
        variant={activeTab === "hierarchy" ? "default" : "ghost"}
        size="sm"
        className="gap-2 h-8"
        onClick={() => setActiveTab("hierarchy")}
      >
        <ListTree className="h-4 w-4" />
        <span>Plan Hierarchy</span>
      </Button>
      <Button
        variant={activeTab === "annual" ? "default" : "ghost"}
        size="sm"
        className="gap-2 h-8"
        onClick={() => setActiveTab("annual")}
      >
        <CalendarDays className="h-4 w-4" />
        <span>Annual Execution</span>
        {annualVersions.length > 0 && (
          <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-5">
            {annualVersions.length}
          </Badge>
        )}
      </Button>
    </div>
  ) : showPeriodDashboard ? (
    <div className="inline-flex rounded-lg border border-border bg-card p-1 flex-wrap shadow-2xs">
      <Button
        variant={activeTab === "hierarchy" ? "default" : "ghost"}
        size="sm"
        className="gap-2 h-8"
        onClick={() => setActiveTab("hierarchy")}
      >
        <ListTree className="h-4 w-4" />
        <span>Plan Hierarchy</span>
      </Button>
      <Button
        variant={activeTab === "periods" ? "default" : "ghost"}
        size="sm"
        className="gap-2 h-8"
        onClick={() => setActiveTab("periods")}
      >
        <Clock className="h-4 w-4" />
        <span>Execution Periods</span>
        {executionPeriods.length > 0 && (
          <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-5">
            {executionPeriods.length}
          </Badge>
        )}
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Navigation & SubNav */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <RegionalPlanVersionSubNav regionId={regionId} versionId={versionId} />

        <div className="flex items-center gap-2 flex-wrap">
          {detailTabToggle}

          {isMasterPlan && plan.status === "draft" && canFinalize && (
            <Button
              size="sm"
              onClick={handleFinalizeDraft}
              disabled={isFinalizingDraft || (readiness && !readiness.ready)}
              className="gap-2 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              title={readiness && !readiness.ready ? readiness.errors.join("; ") : "Finalize draft and start annual execution"}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isFinalizingDraft ? "Finalizing..." : "Start Annual Execution"}</span>
            </Button>
          )}

          {isMasterPlan && plan.status === "finalized" && canUpdatePlan && executionPeriods.length === 0 && (
            <Button
              size="sm"
              onClick={() => setIsInitPeriodsOpen(true)}
              className="gap-2 shadow-xs"
            >
              <Sliders className="h-4 w-4" />
              <span>Initialize Execution Periods</span>
            </Button>
          )}

          <Link href={`/regions/${regionId}/plans/dashboard?plan_version_id=${versionId}`}>
            <Button size="sm" variant="outline" className="gap-2 shadow-2xs">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Execution Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Plan Details Context Ribbon */}
      <div className="rounded-xl border bg-card p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{plan.draft_name}</h2>
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                {plan.status}
              </Badge>
              <Badge variant="secondary" className="capitalize text-xs">
                {plan.version_kind.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cycle: {plan.start_year} – {plan.end_year} • {rawNodes.length} strategic milestones configured
            </p>
          </div>
        </div>

        {activeTab === "hierarchy" && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-48">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Cards</span>
              </Button>
              <Button
                variant={viewMode === "hierarchy" ? "default" : "ghost"}
                size="sm"
                className="gap-2 h-8"
                onClick={() => setViewMode("hierarchy")}
              >
                <ListTree className="h-4 w-4" />
                <span>Hierarchy</span>
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
                <span>Table</span>
              </Button>
            </div>

            {canUpdatePlan && (
              <Button
                onClick={() => openCreateModal(currentParentRegionalNode)}
                className="gap-2 h-8 text-xs shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Add {currentChildLabel}</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Draft Readiness Alert Banner */}
      {isMasterPlan && plan.status === "draft" && readiness && !readiness.ready && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                Action Required Before Starting Annual Execution
              </h4>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                The strategic plan draft cannot start annual execution until the following hierarchy requirements are satisfied:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {readiness.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PLAN HIERARCHY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "hierarchy" && (
        <div className="space-y-4">
          {/* Breadcrumbs navigation for Card / Tree drill-down */}
          {viewMode !== "table" && (
            <nav className="flex items-center gap-1 flex-wrap text-sm bg-card rounded-xl border px-4 py-2.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(-1)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
                  isAtRoot
                    ? "text-primary font-semibold bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Home className="h-3.5 w-3.5" />
                <span>{rootLabel}</span>
              </button>

              {breadcrumbPath.map((node, index) => (
                <span key={node.plan_node_id} className="inline-flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbClick(index)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors max-w-[240px] ${
                      index === breadcrumbPath.length - 1
                        ? "text-primary font-semibold bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {getHierarchyNumber(hierarchyNumberMap, node.plan_node_id) && (
                      <PlanNodeHierarchyNumber
                        value={getHierarchyNumber(hierarchyNumberMap, node.plan_node_id)!}
                        size="sm"
                      />
                    )}
                    <span className="truncate">{node.title}</span>
                  </button>
                </span>
              ))}

              {!isAtRoot && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="text-muted-foreground text-xs px-2 py-1">{currentChildLabel}</span>
                </>
              )}
            </nav>
          )}

          {/* Main Content: Card, Hierarchy Tree, or Table */}
          {rawNodes.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center bg-card">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No Strategic Nodes Defined</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                Get started by creating your Level 1 {getStepLabel(plan?.planRule, 1)}. You can then add subordinate milestones under it.
              </p>
              {canUpdatePlan && (
                <Button onClick={() => openCreateModal(null)} className="gap-2 shadow-xs">
                  <Plus className="h-4 w-4" />
                  <span>Create Root {getStepLabel(plan?.planRule, 1)}</span>
                </Button>
              )}
            </div>
          ) : viewMode === "table" ? (
            <PlanHierarchyTableView
              roots={treeRoots}
              hierarchyNumberMap={hierarchyNumberMap}
              rule={plan?.planRule as any}
              rootLabel={rootLabel}
              configuredUnits={configuredUnits}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              onMoveNode={handleMoveNode}
              isReordering={isReordering}
              readOnly={!canUpdatePlan}
              showAnnualTargets={false}
              showPeriodTargets={false}
              showPeriodActuals={false}
            />
          ) : viewMode === "card" ? (
            <PlanNodeCardGrid
              nodes={currentNodes}
              hierarchyNumberMap={hierarchyNumberMap}
              rule={plan?.planRule as any}
              configuredUnits={configuredUnits}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              onDrillDown={handleDrillDown}
              onMoveNode={(nodeId, direction) => handleMoveNode(nodeId, direction, currentNodes)}
              isReordering={isReordering}
              readOnly={!canUpdatePlan}
            />
          ) : (
            <PlanHierarchyTree
              nodes={treeRoots}
              hierarchyNumberMap={hierarchyNumberMap}
              rule={plan?.planRule as any}
              configuredUnits={configuredUnits}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              onDrillDown={handleDrillDown}
              onMoveNode={handleMoveNode}
              isReordering={isReordering}
              scoped={false}
              readOnly={!canUpdatePlan}
            />
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ANNUAL IMPLEMENTATION PLANS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "annual" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-2xs">
            <div>
              <h3 className="text-base font-semibold text-foreground">Annual Implementation Plans</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each annual implementation plan inherits the master hierarchy. Set annual targets for each fiscal year cycle.
              </p>
            </div>

            {plan.status === "finalized" && canUpdatePlan && (
              <div className="flex items-center gap-2">
                {executionPeriods.length === 0 && (
                  <Button size="sm" onClick={() => setIsInitPeriodsOpen(true)} className="gap-2 shadow-xs">
                    <Sliders className="h-4 w-4" />
                    <span>Initialize Execution Periods</span>
                  </Button>
                )}
                {!plan.annual_targets_finalized_at && (
                  <Button size="sm" onClick={handleFinalizeAnnual} disabled={isFinalizingAnnual} className="gap-2 shadow-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Finalize Annual Targets</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {annualVersions.length === 0 ? (
            <div className="text-center p-8 border rounded-xl bg-card text-muted-foreground text-sm">
              No annual versions generated yet. Finalize the master plan draft to generate annual cycles.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {annualVersions.map((annual) => (
                <div
                  key={annual.regional_plan_version_id}
                  className="rounded-xl border bg-card p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs capitalize font-semibold">
                        {annual.status}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">Year {annual.sequence_index}</span>
                    </div>
                    <h4 className="font-semibold text-foreground mt-2">{annual.draft_name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Fiscal Year {annual.planning_year}</p>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between gap-2">
                    <Link href={`/regions/${regionId}/plans/${annual.regional_plan_version_id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span>Plan Hierarchy & Targets</span>
                      </Button>
                    </Link>

                    {annual.is_locked ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Editable</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: EXECUTION PERIODS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "periods" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-2xs">
            <div>
              <h3 className="text-base font-semibold text-foreground">Execution Period Subdivisions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Periodic execution milestones partition each annual cycle according to the configured breakdown mode.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canUpdatePlan && executionPeriods.length === 0 && (
                <Button size="sm" onClick={() => setIsInitPeriodsOpen(true)} className="gap-2 shadow-xs">
                  <Sliders className="h-4 w-4" />
                  <span>Initialize Execution Periods</span>
                </Button>
              )}

              {canUpdatePlan && executionPeriods.length > 0 && !plan.period_targets_finalized_at && (
                <Button size="sm" onClick={handleFinalizePeriods} disabled={isFinalizingPeriods} className="gap-2 shadow-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Finalize Period Targets</span>
                </Button>
              )}
            </div>
          </div>

          {executionPeriods.length === 0 ? (
            <div className="text-center p-8 border rounded-xl bg-card text-muted-foreground text-sm space-y-3">
              <p>No execution periods initialized yet.</p>
              <Button size="sm" onClick={() => setIsInitPeriodsOpen(true)} className="gap-2 shadow-xs">
                <Sliders className="h-4 w-4" />
                <span>Initialize Periods</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {executionPeriods.map((period) => (
                <div
                  key={period.regional_plan_version_id}
                  className="rounded-xl border bg-card p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs capitalize font-semibold">
                        {period.status}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">Period #{period.sequence_index}</span>
                    </div>
                    <h4 className="font-semibold text-foreground mt-2">{period.period_label || period.draft_name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Year {period.planning_year}</p>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between gap-2">
                    <Link href={`/regions/${regionId}/plans/${period.regional_plan_version_id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span>View Milestones</span>
                      </Button>
                    </Link>

                    {period.is_locked ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Open</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Dynamic Rule-Driven Node Create/Edit Modal */}
      {/* ------------------------------------------------------------- */}
      <CreateRegionalPlanNodeModal
        isOpen={isNodeModalOpen}
        onClose={() => {
          setIsNodeModalOpen(false);
          setParentNodeForCreate(null);
          setSelectedNodeForEdit(null);
          refetch();
        }}
        regionId={regionId!}
        planVersionId={versionId!}
        parentNode={parentNodeForCreate}
        node={selectedNodeForEdit}
        rule={plan?.planRule}
        planningConfig={plan?.planningConfiguration}
        allNodes={rawNodes}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Period Initialization Modal */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isInitPeriodsOpen} onOpenChange={setIsInitPeriodsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sliders className="h-5 w-5 text-primary" />
              <span>Initialize Execution Periods</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose the periodic breakdown mode. This will generate execution sub-versions for every annual plan cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Breakdown Cadence</label>
              <select
                value={subdivisionMode}
                onChange={(e) => setSubdivisionMode(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="quarterly">Quarterly (4 Periods / Year)</option>
                <option value="semi_annual">Semi-Annual (2 Periods / Year)</option>
                <option value="monthly">Monthly (12 Periods / Year)</option>
                <option value="custom">Custom Division</option>
              </select>
            </div>

            {subdivisionMode === "custom" && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Custom Period Names</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1"
                    onClick={() =>
                      setCustomPeriods((prev) => [...prev, { label: `Period ${prev.length + 1}` }])
                    }
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Period</span>
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {customPeriods.map((cp, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Input
                        value={cp.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomPeriods((prev) =>
                            prev.map((p, i) => (i === idx ? { label: val } : p))
                          );
                        }}
                        className="h-8 text-xs"
                        placeholder="e.g. Trimester 1"
                      />
                      {customPeriods.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setCustomPeriods((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsInitPeriodsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInitializePeriods} disabled={isInitializingPeriods}>
                {isInitializingPeriods ? "Generating..." : "Generate Periods"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
