"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetPlanningConfigurationQuery,
  useRestoreDefaultPlanningConfigurationMutation,
  useUpdatePlanningConfigurationMutation,
} from "@/redux/api/planningConfigApi";
import {
  DEFAULT_PLANNING_CONFIGURATION,
  type PlanningConfiguration,
} from "@/redux/types/planningConfig";
import { formatDurationYears } from "@/utils/planDraftUtils";

export default function PlanningConfigurationPage() {
  const { data: config, isLoading } = useGetPlanningConfigurationQuery();
  const [updateConfig, { isLoading: isSaving }] = useUpdatePlanningConfigurationMutation();
  const [restoreDefaults, { isLoading: isRestoring }] =
    useRestoreDefaultPlanningConfigurationMutation();

  const [form, setForm] = useState<PlanningConfiguration>(DEFAULT_PLANNING_CONFIGURATION);

  useEffect(() => {
    if (config) {
      setForm(config);
    }
  }, [config]);

  const setField = <K extends keyof PlanningConfiguration>(key: K, value: PlanningConfiguration[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (form.min_duration_years > form.max_duration_years) {
      toast.error("Minimum duration cannot exceed maximum duration.");
      return;
    }

    try {
      await updateConfig({
        min_duration_years: form.min_duration_years,
        max_duration_years: form.max_duration_years,
        draft_entity_label_singular: form.draft_entity_label_singular.trim(),
        draft_entity_label_plural: form.draft_entity_label_plural.trim(),
        create_action_label: form.create_action_label.trim(),
        planning_period_label: form.planning_period_label.trim(),
        duration_label: form.duration_label.trim(),
        start_year_label: form.start_year_label.trim(),
        end_year_label: form.end_year_label.trim(),
      }).unwrap();
      toast.success("Planning configuration saved");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err.data?.message || "Failed to save configuration");
    }
  };

  const handleRestore = async () => {
    if (!confirm("Restore default planning configuration?")) return;
    try {
      const restored = await restoreDefaults().unwrap();
      setForm(restored);
      toast.success("Defaults restored");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err.data?.message || "Failed to restore defaults");
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
            Configure planning duration limits and draft naming conventions used across the system.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRestore} disabled={isRestoring || isSaving}>
            {isRestoring ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Restore Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isRestoring}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

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
    </div>
  );
}
