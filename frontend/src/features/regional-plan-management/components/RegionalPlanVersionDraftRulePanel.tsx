"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { createFormResolver } from "@/lib/zod-form";
import * as z from "zod";
import { Loader2, Pencil, Plus, Save, Shield, Trash2, X } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateRegionalPlanRuleForVersionMutation } from "@/redux/api/regionalPlanApi";
import type { PerformanceScoringPolicy, PlanRule } from "@/redux/types/plan";
import type { RegionalPlanRule } from "@/redux/types/regionalPlan";
import { getDefaultStepColorHex, getPlanStepSurfaceStyles, sortSteps } from "@/utils/planRuleUtils";

const stepSchema = z.object({
  step_order: z.coerce.number().min(1),
  label: z.string().min(1).max(255),
  requires_weight: z.boolean(),
  requires_contribution_weight: z.boolean(),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid hex color"),
});

const formSchema = z.object({
  name: z.string().min(3).max(255),
  is_active: z.boolean(),
  performance_scoring_policy: z.enum(["CAP_100", "ALLOW_OVER_ACHIEVEMENT"]),
  steps: z.array(stepSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

function resolveScoringPolicy(
  policy: PerformanceScoringPolicy | string | null | undefined
): PerformanceScoringPolicy {
  return policy === "ALLOW_OVER_ACHIEVEMENT" ? "ALLOW_OVER_ACHIEVEMENT" : "CAP_100";
}

function scoringPolicyLabel(policy: PerformanceScoringPolicy | string | null | undefined): string {
  return resolveScoringPolicy(policy) === "ALLOW_OVER_ACHIEVEMENT"
    ? "Allow over-achievement (>100%)"
    : "Cap at 100%";
}

function ruleToFormValues(rule: RegionalPlanRule | PlanRule | any): FormValues {
  let stepsRaw = rule?.steps || [];
  if (!stepsRaw.length) {
    const is3Level = (rule?.name || "").includes("3");
    stepsRaw = is3Level
      ? [
          { level: 1, name: "SF", node_type: "strategic", color_hex: "#8B5CF6", requires_weight: false, requires_contribution_weight: false },
          { level: 2, name: "Goal", node_type: "goal", color_hex: "#3B82F6", requires_weight: false, requires_contribution_weight: false },
          { level: 3, name: "KPI", node_type: "kpi", color_hex: "#10B981", requires_weight: true, requires_contribution_weight: true },
        ]
      : [
          { level: 1, name: "Strategic Priority", node_type: "strategic", color_hex: "#8B5CF6", requires_weight: false, requires_contribution_weight: false },
          { level: 2, name: "Goal", node_type: "goal", color_hex: "#3B82F6", requires_weight: false, requires_contribution_weight: false },
          { level: 3, name: "Key Performance Indicator (KPI)", node_type: "kpi", color_hex: "#10B981", requires_weight: true, requires_contribution_weight: true },
          { level: 4, name: "Activity", node_type: "task", color_hex: "#F59E0B", requires_weight: false, requires_contribution_weight: false },
        ];
  }
  const normalizedSteps = stepsRaw.map((s: any) => ({
    step_order: s.step_order ?? s.level ?? 1,
    label: s.label ?? s.name ?? `Level ${s.step_order ?? s.level ?? 1}`,
    requires_weight: Boolean(s.requires_weight),
    requires_contribution_weight: Boolean(s.requires_contribution_weight),
    color_hex: s.color_hex || getDefaultStepColorHex((s.step_order ?? s.level ?? 1) - 1),
  }));

  const sorted = sortSteps(normalizedSteps as any);
  const weightStart = sorted.find((s) => s.requires_weight)?.step_order ?? null;

  return {
    name: rule?.name || "Draft Regional Plan Rule",
    is_active: rule?.is_active !== undefined ? Boolean(rule.is_active) : true,
    performance_scoring_policy: resolveScoringPolicy(rule?.performance_scoring_policy),
    steps: sorted.map((s) => ({
      step_order: s.step_order,
      label: s.label,
      requires_weight: weightStart !== null && s.step_order === weightStart,
      requires_contribution_weight: Boolean(s.requires_contribution_weight),
      color_hex: s.color_hex || getDefaultStepColorHex(s.step_order - 1),
    })),
  };
}

interface RegionalPlanVersionDraftRulePanelProps {
  versionId: string;
  regionId: string;
  rule: RegionalPlanRule | any | null | undefined;
  isLoading?: boolean;
  canEdit: boolean;
  readOnlyReason?: string | null;
  onSaved?: () => void;
}

export function RegionalPlanVersionDraftRulePanel({
  versionId,
  regionId,
  rule,
  isLoading,
  canEdit,
  readOnlyReason,
  onSaved,
}: RegionalPlanVersionDraftRulePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateRule, { isLoading: isSaving }] = useUpdateRegionalPlanRuleForVersionMutation();

  const isDraftSnapshot = Boolean(rule?.owned_by_plan_version_id);
  const sortedSteps = useMemo(() => {
    let steps = rule?.steps;
    if (!steps || !steps.length) {
      const is3Level = (rule?.name || "").includes("3");
      steps = is3Level
        ? [
            { level: 1, name: "SF", node_type: "strategic", color_hex: "#8B5CF6", requires_weight: false, requires_contribution_weight: false },
            { level: 2, name: "Goal", node_type: "goal", color_hex: "#3B82F6", requires_weight: false, requires_contribution_weight: false },
            { level: 3, name: "KPI", node_type: "kpi", color_hex: "#10B981", requires_weight: true, requires_contribution_weight: true },
          ]
        : [];
    }
    if (!steps.length) return [];
    return sortSteps(
      steps.map((s: any) => ({
        step_order: s.step_order ?? s.level ?? 1,
        label: s.label ?? s.name ?? `Level ${s.step_order ?? s.level ?? 1}`,
        requires_weight: Boolean(s.requires_weight),
        requires_contribution_weight: Boolean(s.requires_contribution_weight),
        color_hex: s.color_hex || getDefaultStepColorHex((s.step_order ?? s.level ?? 1) - 1),
      })) as any
    );
  }, [rule?.steps, rule?.name]);

  const form = useForm<FormValues>({
    resolver: createFormResolver<FormValues>(formSchema),
    defaultValues: {
      name: "",
      is_active: true,
      performance_scoring_policy: "CAP_100",
      steps: [
        {
          step_order: 1,
          label: "Level 1",
          requires_weight: false,
          requires_contribution_weight: false,
          color_hex: getDefaultStepColorHex(0),
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "steps",
  });

  const watchedSteps = form.watch("steps");
  const weightStartLevel = useMemo(() => {
    const idx = watchedSteps.findIndex((s) => s.requires_weight);
    return idx >= 0 ? idx + 1 : null;
  }, [watchedSteps]);

  useEffect(() => {
    if (rule && isEditing) {
      form.reset(ruleToFormValues(rule));
    }
  }, [rule, isEditing, form]);

  const addStep = () => {
    append({
      step_order: fields.length + 1,
      label: `Level ${fields.length + 1}`,
      requires_weight: false,
      requires_contribution_weight: false,
      color_hex: getDefaultStepColorHex(fields.length),
    });
  };

  const removeStep = (index: number) => {
    if (fields.length <= 1) return;
    remove(index);
    const updated = form.getValues("steps").map((step, i) => ({
      ...step,
      step_order: i + 1,
    }));
    form.setValue("steps", updated);
  };

  const setWeightStartFromLevel = (level: number | null) => {
    const current = form.getValues("steps");
    const updated = current.map((s) => ({
      ...s,
      requires_weight: level !== null && s.step_order === level,
    }));
    form.setValue("steps", updated, { shouldDirty: true });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const startIndex = values.steps.findIndex((s) => s.requires_weight);
      const payloadSteps = values.steps.map((s, index) => ({
        step_order: index + 1,
        label: s.label.trim(),
        requires_weight: startIndex >= 0 && index >= startIndex,
        requires_contribution_weight: Boolean(s.requires_contribution_weight),
        color_hex: s.color_hex.trim(),
      }));

      await updateRule({
        versionId,
        region_id: regionId,
        data: {
          name: values.name.trim(),
          is_active: values.is_active,
          performance_scoring_policy: values.performance_scoring_policy,
          steps: payloadSteps as any,
        },
      }).unwrap();

      actionFeedback.success("Draft regional plan rule saved successfully.");
      setIsEditing(false);
      onSaved?.();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to update regional draft rule");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading regional plan rule...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Regional Draft Plan Rule</h3>
            {isDraftSnapshot ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <Shield className="h-3 w-3 text-primary" />
                Version-Isolated Snapshot
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Regional Master Rule
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hierarchy depth, level naming, colors, scoring policy, and weight requirements for this regional plan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && !isEditing && (
            <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 shadow-2xs">
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Draft Rule</span>
            </Button>
          )}

          {isEditing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                form.reset(rule ? ruleToFormValues(rule) : undefined);
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
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Rule Overview</CardTitle>
              <CardDescription className="text-xs">
                General governance and performance scoring rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Rule Name</span>
                <span className="font-semibold text-foreground">{rule?.name || "Standard Rule"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Performance Scoring</span>
                <span className="font-semibold text-foreground">
                  {scoringPolicyLabel(rule?.performance_scoring_policy)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Hierarchy Depth</span>
                <span className="font-semibold text-foreground">{sortedSteps.length} configured levels</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold text-foreground">
                  {rule?.is_active !== false ? "Active" : "Inactive"}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Configured Hierarchy Levels</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedSteps.map((step: any) => {
                const surfaceStyles = getPlanStepSurfaceStyles(step.color_hex || "#6366f1");
                return (
                  <div
                    key={step.step_order}
                    style={surfaceStyles}
                    className="rounded-xl p-3.5 border shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: step.color_hex }}
                        />
                        <span className="text-xs font-mono font-bold text-foreground">
                          Level {step.step_order}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {step.color_hex}
                      </Badge>
                    </div>

                    <h5 className="font-bold text-sm text-foreground">{step.label}</h5>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      {step.requires_weight ? (
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          Target Required
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">No target required</span>
                      )}

                      {step.requires_contribution_weight && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-200">
                          Contrib Weight %
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Rule Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Rule Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Standard Regional Strategy Rule" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="performance_scoring_policy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Performance Scoring Policy</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CAP_100">Cap at 100%</SelectItem>
                            <SelectItem value="ALLOW_OVER_ACHIEVEMENT">
                              Allow Over-Achievement (&gt;100%)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Rule Active Status</div>
                    <div className="text-[11px] text-muted-foreground">
                      Whether this rule definition is currently active for plans
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Hierarchy Levels</h4>
                  <p className="text-xs text-muted-foreground">
                    Define levels, labels, accent colors, and weight requirements.
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addStep} className="gap-1.5 shadow-2xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Level</span>
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((fieldItem, index) => {
                  const stepNumber = index + 1;
                  const isWeightStart = weightStartLevel === stepNumber;

                  return (
                    <div
                      key={fieldItem.id}
                      className="rounded-xl border bg-card p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-muted text-foreground">
                            Level {stepNumber}
                          </span>

                          <FormField
                            control={form.control}
                            name={`steps.${index}.label`}
                            render={({ field }) => (
                              <FormItem className="m-0 space-y-0">
                                <FormControl>
                                  <Input
                                    placeholder="e.g. Priority, Goal, KPI..."
                                    className="h-8 text-xs font-semibold w-48 sm:w-64"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name={`steps.${index}.color_hex`}
                            render={({ field }) => (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  className="h-7 w-7 rounded cursor-pointer border p-0.5"
                                  title="Pick Level Color"
                                />
                                <Input
                                  value={field.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  className="h-8 w-24 text-xs font-mono"
                                />
                              </div>
                            )}
                          />

                          {fields.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeStep(index)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              title="Delete Level"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-foreground block">Target Required From Here</span>
                            <span className="text-[11px] text-muted-foreground">
                              Requires target allocation on Level {stepNumber} and all deeper child levels.
                            </span>
                          </div>
                          <Switch
                            checked={isWeightStart}
                            onCheckedChange={(checked) =>
                              setWeightStartFromLevel(checked ? stepNumber : null)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-foreground block">Requires Contribution Weight</span>
                            <span className="text-[11px] text-muted-foreground">
                              Children at this level must sum to 100% contribution weight.
                            </span>
                          </div>
                          <FormField
                            control={form.control}
                            name={`steps.${index}.requires_contribution_weight`}
                            render={({ field }) => (
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset(rule ? ruleToFormValues(rule) : undefined);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2 shadow-xs">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Draft Rule</span>
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
