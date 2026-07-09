"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetPlanVersionByIdQuery } from "@/redux/api/planApi";
import { useGetPlanRuleForVersionQuery } from "@/redux/api/planRuleApi";
import { usePlanVersionPlanningConfiguration } from "@/hooks/usePlanVersionPlanningConfiguration";
import type { PlanVersion, PlanVersionKind, PlanRuleStep } from "@/redux/types/plan";
import type { BreakdownMode } from "@/redux/types/planningConfig";
import { DEFAULT_PLANNING_CONFIGURATION } from "@/redux/types/planningConfig";
import {
  formatDurationYears,
  formatPlanningPeriod,
  getPlanDraftDisplayName,
} from "@/utils/planDraftUtils";
import { formatDate } from "@/utils/formatDate";
import { getDefaultStepColorHex, getPlanStepSurfaceStyles, sortSteps } from "@/utils/planRuleUtils";
import { getPlanVersionBasePath } from "@/utils/planVersionRouteUtils";
import { PlanDetailLoadingPanel } from "./components/PlanDetailLoadingStates";
import type { PlanVersionViewMode } from "@/utils/planVersionRouteUtils";

const VERSION_KIND_LABELS: Record<PlanVersionKind, string> = {
  master: "Strategic draft",
  annual: "Annual execution",
  execution_period: "Execution period",
};

const BREAKDOWN_MODE_LABELS: Record<BreakdownMode, string> = {
  quarterly: "Quarterly",
  semi_annual: "Semi-annual",
  monthly: "Monthly",
  custom: "Custom",
};

