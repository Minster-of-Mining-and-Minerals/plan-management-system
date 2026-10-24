"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  GitBranch,
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Target,
  Search,
  Lock,
  ListTree,
  LayoutGrid,
  Table2,
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
  useGetCompanyPlanHierarchyQuery,
  useCreateCompanyPlanNodeMutation,
  useUpdateCompanyPlanNodeMutation,
  useDeleteCompanyPlanNodeMutation,
  useUpdateCompanyPeriodActualMutation,
  useUpdateCompanyAnnualTargetMutation,
  useUpdateCompanyPeriodTargetMutation,
  useSubmitCompanyAchievementMutation,
  useApproveCompanyAchievementMutation,
  useRejectCompanyAchievementMutation,
  useValidateCompanyAchievementMutation,
} from "@/redux/api/companyPlanApi";
import { useGetCompanyStructuresQuery } from "@/redux/api/companyApi";
import type { CompanyPlanNode } from "@/redux/types/companyPlan";

const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800", label: "Strategic Focus" },
  2: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", label: "Goal" },
  3: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", label: "KPI" },
  4: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", label: "Task" },
};

export function CompanyPlanHierarchyView() {
  const params = useParams<{ id: string; versionId: string }>();
  const companyId = params?.id;
  const versionId = params?.versionId;
  const { can } = usePermissions();

  const [viewMode, setViewMode] = useState<"tree" | "cards" | "table">("tree");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [parentNodeForCreate, setParentNodeForCreate] = useState<CompanyPlanNode | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<CompanyPlanNode | null>(null);

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [selectedNodeForTarget, setSelectedNodeForTarget] = useState<CompanyPlanNode | null>(null);
  const [targetInput, setTargetInput] = useState<string>("");

  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [selectedNodeForAchievement, setSelectedNodeForAchievement] = useState<CompanyPlanNode | null>(null);
  const [actualInput, setActualInput] = useState<string>("");
  const [narrationInput, setNarrationInput] = useState<string>("");

  // Create/Edit form states
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formWeight, setFormWeight] = useState<number>(0);
  const [formContributionWeight, setFormContributionWeight] = useState<number>(0);
  const [formDepartments, setFormDepartments] = useState<string[]>([]);

  // Fetch Hierarchy
  const {
    data: hierarchyData,
    isLoading: isHierarchyLoading,
    refetch: refetchHierarchy,
  } = useGetCompanyPlanHierarchyQuery(
    { id: versionId, company_id: companyId },
    { skip: !versionId || !companyId }
  );

  // Fetch company departments
  const { data: structures = [] } = useGetCompanyStructuresQuery(
    { company_id: companyId, is_active: true },
    { skip: !companyId }
  );

  // Mutations
  const [createNode, { isLoading: isCreating }] = useCreateCompanyPlanNodeMutation();
  const [updateNode, { isLoading: isUpdating }] = useUpdateCompanyPlanNodeMutation();
  const [deleteNode] = useDeleteCompanyPlanNodeMutation();
  const [updateAnnualTarget] = useUpdateCompanyAnnualTargetMutation();
  const [updatePeriodTarget] = useUpdateCompanyPeriodTargetMutation();
  const [updatePeriodActual, { isLoading: isUpdatingActual }] = useUpdateCompanyPeriodActualMutation();
  const [submitAchievement, { isLoading: isSubmitting }] = useSubmitCompanyAchievementMutation();
  const [approveAchievement, { isLoading: isApproving }] = useApproveCompanyAchievementMutation();
  const [rejectAchievement, { isLoading: isRejecting }] = useRejectCompanyAchievementMutation();
  const [validateAchievement, { isLoading: isValidating }] = useValidateCompanyAchievementMutation();

  const plan = hierarchyData?.version;
  const isLocked = !!plan?.is_locked;

  const canManage = can("COMPANY_PLANS:UPDATE") || can("COMPANY_PLANS:MANAGE") || can("COMPANIES:MANAGE");
  const canExecute = can("COMPANY_PLANS:EXECUTE_ACHIEVEMENT") || canManage;
  const canApprove = can("COMPANY_PLANS:APPROVE_ACHIEVEMENT") || canManage;
  const canValidate = can("COMPANY_PLANS:VALIDATE_ACHIEVEMENT") || canManage;

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenCreateModal = (parent: CompanyPlanNode | null = null) => {
    setParentNodeForCreate(parent);
    setFormTitle("");
    setFormDescription("");
    setFormUnit("");
    setFormWeight(0);
    setFormContributionWeight(0);
    setFormDepartments([]);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      actionFeedback.error("Title is required");
      return;
    }

    const nextLevel = parentNodeForCreate ? parentNodeForCreate.level + 1 : 1;
    const nodeType = nextLevel === 1 ? "strategic_focus" : nextLevel === 2 ? "goal" : nextLevel === 3 ? "kpi" : "activity";

    try {
      await createNode({
        company_id: companyId,
        data: {
          company_plan_version_id: versionId,
          parent_id: parentNodeForCreate ? parentNodeForCreate.company_plan_node_id : null,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          level: nextLevel,
          type: nodeType,
          target_unit: formUnit.trim() || null,
          weight: Number(formWeight) || 0,
          contribution_weight: Number(formContributionWeight) || 0,
          department_ids: formDepartments,
        },
      }).unwrap();

      actionFeedback.success("Hierarchy node added successfully");
      setIsCreateModalOpen(false);
      refetchHierarchy();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to create node");
    }
  };

  const handleOpenEditModal = (node: CompanyPlanNode) => {
    setSelectedNodeForEdit(node);
    setFormTitle(node.title);
    setFormDescription(node.description || "");
    setFormUnit(node.target_unit || "");
    setFormWeight(node.weight || 0);
    setFormContributionWeight(node.contribution_weight || 0);
    setFormDepartments(node.internalAssignments?.map((a) => a.company_structure_id!).filter(Boolean) || []);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeForEdit) return;

    try {
      await updateNode({
        id: selectedNodeForEdit.company_plan_node_id,
        company_id: companyId,
        data: {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          target_unit: formUnit.trim() || null,
          weight: Number(formWeight) || 0,
          contribution_weight: Number(formContributionWeight) || 0,
          department_ids: formDepartments,
        },
      }).unwrap();

      actionFeedback.success("Node updated successfully");
      setIsEditModalOpen(false);
      refetchHierarchy();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to update node");
    }
  };

  const handleDeleteNode = async (node: CompanyPlanNode) => {
    if (isLocked) {
      actionFeedback.error("Plan is locked. Nodes cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${node.title}" and all its children?`)) return;

    try {
      await deleteNode({ id: node.company_plan_node_id, company_id: companyId }).unwrap();
      actionFeedback.success("Node deleted");
      refetchHierarchy();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to delete node");
    }
  };

  // Target Update
  const handleOpenTargetModal = (node: CompanyPlanNode) => {
    setSelectedNodeForTarget(node);
    const initialTarget = plan?.version_kind === "period"
      ? (node.period_target ?? "")
      : (node.annual_target ?? "");
    setTargetInput(String(initialTarget));
    setIsTargetModalOpen(true);
  };

  const handleTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeForTarget) return;

    const val = parseFloat(targetInput) || 0;
    try {
      if (plan?.version_kind === "period") {
        await updatePeriodTarget({
          nodeId: selectedNodeForTarget.company_plan_node_id,
          company_id: companyId,
          period_target: val,
        }).unwrap();
      } else {
        await updateAnnualTarget({
          nodeId: selectedNodeForTarget.company_plan_node_id,
          company_id: companyId,
          annual_target: val,
        }).unwrap();
      }

      actionFeedback.success("Target allocation updated");
      setIsTargetModalOpen(false);
      refetchHierarchy();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to update target");
    }
  };

  // Achievement Workflow
  const handleOpenAchievementModal = (node: CompanyPlanNode) => {
    setSelectedNodeForAchievement(node);
    setActualInput(node.period_actual !== undefined && node.period_actual !== null ? String(node.period_actual) : "");
    setNarrationInput(node.narration || "");
    setIsAchievementModalOpen(true);
  };

  const handleSaveActualOnly = async () => {
    if (!selectedNodeForAchievement) return;
    try {
      await updatePeriodActual({
        nodeId: selectedNodeForAchievement.company_plan_node_id,
        company_id: companyId,
        period_actual: parseFloat(actualInput) || 0,
      }).unwrap();

      actionFeedback.success("Reported actual saved as draft");
      setIsAchievementModalOpen(false);
      refetchHierarchy();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to save actual");
    }
  };

  const handleSubmitAchievement = async () => {
    if (!selectedNodeForAchievement) return;
    try {
      await submitAchievement({
        nodeId: selectedNodeForAchievement.company_plan_node_id,
        company_id: companyId,
        data: {
          period_actual: parseFloat(actualInput) || 0,
          narration: narrationInput.trim(),
        },
      }).unwrap();

      actionFeedback.success("Achievement submitted for management review");
      setIsAchievementModalOpen(false);
      refetchHierarchy();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to submit achievement");
    }
  };

  const handleApproveAchievement = async () => {
    if (!selectedNodeForAchievement) return;
    try {
      await approveAchievement({
        nodeId: selectedNodeForAchievement.company_plan_node_id,
        company_id: companyId,
      }).unwrap();

      actionFeedback.success("Achievement approved");
      setIsAchievementModalOpen(false);
      refetchHierarchy();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to approve achievement");
    }
  };

  const handleValidateAchievement = async () => {
    if (!selectedNodeForAchievement) return;
    try {
      await validateAchievement({
        nodeId: selectedNodeForAchievement.company_plan_node_id,
        company_id: companyId,
      }).unwrap();

      actionFeedback.success("Achievement officially validated");
      setIsAchievementModalOpen(false);
      refetchHierarchy();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to validate achievement");
    }
  };

  const handleRejectAchievement = async () => {
    if (!selectedNodeForAchievement) return;
    const comment = prompt("Enter return/rejection remarks:");
    if (comment === null) return;

    try {
      await rejectAchievement({
        nodeId: selectedNodeForAchievement.company_plan_node_id,
        company_id: companyId,
        comment,
      }).unwrap();

      actionFeedback.success("Achievement returned with comments");
      setIsAchievementModalOpen(false);
      refetchHierarchy();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to return achievement");
    }
  };

  // Filtered Tree & Flat
  const filteredTree = useMemo(() => {
    if (!hierarchyData?.tree) return [];

    const filterNode = (node: CompanyPlanNode): CompanyPlanNode | null => {
      const matchesSearch =
        search === "" ||
        node.title.toLowerCase().includes(search.toLowerCase()) ||
        node.description?.toLowerCase().includes(search.toLowerCase());

      const matchesLevel = levelFilter === "all" || node.level === levelFilter;

      let filteredChildren: CompanyPlanNode[] = [];
      if (node.children && node.children.length > 0) {
        filteredChildren = node.children
          .map(filterNode)
          .filter((c): c is CompanyPlanNode => c !== null);
      }

      if ((matchesSearch && matchesLevel) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }

      return null;
    };

    return hierarchyData.tree.map(filterNode).filter((n): n is CompanyPlanNode => n !== null);
  }, [hierarchyData, search, levelFilter]);

  const flatList = useMemo(() => {
    if (!hierarchyData?.flat) return [];
    return hierarchyData.flat.filter((node) => {
      const matchesSearch =
        search === "" ||
        node.title.toLowerCase().includes(search.toLowerCase()) ||
        node.description?.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = levelFilter === "all" || node.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [hierarchyData, search, levelFilter]);

  if (isHierarchyLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/companies/${companyId}/plans/${versionId}`}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back to Plan Details</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GitBranch className="h-6 w-6 text-primary" />
              Hierarchy Structure & Target Allocation
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {plan?.draft_name}
            </Badge>
            {isLocked && (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage && !isLocked && (
            <Button onClick={() => handleOpenCreateModal(null)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Strategic Focus (L1)
            </Button>
          )}
        </div>
      </div>

      {/* FILTER & VIEW CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-64">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title or description..."
              className="h-9 pl-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1">
            <select
              aria-label="Filter by level"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
            >
              <option value="all">All Levels</option>
              <option value={1}>Level 1: Strategic Focus</option>
              <option value={2}>Level 2: Goals</option>
              <option value={3}>Level 3: KPIs</option>
              <option value={4}>Level 4: Tasks</option>
            </select>
          </div>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-1 border border-border rounded-xl p-1 bg-muted/40">
          <Button
            variant={viewMode === "tree" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setViewMode("tree")}
          >
            <ListTree className="h-3.5 w-3.5" />
            Tree
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="h-3.5 w-3.5" />
            Table
          </Button>
        </div>
      </div>

      {/* RENDER VIEW ACCORDING TO VIEWMODE */}
      {filteredTree.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <Layers className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Nodes Configured</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Get started by creating the highest strategic pillar (Strategic Focus) for this corporate plan.
          </p>
          {canManage && !isLocked && (
            <Button onClick={() => handleOpenCreateModal(null)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Strategic Focus
            </Button>
          )}
        </div>
      ) : viewMode === "tree" ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-2">
          {filteredTree.map((node) => (
            <HierarchyNodeItem
              key={node.company_plan_node_id}
              node={node}
              level={1}
              isLocked={isLocked}
              canManage={canManage}
              canExecute={canExecute}
              canApprove={canApprove}
              canValidate={canValidate}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={toggleCollapse}
              onAddChild={handleOpenCreateModal}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteNode}
              onOpenTarget={handleOpenTargetModal}
              onOpenAchievement={handleOpenAchievementModal}
            />
          ))}
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flatList.map((node) => {
            const config = LEVEL_COLORS[node.level] || { bg: "bg-card", text: "text-foreground", border: "border-border", label: `L${node.level}` };
            const target = node.annual_target || node.period_target || 0;
            const actual = node.period_actual || 0;
            const progress = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;

            return (
              <div
                key={node.company_plan_node_id}
                className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] font-bold ${config.text} ${config.border}`}>
                      {config.label}
                    </Badge>
                    {node.period_actual_status && (
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {node.period_actual_status}
                      </Badge>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-foreground leading-snug">{node.title}</h4>
                  {node.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{node.description}</p>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-border/60">
                  {target > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground">Actual / Target:</span>
                        <span className="font-bold text-foreground">
                          {actual} / {target} {node.target_unit}
                        </span>
                      </div>
                      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 pt-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenAchievementModal(node)}>
                      Report & Signoff
                    </Button>
                    {!isLocked && canManage && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenEditModal(node)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3 pl-4">Level</th>
                <th className="p-3">Title & Hierarchy</th>
                <th className="p-3">Unit</th>
                <th className="p-3 text-right">Target</th>
                <th className="p-3 text-right">Actual</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {flatList.map((node) => {
                const config = LEVEL_COLORS[node.level] || { label: `L${node.level}` };
                const target = node.annual_target || node.period_target || 0;
                const actual = node.period_actual || 0;

                return (
                  <tr key={node.company_plan_node_id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 pl-4">
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {config.label}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-foreground max-w-xs truncate">
                      {node.title}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono">{node.target_unit || "—"}</td>
                    <td className="p-3 text-right font-mono font-bold">{target || "—"}</td>
                    <td className="p-3 text-right font-mono font-bold text-primary">{actual || "—"}</td>
                    <td className="p-3 text-center">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {node.period_actual_status || "empty"}
                      </Badge>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenAchievementModal(node)}>
                          Achievement
                        </Button>
                        {!isLocked && canManage && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenEditModal(node)}>
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE NODE DIALOG */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                {parentNodeForCreate ? (
                  <span>Add Child under &quot;{parentNodeForCreate.title}&quot;</span>
                ) : (
                  <span>Create Strategic Focus (Level 1 Pillar)</span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Node Title <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Expand Mineral Metallurgy Processing Plant"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Description & Context</label>
                <Textarea
                  placeholder="Operational context, scope, or expected milestones..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Target Measurement Unit</label>
                  <Input
                    placeholder="e.g. Kilograms, USD, Count, %"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Weight (Score impact)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formWeight}
                    onChange={(e) => setFormWeight(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {structures.length > 0 && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Assign Responsible Department(s)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-border rounded-xl bg-muted/20">
                    {structures.map((st) => (
                      <label key={st.company_structure_id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formDepartments.includes(st.company_structure_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormDepartments([...formDepartments, st.company_structure_id]);
                            } else {
                              setFormDepartments(formDepartments.filter((id) => id !== st.company_structure_id));
                            }
                          }}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="truncate">{st.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Adding..." : "Add Hierarchy Node"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT NODE DIALOG */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                Edit Hierarchy Node
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Title</label>
                <Input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Description</label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Measurement Unit</label>
                  <Input
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Weight</label>
                  <Input
                    type="number"
                    value={formWeight}
                    onChange={(e) => setFormWeight(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TARGET MODAL */}
      <Dialog open={isTargetModalOpen} onOpenChange={setIsTargetModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleTargetSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Set Planned Target
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1">
                <span className="font-semibold text-foreground">{selectedNodeForTarget?.title}</span>
                <p className="text-xs text-muted-foreground">
                  Unit: <span className="font-mono text-primary">{selectedNodeForTarget?.target_unit || "Units"}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Target Value</label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTargetModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Target</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ACHIEVEMENT & SIGNOFF WORKFLOW MODAL */}
      <Dialog open={isAchievementModalOpen} onOpenChange={setIsAchievementModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Achievement Signoff & Actual Reporting
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1">
              <div className="font-bold text-foreground text-xs">{selectedNodeForAchievement?.title}</div>
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>Target: {selectedNodeForAchievement?.annual_target || selectedNodeForAchievement?.period_target || 0} {selectedNodeForAchievement?.target_unit}</span>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {selectedNodeForAchievement?.period_actual_status || "empty"}
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Actual Result Achieved</label>
              <Input
                type="number"
                step="any"
                value={actualInput}
                onChange={(e) => setActualInput(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Narration & Justification</label>
              <Textarea
                rows={2}
                placeholder="Explain the results, evidence, and operational context..."
                value={narrationInput}
                onChange={(e) => setNarrationInput(e.target.value)}
              />
            </div>

            {/* Workflow Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              {canExecute && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={handleSaveActualOnly}
                    disabled={isUpdatingActual}
                  >
                    Save Draft Value
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 text-xs"
                    onClick={handleSubmitAchievement}
                    disabled={isSubmitting}
                  >
                    Submit For Approval
                  </Button>
                </div>
              )}

              {canApprove && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleApproveAchievement}
                    disabled={isApproving}
                  >
                    Approve Result
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleRejectAchievement}
                    disabled={isRejecting}
                  >
                    Return / Reject
                  </Button>
                </div>
              )}

              {canValidate && (
                <Button
                  type="button"
                  variant="default"
                  className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleValidateAchievement}
                  disabled={isValidating}
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Validate Final Achievement
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HierarchyNodeItem({
  node,
  level,
  isLocked,
  canManage,
  canExecute,
  canApprove,
  canValidate,
  collapsedNodes,
  onToggleCollapse,
  onAddChild,
  onEdit,
  onDelete,
  onOpenTarget,
  onOpenAchievement,
}: {
  node: CompanyPlanNode;
  level: number;
  isLocked: boolean;
  canManage: boolean;
  canExecute: boolean;
  canApprove: boolean;
  canValidate: boolean;
  collapsedNodes: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  onAddChild: (parent: CompanyPlanNode) => void;
  onEdit: (node: CompanyPlanNode) => void;
  onDelete: (node: CompanyPlanNode) => void;
  onOpenTarget: (node: CompanyPlanNode) => void;
  onOpenAchievement: (node: CompanyPlanNode) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = !!collapsedNodes[node.company_plan_node_id];

  const config = LEVEL_COLORS[node.level] || { label: `L${node.level}`, bg: "bg-card", text: "text-foreground", border: "border-border" };

  const target = node.annual_target || node.period_target || 0;
  const actual = node.period_actual || 0;
  const progressPercent = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 transition-all group"
        style={{ marginLeft: `${(level - 1) * 20}px` }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleCollapse(node.company_plan_node_id)}
              className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${config.text} ${config.border}`}>
            {config.label}
          </Badge>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground truncate">{node.title}</span>
              {node.target_unit && (
                <span className="text-[11px] font-mono text-muted-foreground">({node.target_unit})</span>
              )}
            </div>
            {node.description && (
              <p className="text-xs text-muted-foreground truncate max-w-md">{node.description}</p>
            )}
          </div>
        </div>

        {/* Right side controls & targets */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          {/* Target & Actual values */}
          <button
            type="button"
            onClick={() => onOpenTarget(node)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-muted font-mono text-xs text-muted-foreground"
            title="Click to adjust planned target"
          >
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold text-foreground">{target > 0 ? target : "Set target"}</span>
          </button>

          {target > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-muted h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="font-mono text-xs font-bold w-9 text-right">{progressPercent}%</span>
            </div>
          )}

          {/* Achievement button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => onOpenAchievement(node)}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Actual: {actual}</span>
          </Button>

          {/* Contextual actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isLocked && canManage && level < 4 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Add Sub-item"
                onClick={() => onAddChild(node)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}

            {!isLocked && canManage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Edit Node"
                  onClick={() => onEdit(node)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                  title="Delete Node"
                  onClick={() => onDelete(node)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="space-y-1">
          {node.children!.map((child) => (
            <HierarchyNodeItem
              key={child.company_plan_node_id}
              node={child}
              level={level + 1}
              isLocked={isLocked}
              canManage={canManage}
              canExecute={canExecute}
              canApprove={canApprove}
              canValidate={canValidate}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={onToggleCollapse}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenTarget={onOpenTarget}
              onOpenAchievement={onOpenAchievement}
            />
          ))}
        </div>
      )}
    </div>
  );
}
