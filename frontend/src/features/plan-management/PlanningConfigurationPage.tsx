"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Save, Settings2, Plus, Trash2, CalendarRange, Globe, Building2 } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableTabBar } from "@/components/common/TableTabBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetPlanningConfigurationQuery,
  useRestoreDefaultPlanningConfigurationMutation,
  useUpdatePlanningConfigurationMutation,
} from "@/redux/api/planningConfigApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import {
  DEFAULT_PLANNING_CONFIGURATION,
  DEFAULT_TARGET_UNITS,
  slugifyTargetUnitId,
  type PlanningConfiguration,
  type TargetUnit,
  type BreakdownMode,
  type CustomPeriod,
} from "@/redux/types/planningConfig";
import { formatDurationYears } from "@/utils/planDraftUtils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_UPDATE_PERMISSIONS } from "@/utils/planPermissionUtils";
import { useStructureScope } from "@/hooks/useStructureScope";
import { useGovernmentStructureListParams } from "@/hooks/useGovernmentStructureListParams";
import {
  canEditPlanningConfiguration,
  canRestorePlanningConfiguration,
} from "@/utils/planningConfigScopeUtils";

type PlanningConfigEditScope = "global" | "sector";

function toFormState(config: PlanningConfiguration): PlanningConfiguration {
  const { meta: _meta, ...rest } = config;
  return rest;
}

