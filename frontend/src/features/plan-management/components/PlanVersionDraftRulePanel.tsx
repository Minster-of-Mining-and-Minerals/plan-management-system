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
import { useUpdatePlanRuleForVersionMutation } from "@/redux/api/planRuleApi";
import type { PerformanceScoringPolicy, PlanRule, PlanRuleStep } from "@/redux/types/plan";
import { getDefaultStepColorHex, getPlanStepSurfaceStyles, sortSteps } from "@/utils/planRuleUtils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_DRAFT_PUBLISH_PERMISSIONS } from "@/utils/planPermissionUtils";

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

function ruleToFormValues(rule: PlanRule): FormValues {
  const sorted = sortSteps(rule.steps ?? []);
  const weightStart = sorted.find((s) => s.requires_weight)?.step_order ?? null;

  return {
    name: rule.name,
    is_active: rule.is_active,
    performance_scoring_policy: resolveScoringPolicy(rule.performance_scoring_policy),
    steps: sorted.map((s) => ({
      step_order: s.step_order,
      label: s.label,
      requires_weight: weightStart !== null && s.step_order === weightStart,
      requires_contribution_weight: Boolean(s.requires_contribution_weight),
      color_hex: s.color_hex || getDefaultStepColorHex(s.step_order - 1),
    })),
  };
}

interface PlanVersionDraftRulePanelProps {
  masterVersionId: string;
  rule: PlanRule | null | undefined;
  isLoading?: boolean;
  canEdit: boolean;
  readOnlyReason?: string | null;
}

