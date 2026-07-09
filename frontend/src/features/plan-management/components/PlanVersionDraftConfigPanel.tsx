"use client";

import { useEffect, useState } from "react";
import {
  CalendarRange,
  Loader2,
  Pencil,
  Plus,
  Save,
  Settings2,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdatePlanningConfigurationForVersionMutation } from "@/redux/api/planningConfigApi";
import {
  DEFAULT_PLANNING_CONFIGURATION,
  DEFAULT_TARGET_UNITS,
  slugifyTargetUnitId,
  type BreakdownMode,
  type PlanningConfiguration,
} from "@/redux/types/planningConfig";
import { formatDurationYears } from "@/utils/planDraftUtils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_DRAFT_PUBLISH_PERMISSIONS } from "@/utils/planPermissionUtils";

const BREAKDOWN_MODE_LABELS: Record<BreakdownMode, string> = {
  quarterly: "Quarterly",
  semi_annual: "Semi-annual",
  monthly: "Monthly",
  custom: "Custom",
};

function toFormState(config: PlanningConfiguration): PlanningConfiguration {
  const { meta: _meta, ...rest } = config;
  return rest;
}

interface PlanVersionDraftConfigPanelProps {
  masterVersionId: string;
  config: PlanningConfiguration;
  isLoading?: boolean;
  canEdit: boolean;
  readOnlyReason?: string | null;
}

