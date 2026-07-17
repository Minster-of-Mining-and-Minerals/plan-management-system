"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_REQUEST_AMENDMENT_PERMISSIONS } from "@/utils/planPermissionUtils";
import {
  useCreateKpiAdditionMutation,
  useGetExecutionPeriodsQuery,
  useGetKpiAdditionReportingQuery,
  useGetPlanHierarchyQuery,
  useGetPlanNodesQuery,
  useLazyPreviewPlanAmendmentQuery,
  useSubmitPlanAmendmentMutation,
} from "@/redux/api/planApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import type {
  KpiAdditionWeightMode,
  PlanNode,
  PlanNodeHierarchy,
  PlanVersion,
} from "@/redux/types/plan";
import { flattenPlanHierarchy } from "@/utils/planAchievementHierarchyUtils";

const EMPTY_PLAN_NODES: PlanNode[] = [];
const EMPTY_PERIODS: PlanVersion[] = [];

type KpiAdditionFormProps = {
  draftId: string;
  annualVersionId: string;
  onSubmitted?: () => void;
};

type PreviewPayload = {
  parent_title?: string;
  new_kpi?: {
    title?: string;
    annual_target?: number;
    weight?: number;
  };
  period_allocations?: Array<{
    period_label?: string | null;
    target?: number;
    finalized?: boolean;
    in_window?: boolean;
  }>;
  sibling_weight_changes?: Array<{
    kpi_id?: string;
    before_weight?: number;
    after_weight?: number;
  }>;
  summary?: {
    open_period_count?: number;
    sibling_adjustments?: number;
    rollup_note?: string;
  };
};

function resolvePreviewData(raw: unknown): PreviewPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  if (root.new_kpi || root.parent_title) {
    return root as PreviewPayload;
  }
  const actions = root.actions;
  if (Array.isArray(actions) && actions[0]?.preview) {
    return actions[0].preview as PreviewPayload;
  }
  return null;
}

function toLivePeriodOptions(periods: PlanVersion[]): PlanVersion[] {
  return periods.map((period) => ({
    ...period,
    plan_version_id:
      period.execution_snapshot_of_version_id || period.plan_version_id,
  }));
}

function isPeriodFinalized(period: PlanVersion): boolean {
  const execStatus = period.execution_status;
  const status = period.status;
  return (
    execStatus === "completed" ||
    execStatus === "locked" ||
    status === "completed" ||
    status === "finalized" ||
    status === "locked"
  );
}

function collectParentOptions(
  nodes: PlanNodeHierarchy[]
): Array<{ id: string; title: string; type: string }> {
  const flat = flattenPlanHierarchy(nodes);
  const options: Array<{ id: string; title: string; type: string }> = [];
  const seen = new Set<string>();

  for (const node of flat) {
    if (node.type !== "goal" && node.type !== "strategic") continue;
    if (node.is_active === false) continue;
    if (!node.plan_node_id || seen.has(node.plan_node_id)) continue;
    seen.add(node.plan_node_id);
    options.push({
      id: node.plan_node_id,
      title: node.title || "Untitled",
      type: node.type,
    });
  }

  return options.sort((a, b) => a.title.localeCompare(b.title));
}