export function PlanVersionDraftRulePanel({
  masterVersionId,
  rule,
  isLoading,
  canEdit,
  readOnlyReason,
}: PlanVersionDraftRulePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateRule, { isLoading: isSaving }] = useUpdatePlanRuleForVersionMutation();

  const isDraftSnapshot = Boolean(rule?.owned_by_plan_version_id);
  const sortedSteps = useMemo(() => sortSteps(rule?.steps ?? []), [rule?.steps]);

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

  const setWeightRequiredForLevel = (index: number, required: boolean) => {
    const current = form.getValues("steps");
    form.setValue(
      "steps",
      current.map((step, i) => ({
        ...step,
        requires_weight: i === index ? required : false,
      })),
      { shouldValidate: true }
    );
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await updateRule({
        versionId: masterVersionId,
        data: {
          name: values.name,
          is_active: values.is_active,
          performance_scoring_policy: values.performance_scoring_policy,
          steps: values.steps.map((step, index) => ({
            step_order: index + 1,
            label: step.label.trim(),
            requires_weight: step.requires_weight,
            requires_contribution_weight: step.requires_contribution_weight,
            color_hex: step.color_hex,
          })),
        },
      }).unwrap();
      actionFeedback.success(
        isDraftSnapshot
          ? "Draft plan rule saved"
          : "Draft plan rule snapshot created and saved"
      );
      setIsEditing(false);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to save plan rule");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading plan rule…
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        No plan rule is linked to this version.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
            {isDraftSnapshot ? (
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Draft snapshot
              </Badge>
            ) : (
              <Badge variant="outline">Live template</Badge>
            )}
            <Badge variant={rule.is_active ? "default" : "secondary"}>
              {rule.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {scoringPolicyLabel(rule.performance_scoring_policy)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {sortedSteps.length} hierarchy level{sortedSteps.length === 1 ? "" : "s"} define how
            nodes are structured and validated in this draft. Performance scoring policy controls
            whether KPI scores can exceed 100% when actual is above target.
          </p>
        </div>

        {canEdit && !isEditing ? (
          <PermissionGuard requireAll={PLAN_DRAFT_PUBLISH_PERMISSIONS}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                form.reset(ruleToFormValues(rule));
                setIsEditing(true);
              }}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              {isDraftSnapshot ? "Edit rule" : "Edit rule (create snapshot)"}
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
              <Button
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSaving}
                className="gap-2"
              >
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

      {!readOnlyReason && canEdit && !isDraftSnapshot ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          This draft still uses a live template rule. Saving will create an isolated draft snapshot
          so you can set Cap at 100% or Allow over-achievement without changing the template.
        </div>
      ) : null}

      {isEditing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rule settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Active for this draft</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="performance_scoring_policy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Performance scoring policy</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select policy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CAP_100">Cap at 100% (default)</SelectItem>
                          <SelectItem value="ALLOW_OVER_ACHIEVEMENT">
                            Allow over-achievement (&gt;100%)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Cap keeps scored performance at or below 100% while actual stays unchanged.
                        Allow over-achievement lets performance exceed 100% when actual is above
                        target. Applies to this draft&apos;s rule snapshot only.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Hierarchy levels</CardTitle>
                    <CardDescription>
                      Labels, colors, and weight rules for each planning level.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add level
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {fields.map((field, index) => {
                  const level = index + 1;
                  const inheritsWeight =
                    weightStartLevel !== null && level > weightStartLevel;

                  return (
                    <div
                      key={field.id}
                      className="rounded-lg border bg-slate-50/50 p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="inline-flex h-8 min-w-8 items-center justify-center rounded-md text-sm font-semibold"
                          style={getPlanStepSurfaceStyles(
                            watchedSteps[index]?.color_hex || getDefaultStepColorHex(index)
                          )}
                        >
                          L{level}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          disabled={fields.length <= 1}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`steps.${index}.label`}
                          render={({ field: labelField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Label</FormLabel>
                              <FormControl>
                                <Input {...labelField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`steps.${index}.color_hex`}
                          render={({ field: colorField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Color</FormLabel>
                              <FormControl>
                                <div
                                  className="flex h-10 items-center gap-2 rounded-md border px-2 bg-white"
                                  style={getPlanStepSurfaceStyles(
                                    colorField.value || getDefaultStepColorHex(index)
                                  )}
                                >
                                  <input
                                    type="color"
                                    value={colorField.value || getDefaultStepColorHex(index)}
                                    onChange={(e) => colorField.onChange(e.target.value.toUpperCase())}
                                    className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                                  />
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {colorField.value}
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormItem>
                          <FormLabel className="text-xs">Target required</FormLabel>
                          {inheritsWeight ? (
                            <Badge variant="secondary" className="text-xs">
                              Inherits from L{weightStartLevel}
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={watchedSteps[index]?.requires_weight ?? false}
                                onCheckedChange={(checked) =>
                                  setWeightRequiredForLevel(index, !!checked)
                                }
                              />
                              <span className="text-xs text-muted-foreground">
                                {watchedSteps[index]?.requires_weight ? "From this level" : "Off"}
                              </span>
                            </div>
                          )}
                        </FormItem>
                        <FormField
                          control={form.control}
                          name={`steps.${index}.requires_contribution_weight`}
                          render={({ field: contributionField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Contribution %</FormLabel>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={contributionField.value ?? false}
                                  onCheckedChange={contributionField.onChange}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {contributionField.value ? "Weighted rollup" : "Equal average"}
                                </span>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </form>
        </Form>
      ) : (
        <div className="relative pl-4">
          <div className="absolute left-[1.125rem] top-3 bottom-3 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
          <div className="space-y-3">
            {sortedSteps.map((step) => (
              <RuleStepCard key={step.plan_rule_step_id} step={step} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RuleStepCard({ step }: { step: PlanRuleStep }) {
  const styles = getPlanStepSurfaceStyles(
    step.color_hex ?? getDefaultStepColorHex(step.step_order - 1)
  );

  return (
    <div className="relative flex gap-4 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <span
        className="relative z-10 inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ring-4 ring-white"
        style={styles}
      >
        {step.step_order}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-900">{step.label}</p>
          <Badge variant="outline" className="capitalize text-xs">
            {step.node_type.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {step.requires_weight ? (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Target required</Badge>
          ) : null}
          {step.requires_contribution_weight ? (
            <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">
              Contribution weight
            </Badge>
          ) : null}
          {!step.requires_weight && !step.requires_contribution_weight ? (
            <span className="text-xs text-muted-foreground">No weight constraints</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
