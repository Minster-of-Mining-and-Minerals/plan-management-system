"use client";

import { useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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

const stepSchema = z.object({
    step_order: z.coerce.number().min(1),
    label: z.string().min(1).max(255),
    requires_weight: z.boolean(),
});

const formSchema = z.object({
    name: z.string().min(3).max(255),
    government_structure_id: z.string().uuid().optional().nullable(),
    is_active: z.boolean(),
    steps: z.array(stepSchema).min(1),
});

interface CreatePlanRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    rule?: PlanRule | null;
}

export function CreatePlanRuleModal({ isOpen, onClose, rule }: CreatePlanRuleModalProps) {
    const [createRule, { isLoading: isCreating }] = useCreatePlanRuleMutation();
    const [updateRule, { isLoading: isUpdating }] = useUpdatePlanRuleMutation();
    const { data: structures = [] } = useGetGovernmentStructuresQuery({});

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            government_structure_id: null,
            is_active: true,
            steps: [{ step_order: 1, label: "Level 1", requires_weight: false }],
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
            const sorted = (rule.steps ?? []).slice().sort((a, b) => a.step_order - b.step_order);
            const start = sorted.find((s) => s.requires_weight)?.step_order ?? null;
            form.reset({
                name: rule.name,
                government_structure_id: rule.government_structure_id,
                is_active: rule.is_active,
                steps: sorted.map((s) => ({
                    step_order: s.step_order,
                    label: s.label,
                    requires_weight: start !== null && s.step_order === start,
                })),
            });
        } else {
            form.reset({
                name: "",
                government_structure_id: null,
                is_active: true,
                steps: [{ step_order: 1, label: "Level 1", requires_weight: false }],
            });
        }
    }, [rule, form, isOpen]);

    const addStep = () => {
        append({
            step_order: fields.length + 1,
            label: `Level ${fields.length + 1}`,
            requires_weight: false,
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
            const payload = {
                name: values.name,
                government_structure_id: values.government_structure_id || null,
                is_active: values.is_active,
                steps: values.steps.map((step, index) => ({
                    step_order: index + 1,
                    label: step.label.trim(),
                    requires_weight: step.requires_weight,
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
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
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
                            name="government_structure_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Scope</FormLabel>
                                    <Select
                                        onValueChange={(val) =>
                                            field.onChange(val === "global" ? null : val)
                                        }
                                        value={field.value || "global"}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Global (all sectors)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="global">Global (all sectors)</SelectItem>
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

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <FormLabel>Hierarchy Levels</FormLabel>
                                    <FormDescription>
                                        Set a label per level. Enable target on one level — deeper
                                        levels inherit the target requirement. Evaluation mode is
                                        chosen when building the plan hierarchy.
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
                                            className="grid grid-cols-[56px_1fr_1fr_auto] gap-2 items-end"
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
