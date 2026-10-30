"use client";

import { useState, useEffect, type ReactNode } from "react";
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
  History,
  Building2,
  Info,
  Check,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProfileHeroBanner } from "@/components/common/ProfileHeroBanner";
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
import type {
  RegionalPlanVersion,
  RegionalPlanRule,
  RegionalPlanningConfiguration,
} from "@/redux/types/regionalPlan";
import {
  formatDurationYears,
  formatPlanningPeriod,
  getPlanDraftDisplayName,
} from "@/utils/planDraftUtils";
import { formatDate } from "@/utils/formatDate";
import { RegionalPlanVersionSubNav } from "./components/RegionalPlanVersionSubNav";
import { RegionalPlanVersionDraftRulePanel } from "./components/RegionalPlanVersionDraftRulePanel";
import { RegionalPlanVersionDraftConfigPanel } from "./components/RegionalPlanVersionDraftConfigPanel";

const VERSION_KIND_LABELS: Record<string, string> = {
  master: "Strategic draft",
  annual: "Annual execution",
  execution_period: "Execution period",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-primary-foreground/15 text-primary-foreground border-primary-foreground/25",
  active: "bg-emerald-500/20 text-primary-foreground border-emerald-200/30",
  finalized: "bg-violet-500/20 text-primary-foreground border-violet-200/30",
  locked: "bg-amber-500/20 text-primary-foreground border-amber-200/30",
  completed: "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20",
};

type DetailTab = "overview" | "settings" | "rule" | "timeline" | "annual" | "periods";

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  return formatDate(value);
}

function OverviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4 py-2 border-b border-border/40 last:border-b-0">
      <dt className="text-muted-foreground text-xs sm:text-sm">{label}</dt>
      <dd className="font-semibold text-foreground text-xs sm:text-sm sm:text-right">{value}</dd>
    </div>
  );
}

