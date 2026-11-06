"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Layers,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  ListTree,
  LayoutGrid,
  Table2,
  Home,
  ShieldCheck,
  Unlock,
  AlertCircle,
  BarChart3,
  GitBranch,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetRegionalPlanHierarchyQuery,
  useGetRegionalPlanVersionByIdQuery,
  useDeleteRegionalPlanNodeMutation,
  useReorderRegionalPlanNodesMutation,
  useGetRegionalAnnualVersionsQuery,
  useGetRegionalExecutionPeriodsQuery,
  useReopenRegionalPlanDraftMutation,
  useGetRegionalDraftFinalizationReadinessQuery,
  useGetRegionalAnnualTargetAllocationsQuery,
  useUpdateRegionalAnnualTargetMutation,
  useGetRegionalPeriodTargetAllocationsQuery,
  useUpdateRegionalPeriodTargetMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanNode, RegionalPlanVersion } from "@/redux/types/regionalPlan";
import type { PlanNode, PlanNodeHierarchy } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import {
  getStepLabel,
  getMaxRuleDepth,
} from "@/utils/planRuleUtils";
import {
  buildHierarchyNumberMap,
  buildSiblingReorderPayload,
  getHierarchyNumber,
} from "@/utils/planNodeOrderUtils";
import { RegionalPlanVersionSubNav } from "./components/RegionalPlanVersionSubNav";
import { RegionalPlanAchievementScopeProvider } from "./hooks/useRegionalPlanAchievementScope";
import { RegionalPlanNodePeriodActualSection } from "./components/RegionalPlanNodePeriodActualSection";
import { RegionalPlanAchievementPendingPanel } from "./components/RegionalPlanAchievementPendingPanel";
import { RegionalPlanAchievementPendingValidationPanel } from "./components/RegionalPlanAchievementPendingValidationPanel";
import {
  collectPendingAchievementNodes,
  collectPendingValidationNodes,
} from "@/utils/planAchievementHierarchyUtils";
import { CreateRegionalPlanNodeModal } from "./modals/CreateRegionalPlanNodeModal";
import { FinalizeRegionalPlanDraftModal } from "./modals/FinalizeRegionalPlanDraftModal";
import { FinalizeRegionalExecutionPeriodsModal } from "./modals/FinalizeRegionalExecutionPeriodsModal";
import { RegionalAnnualVersionsDashboard } from "./components/RegionalAnnualVersionsDashboard";
import { RegionalExecutionPeriodsDashboard } from "./components/RegionalExecutionPeriodsDashboard";
import { RegionalPlanReviewDashboard } from "./components/RegionalPlanReviewDashboard";
import { PlanNodeCardGrid } from "@/features/plan-management/components/PlanNodeCardGrid";
import { PlanHierarchyTree } from "@/features/plan-management/components/PlanHierarchyTree";
import { PlanHierarchyTableView } from "@/features/plan-management/components/PlanHierarchyTableView";
import { PlanNodeHierarchyNumber } from "@/features/plan-management/components/PlanNodeHierarchyNumber";
import { PlanDraftHeaderMeta } from "@/features/plan-management/components/PlanDraftHeaderMeta";
import { PerformanceColorBadge } from "@/features/plan-management/components/PerformanceColorBadge";
import { EvaluationStatusBadge } from "@/features/plan-management/components/EvaluationStatusBadge";
import {
  resolveCompletionForVersion,
  resolveWorkflowStatusAppearance,
} from "@/utils/performanceColorUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import {
  resolvePlanVersionStatusLabel,
  resolveWorkflowDisplayStatus,
  resolveExecutionEvaluationStatus,
  getExecutionStatusLabel,
} from "@/utils/planExecutionUtils";
import { formatStatus } from "@/utils/statusFormatter";
import { cn } from "@/lib/utils";

type ViewMode = "card" | "hierarchy" | "table";
type HierarchyTab = "hierarchy" | "annual" | "periods" | "review";

