"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarClock } from "lucide-react";
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
import { PLAN_REQUEST_EXECUTION_REOPENING_PERMISSIONS } from "@/utils/planPermissionUtils";
import {
  useCreateExecutionWindowReopeningMutation,
  useGetExecutionWindowReopeningReportingQuery,
  useGetPlanAmendmentTypesQuery,
  useLazyPreviewPlanAmendmentQuery,
  useSubmitPlanAmendmentMutation,
} from "@/redux/api/planApi";
import { cn } from "@/lib/utils";

type ExecutionWindowReopeningFormProps = {
  draftId: string;
  annualVersionId: string;
  onSubmitted?: () => void;
};

type PreviewPayload = {
  reopen_start?: string;
  reopen_end?: string;
  duration_days?: number;
  periods?: Array<{
    period_id?: string;
    period_label?: string | null;
    execution_status?: string | null;
    unchanged_execution_status?: boolean;
    can_edit_actuals_during_window?: boolean;
  }>;
  summary?: {
    note?: string;
    period_count?: number;
  };
};

function resolvePreviewData(raw: unknown): PreviewPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  if (root.reopen_start != null || root.periods != null) {
    return root as PreviewPayload;
  }
  const actions = root.actions;
  if (Array.isArray(actions) && actions[0]?.preview) {
    return actions[0].preview as PreviewPayload;
  }
  const preview = root.preview;
  if (preview && typeof preview === "object") {
    return preview as PreviewPayload;
  }
  return null;
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export function ExecutionWindowReopeningForm({
  draftId,
  annualVersionId,
  onSubmitted,
}: ExecutionWindowReopeningFormProps) {
  const [title, setTitle] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonLabel, setReasonLabel] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [reopenStart, setReopenStart] = useState("");
  const [reopenEnd, setReopenEnd] = useState("");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [draftAmendmentId, setDraftAmendmentId] = useState<string | null>(null);

  const { data: typesData } = useGetPlanAmendmentTypesQuery();
  const { data: reporting, isLoading: isReportingLoading } =
    useGetExecutionWindowReopeningReportingQuery(
      { versionId: annualVersionId },
      { skip: !annualVersionId }
    );

  const [createReopening, { isLoading: isCreating }] =
    useCreateExecutionWindowReopeningMutation();
  const [submitAmendment, { isLoading: isSubmitting }] =
    useSubmitPlanAmendmentMutation();
  const [fetchPreview, { isFetching: isPreviewLoading }] =
    useLazyPreviewPlanAmendmentQuery();

  const reasons = typesData?.execution_window_reopening_reasons ?? [];

  const closedPeriods = useMemo(
    () => (reporting?.periods ?? []).filter((period) => period.finalized),
    [reporting]
  );

  const isSaving = isCreating || isSubmitting || isPreviewLoading;

  const togglePeriod = (periodId: string) => {
    setSelectedPeriodIds((prev) =>
      prev.includes(periodId)
        ? prev.filter((id) => id !== periodId)
        : [...prev, periodId]
    );
    setPreview(null);
    setDraftAmendmentId(null);
  };

  const buildPayload = (submit: boolean) => {
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
      annualVersionId,
      periodVersionIds: selectedPeriodIds,
      reopenStart,
      reopenEnd,
      submit,
    };
  };

  const validateForm = (): string | null => {
    if (!title.trim()) return "Title is required";
    if (!reasonCode && !reasonLabel.trim()) return "Reason is required";
    if (selectedPeriodIds.length === 0) {
      return "Select at least one closed execution period";
    }
    if (!reopenStart) return "Reopen start date is required";
    if (!reopenEnd) return "Reopen end date is required";
    const start = new Date(reopenStart);
    const end = new Date(reopenEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "Enter valid reopen window dates";
    }
    if (end.getTime() < start.getTime()) {
      return "Reopen end must be on or after reopen start";
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
      const created = await createReopening(buildPayload(false)).unwrap();
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
        await createReopening(buildPayload(true)).unwrap();
      }
      actionFeedback.success(
        "Execution window reopening submitted for approval"
      );
      setTitle("");
      setReasonCode("");
      setReasonLabel("");
      setDescription("");
      setSelectedPeriodIds([]);
      setReopenStart("");
      setReopenEnd("");
      setPreview(null);
      setDraftAmendmentId(null);
      onSubmitted?.();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to submit execution window reopening"
      );
    }
  };

  if (isReportingLoading) {
    return (
      <p className="text-xs text-muted-foreground">
        Loading execution periods…
      </p>
    );
  }

  if (!reporting?.process_started) {
    return (
      <p className="text-xs text-muted-foreground">
        Execution window reopening requires a started process.
      </p>
    );
  }

  if (closedPeriods.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No closed execution periods are available to reopen. Complete at least
        one period before requesting a reopening window.
      </p>
    );
  }

  return (
    <PermissionGuard requireAll={PLAN_REQUEST_EXECUTION_REOPENING_PERMISSIONS}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ewr-title">Title</Label>
            <Input
              id="ewr-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Q1 actuals correction window"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ewr-reason">Reason</Label>
            <Select
              value={reasonCode}
              onValueChange={(code) => {
                setReasonCode(code);
                const match = reasons.find((row) => row.code === code);
                setReasonLabel(match?.label ?? code);
              }}
            >
              <SelectTrigger id="ewr-reason" className="w-full">
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
            <Label htmlFor="ewr-reopen-start">Reopen start</Label>
            <Input
              id="ewr-reopen-start"
              type="date"
              value={reopenStart}
              onChange={(event) => {
                setReopenStart(event.target.value);
                setPreview(null);
                setDraftAmendmentId(null);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ewr-reopen-end">Reopen end</Label>
            <Input
              id="ewr-reopen-end"
              type="date"
              value={reopenEnd}
              onChange={(event) => {
                setReopenEnd(event.target.value);
                setPreview(null);
                setDraftAmendmentId(null);
              }}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-amber-100 bg-white/70 p-3">
          <p className="text-xs font-medium text-amber-950">
            Closed periods to reopen
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {closedPeriods.map((period) => {
              const checked = selectedPeriodIds.includes(period.period_id);
              const hasActiveOverride = Boolean(period.active_override);
              return (
                <label
                  key={period.period_id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm",
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    onChange={() => togglePeriod(period.period_id)}
                  />
                  <span>
                    <span className="font-medium">
                      {period.period_label || "Period"}
                    </span>
                    {period.execution_status ? (
                      <span className="block text-xs text-muted-foreground">
                        Status: {period.execution_status}
                      </span>
                    ) : null}
                    {hasActiveOverride ? (
                      <span className="block text-xs text-amber-700">
                        Active override until{" "}
                        {formatDateLabel(
                          period.active_override?.reopen_end
                        )}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ewr-description">Description</Label>
          <Textarea
            id="ewr-description"
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
              Window:{" "}
              <span className="font-medium">
                {formatDateLabel(preview.reopen_start)}
              </span>{" "}
              →{" "}
              <span className="font-medium">
                {formatDateLabel(preview.reopen_end)}
              </span>
              {preview.duration_days != null
                ? ` (${preview.duration_days} day(s))`
                : ""}
            </p>
            {(preview.periods?.length ?? 0) > 0 && (
              <ul className="space-y-1 text-xs">
                {preview.periods?.map((period, index) => (
                  <li key={`${period.period_id}-${index}`}>
                    {period.period_label || "Period"} → Temporarily Reopened
                    {period.execution_status
                      ? ` (status remains ${period.execution_status})`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
            {preview.summary?.note ? (
              <p className="text-xs text-emerald-900/80">{preview.summary.note}</p>
            ) : null}
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
            <CalendarClock className="h-4 w-4" />
            {isSaving ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </form>
    </PermissionGuard>
  );
}
