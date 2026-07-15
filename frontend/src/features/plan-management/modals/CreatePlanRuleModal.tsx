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
import { Plus, Trash2 } from "lucide-react";
import {
    useCreatePlanRuleMutation,
    useUpdatePlanRuleMutation,
} from "@/redux/api/planRuleApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { PlanRule } from "@/redux/types/plan";
import { getDefaultStepColorHex, getPlanStepSurfaceStyles } from "@/utils/planRuleUtils";
import { useGovernmentStructureListParams } from "@/hooks/useGovernmentStructureListParams";
import { useStructureScope } from "@/hooks/useStructureScope";
import {
    canCreateInheritedPlanRule,
    canCreateSystemGlobalPlanRule,
    resolvePlanRuleScopePayload,
    resolvePlanRuleScopeType,
    type PlanRuleScopeType,
} from "@/utils/planRuleScopeUtils";

const stepSchema = z.object({
    step_order: z.coerce.number().min(1),
    label: z.string().min(1).max(255),
    requires_weight: z.boolean(),
    requires_contribution_weight: z.boolean(),
    color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid hex color"),
});

const formSchema = z
    .object({
        name: z.string().min(3).max(255),
        scope_type: z.enum(["system_global", "inherited", "sector"]),
        government_structure_id: z.string().uuid().optional().nullable(),
        is_active: z.boolean(),
        performance_scoring_policy: z
            .enum(["CAP_100", "ALLOW_OVER_ACHIEVEMENT"])
            .default("CAP_100"),
        steps: z.array(stepSchema).min(1),
    })
    .superRefine((values, ctx) => {
        if (values.scope_type !== "system_global" && !values.government_structure_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Select a sector for this scope.",
                path: ["government_structure_id"],
            });
        }
    });

interface CreatePlanRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    rule?: PlanRule | null;
}

