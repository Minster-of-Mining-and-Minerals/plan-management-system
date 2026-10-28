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
import { useUpdateRegionalPlanningConfigForVersionMutation } from "@/redux/api/regionalPlanApi";
import {
  DEFAULT_TARGET_UNITS,
  slugifyTargetUnitId,
  type BreakdownMode,
  type CustomPeriod,
  type TargetUnit,
} from "@/redux/types/planningConfig";

const BREAKDOWN_MODE_LABELS: Record<BreakdownMode, string> = {
  quarterly: "Quarterly",
  semi_annual: "Semi-annual",
  monthly: "Monthly",
  custom: "Custom",
};

interface RegionalDraftConfigFormState {
  min_duration_years: number;
  max_duration_years: number;
  draft_entity_label_singular: string;
  draft_entity_label_plural: string;
  create_action_label: string;
  planning_period_label: string;
  duration_label: string;
  start_year_label: string;
  end_year_label: string;
  target_units: TargetUnit[];
  breakdown_mode: BreakdownMode;
  custom_periods: CustomPeriod[];
}

const DEFAULT_FORM_STATE: RegionalDraftConfigFormState = {
  min_duration_years: 1,
  max_duration_years: 10,
  draft_entity_label_singular: "Regional Plan Draft",
  draft_entity_label_plural: "Regional Plan Drafts",
  create_action_label: "Create Regional Plan Draft",
  planning_period_label: "Planning Period",
  duration_label: "Duration",
  start_year_label: "Start Date",
  end_year_label: "End Date",
  target_units: DEFAULT_TARGET_UNITS,
  breakdown_mode: "quarterly",
  custom_periods: [],
};

function normalizeTargetUnits(units: unknown): TargetUnit[] {
  if (!Array.isArray(units) || units.length === 0) {
    return DEFAULT_TARGET_UNITS;
  }
  return units.map((u, i) => {
    if (typeof u === "string") {
      const slug = slugifyTargetUnitId(u);
      return { id: slug || `unit-${i}`, label: u, symbol: u };
    }
    const label = String(u?.label || u?.id || "").trim();
    const id = slugifyTargetUnitId(u?.id || label);
    return {
      id: id || `unit-${i}`,
      label: label || `Unit ${i + 1}`,
      symbol: String(u?.symbol || label).trim(),
    };
  });
}

function normalizeCustomPeriods(periods: unknown): CustomPeriod[] {
  if (!Array.isArray(periods) || periods.length === 0) {
    return [];
  }
  return periods.map((p, i) => {
    if (typeof p === "string") {
      return { label: p };
    }
    return { label: String(p?.label || `Period ${i + 1}`).trim() };
  });
}

interface RegionalPlanVersionDraftConfigPanelProps {
  versionId: string;
  regionId: string;
  config: any;
  isLoading?: boolean;
  canEdit: boolean;
  readOnlyReason?: string | null;
  onSaved?: () => void;
}