function TimelineItem({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  if (value === "—") return null;

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast ? (
        <span className="absolute left-[0.4375rem] top-3 h-full w-px bg-border" aria-hidden />
      ) : null}
      <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-background" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MetaChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-primary-foreground/90">{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-primary-foreground/70">
            {label}
          </p>
          <p className="truncate text-sm font-semibold text-primary-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function RegionalPlanVersionDetailsView() {
  const router = useRouter();
  const params = useParams<{ id: string; versionId: string }>();
  const regionId = params?.id;
  const versionId = params?.versionId;
  const { can } = usePermissions();

  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
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

  const [finalizeDraft, { isLoading: isFinalizing }] = useFinalizeRegionalPlanDraftMutation();
  const [reopenDraft, { isLoading: isReopening }] = useReopenRegionalPlanDraftMutation();
  const [startProcess, { isLoading: isStarting }] = useStartRegionalPlanProcessMutation();
  const [initPeriods, { isLoading: isInitializingPeriods }] = useInitializeRegionalExecutionPeriodsMutation();
  const [finalizeAnnual, { isLoading: isFinalizingAnnual }] = useFinalizeRegionalAnnualExecutionMutation();
  const [finalizePeriods, { isLoading: isFinalizingPeriods }] = useFinalizeRegionalPeriodTargetsMutation();

  const canFinalize = can("REGIONAL_PLANS:FINALIZE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
  const canUpdate = can("REGIONAL_PLANS:UPDATE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");

  const isMasterDraft = plan?.version_kind === "master" && plan?.status === "draft";
  const hasDraftSnapshots =
    Boolean(versionConfig?.owned_by_plan_version_id) ||
    Boolean(versionRule?.owned_by_plan_version_id);

  const readOnlyReason = !isMasterDraft
    ? plan?.version_kind !== "master"
      ? "Edit planning settings on the master strategic draft — annual and period versions inherit them."
      : `This master plan is ${plan?.status}. Configuration can only be edited while in draft status.`
    : null;

  const configReadOnlyReason =
    readOnlyReason ??
    (!hasDraftSnapshots
      ? "This draft still uses live planning config. Save the draft rule once to isolate config editing."
      : null);

  const canEditRule = isMasterDraft && canUpdate;
  const canEditConfig = isMasterDraft && hasDraftSnapshots && canUpdate;

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

  const statusClass =
    STATUS_STYLES[plan.status] ??
    "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20";

  const tabs: Array<{ id: DetailTab; label: string; icon: any; count?: number }> = [
    { id: "overview", label: "Overview", icon: GitBranch },
    { id: "settings", label: "Configuration", icon: Settings2 },
    { id: "rule", label: "Plan Rule", icon: Layers },
    { id: "timeline", label: "Lifecycle", icon: History },
    { id: "annual", label: "Annual Cycles", icon: Calendar, count: annualVersions.length },
    { id: "periods", label: "Execution Periods", icon: Clock, count: executionPeriods.length },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Navigation & SubNav */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <RegionalPlanVersionSubNav regionId={regionId} versionId={versionId} />

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

      {/* Federal Parity ProfileHeroBanner */}
      <ProfileHeroBanner className="overflow-hidden rounded-2xl border shadow-sm">
        <div className="px-6 py-6 sm:px-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`border ${statusClass}`}>{formatStatus(plan.status)}</Badge>
              <Badge
                variant="secondary"
                className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
              >
                {VERSION_KIND_LABELS[plan.version_kind] || plan.version_kind}
              </Badge>
              {hasDraftSnapshots && (
                <Badge className="gap-1 bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20">
                  <Shield className="h-3 w-3" />
                  Isolated Snapshots
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary-foreground flex items-center gap-2">
                <Info className="h-7 w-7 shrink-0 opacity-90" />
                {getPlanDraftDisplayName(plan as any)}
              </h1>
              <p className="mt-2 text-sm text-primary-foreground/80 max-w-3xl">
                Regional rules, planning configuration, and lifecycle metadata for this plan.
                {plan.region?.name ? ` Region: ${plan.region.name}.` : ""}
              </p>
              <p className="mt-1 text-sm text-primary-foreground/70">
                {formatPlanningPeriod(plan as any)}
                {plan.planning_duration_years != null
                  ? ` · ${formatDurationYears(plan.planning_duration_years)}`
                  : ""}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <MetaChip
                icon={<Building2 className="h-4 w-4" />}
                label="Region / Sector"
                value={plan.region?.name ?? "Regional"}
              />
              <MetaChip
                icon={<Calendar className="h-4 w-4" />}
                label="Planning Period"
                value={formatPlanningPeriod(plan as any)}
              />
              <MetaChip
                icon={<Layers className="h-4 w-4" />}
                label="Hierarchy Levels"
                value={versionRule?.steps?.length ? String(versionRule.steps.length) : "—"}
              />
              <MetaChip
                icon={<Settings2 className="h-4 w-4" />}
                label="Target Units"
                value={String(versionConfig?.target_units?.length || 0)}
              />
            </div>
          </div>
        </div>
      </ProfileHeroBanner>

      {/* Quick Action Ribbon if Draft/Finalized */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Lifecycle Action:</span>
          {isDraft && "Plan is in draft mode. Validate all hierarchy milestones to finalize."}
          {isFinalized && !plan.annual_targets_finalized_at && "Master draft finalized. Allocate and finalize annual targets."}
          {isFinalized && plan.annual_targets_finalized_at && !plan.period_targets_finalized_at && "Annual targets finalized. Initialize execution periods and set period targets."}
          {isFinalized && plan.period_targets_finalized_at && !plan.process_started_at && "Period targets finalized. Start the regional execution process to open reporting."}
          {isActive && "Regional plan execution is currently active and accepting department achievement reports."}
          {isCompleted && "Regional plan execution cycle is completed."}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDraft && canFinalize && (
            <Button
              size="sm"
              onClick={handleFinalizeDraft}
              disabled={isFinalizing || (readiness && !readiness.ready)}
              className="gap-2 shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isFinalizing ? "Finalizing..." : "Finalize Strategic Plan"}</span>
            </Button>
          )}

          {isFinalized && canUpdate && !plan.process_started_at && (
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

          {isFinalized && canFinalize && plan.period_targets_finalized_at && !plan.process_started_at && (
            <Button
              size="sm"
              onClick={handleStartProcess}
              disabled={isStarting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Play className="h-4 w-4" />
              <span>Start Execution Process</span>
            </Button>
          )}
        </div>
      </div>

      {/* Readiness Warning Card if Draft */}
      {isDraft && readiness && !readiness.ready && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Finalization Requirements Incomplete</p>
              <ul className="list-disc list-inside mt-1.5 space-y-1">
                {readiness.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Detail Sections Tabs */}
      <nav className="flex flex-wrap items-center gap-2" aria-label="Plan detail sections">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <Button
            key={id}
            type="button"
            variant={activeTab === id ? "default" : "outline"}
            className="gap-2"
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {count !== undefined && (
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-5">
                {count}
              </Badge>
            )}
          </Button>
        ))}
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Version Summary */}
            <Card className="border shadow-xs">
              <CardContent className="pt-6">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <span>Version Summary</span>
                </h3>
                <dl className="text-sm">
                  <OverviewRow label="Version kind" value={VERSION_KIND_LABELS[plan.version_kind] || plan.version_kind} />
                  <OverviewRow label="Status" value={formatStatus(plan.status)} />
                  <OverviewRow label="Start Year" value={String(plan.start_year)} />
                  <OverviewRow label="End Year" value={String(plan.end_year)} />
                  <OverviewRow label="Duration" value={formatDurationYears(plan.planning_duration_years || 1)} />
                  {plan.planning_year != null && (
                    <OverviewRow label="Planning Year" value={String(plan.planning_year)} />
                  )}
                  {plan.period_label && (
                    <OverviewRow label="Period Label" value={plan.period_label} />
                  )}
                  {plan.sequence_index != null && (
                    <OverviewRow label="Sequence Index" value={String(plan.sequence_index)} />
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Lineage & Relationships */}
            <Card className="border shadow-xs">
              <CardContent className="pt-6">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Lineage & Structure</span>
                </h3>
                <dl className="text-sm">
                  <OverviewRow
                    label="Parent Version"
                    value={
                      plan.parent_plan_version_id ? (
                        <Link
                          href={`/regions/${regionId}/plans/${plan.parent_plan_version_id}/details`}
                          className="font-medium text-primary hover:underline"
                        >
                          {plan.parentPlanVersion?.draft_name || plan.parent_plan_version_id}
                        </Link>
                      ) : (
                        "None (Root Master Plan)"
                      )
                    }
                  />
                  <OverviewRow label="Annual Cycles Generated" value={String(annualVersions.length)} />
                  <OverviewRow label="Execution Periods" value={String(executionPeriods.length)} />
                  <OverviewRow
                    label="Snapshot Isolation"
                    value={
                      hasDraftSnapshots ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Isolated Snapshot Attached
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Regional Template Defaults</span>
                      )
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration Overview Card */}
            <Card className="border shadow-xs">
              <CardContent className="pt-6">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <span>Planning Configuration Highlights</span>
                </h3>
                <dl className="text-sm">
                  <OverviewRow
                    label="Execution Breakdown"
                    value={
                      <span className="capitalize font-semibold">
                        {versionConfig?.breakdown_mode?.replace("_", " ") || "Quarterly"}
                      </span>
                    }
                  />
                  <OverviewRow
                    label="Custom Periods"
                    value={
                      versionConfig?.custom_periods?.length
                        ? `${versionConfig.custom_periods.length} Periods Defined`
                        : "Standard Cadence"
                    }
                  />
                  <OverviewRow
                    label="Configured Target Units"
                    value={
                      <div className="flex flex-wrap gap-1 justify-end">
                        {versionConfig?.target_units?.map((u: any) => (
                          <Badge key={u.id} variant="outline" className="text-[11px]">
                            {u.label} {u.symbol && u.symbol !== u.label ? `(${u.symbol})` : ""}
                          </Badge>
                        )) || "Standard Units"}
                      </div>
                    }
                  />
                  <OverviewRow
                    label="Duration Limits"
                    value={`${versionConfig?.min_duration_years || 1} to ${versionConfig?.max_duration_years || 10} Years`}
                  />
                </dl>
              </CardContent>
            </Card>

            {/* Plan Rules Highlights Card */}
            <Card className="border shadow-xs">
              <CardContent className="pt-6">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Plan Rules & Hierarchy Highlights</span>
                </h3>
                <dl className="text-sm">
                  <OverviewRow label="Rule Name" value={versionRule?.name || "Standard Rule"} />
                  <OverviewRow
                    label="Scoring Policy"
                    value={
                      versionRule?.performance_scoring_policy === "ALLOW_OVER_ACHIEVEMENT"
                        ? "Allow Over-achievement (>100%)"
                        : "Cap at 100%"
                    }
                  />
                  <OverviewRow
                    label="Hierarchy Depth"
                    value={`${versionRule?.steps?.length || 0} Dynamic Levels`}
                  />
                  <OverviewRow
                    label="Configured Levels"
                    value={
                      <div className="flex flex-wrap gap-1.5 justify-end mt-1">
                        {versionRule?.steps?.map((s: any) => (
                          <Badge
                            key={s.step_order}
                            variant="secondary"
                            className="text-[10px] font-mono"
                          >
                            L{s.step_order}: {s.label}
                            {s.requires_weight ? " (Target)" : ""}
                          </Badge>
                        )) || "—"}
                      </div>
                    }
                  />
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CONFIGURATION (EDITABLE SETTINGS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "settings" && (
        <RegionalPlanVersionDraftConfigPanel
          versionId={versionId!}
          regionId={regionId!}
          config={versionConfig}
          isLoading={isConfigLoading}
          canEdit={canEditConfig}
          readOnlyReason={configReadOnlyReason}
          onSaved={() => {
            refetchConfig();
            refetch();
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PLAN RULE (EDITABLE RULES) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "rule" && (
        <RegionalPlanVersionDraftRulePanel
          versionId={versionId!}
          regionId={regionId!}
          rule={versionRule}
          isLoading={isRuleLoading}
          canEdit={canEditRule}
          readOnlyReason={readOnlyReason}
          onSaved={() => {
            refetchRule();
            refetch();
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: TIMELINE (LIFECYCLE) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "timeline" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border shadow-xs">
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <span>Lifecycle History Timeline</span>
              </h3>
              <div className="max-w-md pt-2">
                <TimelineItem label="Created" value={formatTimestamp(plan.created_at)} />
                <TimelineItem label="Last Updated" value={formatTimestamp(plan.updated_at)} />
                <TimelineItem label="Strategic Finalized" value={formatTimestamp(plan.finalized_at)} />
                <TimelineItem
                  label="Annual Targets Finalized"
                  value={formatTimestamp(plan.annual_targets_finalized_at)}
                />
                <TimelineItem
                  label="Period Targets Finalized"
                  value={formatTimestamp(plan.period_targets_finalized_at)}
                />
                <TimelineItem
                  label="Process Started"
                  value={formatTimestamp(plan.process_started_at)}
                />
                <TimelineItem
                  label="Published for Review"
                  value={formatTimestamp(plan.published_for_review_at)}
                />
                <TimelineItem
                  label="Review Completed"
                  value={formatTimestamp(plan.review_completed_at)}
                  isLast
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Stage Readiness Checklist</span>
              </h3>
              <div className="space-y-4 pt-1">
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                  {plan.finalized_at ? (
                    <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-foreground">1. Strategic Plan Finalization</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {plan.finalized_at
                        ? `Finalized on ${formatDate(plan.finalized_at)}`
                        : "Draft hierarchy creation and validation"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                  {plan.annual_targets_finalized_at ? (
                    <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-foreground">2. Annual Target Allocation</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {plan.annual_targets_finalized_at
                        ? `Finalized on ${formatDate(plan.annual_targets_finalized_at)}`
                        : "Requires finalized master strategic plan"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                  {plan.period_targets_finalized_at ? (
                    <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-foreground">3. Execution Period Target Distribution</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {plan.period_targets_finalized_at
                        ? `Finalized on ${formatDate(plan.period_targets_finalized_at)}`
                        : "Requires finalized annual targets"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                  {plan.process_started_at ? (
                    <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-foreground">4. Execution Process & Reporting</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {plan.process_started_at
                        ? `Started on ${formatDate(plan.process_started_at)}`
                        : "Opens regional department achievement reporting"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: ANNUAL PLANNING CYCLES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "annual" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Annual Implementation Plans</h3>
              <p className="text-xs text-muted-foreground">
                Each fiscal year inherits the master strategic hierarchy. Allocate annual targets to plan annual milestones.
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
      {/* TAB 6: EXECUTION PERIODS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "periods" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Execution Period Subdivisions</h3>
              <p className="text-xs text-muted-foreground">
                Progress reporting occurs at the execution period level. Periods divide annual targets according to regional rules.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isFinalized && canUpdate && plan.annual_targets_finalized_at && executionPeriods.length === 0 && (
                <Button size="sm" onClick={() => setIsInitPeriodsOpen(true)} className="gap-2 shadow-xs">
                  <Sliders className="h-4 w-4" />
                  <span>Initialize Execution Periods</span>
                </Button>
              )}

              {isFinalized && canUpdate && executionPeriods.length > 0 && !plan.period_targets_finalized_at && (
                <Button size="sm" onClick={handleFinalizePeriods} disabled={isFinalizingPeriods} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Finalize Period Targets</span>
                </Button>
              )}
            </div>
          </div>

          {executionPeriods.length === 0 ? (
            <div className="text-center p-8 border rounded-xl bg-card text-muted-foreground text-sm space-y-3">
              <p>No execution periods initialized yet.</p>
              {plan.annual_targets_finalized_at ? (
                <Button size="sm" onClick={() => setIsInitPeriodsOpen(true)} className="gap-2">
                  <Sliders className="h-4 w-4" />
                  <span>Generate Execution Periods</span>
                </Button>
              ) : (
                <p className="text-xs text-amber-600 font-medium">
                  Annual targets must be finalized before execution periods can be generated.
                </p>
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
                        {period.status}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">
                        {period.planning_year ? `FY ${period.planning_year}` : ""}
                      </span>
                    </div>

                    <h4 className="font-semibold text-foreground mt-2">{period.draft_name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Label: <span className="font-semibold text-foreground">{period.period_label || "Execution Period"}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between gap-2">
                    <Link href={`/regions/${regionId}/plans/${period.regional_plan_version_id}/hierarchy`}>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span>Allocate / Report</span>
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
      {/* PERIOD INITIALIZATION MODAL */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isInitPeriodsOpen} onOpenChange={setIsInitPeriodsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sliders className="h-5 w-5 text-primary" />
              <span>Initialize Execution Periods</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Choose the periodic breakdown mode. This will generate execution sub-versions for every annual plan cycle.
            </p>

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