export function RegionalPlanHierarchyView() {
  const router = useRouter();
  const params = useParams<{ id: string; versionId: string }>();
  const searchParams = useSearchParams();
  const regionId = params?.id;
  const versionId = params?.versionId;
  const { can } = usePermissions();
  const thresholds = usePerformanceColorThresholds();

  const [activeTab, setActiveTab] = useState<HierarchyTab>("hierarchy");
  const [viewMode, setViewMode] = useState<ViewMode>("hierarchy");
  const [search, setSearch] = useState("");
  const [pathIds, setPathIds] = useState<string[]>([]);

  // Modals state
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [parentNodeForCreate, setParentNodeForCreate] = useState<RegionalPlanNode | null>(null);
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<RegionalPlanNode | null>(null);

  // Lifecycle modals state
  const [isFinalizeDraftOpen, setIsFinalizeDraftOpen] = useState(false);
  const [isFinalizePeriodModalOpen, setIsFinalizePeriodModalOpen] = useState(false);

  // Queries
  const {
    data: hierarchyData,
    isLoading,
    refetch,
  } = useGetRegionalPlanHierarchyQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId }
  );

  const plan = hierarchyData?.version;
  const rawNodes = hierarchyData?.nodes || [];

  const isMasterPlan = plan?.version_kind === "master";
  const isAnnualPlan = plan?.version_kind === "annual";
  const isPeriodPlan = plan?.version_kind === "execution_period";

  const { data: annualVersions = [], refetch: refetchAnnuals } = useGetRegionalAnnualVersionsQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId || !isMasterPlan }
  );

  const { data: executionPeriods = [], refetch: refetchPeriods } = useGetRegionalExecutionPeriodsQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId || !isAnnualPlan }
  );

  const { data: readiness, refetch: refetchReadiness } = useGetRegionalDraftFinalizationReadinessQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId || !isMasterPlan || plan?.status !== "draft" }
  );

  // Target allocations queries
  const { data: annualAllocations = [], refetch: refetchAnnualAllocations } = useGetRegionalAnnualTargetAllocationsQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId || !isAnnualPlan }
  );

  const annualAllocationsMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const a of (annualAllocations as any[])) {
      map[a.plan_node_id || a.regional_plan_node_id] = a;
    }
    return map;
  }, [annualAllocations]);

  const { data: periodAllocations = [], refetch: refetchPeriodAllocations } = useGetRegionalPeriodTargetAllocationsQuery(
    { id: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId || !isPeriodPlan }
  );

  const periodAllocationsMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of (periodAllocations as any[])) {
      map[p.plan_node_id || p.regional_plan_node_id] = p;
    }
    return map;
  }, [periodAllocations]);

  // Mutations
  const [deleteNode] = useDeleteRegionalPlanNodeMutation();
  const [reorderRegionalNodes, { isLoading: isReordering }] = useReorderRegionalPlanNodesMutation();
  const [reopenDraft, { isLoading: isReopeningDraft }] = useReopenRegionalPlanDraftMutation();
  const [updateAnnualTarget] = useUpdateRegionalAnnualTargetMutation();
  const [updatePeriodTarget] = useUpdateRegionalPeriodTargetMutation();

  // Permissions
  const canUpdatePlan = can("REGIONAL_PLANS:UPDATE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
  const canFinalize = can("REGIONAL_PLANS:FINALIZE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");

  const annualParentId = isPeriodPlan ? plan?.parent_plan_version_id : null;
  const { data: annualParentVersion } = useGetRegionalPlanVersionByIdQuery(
    { id: annualParentId!, region_id: regionId! },
    { skip: !annualParentId || !regionId }
  );

  const resolvedMasterVersionId =
    plan?.live_master_version_id ??
    (isMasterPlan
      ? versionId
      : isAnnualPlan
      ? plan?.parent_plan_version_id
      : isPeriodPlan
      ? annualParentVersion?.parent_plan_version_id ?? null
      : null);

  const { data: masterVersion } = useGetRegionalPlanVersionByIdQuery(
    { id: resolvedMasterVersionId!, region_id: regionId! },
    { skip: !resolvedMasterVersionId || !regionId }
  );

  // Lifecycle flags
  const effectiveMasterVersion = isMasterPlan ? plan : masterVersion;
  const masterReviewStatus = effectiveMasterVersion?.review_status ?? (plan as any)?.master_review_status;

  const annualTargetsFinalized = Boolean(
    isMasterPlan
      ? plan?.annual_targets_finalized_at
      : masterVersion?.annual_targets_finalized_at
  );
  const periodsInitializedGlobally = Boolean(
    isMasterPlan
      ? plan?.period_subdivision_mode
      : masterVersion?.period_subdivision_mode ?? plan?.period_subdivision_mode
  );
  const periodTargetsFinalized = Boolean(
    isPeriodPlan
      ? annualParentVersion?.period_targets_finalized_at ?? plan?.period_targets_finalized_at
      : isAnnualPlan
      ? plan?.period_targets_finalized_at
      : false
  );
  const processStarted = Boolean(
    effectiveMasterVersion?.process_started_at ||
      masterVersion?.process_started_at ||
      annualParentVersion?.process_started_at ||
      plan?.process_started_at
  );

  const showPeriodTargets = isPeriodPlan && !processStarted;
  const showPeriodActuals = isPeriodPlan && processStarted;
  const canEditPeriodActual = isPeriodPlan && processStarted && plan?.execution_status === "open";
  const showAnnualTargets = isAnnualPlan;
  const canEditAnnualTarget = isAnnualPlan && !annualTargetsFinalized && canUpdatePlan && plan?.status !== "completed";
  const canEditPeriodTarget = isPeriodPlan && !periodTargetsFinalized && canUpdatePlan && plan?.status !== "completed" && !processStarted;

  const showAnnualDashboard = isMasterPlan && (plan?.status === "finalized" || annualVersions.length > 0);
  const showPeriodDashboard = isAnnualPlan && annualTargetsFinalized && periodsInitializedGlobally;
  const showReviewTab = Boolean(
    effectiveMasterVersion?.published_for_review_at ||
      effectiveMasterVersion?.review_status ||
      plan?.published_for_review_at ||
      plan?.review_status
  );

  // Auto-default tab based on Federal Private lifecycle
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl === "annual" || tabFromUrl === "periods" || tabFromUrl === "hierarchy" || tabFromUrl === "review") {
      setActiveTab(tabFromUrl);
      return;
    }

    if (isMasterPlan && plan?.status === "finalized") {
      setActiveTab("annual");
    } else if (isAnnualPlan && annualTargetsFinalized && periodsInitializedGlobally) {
      setActiveTab("periods");
    } else {
      setActiveTab("hierarchy");
    }
  }, [versionId, isMasterPlan, isAnnualPlan, plan?.status, annualTargetsFinalized, periodsInitializedGlobally, searchParams]);

  const handleSaveAnnualTarget = async (node: PlanNode, val: number | null) => {
    try {
      await updateAnnualTarget({
        nodeId: node.plan_node_id,
        region_id: regionId!,
        annual_target: val as number,
      }).unwrap();
      refetch();
      refetchAnnualAllocations();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to save annual target");
      throw err;
    }
  };

  const handleSavePeriodTarget = async (node: PlanNode, val: number | null) => {
    try {
      await updatePeriodTarget({
        nodeId: node.plan_node_id,
        region_id: regionId!,
        period_target: val as number,
      }).unwrap();
      refetch();
      refetchPeriodAllocations();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to save period target");
      throw err;
    }
  };

  const handleReopenDraft = async () => {
    if (!confirm("Are you sure you want to reopen this strategic plan draft for editing? This will set it back to draft status so you can update structure and durations.")) return;
    try {
      await reopenDraft({ id: versionId!, region_id: regionId! }).unwrap();
      actionFeedback.success("Plan draft reopened for editing");
      refetch();
      refetchAnnuals();
      refetchReadiness();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to reopen plan draft");
    }
  };

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

  const pendingApprovalNodes = useMemo(
    () => (isPeriodPlan && processStarted ? collectPendingAchievementNodes(treeRoots as any) : []),
    [treeRoots, isPeriodPlan, processStarted]
  );
  const pendingValidationNodes = useMemo(
    () => (isPeriodPlan && processStarted ? collectPendingValidationNodes(treeRoots as any) : []),
    [treeRoots, isPeriodPlan, processStarted]
  );

  const renderPeriodActualSection = useCallback(
    (node: PlanNode, options?: { variant?: "card" | "compact" | "table" }) => (
      <RegionalPlanNodePeriodActualSection
        node={node}
        rule={plan?.planRule as any}
        configuredUnits={configuredUnits}
        canEdit={isPeriodPlan && processStarted && plan?.execution_status === "open"}
        variant={options?.variant ?? "card"}
        regionId={regionId!}
      />
    ),
    [plan?.planRule, configuredUnits, isPeriodPlan, processStarted, plan?.execution_status, regionId]
  );

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
  const maxDepth = getMaxRuleDepth(plan?.planRule);

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
    if (!confirm(`Are you sure you want to delete "${targetNode?.title || "this node"}" and all subordinate milestones?`)) return;

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

  const handleBackNavigation = () => {
    if (isPeriodPlan && plan?.parent_plan_version_id) {
      router.push(`/regions/${regionId}/plans/${plan.parent_plan_version_id}?tab=periods`);
    } else if (isAnnualPlan && plan?.parent_plan_version_id) {
      router.push(`/regions/${regionId}/plans/${plan.parent_plan_version_id}?tab=annual`);
    } else {
      router.push(`/regions/${regionId}/plans`);
    }
  };

  if (isLoading || !plan) return <Loading01 />;

  const versionProgress = resolveCompletionForVersion(
    thresholds,
    plan as any,
    processStarted
  );

  const versionStatusAppearance = resolveWorkflowStatusAppearance(thresholds, {
    status: resolveWorkflowDisplayStatus(plan as any, processStarted),
    isLocked: processStarted && plan.execution_status === "locked",
    progress: versionProgress,
    statusLabel: resolvePlanVersionStatusLabel(
      plan as any,
      processStarted,
      (p) => formatStatus(p.status ?? "draft")
    ),
    useAchievementColors: Boolean(versionProgress?.visible && plan.execution_status !== "completed"),
  });

  const versionEvaluationStatus = resolveExecutionEvaluationStatus(
    plan as any,
    processStarted
  );

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
      {showReviewTab && (
        <Button
          variant={activeTab === "review" ? "default" : "ghost"}
          size="sm"
          className="gap-2 h-8"
          onClick={() => setActiveTab("review")}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Review Dashboard</span>
        </Button>
      )}
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
      {showReviewTab && (
        <Button
          variant={activeTab === "review" ? "default" : "ghost"}
          size="sm"
          className="gap-2 h-8"
          onClick={() => setActiveTab("review")}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Review Dashboard</span>
        </Button>
      )}
    </div>
  ) : showReviewTab ? (
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
        variant={activeTab === "review" ? "default" : "ghost"}
        size="sm"
        className="gap-2 h-8"
        onClick={() => setActiveTab("review")}
      >
        <ShieldCheck className="h-4 w-4" />
        <span>Review Dashboard</span>
      </Button>
    </div>
  ) : null;

  const hierarchyToolbar = (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative w-44">
        <Input
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1">
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

      {canUpdatePlan && isMasterPlan && plan.status === "draft" && (
        <Button
          onClick={() => openCreateModal(currentParentRegionalNode)}
          className="gap-2 h-8 text-xs shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add {currentChildLabel}</span>
        </Button>
      )}
    </div>
  );

  return (
    <RegionalPlanAchievementScopeProvider
      versionId={versionId!}
      regionId={regionId!}
      enabled={Boolean((isPeriodPlan || isAnnualPlan) && processStarted)}
    >
      <div className="space-y-6">
      {/* Header bar matching Federal Private */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBackNavigation}
            className="rounded-full shrink-0"
            title={
              isPeriodPlan
                ? "Return to Annual Plan"
                : isAnnualPlan
                  ? "Return to Strategic Plan"
                  : "Back to Plans"
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-w-0">
            <PlanDraftHeaderMeta
              version={plan as any}
              config={plan.planningConfiguration as any}
              showSector={false}
            />

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
                <EvaluationStatusBadge status={versionEvaluationStatus as any} />
              )}
              {isPeriodPlan && plan.period_label && (
                <Badge variant="outline">{plan.period_label}</Badge>
              )}
              {isAnnualPlan && plan.planning_year && (
                <Badge variant="outline">Year {plan.sequence_index} ({plan.planning_year})</Badge>
              )}
              {plan.planRule && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline">{plan.planRule.name}</Badge>
                  <span>({maxDepth} levels)</span>
                </div>
              )}
              {masterReviewStatus && (
                <Badge
                  variant="outline"
                  className={
                    masterReviewStatus === "in_review"
                      ? "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 capitalize text-xs"
                      : masterReviewStatus === "review_completed" || masterReviewStatus === "approved"
                      ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 capitalize text-xs"
                      : masterReviewStatus === "revision_requested"
                      ? "border-orange-500/30 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 capitalize text-xs"
                      : "border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 capitalize text-xs"
                  }
                >
                  {masterReviewStatus.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RegionalPlanVersionSubNav regionId={regionId} versionId={versionId} />

          {/* Action buttons inside the header */}
          {isMasterPlan && plan.status === "draft" && canFinalize && (
            <Button
              size="sm"
              onClick={() => setIsFinalizeDraftOpen(true)}
              className="gap-2 shadow-xs"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Finalize Strategic Plan & Start Annual Execution</span>
            </Button>
          )}

          {isMasterPlan && plan.status === "finalized" && !plan.process_started_at && canUpdatePlan && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReopenDraft}
              disabled={isReopeningDraft}
              className="gap-2 shadow-xs text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <Unlock className="h-4 w-4" />
              <span>{isReopeningDraft ? "Reopening..." : "Reopen Draft for Edit"}</span>
            </Button>
          )}

          <Link href={`/regions/${regionId}/plans/dashboard?plan_version_id=${versionId}`}>
            <Button size="sm" variant="outline" className="gap-2 shadow-2xs">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Dashboard</span>
            </Button>
          </Link>

          {(!showAnnualDashboard && !showPeriodDashboard) || activeTab === "hierarchy" ? hierarchyToolbar : null}
        </div>
      </div>

      {/* Main Body */}
      {showAnnualDashboard ? (
        <div className="rounded-xl border border-gray-100 bg-white dark:bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-end px-4 py-3 border-b border-gray-100 dark:border-border">
            {detailTabToggle}
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            {activeTab === "annual" ? (
              <RegionalAnnualVersionsDashboard masterVersion={plan} regionId={regionId!} />
            ) : activeTab === "review" ? (
              <RegionalPlanReviewDashboard versionId={versionId!} regionId={regionId!} />
            ) : (
              <div className="space-y-4">
                {/* Strategic draft finalized banner */}
                {!processStarted && !annualTargetsFinalized && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-700/50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                    Strategic draft is finalized. Use the <strong>Annual Execution</strong> tab to open each year,
                    distribute annual targets across years (total must match the draft target), then finalize annual execution.
                  </div>
                )}
                {renderHierarchyBody()}
              </div>
            )}
          </div>
        </div>
      ) : showPeriodDashboard ? (
        <div className="rounded-xl border border-gray-100 bg-white dark:bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-100 dark:border-border sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {periodsInitializedGlobally && !periodTargetsFinalized && canFinalize && !processStarted && (
                <Button
                  className="gap-2 shadow-xs"
                  onClick={() => setIsFinalizePeriodModalOpen(true)}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Finalize Execution Period
                </Button>
              )}
            </div>
            {detailTabToggle}
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            {activeTab === "periods" ? (
              <RegionalExecutionPeriodsDashboard
                annualVersion={plan}
                regionId={regionId!}
                onFinalizePeriod={() => setIsFinalizePeriodModalOpen(true)}
                canFinalize={canFinalize}
              />
            ) : activeTab === "review" ? (
              <RegionalPlanReviewDashboard versionId={plan.parent_plan_version_id || versionId!} regionId={regionId!} />
            ) : (
              <div className="space-y-4">
                {!periodTargetsFinalized && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-700/50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                    Annual target distribution is finalized. Open each execution period in the <strong>Execution Periods</strong> tab,
                    set period targets so totals match annual targets, then use <strong>Finalize Execution Period</strong> for this year.
                  </div>
                )}
                {renderHierarchyBody()}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "review" ? (
        <div className="rounded-xl border border-gray-100 bg-white dark:bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-end px-4 py-3 border-b border-gray-100 dark:border-border">
            {detailTabToggle}
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            <RegionalPlanReviewDashboard versionId={plan.parent_plan_version_id || versionId!} regionId={regionId!} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Context Guidance Banners */}
          {isAnnualPlan && !periodsInitializedGlobally && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-700/50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              Set annual targets for this fiscal year so that allocations across all years sum exactly to the strategic draft target.
              When ready, return to the strategic plan and click <strong>Finalize Annual Execution</strong>.
            </div>
          )}

          {isPeriodPlan && !processStarted && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-700/50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              Set period targets for {plan.period_label || `Period ${plan.sequence_index}`} so totals match this year&apos;s annual target.
              Finalize execution period from the annual plan when this year is ready.
            </div>
          )}

          {isPeriodPlan && processStarted && (
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-sm",
                plan.execution_status === "open"
                  ? "border-green-200 bg-green-50 text-green-900 dark:bg-green-950/20 dark:text-green-200"
                  : "border-slate-200 bg-slate-50 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300"
              )}
            >
              Execution version 1 — {getExecutionStatusLabel(plan.execution_status as any)}.
              {plan.execution_status === "open"
                ? " Record achievements on assigned leaf nodes, then submit for departmental approval and validation."
                : " This period is locked until the previous period completes."}
            </div>
          )}

          {renderHierarchyBody()}
        </div>
      )}

      {/* Modals */}
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
        rule={plan.planRule}
        planningConfig={plan.planningConfiguration}
        allNodes={rawNodes}
      />

      <FinalizeRegionalPlanDraftModal
        isOpen={isFinalizeDraftOpen}
        onClose={() => setIsFinalizeDraftOpen(false)}
        version={plan}
        regionId={regionId!}
        onSuccess={() => {
          refetch();
          refetchAnnuals();
          setActiveTab("annual");
        }}
      />

      {isAnnualPlan && (
        <FinalizeRegionalExecutionPeriodsModal
          isOpen={isFinalizePeriodModalOpen}
          onClose={() => setIsFinalizePeriodModalOpen(false)}
          annualVersion={plan}
          regionId={regionId!}
          onSuccess={() => {
            refetch();
            refetchPeriods();
          }}
        />
      )}
    </div>
    </RegionalPlanAchievementScopeProvider>
  );

  function renderHierarchyBody() {
    if (!plan) return null;
    return (
      <div className="space-y-4">
        {/* Breadcrumbs navigation */}
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

        {/* Hierarchy Views */}
        {isPeriodPlan && processStarted && (
          <div className="space-y-3 mb-4">
            <RegionalPlanAchievementPendingPanel
              pendingNodes={pendingApprovalNodes}
              hierarchyNumberMap={hierarchyNumberMap}
              configuredUnits={configuredUnits}
              onNavigateToNode={handleViewDetails}
              regionId={regionId!}
            />
            <RegionalPlanAchievementPendingValidationPanel
              pendingNodes={pendingValidationNodes}
              hierarchyNumberMap={hierarchyNumberMap}
              configuredUnits={configuredUnits}
              onNavigateToNode={handleViewDetails}
              regionId={regionId!}
            />
          </div>
        )}

        {rawNodes.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center bg-card">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Strategic Nodes Defined</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-6">
              Get started by adding your Level 1 {rootLabel}. You can then add subordinate milestones under it.
            </p>
            {canUpdatePlan && isMasterPlan && plan.status === "draft" && (
              <Button onClick={() => openCreateModal(null)} className="gap-2 shadow-xs">
                <Plus className="h-4 w-4" />
                <span>Create Root {rootLabel}</span>
              </Button>
            )}
          </div>
        ) : viewMode === "table" ? (
          <PlanHierarchyTableView
            roots={treeRoots}
            hierarchyNumberMap={hierarchyNumberMap}
            rule={plan.planRule as any}
            rootLabel={rootLabel}
            configuredUnits={configuredUnits}
            onAddChild={handleAddChild}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            onMoveNode={handleMoveNode}
            isReordering={isReordering}
            readOnly={!canUpdatePlan || (isMasterPlan && plan.status !== "draft")}
            showAnnualTargets={showAnnualTargets}
            canEditAnnualTarget={canEditAnnualTarget}
            annualTargetAllocations={annualAllocationsMap}
            onSaveAnnualTarget={handleSaveAnnualTarget}
            showPeriodTargets={showPeriodTargets}
            canEditPeriodTarget={canEditPeriodTarget}
            periodTargetAllocations={periodAllocationsMap}
            onSavePeriodTarget={handleSavePeriodTarget}
            showPeriodActuals={showPeriodActuals}
            canEditPeriodActual={canEditPeriodActual}
            useExecutionCompletion={showPeriodActuals}
            processStarted={processStarted}
            renderPeriodActualSection={renderPeriodActualSection}
          />
        ) : viewMode === "card" ? (
          <PlanNodeCardGrid
            nodes={currentNodes}
            hierarchyNumberMap={hierarchyNumberMap}
            rule={plan.planRule as any}
            configuredUnits={configuredUnits}
            onAddChild={handleAddChild}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            onDrillDown={handleDrillDown}
            onMoveNode={(nodeId, direction) => handleMoveNode(nodeId, direction, currentNodes)}
            isReordering={isReordering}
            readOnly={!canUpdatePlan || (isMasterPlan && plan.status !== "draft")}
            showAnnualTargets={showAnnualTargets}
            canEditAnnualTarget={canEditAnnualTarget}
            annualTargetAllocations={annualAllocationsMap}
            onSaveAnnualTarget={handleSaveAnnualTarget}
            showPeriodTargets={showPeriodTargets}
            canEditPeriodTarget={canEditPeriodTarget}
            periodTargetAllocations={periodAllocationsMap}
            onSavePeriodTarget={handleSavePeriodTarget}
            showPeriodActuals={showPeriodActuals}
            canEditPeriodActual={canEditPeriodActual}
            useExecutionCompletion={showPeriodActuals}
            processStarted={processStarted}
            renderPeriodActualSection={renderPeriodActualSection}
          />
        ) : (
          <PlanHierarchyTree
            nodes={treeRoots}
            hierarchyNumberMap={hierarchyNumberMap}
            rule={plan.planRule as any}
            configuredUnits={configuredUnits}
            onAddChild={handleAddChild}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            onDrillDown={handleDrillDown}
            onMoveNode={handleMoveNode}
            isReordering={isReordering}
            scoped={false}
            readOnly={!canUpdatePlan || (isMasterPlan && plan.status !== "draft")}
            showAnnualTargets={showAnnualTargets}
            canEditAnnualTarget={canEditAnnualTarget}
            annualTargetAllocations={annualAllocationsMap}
            onSaveAnnualTarget={handleSaveAnnualTarget}
            showPeriodTargets={showPeriodTargets}
            canEditPeriodTarget={canEditPeriodTarget}
            periodTargetAllocations={periodAllocationsMap}
            onSavePeriodTarget={handleSavePeriodTarget}
            showPeriodActuals={showPeriodActuals}
            canEditPeriodActual={canEditPeriodActual}
            useExecutionCompletion={showPeriodActuals}
            processStarted={processStarted}
            renderPeriodActualSection={renderPeriodActualSection}
          />
        )}
      </div>
    );
  }
}
