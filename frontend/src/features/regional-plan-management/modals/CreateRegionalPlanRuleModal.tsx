"use client";

import { useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { createFormResolver } from "@/lib/zod-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DIALOG_SIMPLE_SCROLL } from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionFeedback } from "@/components/action-feedback";
import { Plus, Trash2, Layers, Shield } from "lucide-react";
import {
  useCreateRegionalPlanRuleMutation,
  useUpdateRegionalPlanRuleMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanRule } from "@/redux/types/regionalPlan";
import {
  getDefaultStepColorHex,
  getPlanStepSurfaceStyles,
} from "@/utils/planRuleUtils";

const stepSchema = z.object({
  step_order: z.coerce.number().min(1),
  label: z.string().min(1, "Label is required").max(255),
  requires_weight: z.boolean(),
  requires_contribution_weight: z.boolean(),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid hex color"),
});

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(255),
  is_active: z.boolean(),
  performance_scoring_policy: z
    .enum(["CAP_100", "ALLOW_OVER_ACHIEVEMENT"])
    .default("CAP_100"),
  allow_kpi_target_amendment: z.boolean().default(true),
  allow_kpi_weight_amendment: z.boolean().default(true),
  require_amendment_approval: z.boolean().default(true),
  steps: z.array(stepSchema).min(1, "At least one hierarchy level is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateRegionalPlanRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  regionId: string;
  rule?: RegionalPlanRule | null;
  onSuccess?: () => void;
}

export function CreateRegionalPlanRuleModal({
  isOpen,
  onClose,
  regionId,
  rule,
  onSuccess,
}: CreateRegionalPlanRuleModalProps) {
  const [createRule, { isLoading: isCreating }] = useCreateRegionalPlanRuleMutation();
  const [updateRule, { isLoading: isUpdating }] = useUpdateRegionalPlanRuleMutation();

  const form = useForm<FormValues>({
    resolver: createFormResolver<FormValues>(formSchema),
    defaultValues: {
      name: "",
      is_active: true,
      performance_scoring_policy: "CAP_100",
      allow_kpi_target_amendment: true,
      allow_kpi_weight_amendment: true,
      require_amendment_approval: true,
      steps: [
        {
          step_order: 1,
          label: "Strategic Priority",
          requires_weight: false,
          requires_contribution_weight: false,
          color_hex: getDefaultStepColorHex(1),
        },
        {
          step_order: 2,
          label: "Goal",
          requires_weight: false,
          requires_contribution_weight: false,
          color_hex: getDefaultStepColorHex(2),
        },
        {
          step_order: 3,
          label: "Key Performance Indicator (KPI)",
          requires_weight: true,
          requires_contribution_weight: true,
          color_hex: getDefaultStepColorHex(3),
        },
        {
          step_order: 4,
          label: "Activity",
          requires_weight: false,
          requires_contribution_weight: false,
          color_hex: getDefaultStepColorHex(4),
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
    if (rule) {
      const sorted = (rule.steps ?? []).slice().sort((a, b) => {
        const orderA = a.step_order ?? a.level ?? 0;
        const orderB = b.step_order ?? b.level ?? 0;
        return orderA - orderB;
      });
      const start = sorted.find((s) => s.requires_weight);
      const startLevel = start ? (start.step_order ?? start.level) : null;

      const loadedSteps =
        sorted.length > 0
          ? sorted.map((s, idx) => {
              const currentOrder = s.step_order ?? s.level ?? idx + 1;
              return {
                step_order: currentOrder,
                label: s.label || s.name || `Level ${currentOrder}`,
                requires_weight: startLevel !== null && currentOrder === startLevel,
                requires_contribution_weight: Boolean(s.requires_contribution_weight),
                color_hex: s.color_hex || getDefaultStepColorHex(currentOrder),
              };
            })
          : [
              {
                step_order: 1,
                label: "Strategic Priority",
                requires_weight: false,
                requires_contribution_weight: false,
                color_hex: getDefaultStepColorHex(1),
              },
            ];

      form.reset({
        name: rule.name,
        is_active: rule.is_active,
        performance_scoring_policy:
          rule.performance_scoring_policy === "ALLOW_OVER_ACHIEVEMENT"
            ? "ALLOW_OVER_ACHIEVEMENT"
            : "CAP_100",
        allow_kpi_target_amendment:
          rule.amendment_policy?.allow_kpi_target_amendment ?? true,
        allow_kpi_weight_amendment:
          rule.amendment_policy?.allow_kpi_weight_amendment ?? true,
        require_amendment_approval:
          rule.amendment_policy?.require_approval ?? true,
        steps: loadedSteps,
      });
    } else {
      form.reset({
        name: "",
        is_active: true,
        performance_scoring_policy: "CAP_100",
        allow_kpi_target_amendment: true,
        allow_kpi_weight_amendment: true,
        require_amendment_approval: true,
        steps: [
          {
            step_order: 1,
            label: "Strategic Priority",
            requires_weight: false,
            requires_contribution_weight: false,
            color_hex: getDefaultStepColorHex(1),
          },
          {
            step_order: 2,
            label: "Goal",
            requires_weight: false,
            requires_contribution_weight: false,
            color_hex: getDefaultStepColorHex(2),
          },
          {
            step_order: 3,
            label: "Key Performance Indicator (KPI)",
            requires_weight: true,
            requires_contribution_weight: true,
            color_hex: getDefaultStepColorHex(3),
          },
          {
            step_order: 4,
            label: "Activity",
            requires_weight: false,
            requires_contribution_weight: false,
            color_hex: getDefaultStepColorHex(4),
          },
        ],
      });
    }
  }, [rule, form, isOpen]);

  const addStep = () => {
    const nextOrder = fields.length + 1;
    append({
      step_order: nextOrder,
      label: `Level ${nextOrder}`,
      requires_weight: false,
      requires_contribution_weight: false,
      color_hex: getDefaultStepColorHex(nextOrder),
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

  async function onSubmit(values: FormValues) {
    if (!regionId) {
      actionFeedback.error("Region identifier is missing");
      return;
    }

    try {
      const payload = {
        name: values.name.trim(),
        is_active: values.is_active,
        performance_scoring_policy: values.performance_scoring_policy,
        amendment_policy: {
          allow_kpi_target_amendment: values.allow_kpi_target_amendment,
          allow_kpi_weight_amendment: values.allow_kpi_weight_amendment,
          require_approval: values.require_amendment_approval,
        },
        steps: values.steps.map((step, index) => {
          const stepOrder = index + 1;
          const nodeType =
            stepOrder === 1
              ? "strategic"
              : stepOrder === 2
              ? "goal"
              : stepOrder === 3
              ? "kpi"
              : "task";
          return {
            step_order: stepOrder,
            level: stepOrder,
            label: step.label.trim(),
            name: step.label.trim(),
            node_type: nodeType,
            requires_weight: step.requires_weight,
            requires_contribution_weight: step.requires_contribution_weight,
            color_hex: step.color_hex,
          };
        }),
      };

      if (rule) {
        await updateRule({
          id: rule.regional_plan_rule_id,
          region_id: regionId,
          data: payload,
        }).unwrap();
        actionFeedback.success("Regional plan rule updated successfully");
      } else {
        await createRule({
          region_id: regionId,
          data: payload,
        }).unwrap();
        actionFeedback.success("Regional plan rule created successfully");
      }

      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      actionFeedback.error(err.data?.message || err.message || "Failed to save regional plan rule");
    }
  }

  const isSaving = isCreating || isUpdating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(DIALOG_SIMPLE_SCROLL, "sm:max-w-[900px]")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {rule ? "Edit Regional Plan Rule" : "Create Regional Plan Rule"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Standard Regional Strategic Rule"
                        {...field}
                      />
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
                    <FormLabel>Performance Scoring Policy</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select policy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CAP_100">
                          Cap at 100% (default)
                        </SelectItem>
                        <SelectItem value="ALLOW_OVER_ACHIEVEMENT">
                          Allow over-achievement (&gt;100%)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Controls whether period progress calculation caps at 100%.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0 p-3 rounded-lg border bg-card/40">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="font-medium cursor-pointer">
                      Rule Active
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Active rules can be selected for regional plan versions.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Hierarchy Levels Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Hierarchy Levels &amp; Depth Configuration
                  </FormLabel>
                  <FormDescription className="text-xs">
                    Define custom hierarchy depth, node labels, level accent colors, and where target evaluation begins. All levels deeper than the target-required level inherit the target requirement.
                  </FormDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Level
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                {fields.map((field, index) => {
                  const level = index + 1;
                  const inheritsWeight =
                    weightStartLevel !== null && level > weightStartLevel;

                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-[52px_1fr_96px_1fr_1fr_auto] gap-2 items-end pb-2 border-b border-border/50 last:border-b-0 last:pb-0"
                    >
                      <div className="text-sm font-semibold text-muted-foreground pb-2 text-center">
                        L{level}
                      </div>

                      <FormField
                        control={form.control}
                        name={`steps.${index}.label`}
                        render={({ field: labelField }) => (
                          <FormItem>
                            {index === 0 && (
                              <FormLabel className="text-xs">Label</FormLabel>
                            )}
                            <FormControl>
                              <Input
                                placeholder={`Level ${level} label`}
                                className="h-9 text-xs"
                                {...labelField}
                              />
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
                            {index === 0 && (
                              <FormLabel className="text-xs">Color</FormLabel>
                            )}
                            <FormControl>
                              <div
                                className="flex h-9 items-center gap-2 rounded-md border px-2"
                                style={getPlanStepSurfaceStyles(
                                  colorField.value || getDefaultStepColorHex(level)
                                )}
                              >
                                <input
                                  type="color"
                                  value={
                                    colorField.value || getDefaultStepColorHex(level)
                                  }
                                  onChange={(event) =>
                                    colorField.onChange(event.target.value.toUpperCase())
                                  }
                                  className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                                  aria-label={`Level ${level} color`}
                                />
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {colorField.value || getDefaultStepColorHex(level)}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem>
                        {index === 0 && (
                          <FormLabel className="text-xs">Target required</FormLabel>
                        )}
                        {inheritsWeight ? (
                          <div className="flex h-9 items-center">
                            <Badge variant="secondary" className="text-[11px] font-normal">
                              Inherits L{weightStartLevel}
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 h-9">
                            <Switch
                              checked={watchedSteps[index]?.requires_weight ?? false}
                              onCheckedChange={(checked) =>
                                setWeightRequiredForLevel(index, !!checked)
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {watchedSteps[index]?.requires_weight
                                ? "Required from L" + level
                                : "Not required"}
                            </span>
                          </div>
                        )}
                      </FormItem>

                      <FormField
                        control={form.control}
                        name={`steps.${index}.requires_contribution_weight`}
                        render={({ field: contributionField }) => (
                          <FormItem>
                            {index === 0 && (
                              <FormLabel className="text-xs">
                                Contribution %
                              </FormLabel>
                            )}
                            <div className="flex items-center gap-2 h-9">
                              <Switch
                                checked={contributionField.value ?? false}
                                onCheckedChange={contributionField.onChange}
                              />
                              <span className="text-xs text-muted-foreground">
                                {contributionField.value
                                  ? "Weighted rollup"
                                  : "Equal average"}
                              </span>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 h-9 w-9"
                        disabled={fields.length <= 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {weightStartLevel && (
                <p className="text-xs text-muted-foreground">
                  Levels {weightStartLevel}–{fields.length} require target evaluation. Sibling contribution weights roll up according to each level&apos;s setting.
                </p>
              )}
            </div>

            {/* Amendment Policy Configuration */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <FormLabel className="text-sm font-semibold">
                Plan Amendment Policy
              </FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="allow_kpi_target_amendment"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 p-2.5 rounded-lg border bg-card/30">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal cursor-pointer">
                        Allow Target Amendments
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allow_kpi_weight_amendment"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 p-2.5 rounded-lg border bg-card/30">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal cursor-pointer">
                        Allow Weight Amendments
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="require_amendment_approval"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 p-2.5 rounded-lg border bg-card/30">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal cursor-pointer">
                        Require Amendment Approval
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="mt-6 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : rule
                  ? "Update Plan Rule"
                  : "Create Plan Rule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