export function CreatePlanRuleModal({ isOpen, onClose, rule }: CreatePlanRuleModalProps) {
    const [createRule, { isLoading: isCreating }] = useCreatePlanRuleMutation();
    const [updateRule, { isLoading: isUpdating }] = useUpdatePlanRuleMutation();
    const { isSuperAdmin, structureId: sessionStructureId } = useStructureScope();
    const { params: structureQueryParams, skip: skipStructures } =
        useGovernmentStructureListParams({ is_active: true });
    const { data: structures = [] } = useGetGovernmentStructuresQuery(structureQueryParams, {
        skip: skipStructures,
    });
    const allowSystemGlobal = canCreateSystemGlobalPlanRule(isSuperAdmin);
    const allowInherited = canCreateInheritedPlanRule(isSuperAdmin, sessionStructureId);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
        defaultValues: {
            name: "",
            scope_type: allowInherited ? "inherited" : "sector",
            government_structure_id: sessionStructureId ?? null,
            is_active: true,
            performance_scoring_policy: "CAP_100",
            steps: [{ step_order: 1, label: "Level 1", requires_weight: false, requires_contribution_weight: false, color_hex: getDefaultStepColorHex(1) }],
        },
    });

    const scopeType = form.watch("scope_type");

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
            const sorted = (rule.steps ?? []).slice().sort((a, b) => a.step_order - b.step_order);
            const start = sorted.find((s) => s.requires_weight)?.step_order ?? null;
            form.reset({
                name: rule.name,
                scope_type: resolvePlanRuleScopeType(rule),
                government_structure_id: rule.government_structure_id,
                is_active: rule.is_active,
                performance_scoring_policy:
                    rule.performance_scoring_policy === "ALLOW_OVER_ACHIEVEMENT"
                        ? "ALLOW_OVER_ACHIEVEMENT"
                        : "CAP_100",
                steps: sorted.map((s) => ({
                    step_order: s.step_order,
                    label: s.label,
                    requires_weight: start !== null && s.step_order === start,
                    requires_contribution_weight: Boolean(s.requires_contribution_weight),
                    color_hex: s.color_hex || getDefaultStepColorHex(s.step_order),
                })),
            });
        } else {
            const defaultScope: PlanRuleScopeType = allowSystemGlobal
                ? "system_global"
                : allowInherited
                  ? "inherited"
                  : "sector";
            form.reset({
                name: "",
                scope_type: defaultScope,
                government_structure_id: sessionStructureId ?? null,
                is_active: true,
                performance_scoring_policy: "CAP_100",
                steps: [{ step_order: 1, label: "Level 1", requires_weight: false, requires_contribution_weight: false, color_hex: getDefaultStepColorHex(1) }],
            });
        }
    }, [rule, form, isOpen, allowSystemGlobal, allowInherited, sessionStructureId]);

    useEffect(() => {
        if (scopeType === "system_global") {
            form.setValue("government_structure_id", null, { shouldValidate: true });
            return;
        }

        if (!form.getValues("government_structure_id") && sessionStructureId) {
            form.setValue("government_structure_id", sessionStructureId, { shouldValidate: true });
        }
    }, [scopeType, form, sessionStructureId]);

    const addStep = () => {
        append({
            step_order: fields.length + 1,
            label: `Level ${fields.length + 1}`,
            requires_weight: false,
            requires_contribution_weight: false,
            color_hex: getDefaultStepColorHex(fields.length + 1),
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

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const scopePayload = resolvePlanRuleScopePayload(
                values.scope_type,
                values.government_structure_id
            );

            const payload = {
                name: values.name,
                ...scopePayload,
                is_active: values.is_active,
                performance_scoring_policy: values.performance_scoring_policy,
                steps: values.steps.map((step, index) => ({
                    step_order: index + 1,
                    label: step.label.trim(),
                    requires_weight: step.requires_weight,
                    requires_contribution_weight: step.requires_contribution_weight,
                    color_hex: step.color_hex,
                })),
            };

            if (rule) {
                await updateRule({ id: rule.plan_rule_id, data: payload }).unwrap();
                actionFeedback.success("Plan rule updated");
            } else {
                await createRule(payload).unwrap();
                actionFeedback.success("Plan rule created");
            }
            onClose();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Something went wrong");
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={cn(DIALOG_SIMPLE_SCROLL, "sm:max-w-[900px]")}>
                <DialogHeader>
                    <DialogTitle>{rule ? "Edit Plan Rule" : "Create Plan Rule"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rule Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Standard 4-Level Plan" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="scope_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Scope</FormLabel>
                                    <FormDescription>
                                        Sector-specific rules apply to one sector only. Inherited global
                                        rules flow from a parent sector to its children. System global
                                        applies everywhere (Super Admin only).
                                    </FormDescription>
                                    <Select
                                        value={field.value}
                                        onValueChange={(value) =>
                                            field.onChange(value as PlanRuleScopeType)
                                        }
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select scope" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {allowSystemGlobal ? (
                                                <SelectItem value="system_global">
                                                    System global (all sectors)
                                                </SelectItem>
                                            ) : null}
                                            {allowInherited ? (
                                                <SelectItem value="inherited">
                                                    Global (inherited by child sectors)
                                                </SelectItem>
                                            ) : null}
                                            <SelectItem value="sector">Sector-specific</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {scopeType !== "system_global" ? (
                            <FormField
                                control={form.control}
                                name="government_structure_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {scopeType === "inherited" ? "Parent sector" : "Sector"}
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || undefined}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a sector" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {structures.map((s) => (
                                                    <SelectItem
                                                        key={s.government_structure_id}
                                                        value={s.government_structure_id}
                                                    >
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : null}

                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">Active</FormLabel>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="performance_scoring_policy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Performance scoring policy</FormLabel>
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
                                    <FormDescription>
                                        Cap at 100% keeps KPI scores from exceeding 100% while
                                        actual values stay unchanged. Allow over-achievement lets
                                        scores exceed 100% when actual is above target. Drafts
                                        snapshot this setting from the rule.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <FormLabel>Hierarchy Levels</FormLabel>
                                    <FormDescription>
                                        Set a label and soft background color per level. Enable target on one level — deeper
                                        levels inherit the target requirement. Contribution weight is configured per level
                                        independently for execution rollup. Colors appear subtly in plan hierarchy and table views.
                                    </FormDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Level
                                </Button>
                            </div>

                            <div className="space-y-2 rounded-lg border p-3">
                                {fields.map((field, index) => {
                                    const level = index + 1;
                                    const inheritsWeight =
                                        weightStartLevel !== null && level > weightStartLevel;

                                    return (
                                        <div
                                            key={field.id}
                                            className="grid grid-cols-[56px_1fr_88px_1fr_1fr_auto] gap-2 items-end"
                                        >
                                            <div className="text-sm font-medium text-muted-foreground pb-2">
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
                                                                className="flex h-10 items-center gap-2 rounded-md border px-2"
                                                                style={getPlanStepSurfaceStyles(
                                                                    colorField.value || getDefaultStepColorHex(level)
                                                                )}
                                                            >
                                                                <input
                                                                    type="color"
                                                                    value={colorField.value || getDefaultStepColorHex(level)}
                                                                    onChange={(event) =>
                                                                        colorField.onChange(event.target.value.toUpperCase())
                                                                    }
                                                                    className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
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
                                                    <div className="flex h-10 items-center">
                                                        <Badge variant="secondary" className="text-xs">
                                                            Inherits from L{weightStartLevel}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 h-10">
                                                        <Switch
                                                            checked={watchedSteps[index]?.requires_weight ?? false}
                                                            onCheckedChange={(checked) =>
                                                                setWeightRequiredForLevel(index, !!checked)
                                                            }
                                                        />
                                                        <span className="text-xs text-muted-foreground">
                                                            {watchedSteps[index]?.requires_weight
                                                                ? "Required from this level"
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
                                                        <div className="flex items-center gap-2 h-10">
                                                            <Switch
                                                                checked={
                                                                    contributionField.value ?? false
                                                                }
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
                                                className="text-red-500"
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
                                    Levels {weightStartLevel}–{fields.length} require target. Choose
                                    the evaluation mode when adding nodes at level {weightStartLevel}.
                                </p>
                            )}
                        </div>

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isCreating || isUpdating}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || isUpdating}>
                                {isCreating || isUpdating ? "Saving..." : rule ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
