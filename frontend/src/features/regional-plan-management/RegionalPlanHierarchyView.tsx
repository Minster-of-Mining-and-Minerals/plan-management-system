"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  GitBranch,
  Layers,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Building2,
  User as UserIcon,
  Target,
  TrendingUp,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Lock,
  ListTree,
  LayoutGrid,
  Table2,
  Sparkles,
  FileText,
  RotateCcw,
  Check,
  X,
  History,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
  useUpdateRegionalPeriodActualMutation,
  useUpdateRegionalAnnualTargetMutation,
  useUpdateRegionalPeriodTargetMutation,
  useSubmitRegionalAchievementMutation,
  useApproveRegionalAchievementMutation,
  useRejectRegionalAchievementMutation,
  useValidateRegionalAchievementMutation,
  useRejectValidationRegionalAchievementMutation,
} from "@/redux/api/regionalPlanApi";
import { useGetRegionalStructuresQuery } from "@/redux/api/regionApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import type { RegionalPlanNode, RegionalPlanVersion } from "@/redux/types/regionalPlan";

const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800", label: "Priority" },
  2: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", label: "Goal" },
  3: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", label: "KPI" },
  4: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", label: "Task" },
};

export function RegionalPlanHierarchyView() {
  const router = useRouter();
  const params = useParams<{ id: string; versionId: string }>();
  const searchParams = useSearchParams();
  const regionId = params?.id;
  const versionId = params?.versionId;
  const { can } = usePermissions();

  const [viewMode, setViewMode] = useState<"tree" | "cards" | "table">("tree");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [parentNodeForCreate, setParentNodeForCreate] = useState<RegionalPlanNode | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<RegionalPlanNode | null>(null);

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [selectedNodeForTarget, setSelectedNodeForTarget] = useState<RegionalPlanNode | null>(null);
  const [targetValue, setTargetValue] = useState<number>(0);

  const [isActualModalOpen, setIsActualModalOpen] = useState(false);
  const [selectedNodeForActual, setSelectedNodeForActual] = useState<RegionalPlanNode | null>(null);
  const [actualValue, setActualValue] = useState<number>(0);
  const [narration, setNarration] = useState<string>("");

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedNodeForReject, setSelectedNodeForReject] = useState<RegionalPlanNode | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectType, setRejectType] = useState<"approval" | "validation">("approval");

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedNodeForHistory, setSelectedNodeForHistory] = useState<RegionalPlanNode | null>(null);

  // Form states for Create/Edit node
  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeDesc, setNodeDesc] = useState("");
  const [nodeWeight, setNodeWeight] = useState<number>(0);
  const [nodeContribWeight, setNodeContribWeight] = useState<number>(100);
  const [nodeTargetUnit, setNodeTargetUnit] = useState("Units");
  const [nodeStructureId, setNodeStructureId] = useState<string>("");
  const [nodeUserId, setNodeUserId] = useState<string>("");

  // Queries
  const {
    data: hierarchyData,
    isLoading,
    isFetching,
    refetch,
  } = useGetRegionalPlanHierarchyQuery(
    { id: versionId, region_id: regionId },
    { skip: !versionId || !regionId }
  );

  const { data: departments = [] } = useGetRegionalStructuresQuery(
    { region_id: regionId },
    { skip: !regionId }
  );

  const { data: users = [] } = useGetUsersQuery(
    { region_id: regionId },
    { skip: !regionId }
  );

  // Mutations
  const [createNode, { isLoading: isCreatingNode }] = useCreateRegionalPlanNodeMutation();
  const [updateNode, { isLoading: isUpdatingNode }] = useUpdateRegionalPlanNodeMutation();
  const [deleteNode, { isLoading: isDeletingNode }] = useDeleteRegionalPlanNodeMutation();

  const [updateAnnualTarget] = useUpdateRegionalAnnualTargetMutation();
  const [updatePeriodTarget] = useUpdateRegionalPeriodTargetMutation();
  const [updatePeriodActual, { isLoading: isSavingActual }] = useUpdateRegionalPeriodActualMutation();
  const [submitAchievement, { isLoading: isSubmitting }] = useSubmitRegionalAchievementMutation();
  const [approveAchievement, { isLoading: isApproving }] = useApproveRegionalAchievementMutation();
  const [rejectAchievement, { isLoading: isRejecting }] = useRejectRegionalAchievementMutation();
  const [validateAchievement, { isLoading: isValidating }] = useValidateRegionalAchievementMutation();
  const [rejectValidation, { isLoading: isRejectingValidation }] = useRejectValidationRegionalAchievementMutation();

  // Permission flags
  const canUpdatePlan = can("REGIONAL_PLANS:UPDATE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
  const canExecute = can("REGIONAL_PLANS:EXECUTE_ACHIEVEMENT") || canUpdatePlan;
  const canApprove = can("REGIONAL_PLANS:APPROVE_ACHIEVEMENT") || canUpdatePlan;
  const canValidate = can("REGIONAL_PLANS:VALIDATE_ACHIEVEMENT") || can("REGIONAL_PLANS:FINALIZE") || can("REGIONS:MANAGE");

  const plan = hierarchyData?.version;
  const rawNodes = hierarchyData?.nodes || [];

  // Toggle node collapse in tree
  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Build recursive hierarchy tree
  const { treeRoots, nodeMap } = useMemo(() => {
    const map = new Map<string, RegionalPlanNode & { children: any[] }>();
    rawNodes.forEach((n) => {
      map.set(n.regional_plan_node_id, { ...n, children: [] });
    });

    const roots: (RegionalPlanNode & { children: any[] })[] = [];
    rawNodes.forEach((n) => {
      const current = map.get(n.regional_plan_node_id)!;
      if (n.parent_id && map.has(n.parent_id)) {
        map.get(n.parent_id)!.children.push(current);
      } else {
        roots.push(current);
      }
    });

    return { treeRoots: roots, nodeMap: map };
  }, [rawNodes]);

  // Open Create Modal
  const openCreateModal = (parent: RegionalPlanNode | null = null) => {
    setParentNodeForCreate(parent);
    setNodeTitle("");
    setNodeDesc("");
    setNodeWeight(0);
    setNodeContribWeight(100);
    setNodeTargetUnit("Units");
    setNodeStructureId(parent?.internalAssignments?.[0]?.regional_structure_id || "");
    setNodeUserId("");
    setIsCreateModalOpen(true);
  };

  // Handle Create Node
  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeTitle.trim()) {
      actionFeedback.error("Title is required");
      return;
    }

    try {
      await createNode({
        region_id: regionId,
        data: {
          regional_plan_version_id: versionId,
          parent_id: parentNodeForCreate ? parentNodeForCreate.regional_plan_node_id : undefined,
          title: nodeTitle.trim(),
          description: nodeDesc.trim() || undefined,
          weight: Number(nodeWeight) || 0,
          contribution_weight: Number(nodeContribWeight) || 100,
          target_unit: nodeTargetUnit,
          regional_structure_id: nodeStructureId || undefined,
          assigned_user_id: nodeUserId || undefined,
        },
      }).unwrap();

      actionFeedback.success("Node created successfully");
      setIsCreateModalOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to create node");
    }
  };

  // Open Edit Modal
  const openEditModal = (node: RegionalPlanNode) => {
    setSelectedNodeForEdit(node);
    setNodeTitle(node.title);
    setNodeDesc(node.description || "");
    setNodeWeight(Number(node.weight) || 0);
    setNodeContribWeight(node.contribution_weight !== undefined ? Number(node.contribution_weight) : 100);
    setNodeTargetUnit(node.target_unit || "Units");
    setNodeStructureId(node.internalAssignments?.[0]?.regional_structure_id || "");
    setNodeUserId(node.internalAssignments?.[0]?.assignedUser?.user_id || "");
    setIsEditModalOpen(true);
  };

  // Handle Update Node
  const handleUpdateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeForEdit || !nodeTitle.trim()) return;

    try {
      await updateNode({
        id: selectedNodeForEdit.regional_plan_node_id,
        region_id: regionId,
        data: {
          title: nodeTitle.trim(),
          description: nodeDesc.trim() || undefined,
          weight: Number(nodeWeight) || 0,
          contribution_weight: Number(nodeContribWeight) || 100,
          target_unit: nodeTargetUnit,
          regional_structure_id: nodeStructureId || undefined,
        },
      }).unwrap();

      actionFeedback.success("Node updated successfully");
      setIsEditModalOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to update node");
    }
  };

  // Handle Delete Node
  const handleDeleteNode = async (node: RegionalPlanNode) => {
    if (!confirm(`Are you sure you want to delete "${node.title}" and any subordinate nodes?`)) return;

    try {
      await deleteNode({ id: node.regional_plan_node_id, region_id: regionId }).unwrap();
      actionFeedback.success("Node deleted successfully");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to delete node");
    }
  };

  // Open Target Modal
  const openTargetModal = (node: RegionalPlanNode) => {
    setSelectedNodeForTarget(node);
    const current = plan?.version_kind === "execution_period" ? node.period_target : node.annual_target;
    setTargetValue(Number(current) || 0);
    setIsTargetModalOpen(true);
  };

  // Save Target
  const handleSaveTarget = async () => {
    if (!selectedNodeForTarget) return;
    try {
      if (plan?.version_kind === "execution_period") {
        await updatePeriodTarget({
          nodeId: selectedNodeForTarget.regional_plan_node_id,
          region_id: regionId,
          period_target: Number(targetValue),
        }).unwrap();
      } else {
        await updateAnnualTarget({
          nodeId: selectedNodeForTarget.regional_plan_node_id,
          region_id: regionId,
          annual_target: Number(targetValue),
        }).unwrap();
      }

      actionFeedback.success("Target allocated successfully");
      setIsTargetModalOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to allocate target");
    }
  };

  // Open Actual Modal
  const openActualModal = (node: RegionalPlanNode) => {
    setSelectedNodeForActual(node);
    setActualValue(Number(node.period_actual) || 0);
    setNarration(node.narration || "");
    setIsActualModalOpen(true);
  };

  // Save or Submit Actual
  const handleSaveActual = async (andSubmit = false) => {
    if (!selectedNodeForActual) return;
    try {
      await updatePeriodActual({
        nodeId: selectedNodeForActual.regional_plan_node_id,
        region_id: regionId,
        data: {
          period_actual: Number(actualValue),
          narration,
        },
      }).unwrap();

      if (andSubmit) {
        await submitAchievement({
          nodeId: selectedNodeForActual.regional_plan_node_id,
          region_id: regionId,
          data: { period_actual: Number(actualValue), narration },
        }).unwrap();
        actionFeedback.success("Achievement recorded and submitted for department review!");
      } else {
        actionFeedback.success("Achievement saved as draft");
      }

      setIsActualModalOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to save achievement");
    }
  };

  // Direct Submit
  const handleSubmitAchievement = async (node: RegionalPlanNode) => {
    try {
      await submitAchievement({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Achievement submitted for department review");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to submit achievement");
    }
  };

  // Department Approve
  const handleApprove = async (node: RegionalPlanNode) => {
    try {
      await approveAchievement({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Achievement approved and queued for central validation");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to approve achievement");
    }
  };

  // Open Reject Modal
  const openRejectModal = (node: RegionalPlanNode, type: "approval" | "validation") => {
    setSelectedNodeForReject(node);
    setRejectType(type);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!selectedNodeForReject) return;
    try {
      if (rejectType === "approval") {
        await rejectAchievement({
          nodeId: selectedNodeForReject.regional_plan_node_id,
          region_id: regionId,
          comment: rejectReason || "Rejected by reviewer",
        }).unwrap();
      } else {
        await rejectValidation({
          nodeId: selectedNodeForReject.regional_plan_node_id,
          region_id: regionId,
          comment: rejectReason || "Validation rejected",
        }).unwrap();
      }

      actionFeedback.success("Achievement rejected and returned to executor");
      setIsRejectModalOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to reject achievement");
    }
  };

  // Bureau Validate
  const handleValidate = async (node: RegionalPlanNode) => {
    try {
      await validateAchievement({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Achievement validated and confirmed in official rollups!");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to validate achievement");
    }
  };

  if (isLoading || !plan) return <Loading01 />;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href={`/regions/${regionId}/plans`} className="hover:text-primary transition-colors">
            Regional Plans
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/regions/${regionId}/plans/${versionId}`} className="hover:text-primary transition-colors font-medium">
            {plan.draft_name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">Hierarchy & Node Editor</span>
        </div>

        <div className="flex items-center gap-2">
          {canUpdatePlan && (
            <Button size="sm" onClick={() => openCreateModal(null)} className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Add Root Priority</span>
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

      {/* Plan Details Strip */}
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

        {/* View Mode Switcher & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("tree")}
              className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === "tree" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListTree className="h-3.5 w-3.5" />
              <span>Tree</span>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === "cards" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === "table" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Hierarchy Content */}
      {rawNodes.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center bg-card">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No Strategic Nodes Defined</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-6">
            Get started by creating your Level 1 Strategic Priorities. You can then add Regional Goals, KPIs, and Operational Tasks under them.
          </p>
          {canUpdatePlan && (
            <Button onClick={() => openCreateModal(null)} className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Create First Priority</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {treeRoots.map((root, index) => (
            <TreeNodeItem
              key={root.regional_plan_node_id}
              node={root}
              indexPrefix={`${index + 1}`}
              collapsedNodes={collapsedNodes}
              toggleCollapse={toggleCollapse}
              onAddChild={openCreateModal}
              onEdit={openEditModal}
              onDelete={handleDeleteNode}
              onSetTarget={openTargetModal}
              onSetActual={openActualModal}
              onSubmitAchievement={handleSubmitAchievement}
              onApprove={handleApprove}
              onReject={(n) => openRejectModal(n, "approval")}
              onValidate={handleValidate}
              onRejectValidation={(n) => openRejectModal(n, "validation")}
              canUpdate={canUpdatePlan}
              canExecute={canExecute}
              canApprove={canApprove}
              canValidate={canValidate}
              isExecutionPeriod={plan.version_kind === "execution_period"}
            />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: Create Plan Node */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              <span>
                {parentNodeForCreate
                  ? `Add Sub-Milestone under "${parentNodeForCreate.title}"`
                  : "Create Level 1 Strategic Priority"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateNode} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Node Title *</label>
              <Input
                placeholder="e.g. Sustainable Gold Mining Capacity"
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <Textarea
                placeholder="Strategic objective details..."
                value={nodeDesc}
                onChange={(e) => setNodeDesc(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Strategic Weight</label>
                <Input
                  type="number"
                  min="0"
                  value={nodeWeight}
                  onChange={(e) => setNodeWeight(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Contribution Weight (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={nodeContribWeight}
                  onChange={(e) => setNodeContribWeight(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Target Unit</label>
                <Input
                  placeholder="e.g. Tons, USD, Count, %"
                  value={nodeTargetUnit}
                  onChange={(e) => setNodeTargetUnit(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Responsible Department</label>
                <select
                  value={nodeStructureId}
                  onChange={(e) => setNodeStructureId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select Department...</option>
                  {departments.map((dept) => (
                    <option key={dept.regional_structure_id} value={dept.regional_structure_id}>
                      {dept.name} (L{dept.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingNode}>
                {isCreatingNode ? "Creating..." : "Create Node"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: Edit Plan Node */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit2 className="h-5 w-5 text-primary" />
              <span>Edit Milestone</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateNode} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Node Title *</label>
              <Input
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <Textarea
                value={nodeDesc}
                onChange={(e) => setNodeDesc(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Strategic Weight</label>
                <Input
                  type="number"
                  min="0"
                  value={nodeWeight}
                  onChange={(e) => setNodeWeight(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Contribution Weight (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={nodeContribWeight}
                  onChange={(e) => setNodeContribWeight(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Target Unit</label>
                <Input
                  value={nodeTargetUnit}
                  onChange={(e) => setNodeTargetUnit(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Responsible Department</label>
                <select
                  value={nodeStructureId}
                  onChange={(e) => setNodeStructureId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select Department...</option>
                  {departments.map((dept) => (
                    <option key={dept.regional_structure_id} value={dept.regional_structure_id}>
                      {dept.name} (L{dept.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingNode}>
                {isUpdatingNode ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: Allocate Target */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isTargetModalOpen} onOpenChange={setIsTargetModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" />
              <span>
                {plan.version_kind === "execution_period" ? "Allocate Execution Period Target" : "Allocate Annual Target"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Target for <span className="font-semibold text-foreground">"{selectedNodeForTarget?.title}"</span>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Value ({selectedNodeForTarget?.target_unit || "Units"})</label>
              <Input
                type="number"
                min="0"
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsTargetModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTarget}>
                Save Target
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: Report Actual Achievement */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isActualModalOpen} onOpenChange={setIsActualModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span>Record Milestone Achievement</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs font-semibold text-foreground truncate">
                {selectedNodeForActual?.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: {selectedNodeForActual?.period_target || selectedNodeForActual?.annual_target || "0"} {selectedNodeForActual?.target_unit || "Units"}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Actual Achievement Value *</label>
              <Input
                type="number"
                step="any"
                min="0"
                value={actualValue}
                onChange={(e) => setActualValue(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Narration & Executive Summary</label>
              <Textarea
                placeholder="Describe methodology, verification documents, and achievement highlights..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsActualModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => handleSaveActual(false)} disabled={isSavingActual}>
                Save Draft
              </Button>
              <Button onClick={() => handleSaveActual(true)} disabled={isSavingActual || isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Submit for Review
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: Reject Reason Prompt */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>
                {rejectType === "approval" ? "Reject Submitted Achievement" : "Reject Bureau Validation"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Please state why this achievement value cannot be approved. The executing department will receive this comment and be required to adjust the figure.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Rejection Reason *</label>
              <Textarea
                placeholder="e.g. Supporting weighbridge receipts missing or figures don't match regional audit..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={isRejecting || isRejectingValidation || !rejectReason.trim()}
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -------------------------------------------------------------
// Recursive Tree Node Item Component
// -------------------------------------------------------------
function TreeNodeItem({
  node,
  indexPrefix,
  collapsedNodes,
  toggleCollapse,
  onAddChild,
  onEdit,
  onDelete,
  onSetTarget,
  onSetActual,
  onSubmitAchievement,
  onApprove,
  onReject,
  onValidate,
  onRejectValidation,
  canUpdate,
  canExecute,
  canApprove,
  canValidate,
  isExecutionPeriod,
}: {
  node: RegionalPlanNode & { children?: RegionalPlanNode[] };
  indexPrefix: string;
  collapsedNodes: Record<string, boolean>;
  toggleCollapse: (id: string) => void;
  onAddChild: (node: RegionalPlanNode) => void;
  onEdit: (node: RegionalPlanNode) => void;
  onDelete: (node: RegionalPlanNode) => void;
  onSetTarget: (node: RegionalPlanNode) => void;
  onSetActual: (node: RegionalPlanNode) => void;
  onSubmitAchievement: (node: RegionalPlanNode) => void;
  onApprove: (node: RegionalPlanNode) => void;
  onReject: (node: RegionalPlanNode) => void;
  onValidate: (node: RegionalPlanNode) => void;
  onRejectValidation: (node: RegionalPlanNode) => void;
  canUpdate: boolean;
  canExecute: boolean;
  canApprove: boolean;
  canValidate: boolean;
  isExecutionPeriod: boolean;
}) {
  const isCollapsed = collapsedNodes[node.regional_plan_node_id];
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren;

  const target = isExecutionPeriod ? Number(node.period_target) || 0 : Number(node.annual_target) || 0;
  const actual = Number(node.period_actual);
  const status = node.period_actual_status || "empty";
  const progress = (node as any).execution_progress_percent ?? 0;

  const levelCfg = LEVEL_COLORS[node.level] || LEVEL_COLORS[1];
  const assignedDept = node.internalAssignments?.[0]?.department?.name;

  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl border bg-card p-4 shadow-2xs hover:border-primary/40 transition-all ${
          node.level > 1 ? "ml-4 sm:ml-8" : ""
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Indicator Title, Level badge, Code */}
          <div className="flex items-start gap-3 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleCollapse(node.regional_plan_node_id)}
                className="mt-1 p-1 hover:bg-muted rounded transition-colors text-muted-foreground"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            ) : (
              <div className="w-6 mt-1" />
            )}

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  {indexPrefix}
                </span>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${levelCfg.bg} ${levelCfg.text} ${levelCfg.border}`}
                >
                  {levelCfg.label}
                </span>

                <h4 className="font-semibold text-sm text-foreground truncate max-w-md">
                  {node.title}
                </h4>

                {assignedDept && (
                  <Badge variant="outline" className="text-[11px] gap-1 font-normal">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span>{assignedDept}</span>
                  </Badge>
                )}
              </div>

              {node.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {node.description}
                </p>
              )}
            </div>
          </div>

          {/* Center: Targets, Actuals & Progress */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Target & Actual */}
            <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/60">
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Target</span>
                <span className="font-mono font-bold text-foreground">
                  {target.toLocaleString()} {node.target_unit || ""}
                </span>
              </div>

              <div className="h-6 w-px bg-border" />

              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Actual</span>
                <span className="font-mono font-bold text-foreground">
                  {isNaN(actual) || node.period_actual === null ? "—" : actual.toLocaleString()} {node.target_unit || ""}
                </span>
              </div>
            </div>

            {/* Achievement Status Badge */}
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">Workflow</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  status === "validated"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : status === "approved"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                    : status === "submitted"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    : status === "rejected"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {status}
              </span>
            </div>

            {/* Progress Pill */}
            <div className="w-20 text-right">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">Progress</span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-mono font-bold text-xs text-foreground">{progress}%</span>
                <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${
                      progress >= 100 ? "bg-emerald-600" : progress > 50 ? "bg-blue-600" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            <div className="flex items-center gap-1">
              {/* Target allocation trigger */}
              {canUpdate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSetTarget(node)}
                  className="h-7 text-xs px-2 gap-1"
                  title="Allocate Target"
                >
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Target</span>
                </Button>
              )}

              {/* Execution reporting triggers for leaf nodes */}
              {isLeaf && canExecute && status !== "validated" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSetActual(node)}
                  className="h-7 text-xs px-2 gap-1"
                  title="Record Actual Achievement"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Report</span>
                </Button>
              )}

              {/* Executor Submit if draft actual entered */}
              {isLeaf && canExecute && (status === "empty" || status === "rejected") && actual > 0 && (
                <Button
                  size="sm"
                  onClick={() => onSubmitAchievement(node)}
                  className="h-7 text-xs px-2 gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                  title="Submit Achievement for Review"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span>Submit</span>
                </Button>
              )}

              {/* Department Leader Approval Trigger */}
              {canApprove && status === "submitted" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onApprove(node)}
                    className="h-7 text-xs px-2 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                    title="Approve Achievement"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(node)}
                    className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Reject Achievement"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {/* Central Validator Trigger */}
              {canValidate && status === "approved" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onValidate(node)}
                    className="h-7 text-xs px-2 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    title="Validate Achievement (Locking)"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Validate</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRejectValidation(node)}
                    className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                    title="Reject Validation"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {/* Add child if level < 4 */}
              {canUpdate && node.level < 4 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAddChild(node)}
                  className="h-7 w-7 p-0"
                  title="Add Sub-Milestone"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}

              {/* Edit */}
              {canUpdate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(node)}
                  className="h-7 w-7 p-0"
                  title="Edit Milestone"
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}

              {/* Delete */}
              {canUpdate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(node)}
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                  title="Delete Milestone"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Rejection comment notice if rejected */}
        {node.period_actual_rejection_comment && status === "rejected" && (
          <div className="mt-3 p-2.5 rounded-lg border border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              <strong>Reviewer Note:</strong> {node.period_actual_rejection_comment}
            </span>
          </div>
        )}
      </div>

      {/* Recursive children rendering */}
      {!isCollapsed && hasChildren && (
        <div className="space-y-2">
          {node.children!.map((child, cIdx) => (
            <TreeNodeItem
              key={child.regional_plan_node_id}
              node={child}
              indexPrefix={`${indexPrefix}.${cIdx + 1}`}
              collapsedNodes={collapsedNodes}
              toggleCollapse={toggleCollapse}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onSetTarget={onSetTarget}
              onSetActual={onSetActual}
              onSubmitAchievement={onSubmitAchievement}
              onApprove={onApprove}
              onReject={onReject}
              onValidate={onValidate}
              onRejectValidation={onRejectValidation}
              canUpdate={canUpdate}
              canExecute={canExecute}
              canApprove={canApprove}
              canValidate={canValidate}
              isExecutionPeriod={isExecutionPeriod}
            />
          ))}
        </div>
      )}
    </div>
  );
}