export function RegionalPlanVersionDraftConfigPanel({
  versionId,
  regionId,
  config,
  isLoading,
  canEdit,
  readOnlyReason,
  onSaved,
}: RegionalPlanVersionDraftConfigPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<RegionalDraftConfigFormState>(DEFAULT_FORM_STATE);
  const [updateConfig, { isLoading: isSaving }] =
    useUpdateRegionalPlanningConfigForVersionMutation();

  const isDraftSnapshot = Boolean(config?.owned_by_plan_version_id || config?.meta?.scope === "draft");

  useEffect(() => {
    if (config) {
      setForm({
        min_duration_years: config.min_duration_years || 1,
        max_duration_years: config.max_duration_years || 10,
        draft_entity_label_singular: config.draft_entity_label_singular || "Regional Plan Draft",
        draft_entity_label_plural: config.draft_entity_label_plural || "Regional Plan Drafts",
        create_action_label: config.create_action_label || "Create Regional Plan Draft",
        planning_period_label: config.planning_period_label || "Planning Period",
        duration_label: config.duration_label || "Duration",
        start_year_label: config.start_year_label || "Start Date",
        end_year_label: config.end_year_label || "End Date",
        target_units: normalizeTargetUnits(config.target_units),
        breakdown_mode: (config.breakdown_mode as BreakdownMode) || "quarterly",
        custom_periods: normalizeCustomPeriods(config.custom_periods),
      });
    }
  }, [config]);

  const setField = <K extends keyof RegionalDraftConfigFormState>(
    key: K,
    value: RegionalDraftConfigFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateTargetUnit = (index: number, patch: Partial<TargetUnit>) => {
    setForm((prev) => {
      const units = [...prev.target_units];
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
        ...prev.target_units,
        { id: `unit-${Date.now()}`, label: "", symbol: "" },
      ],
    }));
  };

  const removeTargetUnit = (index: number) => {
    setForm((prev) => ({
      ...prev,
      target_units: prev.target_units.filter((_, i) => i !== index),
    }));
  };

  const updateCustomPeriod = (index: number, label: string) => {
    setForm((prev) => {
      const periods = [...prev.custom_periods];
      periods[index] = { label };
      return { ...prev, custom_periods: periods };
    });
  };

  const addCustomPeriod = () => {
    setForm((prev) => ({
      ...prev,
      custom_periods: [
        ...prev.custom_periods,
        { label: `Period ${prev.custom_periods.length + 1}` },
      ],
    }));
  };

  const removeCustomPeriod = (index: number) => {
    setForm((prev) => ({
      ...prev,
      custom_periods: prev.custom_periods.filter((_, i) => i !== index),
    }));
  };

  const handleBreakdownModeChange = (mode: BreakdownMode) => {
    setForm((prev) => {
      const next: RegionalDraftConfigFormState = { ...prev, breakdown_mode: mode };
      if (mode === "custom" && (!prev.custom_periods || prev.custom_periods.length === 0)) {
        next.custom_periods = [
          { label: "Period 1" },
          { label: "Period 2" },
          { label: "Period 3" },
        ];
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig({
        versionId,
        region_id: regionId,
        data: {
          min_duration_years: Number(form.min_duration_years) || 1,
          max_duration_years: Number(form.max_duration_years) || 10,
          draft_entity_label_singular: form.draft_entity_label_singular.trim(),
          draft_entity_label_plural: form.draft_entity_label_plural.trim(),
          create_action_label: form.create_action_label.trim(),
          planning_period_label: form.planning_period_label.trim(),
          duration_label: form.duration_label.trim(),
          start_year_label: form.start_year_label.trim(),
          end_year_label: form.end_year_label.trim(),
          target_units: form.target_units,
          breakdown_mode: form.breakdown_mode,
          custom_periods: form.breakdown_mode === "custom" ? form.custom_periods : [],
        },
      }).unwrap();

      actionFeedback.success("Draft regional planning configuration saved successfully.");
      setIsEditing(false);
      onSaved?.();
    } catch (err: any) {
      actionFeedback.error(
        err?.data?.message || err?.message || "Failed to update regional planning configuration"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading regional planning configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              Regional Draft Planning Configuration
            </h3>
            {isDraftSnapshot ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <Shield className="h-3 w-3 text-primary" />
                Version-Isolated Snapshot
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Regional Master Config
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Duration boundaries, terminology labels, target measurement units, and annual breakdown settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && !isEditing && (
            <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 shadow-2xs">
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Configuration</span>
            </Button>
          )}

          {isEditing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (config) {
                  setForm({
                    min_duration_years: config.min_duration_years || 1,
                    max_duration_years: config.max_duration_years || 10,
                    draft_entity_label_singular: config.draft_entity_label_singular || "Regional Plan Draft",
                    draft_entity_label_plural: config.draft_entity_label_plural || "Regional Plan Drafts",
                    create_action_label: config.create_action_label || "Create Regional Plan Draft",
                    planning_period_label: config.planning_period_label || "Planning Period",
                    duration_label: config.duration_label || "Duration",
                    start_year_label: config.start_year_label || "Start Date",
                    end_year_label: config.end_year_label || "End Date",
                    target_units: normalizeTargetUnits(config.target_units),
                    breakdown_mode: (config.breakdown_mode as BreakdownMode) || "quarterly",
                    custom_periods: normalizeCustomPeriods(config.custom_periods),
                  });
                }
                setIsEditing(false);
              }}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </Button>
          )}
        </div>
      </div>

      {readOnlyReason && !canEdit && (
        <div className="rounded-xl border border-muted bg-muted/20 p-3 text-xs text-muted-foreground">
          {readOnlyReason}
        </div>
      )}

      {!isEditing ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border bg-card shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Duration & Horizon</CardTitle>
                <CardDescription className="text-xs">
                  Allowed timeframe bounds for regional strategic cycles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Minimum Horizon</span>
                  <span className="font-semibold text-foreground">
                    {form.min_duration_years} {form.min_duration_years === 1 ? "year" : "years"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Maximum Horizon</span>
                  <span className="font-semibold text-foreground">
                    {form.max_duration_years} {form.max_duration_years === 1 ? "year" : "years"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Default Breakdown Mode</span>
                  <Badge variant="outline" className="capitalize text-xs font-semibold">
                    {BREAKDOWN_MODE_LABELS[form.breakdown_mode]}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-card shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Target Units & Measures</CardTitle>
                <CardDescription className="text-xs">
                  Supported units for milestone indicator targets
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {form.target_units.map((unit) => (
                    <Badge key={unit.id} variant="secondary" className="text-xs px-2.5 py-1 gap-1">
                      <span>{unit.label}</span>
                      {unit.symbol && <span className="text-muted-foreground font-mono">({unit.symbol})</span>}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {form.breakdown_mode === "custom" && form.custom_periods.length > 0 && (
            <Card className="border bg-card shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Custom Annual Reporting Periods</CardTitle>
                <CardDescription className="text-xs">
                  User-configured period partitions for every annual cycle
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {form.custom_periods.map((p, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs px-3 py-1 font-semibold">
                      {p.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border bg-card shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Field & Terminology Labels</CardTitle>
              <CardDescription className="text-xs">
                Custom labels used in the regional user interface
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-0 text-xs">
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Entity Singular</span>
                <span className="font-semibold text-foreground">{form.draft_entity_label_singular}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Entity Plural</span>
                <span className="font-semibold text-foreground">{form.draft_entity_label_plural}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Planning Period</span>
                <span className="font-semibold text-foreground">{form.planning_period_label}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Duration Label</span>
                <span className="font-semibold text-foreground">{form.duration_label}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Start Year Label</span>
                <span className="font-semibold text-foreground">{form.start_year_label}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">End Year Label</span>
                <span className="font-semibold text-foreground">{form.end_year_label}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Horizon Duration</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0">
              <div className="space-y-1.5">
                <Label className="text-xs">Minimum Duration (Years)</Label>
                <Input
                  type="number"
                  min="1"
                  max={form.max_duration_years}
                  value={form.min_duration_years}
                  onChange={(e) => setField("min_duration_years", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Maximum Duration (Years)</Label>
                <Input
                  type="number"
                  min={form.min_duration_years}
                  max="25"
                  value={form.max_duration_years}
                  onChange={(e) => setField("max_duration_years", Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Annual Breakdown Frequency</CardTitle>
              <CardDescription className="text-xs">
                Choose how annual plans are partitioned into execution reporting windows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(["quarterly", "semi_annual", "monthly", "custom"] as BreakdownMode[]).map((mode) => (
                  <label
                    key={mode}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.breakdown_mode === mode
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="breakdown_mode"
                      value={mode}
                      checked={form.breakdown_mode === mode}
                      onChange={() => handleBreakdownModeChange(mode)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-semibold capitalize text-foreground">
                        {BREAKDOWN_MODE_LABELS[mode]}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {mode === "quarterly" && "4 Quarters per Year"}
                        {mode === "semi_annual" && "2 Halves per Year"}
                        {mode === "monthly" && "12 Months per Year"}
                        {mode === "custom" && "User-defined periods"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {form.breakdown_mode === "custom" && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-semibold text-foreground">Custom Period Labels</h5>
                      <p className="text-[11px] text-muted-foreground">
                        Define names for your reporting periods (e.g. Trimester 1, Trimester 2, Trimester 3)
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addCustomPeriod}
                      className="gap-1 h-7 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Period</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {form.custom_periods.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 p-2 rounded-lg border bg-card">
                        <span className="text-[11px] font-mono text-muted-foreground font-bold w-6">
                          #{idx + 1}
                        </span>
                        <Input
                          value={p.label}
                          onChange={(e) => updateCustomPeriod(idx, e.target.value)}
                          placeholder="Period label"
                          className="h-7 text-xs"
                        />
                        {form.custom_periods.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeCustomPeriod(idx)}
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
            </CardContent>
          </Card>

          <Card className="border shadow-2xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Target Units</CardTitle>
                <CardDescription className="text-xs">
                  Configured measurement units selectable on milestone nodes
                </CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addTargetUnit} className="gap-1 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" />
                <span>Add Unit</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {form.target_units.map((unit, index) => (
                  <div key={unit.id || index} className="p-3 rounded-xl border bg-card shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{unit.id}</span>
                      {form.target_units.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTargetUnit(index)}
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Unit Label (e.g. Metric Tons)"
                      value={unit.label}
                      onChange={(e) => updateTargetUnit(index, { label: e.target.value })}
                      className="h-7 text-xs"
                    />
                    <Input
                      placeholder="Symbol (e.g. t, $, %)"
                      value={unit.symbol || ""}
                      onChange={(e) => updateTargetUnit(index, { symbol: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Terminology & Labels</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-0">
              <div className="space-y-1">
                <Label className="text-xs">Entity Singular</Label>
                <Input
                  value={form.draft_entity_label_singular}
                  onChange={(e) => setField("draft_entity_label_singular", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Entity Plural</Label>
                <Input
                  value={form.draft_entity_label_plural}
                  onChange={(e) => setField("draft_entity_label_plural", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Planning Period</Label>
                <Input
                  value={form.planning_period_label}
                  onChange={(e) => setField("planning_period_label", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration Label</Label>
                <Input
                  value={form.duration_label}
                  onChange={(e) => setField("duration_label", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start Year Label</Label>
                <Input
                  value={form.start_year_label}
                  onChange={(e) => setField("start_year_label", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Year Label</Label>
                <Input
                  value={form.end_year_label}
                  onChange={(e) => setField("end_year_label", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (config) {
                  setForm({
                    min_duration_years: config.min_duration_years || 1,
                    max_duration_years: config.max_duration_years || 10,
                    draft_entity_label_singular: config.draft_entity_label_singular || "Regional Plan Draft",
                    draft_entity_label_plural: config.draft_entity_label_plural || "Regional Plan Drafts",
                    create_action_label: config.create_action_label || "Create Regional Plan Draft",
                    planning_period_label: config.planning_period_label || "Planning Period",
                    duration_label: config.duration_label || "Duration",
                    start_year_label: config.start_year_label || "Start Date",
                    end_year_label: config.end_year_label || "End Date",
                    target_units: normalizeTargetUnits(config.target_units),
                    breakdown_mode: (config.breakdown_mode as BreakdownMode) || "quarterly",
                    custom_periods: normalizeCustomPeriods(config.custom_periods),
                  });
                }
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-2 shadow-xs">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Configuration</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
