"use client";

import { useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Layers,
  Calendar,
  GitBranch,
  Shield,
  Settings2,
  History,
  Building2,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileHeroBanner } from "@/components/common/ProfileHeroBanner";
import { usePermissions } from "@/hooks/usePermissions";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetRegionalPlanVersionByIdQuery,
  useGetRegionalPlanRuleForVersionQuery,
  useGetRegionalPlanningConfigForVersionQuery,
} from "@/redux/api/regionalPlanApi";
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

type DetailTab = "overview" | "settings" | "rule" | "timeline";

const DETAIL_TABS: Array<{
  id: DetailTab;
  label: string;
  icon: typeof GitBranch;
}> = [
  { id: "overview", label: "Overview", icon: GitBranch },
  { id: "settings", label: "Configuration", icon: Settings2 },
  { id: "rule", label: "Plan Rule", icon: Layers },
  { id: "timeline", label: "Lifecycle", icon: History },
];

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

  const {
    data: plan,
    isLoading,
    refetch,
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

  const canEditRule = isMasterDraft && (can("REGIONAL_PLAN_RULES:UPDATE") || canUpdate);
  const canEditConfig = isMasterDraft && (can("REGIONAL_PLANNING_CONFIG:UPDATE") || canUpdate);

  if (isLoading || !plan) {
    return <Loading01 />;
  }

  const statusClass =
    STATUS_STYLES[plan.status] ??
    "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20";

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Navigation & SubNav */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <RegionalPlanVersionSubNav regionId={regionId} versionId={versionId} />

        <div className="flex items-center gap-2">
          <Link href={`/regions/${regionId}/plans/${versionId}`}>
            <Button size="sm" variant="outline" className="gap-2 shadow-2xs">
              <GitBranch className="h-4 w-4 text-primary" />
              <span>Back to Plan View</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Banner */}
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

      {/* Detail Sections Tabs */}
      <nav className="flex flex-wrap items-center gap-2" aria-label="Plan detail sections">
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
            <span>{label}</span>
          </Button>
        ))}
      </nav>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-gray-100 dark:border-border shadow-xs">
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold mb-4 text-foreground">Version Summary</h3>
              <dl className="space-y-3 text-sm">
                <OverviewRow label="Version Kind" value={VERSION_KIND_LABELS[plan.version_kind] || plan.version_kind} />
                <OverviewRow label="Status" value={formatStatus(plan.status)} />
                {plan.planning_year != null && (
                  <OverviewRow label="Planning Year" value={String(plan.planning_year)} />
                )}
                {plan.period_label && (
                  <OverviewRow label="Period Label" value={plan.period_label} />
                )}
                {plan.sequence_index != null && (
                  <OverviewRow label="Sequence" value={String(plan.sequence_index)} />
                )}
                {plan.execution_status && (
                  <OverviewRow label="Execution Status" value={formatStatus(plan.execution_status)} />
                )}
              </dl>
            </CardContent>
          </Card>

          <Card className="border-gray-100 dark:border-border shadow-xs">
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold mb-4 text-foreground">Lineage & Structure</h3>
              <dl className="space-y-3 text-sm">
                <OverviewRow
                  label="Region"
                  value={plan.region?.name ?? "Regional Office"}
                />
                {plan.parentPlanVersion && (
                  <OverviewRow
                    label="Parent Version"
                    value={
                      <Link
                        href={`/regions/${regionId}/plans/${plan.parent_plan_version_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {plan.parentPlanVersion?.draft_name || "Parent Plan"}
                      </Link>
                    }
                  />
                )}
                {plan.annualVersions?.length ? (
                  <OverviewRow
                    label="Annual Cycles"
                    value={String(plan.annualVersions.length)}
                  />
                ) : null}
                {plan.executionPeriodVersions?.length ? (
                  <OverviewRow
                    label="Execution Periods"
                    value={String(plan.executionPeriodVersions.length)}
                  />
                ) : null}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: CONFIGURATION */}
      {activeTab === "settings" && (
        <Card className="border-gray-100 dark:border-border shadow-xs">
          <CardContent className="pt-6">
            <RegionalPlanVersionDraftConfigPanel
              versionId={versionId!}
              regionId={regionId!}
              config={versionConfig}
              isLoading={isConfigLoading}
              canEdit={canEditConfig}
              readOnlyReason={readOnlyReason}
              onSaved={() => {
                refetchConfig();
                refetch();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* TAB 3: RULE */}
      {activeTab === "rule" && (
        <Card className="border-gray-100 dark:border-border shadow-xs">
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      )}

      {/* TAB 4: TIMELINE */}
      {activeTab === "timeline" && (
        <Card className="border-gray-100 dark:border-border shadow-xs">
          <CardContent className="pt-6">
            <h3 className="text-base font-semibold mb-4 text-foreground">Lifecycle Timeline</h3>
            <div className="max-w-lg">
              <TimelineItem label="Created" value={formatTimestamp(plan.created_at)} />
              <TimelineItem label="Last Updated" value={formatTimestamp(plan.updated_at)} />
              <TimelineItem
                label="Strategic Draft Finalized"
                value={formatTimestamp(plan.finalized_at)}
              />
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
                isLast
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
