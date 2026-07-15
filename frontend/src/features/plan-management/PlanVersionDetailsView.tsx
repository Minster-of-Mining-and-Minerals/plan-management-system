"use client";

import { useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import {
  Building2,
  Calendar,
  GitBranch,
  History,
  Info,
  Layers,
  Settings2,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileHeroBanner } from "@/components/common/ProfileHeroBanner";
import { useGetPlanVersionByIdQuery } from "@/redux/api/planApi";
import { useGetPlanRuleForVersionQuery } from "@/redux/api/planRuleApi";
import { usePlanVersionPlanningConfiguration } from "@/hooks/usePlanVersionPlanningConfiguration";
import type { PlanVersion, PlanVersionKind } from "@/redux/types/plan";
import { DEFAULT_PLANNING_CONFIGURATION } from "@/redux/types/planningConfig";
import {
  formatDurationYears,
  formatPlanningPeriod,
  getPlanDraftDisplayName,
} from "@/utils/planDraftUtils";
import { formatDate } from "@/utils/formatDate";
import { getPlanVersionBasePath } from "@/utils/planVersionRouteUtils";
import { PlanDetailLoadingPanel } from "./components/PlanDetailLoadingStates";
import { PlanVersionDraftConfigPanel } from "./components/PlanVersionDraftConfigPanel";
import { PlanVersionDraftRulePanel } from "./components/PlanVersionDraftRulePanel";
import type { PlanVersionViewMode } from "@/utils/planVersionRouteUtils";

const VERSION_KIND_LABELS: Record<PlanVersionKind, string> = {
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

type DetailTab = "overview" | "settings" | "rule" | "timeline";

const DETAIL_TABS: Array<{
  id: DetailTab;
  label: string;
  icon: typeof GitBranch;
}> = [
  { id: "overview", label: "Overview", icon: GitBranch },
  { id: "settings", label: "Configuration", icon: Settings2 },
  { id: "rule", label: "Plan rule", icon: Layers },
  { id: "timeline", label: "Lifecycle", icon: History },
];

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  return formatDate(value);
}

function VersionLink({
  version,
  mode,
}: {
  version: Pick<PlanVersion, "plan_version_id" | "draft_name" | "planning_year" | "period_label" | "version_kind">;
  mode: PlanVersionViewMode;
}) {
  const label =
    version.draft_name ||
    (version.planning_year != null
      ? `Year ${version.planning_year}`
      : version.period_label || version.plan_version_id);

  return (
    <Link
      href={getPlanVersionBasePath(version.plan_version_id, mode)}
      className="font-medium text-primary hover:underline"
    >
      {label}
    </Link>
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
        <p className="mt-0.5 text-sm text-gray-900">{value}</p>
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

interface PlanVersionDetailsViewProps {
  versionId: string;
  mode?: PlanVersionViewMode;
}

export function PlanVersionDetailsView({
  versionId,
  mode = "draft",
}: PlanVersionDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("settings");
  const { data: version, isLoading: isVersionLoading } = useGetPlanVersionByIdQuery(versionId);

  const parentPlanVersionId = version?.parent_plan_version_id ?? null;
  const { data: fetchedParentVersion } = useGetPlanVersionByIdQuery(parentPlanVersionId!, {
    skip: !parentPlanVersionId,
  });
  const parentVersion = version?.parentPlanVersion ?? fetchedParentVersion;

  const annualParentId =
    version?.version_kind === "execution_period" ? version.parent_plan_version_id : null;
  const { data: annualParentVersion } = useGetPlanVersionByIdQuery(annualParentId!, {
    skip: !annualParentId,
  });

  const resolvedMasterVersionId =
    version?.live_master_version_id ??
    (version?.version_kind === "master"
      ? version.plan_version_id
      : version?.version_kind === "annual"
        ? version.parent_plan_version_id
        : version?.version_kind === "execution_period"
          ? annualParentVersion?.parent_plan_version_id ?? null
          : null);

  const { data: masterVersion } = useGetPlanVersionByIdQuery(resolvedMasterVersionId!, {
    skip: !resolvedMasterVersionId,
  });

  const effectiveMasterVersion = version?.version_kind === "master" ? version : masterVersion;
  const masterVersionId = effectiveMasterVersion?.plan_version_id ?? versionId;

  const { config: planningConfig, isLoading: isConfigLoading } =
    usePlanVersionPlanningConfiguration(version, masterVersion);
  const { data: rule, isLoading: isRuleLoading } = useGetPlanRuleForVersionQuery(versionId);

  const isBootstrapping =
    isVersionLoading ||
    !version ||
    (version.version_kind === "execution_period" &&
      !!annualParentId &&
      annualParentVersion === undefined) ||
    (!!resolvedMasterVersionId && masterVersion === undefined && version.version_kind !== "master");

  if (isBootstrapping) {
    return <PlanDetailLoadingPanel variant="cards" count={4} />;
  }

  const labels = planningConfig ?? DEFAULT_PLANNING_CONFIGURATION;
  const lifecycleMaster = effectiveMasterVersion ?? version;
  const isMasterDraft = version.version_kind === "master" && version.status === "draft";
  const hasDraftSnapshots =
    labels.meta?.scope === "draft" || Boolean(rule?.owned_by_plan_version_id);

  const readOnlyReason = !isMasterDraft
    ? version.version_kind !== "master"
      ? "Edit planning settings on the master strategic draft — annual and period versions inherit them."
      : `This master plan is ${version.status}. Configuration can only be edited while in draft status.`
    : null;

  const configReadOnlyReason =
    readOnlyReason ??
    (!hasDraftSnapshots
      ? "This draft still uses live planning config. Save the draft rule once (or run snapshot backfill) to isolate config editing."
      : null);

  const canEditRule = isMasterDraft;
  const canEditConfig = isMasterDraft && hasDraftSnapshots;

  const statusClass =
    STATUS_STYLES[version.status] ?? "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20";

  return (
    <div className="space-y-6">
      <ProfileHeroBanner className="overflow-hidden rounded-2xl border shadow-sm">
        <div className="px-6 py-6 sm:px-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`border ${statusClass}`}>{formatStatus(version.status)}</Badge>
              <Badge
                variant="secondary"
                className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
              >
                {VERSION_KIND_LABELS[version.version_kind]}
              </Badge>
              {hasDraftSnapshots ? (
                <Badge className="gap-1 bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20">
                  <Shield className="h-3 w-3" />
                  Isolated snapshots
                </Badge>
              ) : null}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary-foreground flex items-center gap-2">
                <Info className="h-7 w-7 shrink-0 opacity-90" />
                {getPlanDraftDisplayName(version)}
              </h1>
              <p className="mt-2 text-sm text-primary-foreground/80 max-w-3xl">
                Rules, planning configuration, and lifecycle metadata for this draft.
                {version.governmentStructure?.name ? ` Owned by ${version.governmentStructure.name}.` : ""}
              </p>
              <p className="mt-1 text-sm text-primary-foreground/70">
                {formatPlanningPeriod(version)}
                {version.planning_duration_years != null
                  ? ` · ${formatDurationYears(version.planning_duration_years)}`
                  : ""}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <MetaChip
                icon={<Building2 className="h-4 w-4" />}
                label="Sector"
                value={version.governmentStructure?.name ?? "—"}
              />
              <MetaChip
                icon={<Calendar className="h-4 w-4" />}
                label={labels.planning_period_label}
                value={formatPlanningPeriod(version)}
              />
              <MetaChip
                icon={<Layers className="h-4 w-4" />}
                label="Hierarchy levels"
                value={rule?.steps?.length ? String(rule.steps.length) : "—"}
              />
              <MetaChip
                icon={<Settings2 className="h-4 w-4" />}
                label="Target units"
                value={String(labels.target_units.length)}
              />
            </div>
          </div>
        </div>
      </ProfileHeroBanner>

      <nav
        className="flex flex-wrap items-center gap-2"
        aria-label="Plan detail sections"
      >
        {DETAIL_TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            variant={activeTab === id ? "default" : "outline"}
            className="gap-2"
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="pt-6">
                <h3 className="text-base font-semibold mb-4">Version summary</h3>
                <dl className="space-y-3 text-sm">
                  <OverviewRow label="Version kind" value={VERSION_KIND_LABELS[version.version_kind]} />
                  <OverviewRow label="Status" value={formatStatus(version.status)} />
                  {version.planning_year != null ? (
                    <OverviewRow label="Planning year" value={String(version.planning_year)} />
                  ) : null}
                  {version.period_label ? (
                    <OverviewRow label="Period" value={version.period_label} />
                  ) : null}
                  {version.sequence_index != null ? (
                    <OverviewRow label="Sequence" value={String(version.sequence_index)} />
                  ) : null}
                  {version.review_version_number != null ? (
                    <OverviewRow
                      label="Review round"
                      value={`Round ${version.review_version_number}`}
                    />
                  ) : null}
                </dl>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm">
              <CardContent className="pt-6">
                <h3 className="text-base font-semibold mb-4">Lineage</h3>
                <dl className="space-y-3 text-sm">
                  {version.baseVersion ? (
                    <OverviewRow
                      label="Based on"
                      value={<VersionLink version={version.baseVersion} mode={mode} />}
                    />
                  ) : null}
                  {parentVersion ? (
                    <OverviewRow
                      label="Parent version"
                      value={<VersionLink version={parentVersion} mode={mode} />}
                    />
                  ) : null}
                  {effectiveMasterVersion &&
                  effectiveMasterVersion.plan_version_id !== version.plan_version_id ? (
                    <OverviewRow
                      label="Master plan"
                      value={<VersionLink version={effectiveMasterVersion} mode={mode} />}
                    />
                  ) : null}
                  {version.annualVersions?.length ? (
                    <OverviewRow
                      label="Annual years"
                      value={String(version.annualVersions.length)}
                    />
                  ) : null}
                  {version.executionPeriodVersions?.length ? (
                    <OverviewRow
                      label="Execution periods"
                      value={String(version.executionPeriodVersions.length)}
                    />
                  ) : null}
                </dl>
              </CardContent>
            </Card>

            {(version.access_role || version.tree_access_mode) && (
              <Card className="lg:col-span-2 border-gray-100 shadow-sm">
                <CardContent className="pt-6">
                  <h3 className="text-base font-semibold mb-4">Your access</h3>
                  <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                    {version.access_role ? (
                      <OverviewRow
                        label="Access role"
                        value={formatStatus(version.access_role)}
                      />
                    ) : null}
                    {version.tree_access_mode ? (
                      <OverviewRow
                        label="Tree visibility"
                        value={formatStatus(version.tree_access_mode)}
                      />
                    ) : null}
                  </dl>
                </CardContent>
              </Card>
            )}
        </div>
      ) : null}

      {activeTab === "settings" ? (
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="pt-6">
              <PlanVersionDraftConfigPanel
                masterVersionId={masterVersionId}
                config={labels}
                isLoading={isConfigLoading}
                canEdit={canEditConfig}
                readOnlyReason={configReadOnlyReason}
              />
            </CardContent>
          </Card>
      ) : null}

      {activeTab === "rule" ? (
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="pt-6">
              <PlanVersionDraftRulePanel
                masterVersionId={masterVersionId}
                rule={rule}
                isLoading={isRuleLoading}
                canEdit={canEditRule}
                readOnlyReason={readOnlyReason}
              />
            </CardContent>
          </Card>
      ) : null}

      {activeTab === "timeline" ? (
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold mb-4 text-gray-900">Lifecycle timeline</h3>
              <div className="max-w-lg">
                <TimelineItem label="Created" value={formatTimestamp(version.created_at)} />
                <TimelineItem label="Last updated" value={formatTimestamp(version.updated_at)} />
                <TimelineItem
                  label="Strategic finalized"
                  value={formatTimestamp(version.finalized_at ?? lifecycleMaster?.finalized_at)}
                />
                <TimelineItem
                  label="Annual targets finalized"
                  value={formatTimestamp(lifecycleMaster?.annual_targets_finalized_at)}
                />
                <TimelineItem
                  label="Period targets finalized"
                  value={formatTimestamp(lifecycleMaster?.period_targets_finalized_at)}
                />
                <TimelineItem
                  label="Process started"
                  value={formatTimestamp(lifecycleMaster?.process_started_at)}
                />
                <TimelineItem
                  label="Published for review"
                  value={formatTimestamp(version.published_for_review_at)}
                />
                <TimelineItem
                  label="Review completed"
                  value={formatTimestamp(version.review_completed_at)}
                  isLast
                />
              </div>
            </CardContent>
          </Card>
      ) : null}
    </div>
  );
}

function OverviewRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-gray-900 sm:text-right">{value}</dd>
    </div>
  );
}