export function PlanVersionDraftConfigPanel({
  masterVersionId,
  config,
  isLoading,
  canEdit,
  readOnlyReason,
}: PlanVersionDraftConfigPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PlanningConfiguration>(DEFAULT_PLANNING_CONFIGURATION);
  const [updateConfig, { isLoading: isSaving }] =
    useUpdatePlanningConfigurationForVersionMutation();

  const isDraftSnapshot = config.meta?.scope === "draft";

  useEffect(() => {
    setForm(toFormState(config));
  }, [config]);

  const setField = <K extends keyof PlanningConfiguration>(
    key: K,
    value: PlanningConfiguration[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateTargetUnit = (index: number, patch: Partial<(typeof form.target_units)[number]>) => {
    setForm((prev) => {
      const units = [...(prev.target_units ?? DEFAULT_TARGET_UNITS)];
      const current = { ...units[index], ...patch };
      if (patch.label !== undefined) {
        current.id = slugifyTargetUnitId(current.id || current.label);
      }
      units[index] = current;
      return { ...prev, target_units: units };
    });
  };

  const addTargetUnit = () => {
    setForm((prev) => ({
      ...prev,
      target_units: [
        ...(prev.target_units ?? DEFAULT_TARGET_UNITS),
        { id: `unit-${Date.now()}`, label: "", symbol: "" },
      ],
    }));
  };

  const removeTargetUnit = (index: number) => {
    setForm((prev) => ({
      ...prev,
      target_units: (prev.target_units ?? DEFAULT_TARGET_UNITS).filter((_, i) => i !== index),
    }));
  };

  const updateCustomPeriod = (index: number, label: string) => {
    setForm((prev) => {
      const periods = [...(prev.custom_periods ?? [])];
      periods[index] = { label };
      return { ...prev, custom_periods: periods };
    });
  };

  const addCustomPeriod = () => {
    setForm((prev) => ({
      ...prev,
      custom_periods: [
        ...(prev.custom_periods ?? []),
        { label: `Period ${(prev.custom_periods?.length ?? 0) + 1}` },
      ],
    }));
  };

  const removeCustomPeriod = (index: number) => {
    setForm((prev) => ({
      ...prev,
      custom_periods: (prev.custom_periods ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleBreakdownModeChange = (mode: BreakdownMode) => {
    setForm((prev) => ({
      ...prev,
      breakdown_mode: mode,
      custom_periods:
        mode === "custom" && (prev.custom_periods?.length ?? 0) === 0
          ? [{ label: "Period 1" }, { label: "Period 2" }]
          : prev.custom_periods,
    }));
  };

  const handleCancel = () => {
    setForm(toFormState(config));
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (form.min_duration_years > form.max_duration_years) {
      actionFeedback.error("Minimum duration cannot exceed maximum duration.");
      return;
    }

    const normalizedUnits = (form.target_units ?? [])
      .map((unit) => ({
        id: slugifyTargetUnitId(unit.id || unit.label),
        label: unit.label.trim(),
        symbol: (unit.symbol || unit.label).trim(),
      }))
      .filter((unit) => unit.label);

    if (normalizedUnits.length === 0) {
      actionFeedback.error("Add at least one target unit.");
      return;
    }

    if (form.breakdown_mode === "custom") {
      const customLabels = (form.custom_periods ?? [])
        .map((p) => p.label.trim())
        .filter(Boolean);
      if (customLabels.length === 0) {
        actionFeedback.error("Add at least one custom execution period.");
        return;
      }
    }

    try {
      await updateConfig({
        versionId: masterVersionId,
        data: {
          min_duration_years: form.min_duration_years,
          max_duration_years: form.max_duration_years,
          draft_entity_label_singular: form.draft_entity_label_singular.trim(),
          draft_entity_label_plural: form.draft_entity_label_plural.trim(),
          create_action_label: form.create_action_label.trim(),
          planning_period_label: form.planning_period_label.trim(),
          duration_label: form.duration_label.trim(),
          start_year_label: form.start_year_label.trim(),
          end_year_label: form.end_year_label.trim(),
          target_units: normalizedUnits,
          breakdown_mode: form.breakdown_mode,
          custom_periods:
            form.breakdown_mode === "custom"
              ? (form.custom_periods ?? [])
                  .map((p) => ({ label: p.label.trim() }))
                  .filter((p) => p.label)
              : [],
        },
      }).unwrap();
      actionFeedback.success("Draft planning configuration saved");
      setIsEditing(false);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to save configuration");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading configuration…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Planning configuration</h3>
            {isDraftSnapshot ? (
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Draft snapshot
              </Badge>
            ) : (
              <Badge variant="outline">Live template</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {isDraftSnapshot
              ? "This draft uses its own copy. Changes here do not affect global or sector settings."
              : "Inherited from live global/sector settings. Create or backfill a snapshot to edit per draft."}
          </p>
        </div>

        {canEdit && isDraftSnapshot && !isEditing ? (
          <PermissionGuard requireAll={PLAN_DRAFT_PUBLISH_PERMISSIONS}>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit configuration
            </Button>
          </PermissionGuard>
        ) : null}

        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <PermissionGuard requireAll={PLAN_DRAFT_PUBLISH_PERMISSIONS}>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </PermissionGuard>
          </div>
        ) : null}
      </div>

      {readOnlyReason ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {readOnlyReason}
        </div>
      ) : null}

      {!isEditing ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Duration range"
            value={`${config.min_duration_years}–${config.max_duration_years} yrs`}
            hint={formatDurationYears(config.max_duration_years)}
          />
          <StatTile
            label="Execution breakdown"
            value={BREAKDOWN_MODE_LABELS[config.breakdown_mode]}
            hint={
              config.breakdown_mode === "custom"
                ? `${config.custom_periods.length} custom periods`
                : "Default period labels"
            }
          />
          <StatTile
            label="Target units"
            value={String(config.target_units.length)}
            hint={config.target_units.map((u) => u.symbol || u.label).join(", ")}
          />
          <StatTile
            label="Draft labels"
            value={config.draft_entity_label_singular}
            hint={config.create_action_label}
          />
        </div>
      ) : null}

      {isEditing ? (
        <fieldset disabled={isSaving} className="grid gap-4 lg:grid-cols-2 border-0 p-0 m-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Duration limits</CardTitle>
              <CardDescription>Allowed planning span when editing this draft.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Minimum (years)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={form.min_duration_years}
                  onChange={(e) => setField("min_duration_years", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum (years)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={form.max_duration_years}
                  onChange={(e) => setField("max_duration_years", Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Labels</CardTitle>
              <CardDescription>How this draft appears in the UI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Singular entity</Label>
                <Input
                  value={form.draft_entity_label_singular}
                  onChange={(e) => setField("draft_entity_label_singular", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Plural entity</Label>
                <Input
                  value={form.draft_entity_label_plural}
                  onChange={(e) => setField("draft_entity_label_plural", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Create action</Label>
                <Input
                  value={form.create_action_label}
                  onChange={(e) => setField("create_action_label", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarRange className="h-4 w-4" />
                Execution breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={form.breakdown_mode} onValueChange={(v) => handleBreakdownModeChange(v as BreakdownMode)}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi_annual">Semi-annual</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {form.breakdown_mode === "custom" ? (
                <div className="space-y-2">
                  {(form.custom_periods ?? []).map((period, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={period.label}
                        onChange={(e) => updateCustomPeriod(index, e.target.value)}
                        placeholder={`Period ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 shrink-0"
                        disabled={(form.custom_periods ?? []).length <= 1}
                        onClick={() => removeCustomPeriod(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addCustomPeriod} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add period
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Target units</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(form.target_units ?? []).map((unit, index) => (
                <div key={`${unit.id}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={unit.label}
                      onChange={(e) => updateTargetUnit(index, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Symbol</Label>
                    <Input
                      value={unit.symbol}
                      onChange={(e) => updateTargetUnit(index, { symbol: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500"
                    disabled={(form.target_units ?? []).length <= 1}
                    onClick={() => removeTargetUnit(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTargetUnit} className="gap-2">
                <Plus className="h-4 w-4" />
                Add unit
              </Button>
            </CardContent>
          </Card>
        </fieldset>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Planning period label" value={config.planning_period_label} />
              <DetailItem label="Duration label" value={config.duration_label} />
              <DetailItem
                label="Field labels"
                value={`${config.start_year_label} / ${config.end_year_label}`}
              />
              {config.breakdown_mode === "custom" && config.custom_periods.length > 0 ? (
                <DetailItem
                  label="Custom periods"
                  value={config.custom_periods.map((p) => p.label).join(" · ")}
                />
              ) : null}
              <DetailItem
                label="Units"
                value={config.target_units.map((u) => `${u.label} (${u.symbol})`).join(" · ")}
                className="sm:col-span-2"
              />
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{hint}</p> : null}
    </div>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
