"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Sliders,
  Play,
  RotateCcw,
  Lock,
  Unlock,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  useGetCompanyPlanVersionByIdQuery,
  useGetCompanyDraftFinalizationReadinessQuery,
  useFinalizeCompanyPlanDraftMutation,
  useReopenCompanyPlanDraftMutation,
  useStartCompanyPlanProcessMutation,
  useGetCompanyAnnualVersionsQuery,
  useGetCompanyExecutionPeriodsQuery,
  useInitializeCompanyExecutionPeriodsMutation,
} from "@/redux/api/companyPlanApi";

export function CompanyPlanVersionDetailsView() {
  const router = useRouter();
  const params = useParams<{ id: string; versionId: string }>();
  const companyId = params?.id;
  const versionId = params?.versionId;
  const { can } = usePermissions();

  const [activeTab, setActiveTab] = useState<"annual" | "periods" | "info">("annual");
  const [subdivisionMode, setSubdivisionMode] = useState<"quarterly" | "monthly" | "semi_annual">("quarterly");
  const [isInitPeriodsOpen, setIsInitPeriodsOpen] = useState(false);

  const {
    data: plan,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetCompanyPlanVersionByIdQuery(
    { id: versionId, company_id: companyId },
    { skip: !versionId || !companyId }
  );

  const { data: readiness } = useGetCompanyDraftFinalizationReadinessQuery(
    { id: versionId, company_id: companyId },
    { skip: !versionId || !companyId || plan?.status !== "draft" }
  );

  const { data: annualVersions = [] } = useGetCompanyAnnualVersionsQuery(
    { id: versionId, company_id: companyId },
    { skip: !versionId || !companyId }
  );

  const { data: executionPeriods = [] } = useGetCompanyExecutionPeriodsQuery(
    { id: versionId, company_id: companyId },
    { skip: !versionId || !companyId }
  );

  const [finalizeDraft, { isLoading: isFinalizing }] = useFinalizeCompanyPlanDraftMutation();
  const [reopenDraft, { isLoading: isReopening }] = useReopenCompanyPlanDraftMutation();
  const [startProcess, { isLoading: isStarting }] = useStartCompanyPlanProcessMutation();
  const [initPeriods, { isLoading: isInitializingPeriods }] = useInitializeCompanyExecutionPeriodsMutation();

  const canFinalize = can("COMPANY_PLANS:FINALIZE") || can("COMPANY_PLANS:MANAGE") || can("COMPANIES:MANAGE");
  const canUpdate = can("COMPANY_PLANS:UPDATE") || can("COMPANY_PLANS:MANAGE") || can("COMPANIES:MANAGE");

  const handleFinalizeDraft = async () => {
    if (!confirm("Are you sure you want to finalize this corporate master plan? Its hierarchy structure will be locked.")) return;
    try {
      await finalizeDraft({ id: versionId, company_id: companyId }).unwrap();
      actionFeedback.success("Master strategic plan finalized successfully!");
      refetch();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to finalize plan");
    }
  };

  const handleReopenDraft = async () => {
    if (!confirm("Reopening this plan will unlock its structure for editing. Continue?")) return;
    try {
      await reopenDraft({ id: versionId, company_id: companyId }).unwrap();
      actionFeedback.success("Strategic plan reopened for editing");
      refetch();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to reopen plan");
    }
  };

  const handleStartProcess = async () => {
    if (!confirm("Initiate active corporate execution tracking for this strategic cycle?")) return;
    try {
      await startProcess({ id: versionId, company_id: companyId }).unwrap();
      actionFeedback.success("Execution tracking started!");
      refetch();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to start execution process");
    }
  };

  const handleInitPeriods = async (annualId: string) => {
    try {
      await initPeriods({
        id: annualId,
        company_id: companyId,
        subdivision_mode: subdivisionMode,
      }).unwrap();

      actionFeedback.success(`Execution periods initialized (${subdivisionMode})`);
      setIsInitPeriodsOpen(false);
      refetch();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to initialize execution periods");
    }
  };

  if (isLoading) {
    return <Loading01 />;
  }

  if (error || !plan) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <h2 className="text-base font-bold text-destructive">Failed to Load Corporate Plan</h2>
        <p className="text-xs text-muted-foreground">The requested plan version does not exist or access is restricted.</p>
        <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/plans`)}>
          Back to Plans
        </Button>
      </div>
    );
  }

  const isMaster = plan.version_kind === "master";

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/companies/${companyId}/plans`}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Company Plans
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground">{plan.draft_name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {plan.draft_name}
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              v{plan.version_number}.0
            </Badge>
            <Badge
              variant={plan.status === "finalized" ? "default" : "secondary"}
              className="capitalize text-xs font-semibold"
            >
              {plan.status}
            </Badge>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Navigate to full hierarchy management */}
          <Button asChild className="gap-2">
            <Link href={`/companies/${companyId}/plans/${versionId}/hierarchy`}>
              <Sliders className="h-4 w-4" />
              Manage Plan Hierarchy
            </Link>
          </Button>

          {/* Master Finalize / Reopen / Start Actions */}
          {isMaster && plan.status === "draft" && canFinalize && (
            <Button
              variant="default"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleFinalizeDraft}
              disabled={isFinalizing || (readiness && !readiness.ready)}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isFinalizing ? "Finalizing..." : "Finalize Master Plan"}
            </Button>
          )}

          {isMaster && plan.status === "finalized" && !plan.process_started_at && canFinalize && (
            <>
              <Button
                variant="outline"
                className="gap-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                onClick={handleReopenDraft}
                disabled={isReopening}
              >
                <RotateCcw className="h-4 w-4" />
                {isReopening ? "Reopening..." : "Reopen For Editing"}
              </Button>

              <Button
                variant="default"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleStartProcess}
                disabled={isStarting}
              >
                <Play className="h-4 w-4" />
                {isStarting ? "Starting..." : "Start Execution"}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 w-9 text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* FINALIZATION READINESS ALERT (if in draft) */}
      {isMaster && plan.status === "draft" && readiness && (
        <div
          className={`rounded-2xl border p-4 shadow-xs transition-colors ${
            readiness.ready
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {readiness.ready ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
            )}
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-sm">
                {readiness.ready
                  ? "Master Plan Ready For Finalization"
                  : "Finalization Requirements Incomplete"}
              </h4>
              {readiness.ready ? (
                <p>All required structural nodes and indicators are in place. You can finalize the plan.</p>
              ) : (
                <ul className="list-disc pl-4 space-y-0.5 font-medium">
                  {readiness.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PLAN METADATA STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Planning Horizon</span>
          <p className="text-base font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            {plan.start_year} – {plan.end_year}
          </p>
          <span className="text-[11px] text-muted-foreground">{plan.planning_duration_years} Years Cycle</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Applied Rule</span>
          <p className="text-base font-bold text-foreground flex items-center gap-1.5 truncate">
            <Shield className="h-4 w-4 text-primary" />
            {plan.planRule?.name || "Standard Rule"}
          </p>
          <span className="text-[11px] text-muted-foreground font-mono">
            {plan.planRule?.performance_scoring_policy || "CAP_100"}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Execution Mode</span>
          <p className="text-base font-bold text-foreground capitalize flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            {plan.execution_status || "open"}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {plan.process_started_at ? "Execution active" : "Process not started"}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Lock Status</span>
          <p className="text-base font-bold text-foreground flex items-center gap-1.5">
            {plan.is_locked ? (
              <>
                <Lock className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-600">Locked</span>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 text-muted-foreground" />
                <span>Unlocked</span>
              </>
            )}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {plan.is_locked ? "Structure immutable" : "Editable working draft"}
          </span>
        </div>
      </div>

      {/* TABS HEADER: Annual Breakdown vs Execution Periods */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("annual")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === "annual"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual Plan Breakdowns ({annualVersions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("periods")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === "periods"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Execution Periods ({executionPeriods.length})
          </button>
        </div>

        {/* TAB 1: ANNUAL VERSIONS */}
        {activeTab === "annual" && (
          <div className="space-y-3">
            {annualVersions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold text-foreground">Annual Plans Not Initialized</p>
                <p className="text-xs text-muted-foreground">
                  Finalize the master strategic plan to unlock automated annual breakdown generation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {annualVersions.map((annual) => (
                  <div
                    key={annual.company_plan_version_id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-xs">
                          Year {annual.planning_year}
                        </Badge>
                        <Badge
                          variant={annual.status === "finalized" ? "default" : "secondary"}
                          className="text-[10px] capitalize"
                        >
                          {annual.status}
                        </Badge>
                      </div>

                      <h4 className="font-bold text-sm text-foreground">{annual.draft_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Annual targets and periodic allocation for fiscal year {annual.planning_year}.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-xs gap-1 text-primary hover:text-primary"
                      >
                        <Link href={`/companies/${companyId}/plans/${annual.company_plan_version_id}/hierarchy`}>
                          <span>Allocate Targets</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXECUTION PERIODS */}
        {activeTab === "periods" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Quarterly or monthly execution subdivisions for detailed achievement reporting.
              </span>
              {canUpdate && annualVersions.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setIsInitPeriodsOpen(true)} className="gap-2 text-xs">
                  <Sliders className="h-3.5 w-3.5" />
                  Initialize Periods
                </Button>
              )}
            </div>

            {executionPeriods.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold text-foreground">Execution Periods Not Generated</p>
                <p className="text-xs text-muted-foreground">
                  Click &apos;Initialize Periods&apos; to create quarterly or monthly milestones for the current annual cycle.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {executionPeriods.map((period) => (
                  <div
                    key={period.company_plan_version_id}
                    className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {period.period_label || `Period ${period.sequence_index}`}
                      </Badge>
                      <Badge
                        variant={period.status === "finalized" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {period.status}
                      </Badge>
                    </div>
                    <h5 className="font-semibold text-xs text-foreground line-clamp-1">{period.draft_name}</h5>
                    <div className="pt-2 flex justify-end">
                      <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-2">
                        <Link href={`/companies/${companyId}/plans/${period.company_plan_version_id}/hierarchy`}>
                          Targets & Actuals
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* INITIALIZE PERIODS MODAL */}
      <Dialog open={isInitPeriodsOpen} onOpenChange={setIsInitPeriodsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Initialize Execution Periods
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Subdivide the current fiscal year into standardized execution intervals.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Subdivision Frequency</label>
              <select
                aria-label="Subdivision Frequency"
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                value={subdivisionMode}
                onChange={(e) => setSubdivisionMode(e.target.value as "quarterly" | "monthly" | "semi_annual")}
              >
                <option value="quarterly">Quarterly (4 Quarters: Q1, Q2, Q3, Q4)</option>
                <option value="semi_annual">Semi-Annual (2 Halves: H1, H2)</option>
                <option value="monthly">Monthly (12 Months)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsInitPeriodsOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isInitializingPeriods || annualVersions.length === 0}
              onClick={() => handleInitPeriods(annualVersions[0].company_plan_version_id)}
            >
              {isInitializingPeriods ? "Generating..." : "Generate Periods"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
