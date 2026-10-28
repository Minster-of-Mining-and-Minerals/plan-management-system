"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarRange,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetRegionalPlanConfigQuery,
  useUpdateRegionalPlanConfigMutation,
  useRestoreDefaultRegionalPlanConfigMutation,
} from "@/redux/api/regionalPlanApi";
import {
  DEFAULT_TARGET_UNITS,
  slugifyTargetUnitId,
  type BreakdownMode,
  type CustomPeriod,
  type TargetUnit,
} from "@/redux/types/planningConfig";
import { formatDurationYears } from "@/utils/planDraftUtils";

interface RegionalConfigFormState {
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

const DEFAULT_REGIONAL_FORM: RegionalConfigFormState = {
  min_duration_years: 1,
  max_duration_years: 10,
  draft_entity_label_singular: "Plan Draft",
  draft_entity_label_plural: "Plan Drafts",
  create_action_label: "Create Plan Draft",
  planning_period_label: "Planning Period",
  duration_label: "Duration",
  start_year_label: "Start Date",
  end_year_label: "End Date",
  target_units: DEFAULT_TARGET_UNITS,
  breakdown_mode: "quarterly",
  custom_periods: [],
};

function normalizeIncomingUnits(units: unknown): TargetUnit[] {
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

function normalizeIncomingCustomPeriods(periods: unknown): CustomPeriod[] {
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

export function RegionalPlanningConfigView() {
  const params = useParams<{ id: string }>();
  const regionId = params?.id;
  const { can } = usePermissions();

  const {
    data: config,
    isLoading,
    isFetching,
    refetch,
  } = useGetRegionalPlanConfigQuery({ region_id: regionId }, { skip: !regionId });

  const [updateConfig, { isLoading: isSaving }] = useUpdateRegionalPlanConfigMutation();
  const [restoreDefaults, { isLoading: isRestoring }] =
    useRestoreDefaultRegionalPlanConfigMutation();

  const canManage =
    can("REGIONAL_PLANNING_CONFIG:UPDATE") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONS:MANAGE");

  const [form, setForm] = useState<RegionalConfigFormState>(DEFAULT_REGIONAL_FORM);

  useEffect(() => {
    if (config) {
      setForm({
        min_duration_years: config.min_duration_years || 1,
        max_duration_years: config.max_duration_years || 10,
        draft_entity_label_singular: config.draft_entity_label_singular || "Plan Draft",
        draft_entity_label_plural: config.draft_entity_label_plural || "Plan Drafts",
        create_action_label: config.create_action_label || "Create Plan Draft",
        planning_period_label: config.planning_period_label || "Planning Period",
        duration_label: config.duration_label || "Duration",
        start_year_label: config.start_year_label || "Start Date",
        end_year_label: config.end_year_label || "End Date",
        target_units: normalizeIncomingUnits(config.target_units),
        breakdown_mode: (config.breakdown_mode as BreakdownMode) || "quarterly",
        custom_periods: normalizeIncomingCustomPeriods(config.custom_periods),
      });
    }
  }, [config]);

  const setField = <K extends keyof RegionalConfigFormState>(
    key: K,
    value: RegionalConfigFormState[K]
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

  const handleBreakdownModeChange = (mode: BreakdownMode) => {
    setForm((prev) => ({
      ...prev,
      breakdown_mode: mode,
      custom_periods:
        mode === "custom" && prev.custom_periods.length === 0
          ? [{ label: "Period 1" }, { label: "Period 2" }]
          : prev.custom_periods,
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

  const handleRestoreDefaults = async () => {
    if (!regionId) return;
    if (
      !(await actionFeedback.confirm(
        "Restore regional planning configuration to factory defaults? Custom labels, units, and custom divisions will be reset.",
        { destructive: true }
      ))
    ) {
      return;
    }

    try {
      await restoreDefaults({ region_id: regionId }).unwrap();
      actionFeedback.success("Default planning configuration restored");
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to restore defaults");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionId) return;

    if (form.min_duration_years > form.max_duration_years) {
      actionFeedback.error("Minimum duration cannot exceed maximum duration.");
      return;
    }

    const normalizedUnits = form.target_units
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

    const unitIds = new Set<string>();
    for (const unit of normalizedUnits) {
      if (unitIds.has(unit.id)) {
        actionFeedback.error(`Duplicate target unit: ${unit.label}`);
        return;
      }
      unitIds.add(unit.id);
    }

    if (form.breakdown_mode === "custom") {
      const customLabels = form.custom_periods
        .map((p) => p.label.trim())
        .filter(Boolean);
      if (customLabels.length === 0) {
        actionFeedback.error("Add at least one custom execution period.");
        return;
      }
      const unique = new Set(customLabels.map((l) => l.toLowerCase()));
      if (unique.size !== customLabels.length) {
        actionFeedback.error("Custom period labels must be unique.");
        return;
      }
    }

    try {
      await updateConfig({
        region_id: regionId,
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
              ? form.custom_periods
                  .map((p) => ({ label: p.label.trim() }))
                  .filter((p) => p.label)
              : [],
        },
      }).unwrap();

      actionFeedback.success("Planning configuration saved successfully");
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to update configuration");
    }
  };

  if (isLoading) return <Loading01 />;

  const formDisabled = !canManage || isSaving || isRestoring;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Settings2 className="h-4 w-4" />
            <span>Cycle & Schema Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Planning Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure regional planning duration limits, execution subdivision modes, target units, and draft naming conventions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreDefaults}
              disabled={formDisabled}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className={`h-4 w-4 ${isRestoring ? "animate-spin" : ""}`} />
              <span>Restore Defaults</span>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {canManage && (
            <Button size="sm" onClick={handleSave} disabled={formDisabled} className="gap-2 shadow-xs">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Configuration Grid */}
      <fieldset disabled={formDisabled} className="min-w-0 border-0 p-0 m-0">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card 1: Duration Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Duration Limits</CardTitle>
              <CardDescription>
                Allowed planning durations when creating regional drafts. Users can select any whole number
                between the minimum and maximum.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="min_duration_years">Minimum Planning Duration (years)</Label>
                <Input
                  id="min_duration_years"
                  type="number"
                  min={1}
                  max={50}
                  value={form.min_duration_years}
                  onChange={(e) => setField("min_duration_years", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Example: {formatDurationYears(form.min_duration_years)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_duration_years">Maximum Planning Duration (years)</Label>
                <Input
                  id="max_duration_years"
                  type="number"
                  min={1}
                  max={50}
                  value={form.max_duration_years}
                  onChange={(e) => setField("max_duration_years", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Example: {formatDurationYears(form.max_duration_years)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Naming Conventions */}
          <Card>
            <CardHeader>
              <CardTitle>Naming Conventions</CardTitle>
              <CardDescription>
                Customize how regional draft documents are labeled in buttons, headers, and listings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="draft_entity_label_singular">Draft Entity (Singular)</Label>
                <Input
                  id="draft_entity_label_singular"
                  value={form.draft_entity_label_singular}
                  onChange={(e) => setField("draft_entity_label_singular", e.target.value)}
                  placeholder="Plan Draft"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="draft_entity_label_plural">Draft Entity (Plural)</Label>
                <Input
                  id="draft_entity_label_plural"
                  value={form.draft_entity_label_plural}
                  onChange={(e) => setField("draft_entity_label_plural", e.target.value)}
                  placeholder="Plan Drafts"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_action_label">Create Action Label</Label>
                <Input
                  id="create_action_label"
                  value={form.create_action_label}
                  onChange={(e) => setField("create_action_label", e.target.value)}
                  placeholder="Create Plan Draft"
                />
                <p className="text-xs text-muted-foreground">
                  Preview: {form.create_action_label || "Create Plan Draft"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Target Units */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Target Units</CardTitle>
              <CardDescription>
                Units available when setting numeric targets on regional KPIs and activities (e.g. person,
                km, birr, ton, megawatt).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.target_units.map((unit, index) => (
                <div
                  key={`${unit.id}-${index}`}
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`unit-label-${index}`}>Unit Label</Label>
                    <Input
                      id={`unit-label-${index}`}
                      value={unit.label}
                      onChange={(e) => updateTargetUnit(index, { label: e.target.value })}
                      placeholder="e.g. Kilogram, Metric Ton"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`unit-symbol-${index}`}>Display Symbol</Label>
                    <Input
                      id={`unit-symbol-${index}`}
                      value={unit.symbol}
                      onChange={(e) => updateTargetUnit(index, { symbol: e.target.value })}
                      placeholder="e.g. kg, t, ETB"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeTargetUnit(index)}
                    disabled={form.target_units.length <= 1}
                    title="Remove unit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addTargetUnit} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Unit
              </Button>
            </CardContent>
          </Card>

          {/* Card 4: Annual Version Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                Annual Version Breakdown
              </CardTitle>
              <CardDescription>
                Configure how active regional annual plans are divided into execution reporting periods.
                Quarterly is the default suggestion, but you can select semi-annual, monthly (12 months),
                or define custom periods.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    {
                      value: "quarterly" as BreakdownMode,
                      label: "Quarterly",
                      preview: "Q1, Q2, Q3, Q4",
                    },
                    {
                      value: "semi_annual" as BreakdownMode,
                      label: "Semi-Annual",
                      preview: "H1, H2",
                    },
                    {
                      value: "monthly" as BreakdownMode,
                      label: "Monthly",
                      preview: "Month 1–12 (12 periods)",
                    },
                    {
                      value: "custom" as BreakdownMode,
                      label: "Custom",
                      preview: "Region-defined periods",
                    },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleBreakdownModeChange(option.value)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      form.breakdown_mode === option.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{option.preview}</p>
                  </button>
                ))}
              </div>

              {form.breakdown_mode === "custom" && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Define custom execution reporting period labels. These are generated when an annual
                    version initializes execution periods.
                  </p>
                  {form.custom_periods.map((period, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`custom-period-${index}`}>Period {index + 1}</Label>
                        <Input
                          id={`custom-period-${index}`}
                          value={period.label}
                          onChange={(e) => updateCustomPeriod(index, e.target.value)}
                          placeholder={`Period ${index + 1}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeCustomPeriod(index)}
                        disabled={form.custom_periods.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomPeriod}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Period
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 5: Field Labels */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Field Labels</CardTitle>
              <CardDescription>
                Labels shown on draft forms and detail headers for regional planning timeframe fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="planning_period_label">Planning Period Label</Label>
                <Input
                  id="planning_period_label"
                  value={form.planning_period_label}
                  onChange={(e) => setField("planning_period_label", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_label">Duration Label</Label>
                <Input
                  id="duration_label"
                  value={form.duration_label}
                  onChange={(e) => setField("duration_label", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_year_label">Start Date Label</Label>
                <Input
                  id="start_year_label"
                  value={form.start_year_label}
                  onChange={(e) => setField("start_year_label", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_year_label">End Date Label</Label>
                <Input
                  id="end_year_label"
                  value={form.end_year_label}
                  onChange={(e) => setField("end_year_label", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </fieldset>
    </div>
  );
}