export default function PlanningConfigurationPage() {
  const { isSuperAdmin, structureId } = useStructureScope();
  const [editScope, setEditScope] = useState<PlanningConfigEditScope>(
    isSuperAdmin ? "global" : "sector"
  );
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(structureId);

  const targetStructureId = useMemo(() => {
    if (isSuperAdmin) {
      return editScope === "global" ? undefined : selectedSectorId ?? undefined;
    }
    return structureId ?? undefined;
  }, [isSuperAdmin, editScope, selectedSectorId, structureId]);

  const configQueryArg = useMemo(
    () => (targetStructureId ? { government_structure_id: targetStructureId } : undefined),
    [targetStructureId]
  );

  const { data: config, isLoading } = useGetPlanningConfigurationQuery(configQueryArg);
  const { params: structureQueryParams, skip: skipStructures } =
    useGovernmentStructureListParams({ is_active: true });
  const { data: sectors = [] } = useGetGovernmentStructuresQuery(structureQueryParams, {
    skip: skipStructures || !isSuperAdmin || editScope !== "sector",
  });

  const [updateConfig, { isLoading: isSaving }] = useUpdatePlanningConfigurationMutation();
  const [restoreDefaults, { isLoading: isRestoring }] =
    useRestoreDefaultPlanningConfigurationMutation();

  const [form, setForm] = useState<PlanningConfiguration>(DEFAULT_PLANNING_CONFIGURATION);

  const meta = config?.meta;
  const hasSectorOverride = Boolean(meta?.has_sector_override);
  const isUsingDefault = meta?.is_using_default ?? editScope === "global";
  const canEdit = canEditPlanningConfiguration(isSuperAdmin, editScope);
  const canRestore = canRestorePlanningConfiguration(
    isSuperAdmin,
    editScope,
    hasSectorOverride
  );
  const formDisabled = !canEdit || isSaving || isRestoring;

  useEffect(() => {
    if (!isSuperAdmin && structureId) {
      setSelectedSectorId(structureId);
      setEditScope("sector");
    }
  }, [isSuperAdmin, structureId]);

  useEffect(() => {
    if (config) {
      setForm(toFormState(config));
    }
  }, [config]);

  const setField = <K extends keyof PlanningConfiguration>(key: K, value: PlanningConfiguration[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateTargetUnit = (index: number, patch: Partial<TargetUnit>) => {
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

  const handleSave = async () => {
    if (editScope === "sector" && !targetStructureId) {
      actionFeedback.error("Select a sector before saving sector configuration.");
      return;
    }

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
      const unique = new Set(customLabels.map((l) => l.toLowerCase()));
      if (unique.size !== customLabels.length) {
        actionFeedback.error("Custom period labels must be unique.");
        return;
      }
    }

    const ids = new Set<string>();
    for (const unit of normalizedUnits) {
      if (ids.has(unit.id)) {
        actionFeedback.error(`Duplicate target unit: ${unit.label}`);
        return;
      }
      ids.add(unit.id);
    }

    try {
      const government_structure_id =
        isSuperAdmin && editScope === "global" ? null : targetStructureId ?? null;

      await updateConfig({
        government_structure_id,
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
      }).unwrap();
      actionFeedback.success("Planning configuration saved");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to save configuration");
    }
  };

  const handleRestore = async () => {
    const message =
      editScope === "global"
        ? "Restore global planning configuration to factory defaults? Sector overrides are not affected."
        : "Remove this sector's planning configuration override and use inherited defaults?";

    if (!(await actionFeedback.confirm(message, { destructive: true }))) return;
    try {
      const government_structure_id =
        isSuperAdmin && editScope === "global" ? null : targetStructureId ?? null;

      const restored = await restoreDefaults(
        government_structure_id === undefined ? undefined : { government_structure_id }
      ).unwrap();
      setForm(toFormState(restored));
      actionFeedback.success(
        editScope === "global" ? "Global defaults restored" : "Sector override removed"
      );
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to restore defaults");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading planning configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Planning Configuration
          </h1>
          <p className="text-gray-500 mt-1">
            Configure planning duration limits and draft naming conventions.
            {!canEdit && editScope === "global"
              ? " Global settings are read-only for sector users."
              : null}
            {editScope === "sector" && isUsingDefault
              ? " This sector inherits the global configuration."
              : null}
          </p>
        </div>
        <div className="flex gap-2">
          {canRestore ? (
            <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
              <Button
                variant="outline"
                onClick={handleRestore}
                disabled={isRestoring || isSaving || formDisabled}
              >
                {isRestoring ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {editScope === "global" ? "Restore Factory Defaults" : "Reset to Inherited Default"}
              </Button>
            </PermissionGuard>
          ) : null}
          {canEdit ? (
            <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
              <Button onClick={handleSave} disabled={isSaving || isRestoring || formDisabled}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </PermissionGuard>
          ) : null}
        </div>
      </div>

      {isSuperAdmin ? (
        <div className="space-y-3">
          <TableTabBar
            tabs={[
              { value: "global", label: "System Default", icon: <Globe className="h-4 w-4" /> },
              {
                value: "sector",
                label: "Sector Override",
                icon: <Building2 className="h-4 w-4" />,
              },
            ]}
            activeTab={editScope}
            onTabChange={(value) => setEditScope(value as PlanningConfigEditScope)}
          />
          {editScope === "sector" ? (
            <div className="max-w-md space-y-2">
              <Label>Sector</Label>
              <Select
                value={selectedSectorId ?? ""}
                onValueChange={(value) => setSelectedSectorId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem
                      key={sector.government_structure_id}
                      value={sector.government_structure_id}
                    >
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      <fieldset disabled={formDisabled} className="min-w-0 border-0 p-0 m-0">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Duration Limits</CardTitle>
            <CardDescription>
              Allowed planning durations when creating drafts. Users can select any whole number
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

        <Card>
          <CardHeader>
            <CardTitle>Naming Conventions</CardTitle>
            <CardDescription>
              Customize how draft documents are labeled in buttons, headers, and listings.
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Target Units</CardTitle>
            <CardDescription>
              Units available when setting numeric strategic targets on plan nodes (e.g. person,
              km, birr). Users pick from this list when the target evaluation mode is Number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(form.target_units ?? DEFAULT_TARGET_UNITS).map((unit, index) => (
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
                    placeholder="Kilometer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`unit-symbol-${index}`}>Display Symbol</Label>
                  <Input
                    id={`unit-symbol-${index}`}
                    value={unit.symbol}
                    onChange={(e) => updateTargetUnit(index, { symbol: e.target.value })}
                    placeholder="km"
                  />
                </div>
                <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeTargetUnit(index)}
                    disabled={(form.target_units ?? []).length <= 1}
                    title="Remove unit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </PermissionGuard>
              </div>
            ))}
            <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
              <Button type="button" variant="outline" onClick={addTargetUnit} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Unit
              </Button>
            </PermissionGuard>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              Annual Version Breakdown
            </CardTitle>
            <CardDescription>
              Configure how active annual versions are divided into execution periods. Quarterly is
              the default, but administrators can choose semi-annual or define custom periods.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { value: "quarterly" as BreakdownMode, label: "Quarterly", preview: "Q1, Q2, Q3, Q4" },
                  { value: "semi_annual" as BreakdownMode, label: "Semi-Annual", preview: "H1, H2" },
                  { value: "custom" as BreakdownMode, label: "Custom", preview: "Administrator-defined" },
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
                  Define custom execution period labels. These are generated when an annual version
                  becomes active.
                </p>
                {(form.custom_periods ?? []).map((period: CustomPeriod, index: number) => (
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
                    <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeCustomPeriod(index)}
                        disabled={(form.custom_periods ?? []).length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                  </div>
                ))}
                <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
                  <Button type="button" variant="outline" onClick={addCustomPeriod} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Period
                  </Button>
                </PermissionGuard>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Field Labels</CardTitle>
            <CardDescription>
              Labels shown on draft forms and detail headers for planning timeframe fields.
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
