"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
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
  useGetCompanyPlanConfigQuery,
  useUpdateCompanyPlanConfigMutation,
} from "@/redux/api/companyPlanApi";
import type { CompanyPlanningConfiguration } from "@/redux/types/companyPlan";
import { CompanyPlanTabsHeader } from "./CompanyPlanTabsHeader";

interface FormProps {
  config: CompanyPlanningConfiguration;
  companyId: string;
  refetch: () => void;
  isFetching: boolean;
}

function CompanyPlanningConfigForm({ config, companyId, refetch, isFetching }: FormProps) {
  const { can } = usePermissions();
  const [updateConfig, { isLoading: isSaving }] = useUpdateCompanyPlanConfigMutation();

  const [minYears, setMinYears] = useState(config.min_duration_years || 1);
  const [maxYears, setMaxYears] = useState(config.max_duration_years || 10);
  const [breakdownMode, setBreakdownMode] = useState<"quarterly" | "semi_annual" | "monthly">(
    config.breakdown_mode === "semi_annual" || config.breakdown_mode === "monthly"
      ? config.breakdown_mode
      : "quarterly"
  );
  const [draftLabel, setDraftLabel] = useState(config.draft_entity_label_singular || "Company Plan Draft");
  const [periodLabel, setPeriodLabel] = useState(config.planning_period_label || "Company Planning Cycle");
  const [targetUnits, setTargetUnits] = useState<string[]>(
    Array.isArray(config.target_units) ? config.target_units : ["ETB", "USD", "Tons", "Units", "%"]
  );
  const [newUnitInput, setNewUnitInput] = useState("");

  const canManage = can("COMPANY_PLANNING_CONFIG:UPDATE") || can("COMPANY_PLANS:UPDATE") || can("COMPANIES:MANAGE");

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
        company_id: companyId,
        data: {
          min_duration_years: Number(minYears),
          max_duration_years: Number(maxYears),
          breakdown_mode: breakdownMode,
          draft_entity_label_singular: draftLabel.trim(),
          planning_period_label: periodLabel.trim(),
          target_units: targetUnits,
        },
      }).unwrap();

      actionFeedback.success("Company planning configuration saved successfully");
      refetch();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errObj?.data?.message || errObj?.message || "Failed to update configuration");
    }
  };

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Tab Navigation */}
      <CompanyPlanTabsHeader />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Paintbrush className="h-5 w-5 text-primary" />
              Company Planning Configuration
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure corporate planning horizons, default terminology labels, measurement target units, and periodic breakdown rules.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Duration Horizons */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Planning Horizon & Duration Constraints
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Minimum Plan Duration (Years)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={maxYears}
                  value={minYears}
                  onChange={(e) => setMinYears(parseInt(e.target.value, 10))}
                  disabled={!canManage}
                />
                <p className="text-[11px] text-muted-foreground">
                  Earliest allowable duration for strategic corporate plan drafts.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Maximum Plan Duration (Years)
                </label>
                <Input
                  type="number"
                  min={minYears}
                  max={30}
                  value={maxYears}
                  onChange={(e) => setMaxYears(parseInt(e.target.value, 10))}
                  disabled={!canManage}
                />
                <p className="text-[11px] text-muted-foreground">
                  Longest duration allowable for multi-year strategic roadmaps.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Terminology Customization */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Terminology & Entity Labels
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Plan Draft Entity Label
                </label>
                <Input
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  disabled={!canManage}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Planning Period Heading Label
                </label>
                <Input
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  disabled={!canManage}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Periodic Breakdown Mode */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Execution Periodic Subdivision
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Default Subdivision Mode
              </label>
              <select
                aria-label="Default Subdivision Mode"
                className="w-full max-w-xs h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                value={breakdownMode}
                onChange={(e) => setBreakdownMode(e.target.value as "quarterly" | "semi_annual" | "monthly")}
                disabled={!canManage}
              >
                <option value="quarterly">Quarterly (4 Periods / Year)</option>
                <option value="semi_annual">Semi-Annual (2 Periods / Year)</option>
                <option value="monthly">Monthly (12 Periods / Year)</option>
              </select>
            </div>
          </div>

          {/* Section 4: Target Units */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Allowed Target Measurement Units
            </h2>

            <div className="flex flex-wrap gap-2">
              {targetUnits.map((unit) => (
                <Badge
                  key={unit}
                  variant="secondary"
                  className="px-3 py-1 text-xs gap-1.5 rounded-lg"
                >
                  <span>{unit}</span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(unit)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>

            {canManage && (
              <div className="flex items-center gap-2 max-w-sm">
                <Input
                  placeholder="New unit (e.g. Ounces, Liters)..."
                  value={newUnitInput}
                  onChange={(e) => setNewUnitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddUnit();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddUnit}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Save Button */}
          {canManage && (
            <div className="pt-4 border-t border-border flex justify-end">
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? "Saving Configuration..." : "Save Configuration"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export function CompanyPlanningConfigView() {
  const params = useParams<{ id: string }>();
  const companyId = params?.id;

  const {
    data: config,
    isLoading,
    isFetching,
    refetch,
  } = useGetCompanyPlanConfigQuery({ company_id: companyId }, { skip: !companyId });

  if (isLoading || !config) {
    return <Loading01 />;
  }

  return (
    <CompanyPlanningConfigForm
      key={config.company_planning_config_id || "cfg"}
      config={config}
      companyId={companyId}
      refetch={refetch}
      isFetching={isFetching}
    />
  );
}
