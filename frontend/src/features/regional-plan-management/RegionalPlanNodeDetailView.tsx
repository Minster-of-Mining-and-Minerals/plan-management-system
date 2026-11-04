"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Target,
  BarChart3,
  Building2,
  User as UserIcon,
  CheckCircle2,
  ShieldCheck,
  Send,
  Flag,
  CheckSquare,
  Plus,
  Edit3,
  GitBranch,
  ArrowRight,
  Layers,
  XCircle,
  Clock,
  Sparkles,
  UserPlus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { ActionButton } from "@/types/tableLayout";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
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
import { CreateRegionalPlanNodeModal } from "./modals/CreateRegionalPlanNodeModal";
import { AssignRegionalPlanNodeModal } from "./modals/AssignRegionalPlanNodeModal";
import { PlanNodeContributionBadge } from "@/features/plan-management/components/PlanNodeContributionBadge";
import {
  formatNodeTarget,
  getStepLabel,
  stepRequiresContributionWeight,
  getStepForLevel,
} from "@/utils/planRuleUtils";

import {
  useGetRegionalPlanNodeByIdQuery,
  useGetRegionalPlanHierarchyQuery,
  useGetRegionalPlanVersionByIdQuery,
  useUpdateRegionalAnnualTargetMutation,
  useUpdateRegionalPeriodTargetMutation,
  useUpdateRegionalPeriodActualMutation,
  useSubmitRegionalAchievementMutation,
  useApproveRegionalAchievementMutation,
  useRejectRegionalAchievementMutation,
  useValidateRegionalAchievementMutation,
  useRemoveRegionalPlanNodeAssignmentMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanNode } from "@/redux/types/regionalPlan";

interface RegionalPlanNodeDetailViewProps {
  versionId: string;
  nodeId: string;
}

