"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Paintbrush,
  Save,
  Plus,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetRegionalPlanConfigQuery,
  useUpdateRegionalPlanConfigMutation,
} from "@/redux/api/regionalPlanApi";
import { RegionalPlanTabsHeader } from "./RegionalPlanTabsHeader";

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

  const [minYears, setMinYears] = useState(1);
  const [maxYears, setMaxYears] = useState(10);
  const [breakdownMode, setBreakdownMode] = useState<"quarterly" | "semi_annual" | "monthly">("quarterly");
  const [draftLabel, setDraftLabel] = useState("Regional Plan Draft");
  const [periodLabel, setPeriodLabel] = useState("Regional Planning Cycle");
  const [targetUnits, setTargetUnits] = useState<string[]>([]);
  const [newUnitInput, setNewUnitInput] = useState("");

  const canManage = can("REGIONAL_PLANNING_CONFIG:UPDATE") || can("REGIONAL_PLANS:UPDATE") || can("REGIONS:MANAGE");

  useEffect(() => {
    if (config) {
      setMinYears(config.min_duration_years || 1);
      setMaxYears(config.max_duration_years || 10);
      setBreakdownMode(config.breakdown_mode as any || "quarterly");
      setDraftLabel(config.draft_entity_label_singular || "Regional Plan Draft");
      setPeriodLabel(config.planning_period_label || "Regional Planning Cycle");
      setTargetUnits(Array.isArray(config.target_units) ? config.target_units : ["ETB", "USD", "Tons", "Units", "%"]);
    }
  }, [config]);

  const handleAddUnit = () => {
    if (!newUnitInput.trim()) return;
    if (targetUnits.includes(newUnitInput.trim())) {
      actionFeedback.error("Unit already exists");
      return;
    }
    setTargetUnits([...targetUnits, newUnitInput.trim()]);
    setNewUnitInput("");
  };

  const handleRemoveUnit = (unitToRemove: string) => {
    setTargetUnits(targetUnits.filter((u) => u !== unitToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig({
        region_id: regionId,
        data: {
          min_duration_years: Number(minYears),
          max_duration_years: Number(maxYears),
          breakdown_mode: breakdownMode,
          draft_entity_label_singular: draftLabel.trim(),
          planning_period_label: periodLabel.trim(),
          target_units: targetUnits,
        },
      }).unwrap();

      actionFeedback.success("Regional planning configuration saved successfully");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to update configuration");
    }
  };

  if (isLoading) return <Loading01 />;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <RegionalPlanTabsHeader />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Paintbrush className="h-4 w-4" />
            <span>Cycle & Schema Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Regional Planning Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define planning cycle durations, calendar subdivision modes, custom vocabulary, and allowable target units.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {canManage && (
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2 shadow-xs">
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Cycle Duration & Subdivision */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-semibold text-base text-foreground">Cycle Durations & Periods</h3>
            <p className="text-xs text-muted-foreground">
              Define allowable master plan duration and default calendar subdivisions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Minimum Duration (Years)</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={minYears}
                onChange={(e) => setMinYears(Number(e.target.value))}
                disabled={!canManage}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Maximum Duration (Years)</label>
              <Input
                type="number"
                min="1"
                max="25"
                value={maxYears}
                onChange={(e) => setMaxYears(Number(e.target.value))}
                disabled={!canManage}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Default Execution Subdivision Mode</label>
            <select
              value={breakdownMode}
              onChange={(e) => setBreakdownMode(e.target.value as any)}
              disabled={!canManage}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-ring"
            >
              <option value="quarterly">Quarterly (4 Quarters per Year: Q1, Q2, Q3, Q4)</option>
              <option value="semi_annual">Semi-Annual (2 Semesters per Year: H1, H2)</option>
              <option value="monthly">Monthly (12 Months per Year: Month 1 - 12)</option>
            </select>
          </div>
        </div>

        {/* Card 2: Custom Vocabulary Labels */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-semibold text-base text-foreground">Vocabulary & UI Labels</h3>
            <p className="text-xs text-muted-foreground">
              Tailor administrative labels displayed in regional forms and headers.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Draft Entity Label</label>
            <Input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              disabled={!canManage}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Planning Period Label</label>
            <Input
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              disabled={!canManage}
            />
          </div>
        </div>

        {/* Card 3: Target Units Catalog */}
        <div className="md:col-span-2 rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-semibold text-base text-foreground">Allowed Target Units Catalog</h3>
            <p className="text-xs text-muted-foreground">
              Units of measurement available when setting KPI and task targets across regional departments.
            </p>
          </div>

          {canManage && (
            <div className="flex gap-2 max-w-sm">
              <Input
                placeholder="e.g. Megawatts, Liters, Hectares"
                value={newUnitInput}
                onChange={(e) => setNewUnitInput(e.target.value)}
                className="h-8 text-xs"
              />
              <Button type="button" size="sm" onClick={handleAddUnit} className="h-8 gap-1">
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {targetUnits.map((unit) => (
              <Badge
                key={unit}
                variant="secondary"
                className="text-xs px-2.5 py-1 gap-1.5 font-medium"
              >
                <span>{unit}</span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUnit(unit)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
