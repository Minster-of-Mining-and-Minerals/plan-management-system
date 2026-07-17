"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Target } from "lucide-react";
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
import { SearchableEntityPicker } from "@/components/ui/searchable-entity-picker";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_REQUEST_AMENDMENT_PERMISSIONS } from "@/utils/planPermissionUtils";
import {
  useCreateAnnualTargetRevisionMutation,
  useGetAnnualTargetRevisionReportingQuery,
  useGetPlanAmendmentTypesQuery,
  useLazyPreviewPlanAmendmentQuery,
  useSubmitPlanAmendmentMutation,
} from "@/redux/api/planApi";
import type {
  AnnualTargetRedistributionMode,
  AnnualTargetRevisionKpiReporting,
} from "@/redux/types/plan";
import { useGetPlanRuleForVersionQuery } from "@/redux/api/planRuleApi";
import { getAmendableTargetLabel } from "@/utils/planRuleUtils";

type AnnualTargetRevisionFormProps = {
  draftId: string;
  annualVersionId: string;
  onSubmitted?: () => void;
};

type PreviewPayload = {
  original_annual_target?: number;
  current_annual_target?: number;
  revised_annual_target?: number;
  recorded_achievement?: number;
  completed_periods?: Array<{
    period_label?: string | null;
    target?: number;
  }>;
  remaining_periods?: Array<{
    period_label?: string | null;
    before?: number;
    after?: number;
  }>;
  summary?: {
    remaining_target?: number;
    redistribution?: string;
    performance_note?: string;
  };
  percentage_change?: number | null;
};

function resolvePreviewData(raw: unknown): PreviewPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  if (root.revised_annual_target != null || root.original_annual_target != null) {
    return root as PreviewPayload;
  }
  const actions = root.actions;
  if (Array.isArray(actions) && actions[0]?.preview) {
    return actions[0].preview as PreviewPayload;
  }
  return null;
}