export function RegionalPlanNodeDetailView({
  versionId,
  nodeId,
}: RegionalPlanNodeDetailViewProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const regionId = params?.id || "";
  const { can } = usePermissions();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateChildModalOpen, setIsCreateChildModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [annualTargetInput, setAnnualTargetInput] = useState<string>("");
  const [periodTargetInput, setPeriodTargetInput] = useState<string>("");
  const [periodActualInput, setPeriodActualInput] = useState<string>("");
  const [narrationInput, setNarrationInput] = useState<string>("");

  const {
    data: version,
    isLoading: isLoadingVersion,
  } = useGetRegionalPlanVersionByIdQuery(
    { id: versionId, region_id: regionId },
    { skip: !versionId || !regionId }
  );

  const {
    data: node,
    isLoading: isLoadingNode,
    refetch,
  } = useGetRegionalPlanNodeByIdQuery(
    { id: nodeId, region_id: regionId },
    { skip: !nodeId || !regionId }
  );

  const { data: hierarchyData } = useGetRegionalPlanHierarchyQuery(
    { id: versionId, region_id: regionId },
    { skip: !versionId || !regionId }
  );
  const allNodes = hierarchyData?.nodes || [];

  const [updateAnnualTarget, { isLoading: isUpdatingAnnualTarget }] =
    useUpdateRegionalAnnualTargetMutation();
  const [updatePeriodTarget, { isLoading: isUpdatingPeriodTarget }] =
    useUpdateRegionalPeriodTargetMutation();
  const [updatePeriodActual, { isLoading: isUpdatingPeriodActual }] =
    useUpdateRegionalPeriodActualMutation();
  const [submitAchievement, { isLoading: isSubmittingAchievement }] =
    useSubmitRegionalAchievementMutation();
  const [approveAchievement, { isLoading: isApprovingAchievement }] =
    useApproveRegionalAchievementMutation();
  const [rejectAchievement, { isLoading: isRejectingAchievement }] =
    useRejectRegionalAchievementMutation();
  const [validateAchievement, { isLoading: isValidatingAchievement }] =
    useValidateRegionalAchievementMutation();
  const [removeAssignment, { isLoading: isRemovingAssignment }] =
    useRemoveRegionalPlanNodeAssignmentMutation();

  const canUpdate =
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const canExecute =
    can("REGIONAL_PLANS:EXECUTE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const canApprove =
    can("REGIONAL_PLANS:APPROVE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const canValidate =
    can("REGIONAL_PLANS:VALIDATE_ACHIEVEMENT") ||
    can("REGIONAL_PLANS:FINALIZE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");

  const configuredUnits = useMemo(() => {
    return version?.planningConfiguration?.target_units || [];
  }, [version?.planningConfiguration?.target_units]);

  const rule = version?.planRule;
  const levelStep = node ? getStepForLevel(rule, node.level) : null;
  const levelLabel = node ? getStepLabel(rule, node.level) : "Node";

  const allAssignments = node?.internalAssignments || [];
  const assignmentRows = useMemo(() => {
    if (showHistory) return allAssignments;
    return allAssignments.filter((a: any) => a.is_active !== false);
  }, [allAssignments, showHistory]);

  const isExclusive = node?.assignment_sharing_mode !== "shared";
  const activeAssignments = useMemo(
    () => allAssignments.filter((a: any) => a.is_active !== false),
    [allAssignments]
  );
  const activeCount = activeAssignments.length;
  const assignLabel = isExclusive && activeCount > 0 ? "Reassign Directorate" : "Assign Directorate";

  const actions: ActionButton[] = canUpdate
    ? [
        {
          label: assignLabel,
          icon:
            isExclusive && activeCount > 0 ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            ),
          variant: "default" as const,
          onClick: () => setIsAssignModalOpen(true),
        },
      ]
    : [];

  const assignmentColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "department",
      header: "Responsible Directorate / Department",
      cell: ({ row }) => {
        const a = row.original;
        const dept = a.department;
        return (
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-foreground text-xs block">
                {dept?.name || "Directorate Assigned"}
              </span>
              {dept?.level && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  Level {dept.level}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "assignedUser",
      header: "Designated Lead / Staff",
      cell: ({ row }) => {
        const u = row.original.assignedUser;
        if (!u) {
          return (
            <span className="text-xs text-muted-foreground italic">
              Directorate-wide (All Staff)
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-muted text-muted-foreground shrink-0">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-medium text-xs text-foreground block">
                {u.full_name || u.email}
              </span>
              <span className="text-[10px] text-muted-foreground">{u.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: "assignment_mode",
      header: "Mode",
      cell: () => (
        <Badge
          variant="outline"
          className={
            isExclusive
              ? "bg-slate-500/10 text-slate-700 border-slate-500/20 text-[10px]"
              : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]"
          }
        >
          <GitBranch className="h-3 w-3 mr-1" />
          {isExclusive ? "Exclusive" : "Shared"}
        </Badge>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active !== false} />,
    },
    {
      accessorKey: "created_at",
      header: "Assigned Date",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {row.original.created_at
            ? new Date(row.original.created_at).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const a = row.original;
        if (!canUpdate) return null;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              title={isExclusive ? "Reassign Directorate" : "Change Assignment"}
              onClick={() => setIsAssignModalOpen(true)}
              className="h-8 w-8 p-0"
            >
              {isExclusive ? <RotateCcw className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Remove Assignment"
              onClick={async () => {
                if (
                  await actionFeedback.confirm(
                    "Are you sure you want to remove this directorate assignment from the milestone?",
                    { destructive: true }
                  )
                ) {
                  try {
                    await removeAssignment({
                      nodeId: nodeId,
                      assignment_id: a.regional_internal_assignment_id,
                      region_id: regionId,
                    }).unwrap();
                    actionFeedback.success("Assignment removed successfully.");
                    refetch();
                  } catch (err: any) {
                    actionFeedback.error(err?.data?.message || "Failed to remove assignment.");
                  }
                }
              }}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [canUpdate, isExclusive, nodeId, regionId, removeAssignment, refetch]);

  const getTypeIcon = (type: string, level: number) => {
    switch (type) {
      case "strategic":
        return <Flag className="h-5 w-5 text-purple-600" />;
      case "goal":
        return <Target className="h-5 w-5 text-blue-600" />;
      case "kpi":
        return <BarChart3 className="h-5 w-5 text-emerald-600" />;
      case "task":
        return <CheckSquare className="h-5 w-5 text-amber-600" />;
      default:
        return level === 1 ? (
          <Flag className="h-5 w-5 text-purple-600" />
        ) : level === 2 ? (
          <Target className="h-5 w-5 text-blue-600" />
        ) : (
          <BarChart3 className="h-5 w-5 text-emerald-600" />
        );
    }
  };

  if (isLoadingVersion || isLoadingNode) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading01 />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Regional plan node not found.</p>
        <Button
          variant="outline"
          className="mt-4 gap-2"
          onClick={() => router.push(`/regions/${regionId}/plans/${versionId}`)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Plan Hierarchy</span>
        </Button>
      </div>
    );
  }

  const handleSaveAnnualTarget = async () => {
    if (!regionId) return;
    try {
      const val = parseFloat(annualTargetInput);
      if (isNaN(val)) return actionFeedback.error("Please enter a valid numeric target value");
      await updateAnnualTarget({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
        annual_target: val,
      }).unwrap();
      actionFeedback.success("Annual target updated successfully");
      setAnnualTargetInput("");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to update target");
    }
  };

  const handleSavePeriodTarget = async () => {
    if (!regionId) return;
    try {
      const val = parseFloat(periodTargetInput);
      if (isNaN(val)) return actionFeedback.error("Please enter a valid numeric period target");
      await updatePeriodTarget({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
        period_target: val,
      }).unwrap();
      actionFeedback.success("Execution period target updated successfully");
      setPeriodTargetInput("");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to update period target");
    }
  };

  const handleSavePeriodActual = async () => {
    if (!regionId) return;
    try {
      const val = parseFloat(periodActualInput);
      if (isNaN(val)) return actionFeedback.error("Please enter a valid actual value");
      await updatePeriodActual({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
        data: {
          period_actual: val,
          narration: narrationInput.trim() || undefined,
        },
      }).unwrap();
      actionFeedback.success("Achievement value recorded successfully");
      setPeriodActualInput("");
      setNarrationInput("");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to record actual value");
    }
  };

  const handleSubmit = async () => {
    if (!regionId) return;
    try {
      const val = parseFloat(periodActualInput) || node.period_actual || 0;
      await submitAchievement({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
        data: {
          period_actual: val,
          narration: narrationInput.trim() || undefined,
        },
      }).unwrap();
      actionFeedback.success("Achievement submitted for department review");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to submit achievement");
    }
  };

  const handleApprove = async () => {
    if (!regionId) return;
    try {
      await approveAchievement({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Achievement approved successfully");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to approve achievement");
    }
  };

  const handleRejectConfirm = async () => {
    if (!regionId) return;
    try {
      await rejectAchievement({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
        comment: rejectReason.trim() || "Achievement rejected with revision requested",
      }).unwrap();
      actionFeedback.success("Achievement rejected and unlocked for corrections");
      setIsRejectDialogOpen(false);
      setRejectReason("");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to reject achievement");
    }
  };

  const handleValidate = async () => {
    if (!regionId) return;
    try {
      await validateAchievement({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Achievement validated and permanently locked");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to validate achievement");
    }
  };

  const isExecutionPeriod = version?.version_kind === "execution_period";
  const isAnnual = version?.version_kind === "annual";
  const isMaster = version?.version_kind === "master";

  const parentMasterId = isAnnual ? version?.parent_plan_version_id : null;
  const { data: masterVersion } = useGetRegionalPlanVersionByIdQuery(
    { id: parentMasterId!, region_id: regionId },
    { skip: !parentMasterId || !regionId }
  );
  const annualTargetsFinalized = Boolean(masterVersion?.annual_targets_finalized_at);

  const statusColorClass =
    node.period_actual_status === "validated"
      ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
      : node.period_actual_status === "approved"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : node.period_actual_status === "submitted"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
      : node.period_actual_status === "rejected"
      ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Header Bar matching Federal Information Architecture */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-lg text-xs"
            onClick={() => router.push(`/regions/${regionId}/plans/${versionId}`)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Plan Hierarchy</span>
          </Button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{node.title}</h1>
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                Level {node.level} • {levelLabel}
              </Badge>
              <Badge variant="secondary" className="capitalize text-xs">
                {version?.version_kind.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plan: {version?.draft_name} • Fiscal Period: {version?.start_year} – {version?.end_year}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {node.period_actual_status && isExecutionPeriod && (
            <Badge
              variant="outline"
              className={`capitalize font-semibold text-xs px-3 py-1 ${statusColorClass}`}
            >
              Achievement: {node.period_actual_status}
            </Badge>
          )}

          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs shadow-2xs"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit3 className="h-3.5 w-3.5 text-primary" />
              <span>Edit Details</span>
            </Button>
          )}

          {canUpdate && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs shadow-2xs"
              onClick={() => setIsCreateChildModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Subordinate Milestone</span>
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main Node Card with Level Color & Federal Aesthetics */}
      {/* ------------------------------------------------------------- */}
      <Card className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div
          className="h-2 w-full"
          style={{
            backgroundColor:
              levelStep?.color_hex ||
              (node.level === 1
                ? "#8B5CF6"
                : node.level === 2
                ? "#3B82F6"
                : node.level === 3
                ? "#10B981"
                : "#F59E0B"),
          }}
        />

        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              {getTypeIcon(node.type || "goal", node.level)}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{node.title}</h2>
                <Badge variant="outline" className="uppercase font-bold text-[10px] tracking-wider">
                  {levelLabel}
                </Badge>

                {isMaster && (node.weight || 0) > 0 && (
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-500/20 font-bold">
                    Draft Target: {formatNodeTarget(node.weight, node.weight_mode as any, node.target_unit, configuredUnits as any)}
                  </Badge>
                )}

                {isAnnual && (node.annual_target != null && node.annual_target > 0) && (
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-500/20 font-bold">
                    Annual Target: {formatNodeTarget(node.annual_target, node.weight_mode as any, node.target_unit, configuredUnits as any)}
                  </Badge>
                )}

                {isExecutionPeriod && (node.period_target != null && node.period_target > 0) && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold">
                    Period Target: {formatNodeTarget(node.period_target, node.weight_mode as any, node.target_unit, configuredUnits as any)}
                  </Badge>
                )}

                {stepRequiresContributionWeight(rule, node.level) && (
                  <PlanNodeContributionBadge
                    contributionWeight={node.contribution_weight}
                    missing={!node.contribution_weight || node.contribution_weight <= 0}
                    className="font-bold"
                  />
                )}

                <Badge
                  variant="outline"
                  className={
                    node.assignment_sharing_mode === "shared"
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-700 border-slate-500/20"
                  }
                >
                  <GitBranch className="h-3 w-3 mr-1" />
                  {node.assignment_sharing_mode === "shared" ? "Shared Assignment" : "Exclusive Assignment"}
                </Badge>
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed">
                {node.description || "No description provided for this milestone."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* Grid: Properties, Responsibilities, Targets & Actuals */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Hierarchy Context & Properties */}
        <Card className="rounded-2xl border shadow-xs">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>Hierarchy Position & Rules</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">Hierarchy Level</span>
              <span className="font-semibold text-foreground text-sm">
                Level {node.level} • {levelLabel}
              </span>
            </div>

            {node.parent && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground block mb-0.5">Parent Milestone</span>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/regions/${regionId}/plans/${versionId}/nodes/${node.parent_id}`
                    )
                  }
                  className="font-semibold text-primary hover:underline text-left flex items-center gap-1.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{node.parent.title}</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <span className="text-muted-foreground block">Evaluation Mode</span>
                <span className="font-medium capitalize">{node.weight_mode || "Inherited"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Target Unit</span>
                <span className="font-medium">{node.target_unit || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Target Allocation</span>
                <span className="font-medium capitalize">{node.target_allocation_mode || "Divisible"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Achievement Cadence</span>
                <span className="font-medium capitalize">{node.achievement_mode || "Periodic"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Assigned Responsibility (Federal Department Parity) */}
        <Card className="rounded-2xl border shadow-xs">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Assigned Directorate Responsibility</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            {node.internalAssignments && node.internalAssignments.length > 0 ? (
              node.internalAssignments.map((a: any, i: number) => (
                <div key={i} className="rounded-xl border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground text-xs block">
                        {a.department?.name || "Directorate Assigned"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Organizational Structure</span>
                    </div>
                  </div>

                  {a.assignedUser ? (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="font-medium text-foreground block">
                          {a.assignedUser.full_name || `${a.assignedUser.first_name || ""} ${a.assignedUser.last_name || ""}`.trim() || a.assignedUser.email}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{a.assignedUser.email}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-border/50 text-muted-foreground">
                      No designated officer specified (Directorate-wide ownership)
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No organizational unit assigned to this milestone.</p>
                {canUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs h-7"
                    onClick={() => setIsAssignModalOpen(true)}
                  >
                    Assign Directorate
                  </Button>
                )}
              </div>
            )}
            {node.internalAssignments && node.internalAssignments.length > 0 && canUpdate && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7 gap-1.5 mt-2"
                onClick={() => setIsAssignModalOpen(true)}
              >
                {isExclusive ? <RotateCcw className="h-3.5 w-3.5 text-primary" /> : <UserPlus className="h-3.5 w-3.5 text-primary" />}
                <span>{assignLabel}</span>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Targets, Progress & Reporting Lifecycle */}
        <Card className="rounded-2xl border shadow-xs">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Targets & Performance Execution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            {/* Master Target */}
            <div>
              <span className="text-muted-foreground block">Master Baseline Target</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-base text-foreground">
                  {node.weight != null ? node.weight : "—"} {node.target_unit || ""}
                </span>
              </div>
            </div>

            {/* Annual Target */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground block">Annual Target</span>
                {isAnnual && canUpdate && !annualTargetsFinalized && (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    Editable Draft
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-base text-foreground">
                  {node.annual_target != null ? node.annual_target : "—"} {node.target_unit || ""}
                </span>
                {isAnnual && canUpdate && !annualTargetsFinalized && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Input
                      type="number"
                      placeholder="New target"
                      value={annualTargetInput}
                      onChange={(e) => setAnnualTargetInput(e.target.value)}
                      className="h-7 w-20 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={handleSaveAnnualTarget}
                      disabled={isUpdatingAnnualTarget}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Execution Period Target & Actual */}
            {isExecutionPeriod && (
              <div className="pt-3 border-t space-y-3">
                <div>
                  <span className="text-muted-foreground block">Period Target</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-base text-foreground">
                      {node.period_target != null ? node.period_target : "—"} {node.target_unit || ""}
                    </span>
                    {canUpdate && !version?.period_targets_finalized_at && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Input
                          type="number"
                          placeholder="Target"
                          value={periodTargetInput}
                          onChange={(e) => setPeriodTargetInput(e.target.value)}
                          className="h-7 w-20 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={handleSavePeriodTarget}
                          disabled={isUpdatingPeriodTarget}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground">Recorded Achievement</span>
                    <span className="font-bold text-emerald-600">
                      {Math.round(node.execution_progress_percent ?? 0)}% Progress
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-foreground">
                      {node.period_actual != null ? node.period_actual : "0"} {node.target_unit || ""}
                    </span>
                  </div>

                  {canExecute && node.period_actual_status !== "validated" && (
                    <div className="space-y-2 mt-2 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Enter actual value"
                          value={periodActualInput}
                          onChange={(e) => setPeriodActualInput(e.target.value)}
                          className="h-7 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          onClick={handleSavePeriodActual}
                          disabled={isUpdatingPeriodActual}
                        >
                          Save Draft
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Optional achievement narration or performance notes..."
                        value={narrationInput}
                        onChange={(e) => setNarrationInput(e.target.value)}
                        className="text-xs min-h-[50px]"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Achievement Lifecycle Buttons */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t">
                    {canExecute && node.period_actual_status !== "validated" && (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-semibold"
                        onClick={handleSubmit}
                        disabled={isSubmittingAchievement}
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit for Review</span>
                      </Button>
                    )}

                    {canApprove && node.period_actual_status === "submitted" && (
                      <>
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={handleApprove}
                          disabled={isApprovingAchievement}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50"
                          onClick={() => setIsRejectDialogOpen(true)}
                          disabled={isRejectingAchievement}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </Button>
                      </>
                    )}

                    {canValidate && node.period_actual_status === "approved" && (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleValidate}
                        disabled={isValidatingAchievement}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Validate & Lock</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Subordinate Child Nodes Section */}
      {/* ------------------------------------------------------------- */}
      <Card className="rounded-2xl border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Subordinate Milestones</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct child milestones configured under {node.title}.
            </p>
          </div>

          {canUpdate && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setIsCreateChildModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Child Milestone</span>
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-4">
          {node.children && node.children.length > 0 ? (
            <div className="divide-y border rounded-xl overflow-hidden bg-background">
              {node.children.map((child: any) => (
                <div
                  key={child.regional_plan_node_id}
                  className="flex flex-wrap items-center justify-between p-3.5 hover:bg-muted/30 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {getTypeIcon(child.type, child.level)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {child.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          Level {child.level}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {child.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    {child.weight > 0 && (
                      <span className="text-xs font-semibold text-muted-foreground">
                        Target: {child.weight} {child.target_unit || ""}
                      </span>
                    )}

                    {child.contribution_weight != null && (
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {child.contribution_weight}% contrib
                      </span>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 h-8 text-xs text-primary"
                      onClick={() =>
                        router.push(
                          `/regions/${regionId}/plans/${versionId}/nodes/${child.regional_plan_node_id}`
                        )
                      }
                    >
                      <span>View</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
              No subordinate milestones added yet under this node.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* Tabular Assignments Section (Federal Parity) */}
      {/* ------------------------------------------------------------- */}
      <Card className="rounded-2xl border shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span>Accountability & Directorate Assignments</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organizational directorates and designated officers accountable for this milestone.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-regional-history"
                checked={showHistory}
                onCheckedChange={setShowHistory}
              />
              <Label
                htmlFor="show-regional-history"
                className="text-xs text-muted-foreground cursor-pointer font-medium"
              >
                Show assignment history
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TableLayout actions={actions} filterColumnsPerRow={1}>
            <DataTable
              columns={assignmentColumns}
              data={assignmentRows}
              isLoading={isLoadingNode || isRemovingAssignment}
              resetKey={`${showHistory}-${assignmentRows.length}`}
            />
          </TableLayout>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Assign / Reassign Modal */}
      {/* ------------------------------------------------------------- */}
      {node && (
        <AssignRegionalPlanNodeModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            refetch();
          }}
          node={node}
          regionId={regionId}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Edit Node Modal */}
      {/* ------------------------------------------------------------- */}
      <CreateRegionalPlanNodeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          refetch();
        }}
        regionId={regionId}
        planVersionId={versionId}
        node={node}
        rule={version?.planRule}
        planningConfig={version?.planningConfiguration}
        allNodes={allNodes}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Create Subordinate Child Node Modal */}
      {/* ------------------------------------------------------------- */}
      <CreateRegionalPlanNodeModal
        isOpen={isCreateChildModalOpen}
        onClose={() => {
          setIsCreateChildModalOpen(false);
          refetch();
        }}
        regionId={regionId}
        planVersionId={versionId}
        parentNode={node}
        rule={version?.planRule}
        planningConfig={version?.planningConfiguration}
        allNodes={allNodes}
      />

      {/* ------------------------------------------------------------- */}
      {/* DIALOG: Rejection Reason Dialog */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              <span>Reject Achievement</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide feedback or correction notes for the department to revise this achievement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Textarea
              placeholder="Enter rejection reason or required revisions..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={isRejectingAchievement}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