function roundTarget(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function equalSplitTargets(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = roundTarget(total / count);
  const amounts = Array.from({ length: count }, () => base);
  const sum = amounts.reduce((acc, value) => acc + value, 0);
  amounts[count - 1] = roundTarget(amounts[count - 1] + (total - sum));
  return amounts;
}

export function KpiAdditionForm({
  draftId,
  annualVersionId,
  onSubmitted,
}: KpiAdditionFormProps) {
  const [requestTitle, setRequestTitle] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [parentId, setParentId] = useState("");
  const [kpiTitle, setKpiTitle] = useState("");
  const [kpiDescription, setKpiDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [contributionWeight, setContributionWeight] = useState("");
  const [annualTarget, setAnnualTarget] = useState("");
  const [startPeriodId, setStartPeriodId] = useState("");
  const [endPeriodId, setEndPeriodId] = useState("");
  const [weightMode, setWeightMode] =
    useState<KpiAdditionWeightMode>("proportional");
  const [periodTargets, setPeriodTargets] = useState<Record<string, string>>(
    {}
  );
  const [siblingWeights, setSiblingWeights] = useState<
    Record<string, string>
  >({});
  const [ownerUserId, setOwnerUserId] = useState("");
  const [governmentStructureId, setGovernmentStructureId] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [draftAmendmentId, setDraftAmendmentId] = useState<string | null>(null);

  const { data: reporting, isLoading: isReportingLoading } =
    useGetKpiAdditionReportingQuery(
      { versionId: annualVersionId },
      { skip: !annualVersionId }
    );

  const { data: hierarchy, isLoading: isHierarchyLoading } =
    useGetPlanHierarchyQuery(draftId, { skip: !draftId });

  const { data: periodsResponse, isLoading: isPeriodsLoading } =
    useGetExecutionPeriodsQuery(annualVersionId, { skip: !annualVersionId });

  const { data: siblingNodesData } = useGetPlanNodesQuery(
    {
      plan_version_id: draftId,
      parent_id: parentId,
      type: "kpi",
      is_active: true,
    },
    { skip: !draftId || !parentId || weightMode !== "manual" }
  );
  const siblingNodes = siblingNodesData ?? EMPTY_PLAN_NODES;

  const { data: usersData } = useGetUsersQuery({ page: 1, limit: 200 });
  const users = usersData ?? [];
  const { data: govStructuresData } = useGetGovernmentStructuresQuery({
    is_active: true,
  });
  const govStructures = govStructuresData ?? [];

  const [createKpiAddition, { isLoading: isCreating }] =
    useCreateKpiAdditionMutation();
  const [submitAmendment, { isLoading: isSubmitting }] =
    useSubmitPlanAmendmentMutation();
  const [fetchPreview, { isFetching: isPreviewLoading }] =
    useLazyPreviewPlanAmendmentQuery();

  const parentOptions = useMemo(
    () => collectParentOptions(hierarchy ?? []),
    [hierarchy]
  );

  const periods = useMemo(
    () =>
      toLivePeriodOptions(
        periodsResponse?.executionPeriods ?? EMPTY_PERIODS
      ),
    [periodsResponse?.executionPeriods]
  );

  const sortedPeriods = useMemo(
    () =>
      [...periods].sort(
        (a, b) => (a.sequence_index ?? 0) - (b.sequence_index ?? 0)
      ),
    [periods]
  );

  const openPeriodsInRange = useMemo(() => {
    if (!startPeriodId) return EMPTY_PERIODS;
    const startIndex = sortedPeriods.findIndex(
      (period) => period.plan_version_id === startPeriodId
    );
    if (startIndex < 0) return EMPTY_PERIODS;

    let endIndex = sortedPeriods.length - 1;
    if (endPeriodId) {
      const resolvedEnd = sortedPeriods.findIndex(
        (period) => period.plan_version_id === endPeriodId
      );
      if (resolvedEnd >= startIndex) {
        endIndex = resolvedEnd;
      }
    }

    return sortedPeriods
      .slice(startIndex, endIndex + 1)
      .filter((period) => !isPeriodFinalized(period));
  }, [sortedPeriods, startPeriodId, endPeriodId]);

  const openPeriodIdsKey = useMemo(
    () => openPeriodsInRange.map((period) => period.plan_version_id).join("|"),
    [openPeriodsInRange]
  );

  const siblingIdsKey = useMemo(
    () =>
      siblingNodes
        .map((sibling) => `${sibling.plan_node_id}:${sibling.weight ?? ""}`)
        .join("|"),
    [siblingNodes]
  );

  useEffect(() => {
    if (!parentId || weightMode !== "manual") {
      setSiblingWeights((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }
    const next: Record<string, string> = {};
    for (const sibling of siblingNodes) {
      if (!sibling.plan_node_id) continue;
      next[sibling.plan_node_id] = String(sibling.weight ?? "");
    }
    setSiblingWeights((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === next[key])
      ) {
        return prev;
      }
      return next;
    });
    // Only seed weights when parent/siblings change — do not clear preview here.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- siblingIdsKey captures sibling identity
  }, [parentId, weightMode, siblingIdsKey]);

  useEffect(() => {
    const numericTarget = Number(annualTarget);
    if (
      annualTarget.trim() === "" ||
      !Number.isFinite(numericTarget) ||
      openPeriodsInRange.length === 0
    ) {
      setPeriodTargets((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }

    const split = equalSplitTargets(numericTarget, openPeriodsInRange.length);
    const next: Record<string, string> = {};
    openPeriodsInRange.forEach((period, index) => {
      next[period.plan_version_id] = String(split[index] ?? 0);
    });
    setPeriodTargets((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === next[key])
      ) {
        return prev;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openPeriodIdsKey captures range identity
  }, [annualTarget, openPeriodIdsKey]);

  const isSaving = isCreating || isSubmitting || isPreviewLoading;
  const isLoading = isReportingLoading || isHierarchyLoading || isPeriodsLoading;

  const buildPayload = (submit: boolean) => {
    const numericWeight = Number(weight);
    const numericContribution =
      contributionWeight.trim() === ""
        ? null
        : Number(contributionWeight);
    const numericAnnualTarget = Number(annualTarget);

    return {
      draftId,
      title: requestTitle.trim() || kpiTitle.trim(),
      reason: reason.trim(),
      description: description.trim() || undefined,
      effectiveMode: (effectiveDate
        ? "custom_date"
        : "immediate") as "immediate" | "custom_date",
      effectiveDate: effectiveDate || null,
      parentId,
      annualVersionId,
      kpiTitle: kpiTitle.trim(),
      kpiDescription: kpiDescription.trim() || undefined,
      weight: numericWeight,
      contributionWeight: numericContribution,
      annualTarget: numericAnnualTarget,
      startPeriodId,
      endPeriodId: endPeriodId || null,
      periodAllocations: openPeriodsInRange.map((period) => ({
        periodId: period.plan_version_id,
        target: Number(periodTargets[period.plan_version_id] ?? 0),
      })),
      weightRedistributionMode: weightMode,
      siblingWeightAdjustments:
        weightMode === "manual"
          ? siblingNodes.map((sibling) => ({
              kpiId: sibling.plan_node_id,
              weight: Number(siblingWeights[sibling.plan_node_id] ?? 0),
              contributionWeight: sibling.contribution_weight ?? null,
            }))
          : [],
      ownerUserId,
      governmentStructureId,
      targetAllocationMode: "divisible",
      achievementMode: "period",
      submit,
    };
  };

  const validateForm = (): string | null => {
    if (!requestTitle.trim() && !kpiTitle.trim()) {
      return "Request title or KPI title is required";
    }
    if (!reason.trim()) return "Reason is required";
    if (!parentId) return "Select a parent goal or strategic objective";
    if (!kpiTitle.trim()) return "KPI title is required";
    const numericWeight = Number(weight);
    if (!Number.isFinite(numericWeight) || numericWeight < 0) {
      return "Weight must be a non-negative number";
    }
    const numericAnnualTarget = Number(annualTarget);
    if (!Number.isFinite(numericAnnualTarget) || numericAnnualTarget <= 0) {
      return "Annual target must be a positive number";
    }
    if (!startPeriodId) return "Start period is required";
    if (openPeriodsInRange.length === 0) {
      return "No open periods in the selected range";
    }
    for (const period of openPeriodsInRange) {
      const value = Number(periodTargets[period.plan_version_id]);
      if (!Number.isFinite(value) || value < 0) {
        return `Enter a valid non-negative target for ${period.period_label || "open period"}`;
      }
    }
    if (!ownerUserId) return "Select an owner";
    if (!governmentStructureId) return "Select a department / sector";
    if (weightMode === "manual") {
      for (const sibling of siblingNodes) {
        const value = Number(siblingWeights[sibling.plan_node_id]);
        if (!Number.isFinite(value) || value < 0) {
          return `Enter a valid weight for sibling KPI "${sibling.title || "Untitled"}"`;
        }
      }
    }
    return null;
  };

  const handlePreview = async () => {
    const error = validateForm();
    if (error) {
      actionFeedback.error(error);
      return;
    }

    try {
      const created = await createKpiAddition(buildPayload(false)).unwrap();
      const amendmentId = created.plan_amendment_id || created.id;
      setDraftAmendmentId(amendmentId);
      const previewResult = await fetchPreview(amendmentId).unwrap();
      const resolved =
        resolvePreviewData(previewResult.legacy_preview) ||
        resolvePreviewData(previewResult.preview);
      setPreview(resolved);
      if (!resolved) {
        actionFeedback.error("Preview was empty");
        return;
      }
      actionFeedback.success("Preview ready — nothing applied yet");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to build preview");
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      actionFeedback.error(error);
      return;
    }

    try {
      if (draftAmendmentId) {
        await submitAmendment(draftAmendmentId).unwrap();
      } else {
        await createKpiAddition(buildPayload(true)).unwrap();
      }
      actionFeedback.success("KPI addition submitted for approval");
      setRequestTitle("");
      setReason("");
      setEffectiveDate("");
      setParentId("");
      setKpiTitle("");
      setKpiDescription("");
      setWeight("");
      setContributionWeight("");
      setAnnualTarget("");
      setStartPeriodId("");
      setEndPeriodId("");
      setWeightMode("proportional");
      setPeriodTargets({});
      setSiblingWeights({});
      setOwnerUserId("");
      setGovernmentStructureId("");
      setDescription("");
      setPreview(null);
      setDraftAmendmentId(null);
      onSubmitted?.();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to submit KPI addition");
    }
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading form data…</p>;
  }

  if (!reporting?.process_started) {
    return (
      <p className="text-xs text-muted-foreground">
        KPI addition requires execution to have started.
      </p>
    );
  }

  return (
    <PermissionGuard requireAll={PLAN_REQUEST_AMENDMENT_PERMISSIONS}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="kpi-req-title">Request title</Label>
            <Input
              id="kpi-req-title"
              value={requestTitle}
              onChange={(event) => setRequestTitle(event.target.value)}
              placeholder="e.g. Add Q3 outreach KPI"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="kpi-reason">Reason</Label>
            <Textarea
              id="kpi-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="Why is this KPI being added?"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-effective-date">Effective date (optional)</Label>
            <Input
              id="kpi-effective-date"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-parent">Parent</Label>
            <Select
              value={parentId || undefined}
              onValueChange={(value) => {
                setParentId(value);
                setPreview(null);
                setDraftAmendmentId(null);
              }}
            >
              <SelectTrigger id="kpi-parent" className="w-full">
                <SelectValue placeholder="Select parent" />
              </SelectTrigger>
              <SelectContent>
                {parentOptions.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.title} ({parent.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="kpi-title">KPI title</Label>
            <Input
              id="kpi-title"
              value={kpiTitle}
              onChange={(event) => setKpiTitle(event.target.value)}
              placeholder="e.g. Community outreach events held"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-weight">Weight</Label>
            <Input
              id="kpi-weight"
              type="number"
              step="any"
              min={0}
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value);
                setPreview(null);
                setDraftAmendmentId(null);
              }}
              placeholder="e.g. 10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-contribution-weight">
              Contribution weight (optional)
            </Label>
            <Input
              id="kpi-contribution-weight"
              type="number"
              step="any"
              min={0}
              value={contributionWeight}
              onChange={(event) => setContributionWeight(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-annual-target">Annual target</Label>
            <Input
              id="kpi-annual-target"
              type="number"
              step="any"
              min={0}
              value={annualTarget}
              onChange={(event) => setAnnualTarget(event.target.value)}
              placeholder="e.g. 100"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-weight-mode">Weight redistribution mode</Label>
            <Select
              value={weightMode}
              onValueChange={(value) => {
                setWeightMode(value as KpiAdditionWeightMode);
                setPreview(null);
                setDraftAmendmentId(null);
              }}
            >
              <SelectTrigger id="kpi-weight-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proportional">Auto proportional</SelectItem>
                <SelectItem value="equal">Auto equal</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-start-period">Start period</Label>
            <Select
              value={startPeriodId || undefined}
              onValueChange={(value) => {
                setStartPeriodId(value);
                setPreview(null);
                setDraftAmendmentId(null);
              }}
            >
              <SelectTrigger id="kpi-start-period" className="w-full">
                <SelectValue placeholder="Select start period" />
              </SelectTrigger>
              <SelectContent>
                {sortedPeriods
                  .filter((period) => !isPeriodFinalized(period))
                  .map((period) => (
                    <SelectItem
                      key={period.plan_version_id}
                      value={period.plan_version_id}
                    >
                      {period.period_label || "Period"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-end-period">End period (optional)</Label>
            <Select
              value={endPeriodId || "__none__"}
              onValueChange={(value) => {
                setEndPeriodId(value === "__none__" ? "" : value);
                setPreview(null);
                setDraftAmendmentId(null);
              }}
            >
              <SelectTrigger id="kpi-end-period" className="w-full">
                <SelectValue placeholder="Through year end" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Through year end</SelectItem>
                {sortedPeriods.map((period) => (
                  <SelectItem
                    key={period.plan_version_id}
                    value={period.plan_version_id}
                  >
                    {period.period_label || "Period"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-owner">Owner</Label>
            <Select value={ownerUserId || undefined} onValueChange={setOwnerUserId}>
              <SelectTrigger id="kpi-owner" className="w-full">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-gov-structure">Department / sector</Label>
            <Select
              value={governmentStructureId || undefined}
              onValueChange={setGovernmentStructureId}
            >
              <SelectTrigger id="kpi-gov-structure" className="w-full">
                <SelectValue placeholder="Select structure" />
              </SelectTrigger>
              <SelectContent>
                {govStructures.map((structure) => (
                  <SelectItem
                    key={structure.government_structure_id}
                    value={structure.government_structure_id}
                  >
                    {structure.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {openPeriodsInRange.length > 0 && (
          <div className="space-y-2 rounded-md border border-amber-100 bg-white/70 p-3">
            <p className="text-xs font-medium text-amber-950">
              Period target allocation
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {openPeriodsInRange.map((period) => (
                <div key={period.plan_version_id} className="space-y-1">
                  <Label
                    htmlFor={`kpi-period-${period.plan_version_id}`}
                    className="text-xs"
                  >
                    {period.period_label || "Period"}
                  </Label>
                  <Input
                    id={`kpi-period-${period.plan_version_id}`}
                    type="number"
                    step="any"
                    min={0}
                    value={periodTargets[period.plan_version_id] ?? ""}
                    onChange={(event) => {
                      setPeriodTargets((prev) => ({
                        ...prev,
                        [period.plan_version_id]: event.target.value,
                      }));
                      setPreview(null);
                      setDraftAmendmentId(null);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {weightMode === "manual" && siblingNodes.length > 0 && (
          <div className="space-y-2 rounded-md border border-sky-100 bg-white/70 p-3">
            <p className="text-xs font-medium text-sky-950">
              Sibling KPI weights
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {siblingNodes.map((sibling) => (
                <div key={sibling.plan_node_id} className="space-y-1">
                  <Label
                    htmlFor={`kpi-sibling-${sibling.plan_node_id}`}
                    className="text-xs"
                  >
                    {sibling.title || "Untitled KPI"}
                  </Label>
                  <Input
                    id={`kpi-sibling-${sibling.plan_node_id}`}
                    type="number"
                    step="any"
                    min={0}
                    value={siblingWeights[sibling.plan_node_id] ?? ""}
                    onChange={(event) => {
                      setSiblingWeights((prev) => ({
                        ...prev,
                        [sibling.plan_node_id]: event.target.value,
                      }));
                      setPreview(null);
                      setDraftAmendmentId(null);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="kpi-description">KPI description (optional)</Label>
          <Textarea
            id="kpi-description"
            value={kpiDescription}
            onChange={(event) => setKpiDescription(event.target.value)}
            rows={2}
            placeholder="Optional KPI detail"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="kpi-request-description">
            Request description (optional)
          </Label>
          <Textarea
            id="kpi-request-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Optional detail for approvers"
          />
        </div>

        {preview && (
          <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-sm text-emerald-950">
            <p className="font-medium">Preview (not applied)</p>
            {preview.parent_title && (
              <p>
                Parent: <span className="font-medium">{preview.parent_title}</span>
              </p>
            )}
            {preview.new_kpi?.title && (
              <p>
                New KPI:{" "}
                <span className="font-medium">{preview.new_kpi.title}</span>
                {preview.new_kpi.annual_target != null
                  ? ` · Annual target ${preview.new_kpi.annual_target}`
                  : ""}
                {preview.new_kpi.weight != null
                  ? ` · Weight ${preview.new_kpi.weight}`
                  : ""}
              </p>
            )}
            {(preview.period_allocations?.length ?? 0) > 0 && (
              <ul className="space-y-1 text-xs">
                {preview.period_allocations
                  ?.filter((row) => row.in_window && !row.finalized)
                  .map((row, index) => (
                    <li key={`${row.period_label}-${index}`}>
                      {row.period_label || "Period"}: {row.target}
                    </li>
                  ))}
              </ul>
            )}
            {(preview.sibling_weight_changes?.length ?? 0) > 0 && (
              <ul className="space-y-1 text-xs">
                {(preview.sibling_weight_changes ?? []).map((row, index) => (
                  <li key={`${row.kpi_id}-${index}`}>
                    Sibling weight: {row.before_weight} → {row.after_weight}
                  </li>
                ))}
              </ul>
            )}
            {preview.summary?.rollup_note && (
              <p className="text-xs text-emerald-900/80">
                {preview.summary.rollup_note}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={handlePreview}
          >
            {isPreviewLoading ? "Previewing…" : "Preview"}
          </Button>
          <Button type="submit" disabled={isSaving} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            {isSaving ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </form>
    </PermissionGuard>
  );
}
