"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Layers,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  GitBranch,
  Shield,
  Sliders,
  Play,
  RotateCcw,
  Lock,
  Unlock,
  ChevronRight,
  Target,
  Sparkles,
  BarChart3,
  RefreshCw,
  Settings2,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  useGetRegionalPlanVersionByIdQuery,
  useGetRegionalPlanRuleForVersionQuery,
  useGetRegionalPlanningConfigForVersionQuery,
  useGetRegionalDraftFinalizationReadinessQuery,
  useFinalizeRegionalPlanDraftMutation,
  useReopenRegionalPlanDraftMutation,
  useStartRegionalPlanProcessMutation,
  useGetRegionalAnnualVersionsQuery,
  useGetRegionalExecutionPeriodsQuery,
  useInitializeRegionalExecutionPeriodsMutation,
  useFinalizeRegionalAnnualExecutionMutation,
  useFinalizeRegionalPeriodTargetsMutation,
} from "@/redux/api/regionalPlanApi";
import { RegionalPlanVersionDraftRulePanel } from "./components/RegionalPlanVersionDraftRulePanel";
import { RegionalPlanVersionDraftConfigPanel } from "./components/RegionalPlanVersionDraftConfigPanel";

export function RegionalPlanVersionDetailsView() {
  const router = useRouter();
  const params = useParams<{ id: string; versionId: string }>();
  const regionId = params?.id;
  const versionId = params?.versionId;
  const { can } = usePermissions();

  const [activeTab, setActiveTab] = useState<"annual" | "periods" | "rule" | "settings">("annual");
  const [subdivisionMode, setSubdivisionMode] = useState<"quarterly" | "monthly" | "semi_annual" | "custom">("quarterly");
  const [customPeriods, setCustomPeriods] = useState<Array<{ label: string }>>([
    { label: "Period 1" },
    { label: "Period 2" },
    { label: "Period 3" },
  ]);
  const [isInitPeriodsOpen, setIsInitPeriodsOpen] = useState(false);

  const {
    data: plan,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetRegionalPlanVersionByIdQuery(
    { id: versionId, region_id: regionId },
    { skip: !versionId || !regionId }
  );

  const {
    data: versionRule,
    refetch: refetchRule,
    isLoading: isRuleLoading,
  } = useGetRegionalPlanRuleForVersionQuery(
    { versionId: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId }
  );

  const {
    data: versionConfig,
    refetch: refetchConfig,
    isLoading: isConfigLoading,
  } = useGetRegionalPlanningConfigForVersionQuery(
    { versionId: versionId!, region_id: regionId! },
    { skip: !versionId || !regionId }
  );

  useEffect(() => {
    if (plan?.planningConfiguration) {
      if (plan.planningConfiguration.breakdown_mode) {
        setSubdivisionMode(plan.planningConfiguration.breakdown_mode as any);
      }
      if (
        plan.planningConfiguration.custom_periods &&
        Array.isArray(plan.planningConfiguration.custom_periods) &&
        plan.planningConfiguration.custom_periods.length > 0
      ) {
        setCustomPeriods(
          plan.planningConfiguration.custom_periods.map((p: any) => ({
            label: typeof p === "string" ? p : p.label || "Period",
          }))
        );
      }
    }
  }, [plan]);

  const { data: readiness, refetch: refetchReadiness } = useGetRegionalDraftFinalizationReadinessQuery(
    { id: versionId, region_id: regionId },
    { skip: !versionId || !regionId || plan?.status !== "draft" }
  );

  const { data: annualVersions = [] } = useGetRegionalAnnualVersionsQuery(
    { id: versionId, region_id: regionId },
    { skip: !versionId || !regionId }
  );

  const { data: executionPeriods = [] } = useGetRegionalExecutionPeriodsQuery(
    { id: versionId, region_id: regionId },
    { skip: !versionId || !regionId }
  );

  const [finalizeDraft, { isLoading: isFinalizing }] = useFinalizeRegionalPlanDraftMutation();
  const [reopenDraft, { isLoading: isReopening }] = useReopenRegionalPlanDraftMutation();
  const [startProcess, { isLoading: isStarting }] = useStartRegionalPlanProcessMutation();
  const [initPeriods, { isLoading: isInitializingPeriods }] = useInitializeRegionalExecutionPeriodsMutation();
  const [finalizeAnnual, { isLoading: isFinalizingAnnual }] = useFinalizeRegionalAnnualExecutionMutation();
  const [finalizePeriods, { isLoading: isFinalizingPeriods }] = useFinalizeRegionalPeriodTargetsMutation();

  const canFinalize = can("REGIONAL_PLANS:FINALIZE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
  const canUpdate = can("REGIONAL_PLANS:UPDATE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");

  const handleFinalizeDraft = async () => {
    try {
      await finalizeDraft({ id: versionId, region_id: regionId }).unwrap();
      actionFeedback.success("Regional plan draft finalized! Annual plans generated.");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to finalize plan draft");
    }
  };

  const handleReopenDraft = async () => {
    if (!confirm("Are you sure you want to reopen this plan for edit?")) return;
    try {
      await reopenDraft({ id: versionId, region_id: regionId }).unwrap();
      actionFeedback.success("Plan reopened for edit.");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to reopen plan");
    }
  };

  const handleStartProcess = async () => {
    try {
      await startProcess({ id: versionId, region_id: regionId }).unwrap();
      actionFeedback.success("Regional plan execution process started! Reporting is now open.");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to start execution process");
    }
  };

  const handleInitializePeriods = async () => {
    try {
      await initPeriods({
        id: versionId,
        region_id: regionId,
        subdivision_mode: subdivisionMode,
        custom_periods: subdivisionMode === "custom" ? customPeriods : undefined,
      }).unwrap();
      actionFeedback.success("Execution periods initialized successfully!");
      setIsInitPeriodsOpen(false);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to initialize execution periods");
    }
  };

  const handleFinalizeAnnual = async () => {
    try {
      await finalizeAnnual({ id: versionId, region_id: regionId }).unwrap();
      actionFeedback.success("Annual targets finalized successfully!");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to finalize annual targets");
    }
  };

  const handleFinalizePeriods = async () => {
    try {
      await finalizePeriods({ id: versionId, region_id: regionId }).unwrap();
      actionFeedback.success("Execution period targets finalized successfully!");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to finalize period targets");
    }
  };

  if (isLoading || !plan) return <Loading01 />;

  const isDraft = plan.status === "draft";
  const isFinalized = plan.status === "finalized";
  const isActive = plan.status === "active";
  const isCompleted = plan.status === "completed";

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Breadcrumb / Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href={`/regions/${regionId}/plans`} className="hover:text-primary transition-colors">
            Plans
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground truncate max-w-xs">{plan.draft_name}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/regions/${regionId}/plans/${versionId}/hierarchy`}>
            <Button size="sm" variant="outline" className="gap-2 shadow-2xs">
              <GitBranch className="h-4 w-4 text-primary" />
              <span>Hierarchy & Node Editor</span>
            </Button>
          </Link>

          <Link href={`/regions/${regionId}/plans/dashboard?plan_version_id=${versionId}`}>
            <Button size="sm" variant="outline" className="gap-2 shadow-2xs">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Execution Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Plan Hero Banner */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize font-semibold text-xs px-2.5 py-0.5">
                {plan.status}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">v{plan.version_number}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">Cycle {plan.start_year} – {plan.end_year}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {plan.draft_name}
            </h1>

            <p className="text-sm text-muted-foreground">
              Master Plan Rule: <span className="font-semibold text-foreground">{plan.planRule?.name || "Standard Rule"}</span>
            </p>
          </div>

          {/* Quick Lifecycle Action Triggers */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isDraft && canFinalize && (
              <Button
                onClick={handleFinalizeDraft}
                disabled={isFinalizing || (readiness && !readiness.ready)}
                className="gap-2 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isFinalizing ? "Finalizing..." : "Finalize Strategic Plan"}</span>
              </Button>
            )}

            {isFinalized && canUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopenDraft}
                disabled={isReopening}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4 text-amber-600" />
                <span>Reopen for Edit</span>
              </Button>
            )}

            {isFinalized && canFinalize && (
              <Button
                onClick={handleStartProcess}
                disabled={isStarting || !plan.period_targets_finalized_at}
                className="gap-2 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="h-4 w-4" />
                <span>{isStarting ? "Starting..." : "Start Plan Execution"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lifecycle Stage Readiness Notice if Draft */}
      {isDraft && readiness && (
        <div
          className={`rounded-xl border p-4 text-xs ${
            readiness.ready
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-200"
              : "bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {readiness.ready ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {readiness.ready ? "Plan Draft is Ready for Finalization" : "Finalization Requirements Incomplete"}
              </p>
              {readiness.errors.length > 0 ? (
                <ul className="list-disc list-inside mt-1.5 space-y-1">
                  {readiness.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1">
                  All hierarchy levels, targets, and contribution weights are properly validated.
                  Clicking Finalize will generate {plan.planning_duration_years} annual plans and snapshot this version.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workflow Tabs: Annual Cycles & Execution Periods */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab("annual")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
              activeTab === "annual"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Annual Planning Cycles ({annualVersions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("periods")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
              activeTab === "periods"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Execution Periods ({executionPeriods.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("rule")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
              activeTab === "rule"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Plan Rule</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            <span>Planning Configuration</span>
          </button>
        </div>

        {/* Tab 1: Annual Plans */}
        {activeTab === "annual" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Annual Implementation Plans</h3>
                <p className="text-xs text-muted-foreground">
                  Each year inherits the master strategic hierarchy. Allocate annual targets to plan annual milestones.
                </p>
              </div>

              {isFinalized && canUpdate && !plan.annual_targets_finalized_at && (
                <Button size="sm" onClick={handleFinalizeAnnual} disabled={isFinalizingAnnual} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Finalize Annual Targets</span>
                </Button>
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
                      <Link href={`/regions/${regionId}/plans/${annual.regional_plan_version_id}/hierarchy`}>
                        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                          <Target className="h-3.5 w-3.5 text-primary" />
                          <span>Set Targets</span>
                        </Button>
                      </Link>

                      <Link href={`/regions/${regionId}/plans/${annual.regional_plan_version_id}`}>
                        <Button size="sm" variant="ghost" className="gap-1 h-8 text-xs">
                          <span>Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Execution Periods */}
        {activeTab === "periods" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Execution Reporting Periods</h3>
                <p className="text-xs text-muted-foreground">
                  Reporting periods allow officers to enter achievement values and evidence against periodic targets.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isFinalized && canUpdate && !plan.period_subdivision_mode && (
                  <Button size="sm" onClick={() => setIsInitPeriodsOpen(true)} className="gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Initialize Reporting Periods</span>
                  </Button>
                )}

                {isFinalized && canUpdate && plan.period_subdivision_mode && !plan.period_targets_finalized_at && (
                  <Button size="sm" onClick={handleFinalizePeriods} disabled={isFinalizingPeriods} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Finalize Period Targets</span>
                  </Button>
                )}
              </div>
            </div>

            {executionPeriods.length === 0 ? (
              <div className="text-center p-8 border rounded-xl bg-card text-muted-foreground text-sm space-y-3">
                <p>No execution reporting periods initialized for this plan cycle yet.</p>
                {isFinalized && canUpdate && (
                  <Button size="sm" onClick={() => setIsInitPeriodsOpen(true)} className="gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Initialize Reporting Periods</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {executionPeriods.map((period) => (
                  <div
                    key={period.regional_plan_version_id}
                    className="rounded-xl border bg-card p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs capitalize font-semibold">
                          {period.execution_status || period.status}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">FY {period.planning_year}</span>
                      </div>
                      <h4 className="font-semibold text-foreground mt-2">{period.period_label || period.draft_name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Reporting Window</p>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between gap-2">
                      <Link href={`/regions/${regionId}/plans/${period.regional_plan_version_id}/hierarchy`}>
                        <Button size="sm" variant="default" className="gap-1.5 h-8 text-xs w-full">
                          <span>Open Reporting</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Draft Plan Rule */}
        {activeTab === "rule" && (
          <RegionalPlanVersionDraftRulePanel
            versionId={versionId!}
            regionId={regionId!}
            rule={versionRule || plan?.planRule}
            isLoading={isRuleLoading}
            canEdit={isDraft && canUpdate}
            readOnlyReason={
              !isDraft
                ? `This plan is ${plan.status}. Plan rules can only be edited while in draft status.`
                : !canUpdate
                ? "You do not have permission to modify regional plan rules."
                : null
            }
            onSaved={() => {
              refetch();
              refetchRule();
            }}
          />
        )}

        {/* Tab 4: Draft Planning Configuration */}
        {activeTab === "settings" && (
          <RegionalPlanVersionDraftConfigPanel
            versionId={versionId!}
            regionId={regionId!}
            config={versionConfig || plan?.planningConfiguration}
            isLoading={isConfigLoading}
            canEdit={isDraft && canUpdate}
            readOnlyReason={
              !isDraft
                ? `This plan is ${plan.status}. Planning configuration can only be edited while in draft status.`
                : !canUpdate
                ? "You do not have permission to modify regional planning configuration."
                : null
            }
            onSaved={() => {
              refetch();
              refetchConfig();
            }}
          />
        )}
      </div>

      {/* Initialize Periods Modal */}
      <Dialog open={isInitPeriodsOpen} onOpenChange={setIsInitPeriodsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>Initialize Reporting Periods</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">
              Select the subdivision frequency to partition each annual cycle into execution periods:
            </p>

            <div className="space-y-2">
              {[
                { id: "quarterly", label: "Quarterly (4 Quarters per Year)", desc: "Q1, Q2, Q3, Q4" },
                { id: "semi_annual", label: "Semi-Annual (2 Halves per Year)", desc: "H1, H2" },
                { id: "monthly", label: "Monthly (12 Months per Year)", desc: "Month 1 through Month 12" },
                { id: "custom", label: "Custom (User-Defined Periods)", desc: "Configurable period partitions" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    subdivisionMode === opt.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="subdivisionMode"
                    value={opt.id}
                    checked={subdivisionMode === opt.id}
                    onChange={() => setSubdivisionMode(opt.id as any)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {subdivisionMode === "custom" && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Custom Period Partitions</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCustomPeriods((prev) => [
                        ...prev,
                        { label: `Period ${prev.length + 1}` },
                      ])
                    }
                    className="h-6 text-[11px] gap-1 px-2"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Period</span>
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {customPeriods.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground w-6">#{idx + 1}</span>
                      <Input
                        value={p.label}
                        onChange={(e) => {
                          const updated = [...customPeriods];
                          updated[idx] = { label: e.target.value };
                          setCustomPeriods(updated);
                        }}
                        className="h-7 text-xs"
                        placeholder="e.g. Trimester 1"
                      />
                      {customPeriods.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setCustomPeriods((prev) => prev.filter((_, i) => i !== idx))}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInitPeriodsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInitializePeriods} disabled={isInitializingPeriods}>
              {isInitializingPeriods ? "Initializing..." : "Initialize Periods"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
