"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetRegionalPlanNodeByIdQuery,
  useGetRegionalPlanVersionByIdQuery,
  useUpdateRegionalAnnualTargetMutation,
  useUpdateRegionalPeriodTargetMutation,
  useUpdateRegionalPeriodActualMutation,
  useSubmitRegionalAchievementMutation,
  useApproveRegionalAchievementMutation,
  useValidateRegionalAchievementMutation,
} from "@/redux/api/regionalPlanApi";

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
  const regionId = params?.id;
  const { can } = usePermissions();

  const [annualTargetInput, setAnnualTargetInput] = useState<string>("");
  const [periodTargetInput, setPeriodTargetInput] = useState<string>("");
  const [periodActualInput, setPeriodActualInput] = useState<string>("");

  const {
    data: version,
    isLoading: isLoadingVersion,
  } = useGetRegionalPlanVersionByIdQuery(
    { id: versionId, region_id: regionId || "" },
    { skip: !versionId || !regionId }
  );

  const {
    data: node,
    isLoading: isLoadingNode,
    refetch,
  } = useGetRegionalPlanNodeByIdQuery(
    { id: nodeId, region_id: regionId || "" },
    { skip: !nodeId || !regionId }
  );

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
  const [validateAchievement, { isLoading: isValidatingAchievement }] =
    useValidateRegionalAchievementMutation();

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

  if (isLoadingVersion || isLoadingNode) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading01 />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Plan node not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/${regionId}/plans/${versionId}`)}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Back to Hierarchy
        </Button>
      </div>
    );
  }

  const handleSaveAnnualTarget = async () => {
    if (!regionId) return;
    try {
      const val = parseFloat(annualTargetInput);
      if (isNaN(val)) return actionFeedback.error("Please enter a valid target value");
      await updateAnnualTarget({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
        annual_target: val,
      }).unwrap();
      actionFeedback.success("Annual target updated");
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
      if (isNaN(val)) return actionFeedback.error("Please enter a valid target value");
      await updatePeriodTarget({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
        period_target: val,
      }).unwrap();
      actionFeedback.success("Execution period target updated");
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
        },
      }).unwrap();
      actionFeedback.success("Period actual value recorded");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to save actual value");
    }
  };

  const handleSubmit = async () => {
    if (!regionId) return;
    try {
      const val = parseFloat(periodActualInput) || node.period_actual || 0;
      await submitAchievement({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
        data: { period_actual: val },
      }).unwrap();
      actionFeedback.success("Achievement submitted for approval");
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
      actionFeedback.success("Achievement approved");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to approve achievement");
    }
  };

  const handleValidate = async () => {
    if (!regionId) return;
    try {
      await validateAchievement({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Achievement validated and finalized");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to validate achievement");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => router.push(`/${regionId}/plans/${versionId}`)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Hierarchy</span>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{node.title}</h1>
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                Level {node.level}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plan: {version?.draft_name} • Node ID: {node.regional_plan_node_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {node.period_actual_status && (
            <Badge
              variant="outline"
              className="capitalize font-semibold text-xs px-2.5 py-1"
            >
              Status: {node.period_actual_status}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Node Properties */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Node Properties</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Title</span>
              <span className="font-semibold">{node.title}</span>
            </div>
            {node.description && (
              <div>
                <span className="text-xs text-muted-foreground block">Description</span>
                <p className="text-xs text-foreground/80 mt-1">{node.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div>
                <span className="text-xs text-muted-foreground block">Weight</span>
                <span className="font-medium">{node.weight ?? 0}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Contribution Weight</span>
                <span className="font-medium">{node.contribution_weight ?? "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Target Unit</span>
                <span className="font-medium">{node.target_unit || "Units"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Progress</span>
                <span className="font-bold text-emerald-600">
                  {Math.round(node.execution_progress_percent ?? 0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Responsibility */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Assigned Responsibility</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {node.internalAssignments && node.internalAssignments.length > 0 ? (
              node.internalAssignments.map((a, i) => (
                <div key={i} className="rounded-xl border p-3 space-y-2">
                  {a.department && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-xs">{a.department.name}</span>
                    </div>
                  )}
                  {a.assignedUser && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {a.assignedUser.full_name} ({a.assignedUser.email})
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No organizational unit assigned to this node.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Target & Execution Metrics */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Targets & Actuals</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Annual Target</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-semibold text-base">{node.annual_target ?? "—"}</span>
                {canUpdate && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Input
                      type="number"
                      placeholder="New target"
                      value={annualTargetInput}
                      onChange={(e) => setAnnualTargetInput(e.target.value)}
                      className="h-7 w-24 text-xs"
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

            <div className="pt-2 border-t">
              <span className="text-xs text-muted-foreground block">Period Target</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-semibold text-base">{node.period_target ?? "—"}</span>
                {canUpdate && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Input
                      type="number"
                      placeholder="New target"
                      value={periodTargetInput}
                      onChange={(e) => setPeriodTargetInput(e.target.value)}
                      className="h-7 w-24 text-xs"
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
              <span className="text-xs text-muted-foreground block">Period Actual Achievement</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-base text-foreground">{node.period_actual ?? "0"}</span>
                {canExecute && node.period_actual_status !== "validated" && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Input
                      type="number"
                      placeholder="Actual"
                      value={periodActualInput}
                      onChange={(e) => setPeriodActualInput(e.target.value)}
                      className="h-7 w-24 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={handleSavePeriodActual}
                      disabled={isUpdatingPeriodActual}
                    >
                      Record
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Achievement lifecycle action triggers */}
            <div className="pt-4 border-t flex flex-wrap gap-2">
              {canExecute && node.period_actual_status !== "validated" && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  onClick={handleSubmit}
                  disabled={isSubmittingAchievement}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit</span>
                </Button>
              )}

              {canApprove && node.period_actual_status === "submitted" && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleApprove}
                  disabled={isApprovingAchievement}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </Button>
              )}

              {canValidate && node.period_actual_status === "approved" && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleValidate}
                  disabled={isValidatingAchievement}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Validate (Lock)</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