const ACCESS_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  participant: "Participant",
  oversight: "Oversight",
  global: "Global",
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  if (value == null || value === "") return null;

  return (
    <div className="grid gap-1 py-2.5 border-b border-gray-100 last:border-0 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-gray-600">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

function formatTimestamp(value?: string | null) {
  if (!value) return null;
  return formatDate(value);
}

function formatVersionKind(kind: PlanVersionKind) {
  return VERSION_KIND_LABELS[kind] ?? kind;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function PlanRuleStepRow({ step }: { step: PlanRuleStep }) {
  const styles = getPlanStepSurfaceStyles(
    step.color_hex ?? getDefaultStepColorHex(step.step_order - 1)
  );

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
      <span
        className="inline-flex h-7 min-w-7 items-center justify-center rounded-md text-xs font-semibold"
        style={styles}
      >
        {step.step_order}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{step.label}</p>
        <p className="text-xs text-gray-500 capitalize">{step.node_type.replace(/_/g, " ")}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {step.requires_weight && <Badge variant="outline">Requires target</Badge>}
        {step.requires_contribution_weight && (
          <Badge variant="outline">Requires contribution</Badge>
        )}
      </div>
    </div>
  );
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
      className="text-primary hover:underline"
    >
      {label}
    </Link>
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
    return <PlanDetailLoadingPanel variant="cards" count={6} />;
  }

  const labels = planningConfig ?? DEFAULT_PLANNING_CONFIGURATION;
  const configMeta = labels.meta;
  const sortedRuleSteps = sortSteps(rule?.steps ?? []);
  const lifecycleMaster = effectiveMasterVersion ?? version;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plan Details</h1>
        <p className="text-sm text-gray-500 mt-1">
          Rules, configuration, owner sector, and lifecycle metadata for{" "}
          {getPlanDraftDisplayName(version)}.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailSection title="Overview">
          <DetailRow label="Draft name" value={getPlanDraftDisplayName(version)} />
          <DetailRow label="Version kind" value={formatVersionKind(version.version_kind)} />
          <DetailRow label="Status" value={<span className="capitalize">{formatStatus(version.status)}</span>} />
          <DetailRow
            label={labels.planning_period_label}
            value={formatPlanningPeriod(version)}
          />
          <DetailRow
            label={labels.duration_label}
            value={
              version.planning_duration_years != null
                ? formatDurationYears(version.planning_duration_years)
                : null
            }
          />
          {version.planning_year != null && (
            <DetailRow label="Planning year" value={String(version.planning_year)} />
          )}
          {version.period_label && (
            <DetailRow label="Period" value={version.period_label} />
          )}
          {version.sequence_index != null && (
            <DetailRow label="Sequence" value={String(version.sequence_index)} />
          )}
          {version.review_version_number != null && (
            <DetailRow
              label="Review version"
              value={`Round ${version.review_version_number}`}
            />
          )}
        </DetailSection>

        <DetailSection title="Owner sector">
          <DetailRow
            label="Sector"
            value={version.governmentStructure?.name ?? "—"}
          />
          <DetailRow
            label="Sector ID"
            value={
              <span className="font-mono text-xs break-all">
                {version.government_structure_id}
              </span>
            }
          />
          <DetailRow
            label="Configuration scope"
            value={
              configMeta?.scope === "sector"
                ? "Sector override"
                : "Global default"
            }
          />
          {configMeta?.has_sector_override != null && (
            <DetailRow
              label="Using sector override"
              value={configMeta.has_sector_override ? "Yes" : "No"}
            />
          )}
        </DetailSection>

        <DetailSection title="Planning configuration">
          {isConfigLoading ? (
            <p className="text-sm text-gray-500">Loading configuration…</p>
          ) : (
            <>
              <DetailRow
                label="Allowed duration"
                value={`${labels.min_duration_years}–${labels.max_duration_years} years`}
              />
              <DetailRow
                label="Execution breakdown"
                value={BREAKDOWN_MODE_LABELS[labels.breakdown_mode]}
              />
              {labels.breakdown_mode === "custom" && labels.custom_periods.length > 0 && (
                <DetailRow
                  label="Custom periods"
                  value={labels.custom_periods.map((period) => period.label).join(", ")}
                />
              )}
              <DetailRow
                label="Target units"
                value={labels.target_units.map((unit) => unit.label).join(", ")}
              />
              <DetailRow
                label="Draft labels"
                value={`${labels.draft_entity_label_singular} / ${labels.draft_entity_label_plural}`}
              />
              {labels.updated_at && (
                <DetailRow
                  label="Configuration updated"
                  value={formatTimestamp(labels.updated_at)}
                />
              )}
            </>
          )}
        </DetailSection>

        <DetailSection title="Plan rule">
          {isRuleLoading ? (
            <p className="text-sm text-gray-500">Loading plan rule…</p>
          ) : rule ? (
            <>
              <DetailRow label="Rule name" value={rule.name} />
              <DetailRow
                label="Scope"
                value={
                  rule.government_structure_id
                    ? rule.governmentStructure?.name ?? "Sector-specific"
                    : "Global"
                }
              />
              <DetailRow
                label="Active"
                value={rule.is_active ? "Yes" : "No"}
              />
              <DetailRow
                label="Inherit to descendants"
                value={rule.inherit_to_descendants ? "Yes" : "No"}
              />
              <div className="pt-3 space-y-2">
                <p className="text-sm font-medium text-gray-600">Hierarchy steps</p>
                {sortedRuleSteps.map((step) => (
                  <PlanRuleStepRow key={step.plan_rule_step_id} step={step} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No plan rule is linked to this version.</p>
          )}
        </DetailSection>

        <DetailSection title="Lifecycle">
          <DetailRow label="Created" value={formatTimestamp(version.created_at)} />
          <DetailRow label="Last updated" value={formatTimestamp(version.updated_at)} />
          <DetailRow
            label="Strategic finalized"
            value={formatTimestamp(version.finalized_at ?? lifecycleMaster?.finalized_at)}
          />
          <DetailRow
            label="Annual targets finalized"
            value={formatTimestamp(lifecycleMaster?.annual_targets_finalized_at)}
          />
          <DetailRow
            label="Period subdivision"
            value={
              lifecycleMaster?.period_subdivision_mode
                ? BREAKDOWN_MODE_LABELS[lifecycleMaster.period_subdivision_mode]
                : null
            }
          />
          <DetailRow
            label="Period targets finalized"
            value={formatTimestamp(lifecycleMaster?.period_targets_finalized_at)}
          />
          <DetailRow
            label="Process started"
            value={formatTimestamp(lifecycleMaster?.process_started_at)}
          />
          <DetailRow
            label="Published for review"
            value={formatTimestamp(version.published_for_review_at)}
          />
          <DetailRow
            label="Review unlocked"
            value={formatTimestamp(version.review_unlocked_at)}
          />
          <DetailRow
            label="Review completed"
            value={formatTimestamp(version.review_completed_at)}
          />
        </DetailSection>

        <DetailSection title="Lineage & structure">
          {version.baseVersion && (
            <DetailRow
              label="Based on"
              value={<VersionLink version={version.baseVersion} mode={mode} />}
            />
          )}
          {parentVersion && (
            <DetailRow
              label="Parent version"
              value={<VersionLink version={parentVersion} mode={mode} />}
            />
          )}
          {effectiveMasterVersion &&
            effectiveMasterVersion.plan_version_id !== version.plan_version_id && (
              <DetailRow
                label="Master plan"
                value={<VersionLink version={effectiveMasterVersion} mode={mode} />}
              />
            )}
          {version.live_master_draft_name && version.live_master_version_id && (
            <DetailRow
              label="Live master draft"
              value={
                <VersionLink
                  version={{
                    plan_version_id: version.live_master_version_id,
                    draft_name: version.live_master_draft_name,
                    planning_year: null,
                    period_label: null,
                    version_kind: "master",
                  }}
                  mode={mode}
                />
              }
            />
          )}
          <DetailRow
            label="Annual years"
            value={
              version.annualVersions?.length
                ? String(version.annualVersions.length)
                : version.version_kind === "master"
                  ? "0"
                  : null
            }
          />
          <DetailRow
            label="Execution periods"
            value={
              version.executionPeriodVersions?.length
                ? String(version.executionPeriodVersions.length)
                : null
            }
          />
          <DetailRow
            label="Plan rule ID"
            value={
              version.plan_rule_id ? (
                <span className="font-mono text-xs break-all">{version.plan_rule_id}</span>
              ) : null
            }
          />
          <DetailRow
            label="Version ID"
            value={
              <span className="font-mono text-xs break-all">{version.plan_version_id}</span>
            }
          />
        </DetailSection>

        {(version.access_role || version.tree_access_mode) && (
          <DetailSection title="Your access">
            {version.access_role && (
              <DetailRow
                label="Access role"
                value={ACCESS_ROLE_LABELS[version.access_role] ?? version.access_role}
              />
            )}
            {version.tree_access_mode && (
              <DetailRow
                label="Tree visibility"
                value={formatStatus(version.tree_access_mode)}
              />
            )}
          </DetailSection>
        )}
      </div>
    </div>
  );
}