export function AnnualTargetRevisionForm({
  draftId,
  annualVersionId,
  onSubmitted,
}: AnnualTargetRevisionFormProps) {
  const [title, setTitle] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonLabel, setReasonLabel] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [kpiId, setKpiId] = useState("");
  const [revisedTarget, setRevisedTarget] = useState("");
  const [redistributionMode, setRedistributionMode] =
    useState<AnnualTargetRedistributionMode>("proportional");
  const [manualTargets, setManualTargets] = useState<Record<string, string>>(
    {}
  );
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [draftAmendmentId, setDraftAmendmentId] = useState<string | null>(null);

  const { data: typesData } = useGetPlanAmendmentTypesQuery();
  const { data: rule } = useGetPlanRuleForVersionQuery(annualVersionId, {
    skip: !annualVersionId,
  });
  const targetNodeLabel = getAmendableTargetLabel(rule);
  const { data: reporting, isLoading: isReportingLoading } =
    useGetAnnualTargetRevisionReportingQuery(
      { versionId: annualVersionId },
      { skip: !annualVersionId }
    );

  const [createRevision, { isLoading: isCreating }] =
    useCreateAnnualTargetRevisionMutation();
  const [submitAmendment, { isLoading: isSubmitting }] =
    useSubmitPlanAmendmentMutation();
  const [fetchPreview, { isFetching: isPreviewLoading }] =
    useLazyPreviewPlanAmendmentQuery();

  const reasons = typesData?.annual_target_revision_reasons ?? [];
  const kpis = reporting?.kpis ?? [];

  const selectedKpi: AnnualTargetRevisionKpiReporting | undefined = useMemo(
    () => kpis.find((row) => row.kpi_id === kpiId),
    [kpis, kpiId]
  );

  const openPeriods = useMemo(
    () => (selectedKpi?.periods ?? []).filter((period) => !period.finalized),
    [selectedKpi]
  );

  useEffect(() => {
    if (!selectedKpi) {
      setRevisedTarget("");
      setManualTargets({});
      return;
    }
    setRevisedTarget(String(selectedKpi.current_annual_target ?? ""));
    const next: Record<string, string> = {};
    for (const period of selectedKpi.periods ?? []) {
      if (period.finalized) continue;
      next[period.period_id] = String(period.current_target ?? "");
    }
    setManualTargets(next);
    setPreview(null);
    setDraftAmendmentId(null);
  }, [selectedKpi]);

  const isSaving = isCreating || isSubmitting || isPreviewLoading;

  const buildPayload = (submit: boolean) => {
    const numericRevised = Number(revisedTarget);
    const reason =
      reasonLabel ||
      reasons.find((row) => row.code === reasonCode)?.label ||
      "";

    return {
      draftId,
      title: title.trim(),
      reason: reason.trim(),
      reasonCode: reasonCode || undefined,
      description: description.trim() || undefined,
      effectiveMode: (effectiveDate
        ? "custom_date"
        : "immediate") as "immediate" | "custom_date",
      effectiveDate: effectiveDate || null,
      kpiId,
      revisedAnnualTarget: numericRevised,
      redistributionMode,
      periodAllocations:
        redistributionMode === "manual"
          ? openPeriods.map((period) => ({
              periodId: period.period_id,
              target: Number(manualTargets[period.period_id] ?? 0),
            }))
          : [],
      submit,
    };
  };

  const validateForm = (): string | null => {
    if (!title.trim()) return "Title is required";
    if (!reasonCode && !reasonLabel.trim()) return "Reason is required";
    if (!kpiId) return `Select a ${targetNodeLabel}`;
    const numericRevised = Number(revisedTarget);
    if (!Number.isFinite(numericRevised)) {
      return "Revised annual target must be a number";
    }
    if (numericRevised < 0) return "Annual target cannot be negative";
    if (redistributionMode === "manual") {
      for (const period of openPeriods) {
        const value = Number(manualTargets[period.period_id]);
        if (!Number.isFinite(value) || value < 0) {
          return `Enter a valid non-negative target for ${period.period_label || "open period"}`;
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
      const created = await createRevision(buildPayload(false)).unwrap();
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
        await createRevision(buildPayload(true)).unwrap();
      }
      actionFeedback.success("Annual target revision submitted for approval");
      setTitle("");
      setReasonCode("");
      setReasonLabel("");
      setEffectiveDate("");
      setKpiId("");
      setRevisedTarget("");
      setRedistributionMode("proportional");
      setManualTargets({});
      setDescription("");
      setPreview(null);
      setDraftAmendmentId(null);
      onSubmitted?.();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to submit annual target revision"
      );
    }
  };

  if (isReportingLoading) {
    return (
      <p className="text-xs text-muted-foreground">
        Loading {targetNodeLabel.toLowerCase()} targets…
      </p>
    );
  }

  if (!reporting?.process_started || kpis.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Annual target revision requires a started process and at least one annual{" "}
        {targetNodeLabel.toLowerCase()}.
      </p>
    );
  }

  return (
    <PermissionGuard requireAll={PLAN_REQUEST_AMENDMENT_PERMISSIONS}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="atr-title">Title</Label>
            <Input
              id="atr-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Mid-year budget reduction"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="atr-reason">Reason</Label>
            <Select
              value={reasonCode}
              onValueChange={(code) => {
                setReasonCode(code);
                const match = reasons.find((row) => row.code === code);
                setReasonLabel(match?.label ?? code);
              }}
            >
              <SelectTrigger id="atr-reason" className="w-full">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.code} value={reason.code}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="atr-effective-date">Effective date (optional)</Label>
            <Input
              id="atr-effective-date"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="atr-kpi">{targetNodeLabel}</Label>
            <SearchableEntityPicker
              id="atr-kpi"
              value={kpiId}
              onValueChange={setKpiId}
              placeholder={`Select ${targetNodeLabel}`}
              searchPlaceholder={`Search ${targetNodeLabel.toLowerCase()}…`}
              emptyMessage={`No ${targetNodeLabel.toLowerCase()} matches`}
              options={kpis.map((kpi) => ({
                value: kpi.kpi_id,
                label: kpi.kpi_title,
              }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="atr-original">Original target</Label>
            <Input
              id="atr-original"
              readOnly
              value={
                selectedKpi
                  ? String(selectedKpi.original_annual_target)
                  : ""
              }
              placeholder="—"
              className="bg-muted/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="atr-current">Current effective target</Label>
            <Input
              id="atr-current"
              readOnly
              value={
                selectedKpi ? String(selectedKpi.current_annual_target) : ""
              }
              placeholder="—"
              className="bg-muted/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="atr-revised">Revised target</Label>
            <Input
              id="atr-revised"
              type="number"
              step="any"
              value={revisedTarget}
              onChange={(event) => {
                setRevisedTarget(event.target.value);
                setPreview(null);
                setDraftAmendmentId(null);
              }}
              placeholder="e.g. 80"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="atr-mode">Redistribution mode</Label>
            <Select
              value={redistributionMode}
              onValueChange={(value) => {
                setRedistributionMode(value as AnnualTargetRedistributionMode);
                setPreview(null);
                setDraftAmendmentId(null);
              }}
            >
              <SelectTrigger id="atr-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proportional">
                  Auto proportional
                </SelectItem>
                <SelectItem value="equal">Auto equal</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {redistributionMode === "manual" && openPeriods.length > 0 && (
          <div className="space-y-2 rounded-md border border-amber-100 bg-white/70 p-3">
            <p className="text-xs font-medium text-amber-950">
              Remaining period allocation
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {openPeriods.map((period) => (
                <div key={period.period_id} className="space-y-1">
                  <Label
                    htmlFor={`atr-period-${period.period_id}`}
                    className="text-xs"
                  >
                    {period.period_label || "Period"}
                  </Label>
                  <Input
                    id={`atr-period-${period.period_id}`}
                    type="number"
                    step="any"
                    min={0}
                    value={manualTargets[period.period_id] ?? ""}
                    onChange={(event) => {
                      setManualTargets((prev) => ({
                        ...prev,
                        [period.period_id]: event.target.value,
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
          <Label htmlFor="atr-description">Description</Label>
          <Textarea
            id="atr-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Optional detail for approvers"
          />
        </div>

        {preview && (
          <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-sm text-emerald-950">
            <p className="font-medium">Preview (not applied)</p>
            <p>
              Annual target{" "}
              <span className="font-medium">
                {preview.original_annual_target ??
                  preview.current_annual_target}
              </span>{" "}
              →{" "}
              <span className="font-medium">
                {preview.revised_annual_target}
              </span>
              {preview.percentage_change != null
                ? ` (${preview.percentage_change}%)`
                : ""}
            </p>
            {(preview.completed_periods?.length ?? 0) > 0 && (
              <p className="text-xs">
                Completed periods unchanged:{" "}
                {preview.completed_periods
                  ?.map(
                    (period) =>
                      `${period.period_label || "Period"} (${period.target})`
                  )
                  .join(", ")}
              </p>
            )}
            {(preview.remaining_periods?.length ?? 0) > 0 && (
              <ul className="space-y-1 text-xs">
                {preview.remaining_periods?.map((period, index) => (
                  <li key={`${period.period_label}-${index}`}>
                    {period.period_label || "Period"}: {period.before} →{" "}
                    {period.after}
                  </li>
                ))}
              </ul>
            )}
            {preview.summary?.remaining_target != null && (
              <p className="text-xs">
                Remaining target: {preview.summary.remaining_target} · Mode:{" "}
                {preview.summary.redistribution}
              </p>
            )}
            {preview.summary?.performance_note && (
              <p className="text-xs text-emerald-900/80">
                {preview.summary.performance_note}
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
            <Target className="h-4 w-4" />
            {isSaving ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </form>
    </PermissionGuard>
  );
}
