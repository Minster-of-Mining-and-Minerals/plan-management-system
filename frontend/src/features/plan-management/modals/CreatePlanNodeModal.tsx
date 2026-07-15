"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { createFormResolver } from "@/lib/zod-form";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { DIALOG_SCROLLABLE_BODY, DIALOG_SCROLLABLE_CONTENT } from "@/lib/dialogLayout";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { actionFeedback } from "@/components/action-feedback";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";
import { normalizeOptionalId } from "@/utils/apiPayloadUtils";
import {
    useCreatePlanNodeMutation,
    useUpdatePlanNodeMutation,
    useGetPlanNodesQuery,
    useGetPlanVersionByIdQuery,
} from "@/redux/api/planApi";
import { useGetPlanRuleForVersionQuery } from "@/redux/api/planRuleApi";
import { usePlanVersionPlanningConfiguration } from "@/hooks/usePlanVersionPlanningConfiguration";
import { TARGET_UNIT_NONE_VALUE } from "@/redux/types/planningConfig";
import { PlanNode, PlanRuleWeightMode, AssignmentSharingMode, TargetAllocationMode, AchievementMode } from "@/redux/types/plan";
import {
    getStepLabel,
    getWeightTarget,
    getWeightUnitLabel,
    resolveNodeWeightMode,
    resolveNodeTargetUnit,
    stepRequiresWeight,
    stepRequiresContributionWeight,
    isWeightModeSelectionLevel,
    TARGET_FIELD_LABEL,
    CONTRIBUTION_FIELD_LABEL,
    getContributionSiblingTarget,
    levelToNodeType,
    WEIGHT_MODE_LABELS,
} from "@/utils/planRuleUtils";

interface CreatePlanNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    planVersionId: string;
    parentNode?: PlanNode | null;
    node?: PlanNode | null;
}

export function CreatePlanNodeModal({
    isOpen,
    onClose,
    planVersionId,
    parentNode,
    node,
}: CreatePlanNodeModalProps) {
    const [createNode, { isLoading: isCreating }] = useCreatePlanNodeMutation();
    const [updateNode, { isLoading: isUpdating }] = useUpdatePlanNodeMutation();
    const { data: rule } = useGetPlanRuleForVersionQuery(planVersionId, { skip: !isOpen });
    const { data: planVersion } = useGetPlanVersionByIdQuery(planVersionId, { skip: !isOpen });
    const { config: planningConfig } = usePlanVersionPlanningConfiguration(planVersion);
    const configuredUnits = planningConfig?.target_units ?? [];

    const nodeLevel = node?.level ?? (parentNode ? parentNode.level + 1 : 1);
    const levelLabel = getStepLabel(rule, nodeLevel);
    const requiresWeight = stepRequiresWeight(rule, nodeLevel);
    const requiresContribution = stepRequiresContributionWeight(rule, nodeLevel);
    const showWeightModeSelect = isWeightModeSelectionLevel(rule, nodeLevel);
    const inheritedMode = resolveNodeWeightMode(rule, nodeLevel, parentNode, node);

    const formSchema = useMemo(
        () =>
            z.object({
                plan_version_id: z.string().uuid(),
                parent_id: z.string().uuid().optional().nullable(),
                title: z.string().min(3).max(255),
                description: z.string().optional().nullable(),
                weight: z.coerce.number().min(0).default(0),
                weight_mode: z
                    .enum(["number", "percentage", "frequency"])
                    .optional()
                    .nullable(),
                contribution_weight: z.coerce.number().min(0).max(100).default(0),
                target_unit: z.string().optional().nullable(),
                target_allocation_mode: z.enum(["divisible", "lump"]).default("divisible"),
                achievement_mode: z.enum(["period", "annual"]).default("period"),
                level: z.coerce.number().optional(),
                assignment_sharing_mode: z.enum(["exclusive", "shared"]).default("exclusive"),
            }),
        []
    );

    type FormValues = z.infer<typeof formSchema>;

    const form = useForm<FormValues>({
        resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
        defaultValues: {
            plan_version_id: planVersionId,
            parent_id: null,
            title: "",
            description: "",
            weight: 0,
            weight_mode: null,
            contribution_weight: 0,
            target_unit: null,
            target_allocation_mode: "divisible" as TargetAllocationMode,
            achievement_mode: "period" as AchievementMode,
            assignment_sharing_mode: "exclusive" as AssignmentSharingMode,
        },
    });

    const selectedWeightMode = form.watch("weight_mode");
    const selectedTargetUnit = form.watch("target_unit");
    const effectiveWeightMode: PlanRuleWeightMode | null = showWeightModeSelect
        ? (selectedWeightMode as PlanRuleWeightMode | null) ?? node?.weight_mode ?? null
        : inheritedMode;

    const inheritedTargetUnit = resolveNodeTargetUnit(rule, nodeLevel, parentNode, node);
    const effectiveTargetUnit =
        effectiveWeightMode === "number"
            ? showWeightModeSelect
                ? selectedTargetUnit ?? node?.target_unit ?? null
                : inheritedTargetUnit
            : null;

    const showTargetUnitSelect =
        requiresWeight && effectiveWeightMode === "number" && showWeightModeSelect;

    const canEnterWeight =
        requiresWeight && (!showWeightModeSelect || !!effectiveWeightMode);

    const canEnterContribution = requiresContribution;

    const needsSiblingData = canEnterWeight || canEnterContribution;

    const { data: siblings = [] } = useGetPlanNodesQuery(
        {
            plan_version_id: planVersionId,
            parent_id: node?.parent_id ?? parentNode?.plan_node_id ?? null,
            is_active: true,
        },
        { skip: !isOpen || !needsSiblingData }
    );

    const weightTarget = getWeightTarget(
        parentNode ?? node?.parent ?? null,
        effectiveWeightMode
    );
    const siblingUsed = siblings
        .filter((s) => s.plan_node_id !== node?.plan_node_id)
        .reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
    const remainingWeight =
        weightTarget !== null ? Math.max(0, weightTarget - siblingUsed) : null;
    const weightUnit = getWeightUnitLabel(
        effectiveWeightMode,
        effectiveTargetUnit,
        configuredUnits
    );

    const contributionTarget = getContributionSiblingTarget();
    const contributionSiblingUsed = siblings
        .filter((s) => s.plan_node_id !== node?.plan_node_id)
        .reduce((sum, s) => sum + (Number(s.contribution_weight) || 0), 0);
    const remainingContribution = Math.max(0, contributionTarget - contributionSiblingUsed);

    useEffect(() => {
        if (!isOpen) return;

        if (node) {
            form.reset({
                plan_version_id: node.plan_version_id,
                parent_id: node.parent_id,
                title: node.title,
                description: node.description,
                weight: node.weight,
                weight_mode: node.weight_mode,
                contribution_weight: node.contribution_weight ?? 0,
                target_unit: node.target_unit,
                target_allocation_mode:
                    node.target_allocation_mode === "lump" ? "lump" : "divisible",
                achievement_mode:
                    node.achievement_mode === "annual" ? "annual" : "period",
                level: node.level,
                assignment_sharing_mode: node.assignment_sharing_mode ?? "exclusive",
            });
        } else {
            form.reset({
                plan_version_id: planVersionId,
                parent_id: parentNode?.plan_node_id || null,
                title: "",
                description: "",
                weight: 0,
                weight_mode: null,
                contribution_weight: 0,
                target_unit: null,
                target_allocation_mode: "divisible",
                achievement_mode: "period",
                level: nodeLevel,
                assignment_sharing_mode: parentNode?.assignment_sharing_mode ?? "exclusive",
            });
        }
    }, [node, parentNode, planVersionId, form, isOpen, nodeLevel]);

    async function onSubmit(values: FormValues) {
        if (showWeightModeSelect && !values.weight_mode) {
            form.setError("weight_mode", {
                message: `Select a ${TARGET_FIELD_LABEL.toLowerCase()} evaluation mode`,
            });
            return;
        }

        if (requiresWeight && values.weight <= 0) {
            form.setError("weight", { message: `${TARGET_FIELD_LABEL} is required at this level` });
            return;
        }

        if (
            requiresWeight &&
            weightTarget !== null &&
            siblingUsed + values.weight > weightTarget + 0.001
        ) {
            form.setError("weight", {
                message: `Combined sibling ${TARGET_FIELD_LABEL.toLowerCase()} cannot exceed ${weightTarget}${weightUnit}`,
            });
            return;
        }

        if (requiresContribution && values.contribution_weight <= 0) {
            form.setError("contribution_weight", {
                message: `${CONTRIBUTION_FIELD_LABEL} is required at this level`,
            });
            return;
        }

        if (
            requiresContribution &&
            contributionSiblingUsed + values.contribution_weight > contributionTarget + 0.001
        ) {
            form.setError("contribution_weight", {
                message: `Combined sibling contribution cannot exceed ${contributionTarget}%`,
            });
            return;
        }

        try {
            const modeToSave = showWeightModeSelect
                ? values.weight_mode
                : inheritedMode;

            const sharedFields = {
                parent_id: normalizeOptionalId(values.parent_id),
                type: levelToNodeType(nodeLevel),
                title: values.title,
                description: values.description,
                weight: requiresWeight ? values.weight : 0,
                weight_mode: requiresWeight ? modeToSave : null,
                contribution_weight: requiresContribution ? values.contribution_weight : null,
                target_unit:
                    requiresWeight && modeToSave === "number"
                        ? showWeightModeSelect
                            ? values.target_unit || null
                            : inheritedTargetUnit
                        : null,
                target_allocation_mode: requiresWeight
                    ? values.target_allocation_mode
                    : "divisible",
                achievement_mode: requiresWeight ? values.achievement_mode : "period",
                level: nodeLevel,
                assignment_sharing_mode: values.assignment_sharing_mode,
            };

            if (node) {
                await updateNode({
                    id: node.plan_node_id,
                    data: sharedFields,
                }).unwrap();
                actionFeedback.success("Plan node updated successfully");
            } else {
                await createNode({
                    plan_version_id: values.plan_version_id,
                    ...sharedFields,
                }).unwrap();
                actionFeedback.success("Plan node created successfully");
            }
            onClose();
        } catch (error: unknown) {
            actionFeedback.error(getApiErrorMessage(error));
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[600px]")}>
                <DialogHeader className="px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>
                        {node
                            ? `Edit ${levelLabel}`
                            : parentNode
                              ? `Add ${levelLabel} under: ${parentNode.title}`
                              : `Add ${levelLabel}`}
                    </DialogTitle>
                </DialogHeader>

                {rule && (
                    <div className="flex shrink-0 items-center gap-2 px-6 pb-2 text-sm text-muted-foreground">
                        <span>Rule:</span>
                        <Badge variant="outline">{rule.name}</Badge>
                        <Badge variant="secondary">Level {nodeLevel}</Badge>
                    </div>
                )}

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                        <div className={cn(DIALOG_SCROLLABLE_BODY, "px-6 pb-4")}>
                            <div className="space-y-4">
                        {showWeightModeSelect && (
                            <FormField
                                control={form.control}
                                name="weight_mode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{TARGET_FIELD_LABEL} evaluation mode</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value ?? ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select mode" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(WEIGHT_MODE_LABELS).map(
                                                    ([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Deeper levels in this branch inherit this mode.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {showTargetUnitSelect && (
                            <FormField
                                control={form.control}
                                name="target_unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Unit (optional)</FormLabel>
                                        <Select
                                            onValueChange={(value) =>
                                                field.onChange(
                                                    value === TARGET_UNIT_NONE_VALUE ? null : value
                                                )
                                            }
                                            value={field.value ?? TARGET_UNIT_NONE_VALUE}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select unit" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={TARGET_UNIT_NONE_VALUE}>
                                                    None
                                                </SelectItem>
                                                {configuredUnits.map((unit) => (
                                                    <SelectItem key={unit.id} value={unit.id}>
                                                        {unit.label}
                                                        {unit.symbol && unit.symbol !== unit.label
                                                            ? ` (${unit.symbol})`
                                                            : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Optional. Choose None to set a numeric target without a
                                            unit, or pick a unit from Planning Configuration.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {canEnterWeight && (
                            <FormField
                                control={form.control}
                                name="weight"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {TARGET_FIELD_LABEL}
                                            {weightUnit ? ` (${weightUnit.trim()})` : ""}
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} step="any" {...field} />
                                        </FormControl>
                                        {remainingWeight !== null && weightTarget !== null && (
                                            <FormDescription>
                                                {siblingUsed > 0
                                                    ? `${siblingUsed}${weightUnit} used by siblings. `
                                                    : ""}
                                                Up to {remainingWeight}
                                                {weightUnit} remaining of {weightTarget}
                                                {weightUnit}
                                                {parentNode ? ` (parent ${TARGET_FIELD_LABEL.toLowerCase()})` : ""}.
                                            </FormDescription>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {canEnterContribution && (
                            <FormField
                                control={form.control}
                                name="contribution_weight"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between gap-2">
                                            <FormLabel>{CONTRIBUTION_FIELD_LABEL} (%)</FormLabel>
                                            {remainingContribution > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() =>
                                                        field.onChange(remainingContribution)
                                                    }
                                                >
                                                    Use remaining {remainingContribution}%
                                                </Button>
                                            )}
                                        </div>
                                        <FormControl>
                                            <Input type="number" min={0} max={100} step="any" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            {contributionSiblingUsed > 0
                                                ? `${contributionSiblingUsed}% used by siblings. `
                                                : ""}
                                            Up to {remainingContribution}% remaining of {contributionTarget}%
                                            {parentNode ? " for this parent" : ""}.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {requiresWeight && (
                            <FormField
                                control={form.control}
                                name="target_allocation_mode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Period target allocation</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value ?? "divisible"}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select allocation mode" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="divisible">
                                                    Divisible across periods
                                                </SelectItem>
                                                <SelectItem value="lump">
                                                    Lump (one or few periods)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Divisible requires a share in every execution period that
                                            sums to the annual target. Lump lets you place the full
                                            annual target in one (or fewer) periods; unused periods
                                            may stay empty.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {requiresWeight && (
                            <FormField
                                control={form.control}
                                name="achievement_mode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Achievement evaluation</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value ?? "period"}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select achievement mode" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="period">
                                                    Per period (default)
                                                </SelectItem>
                                                <SelectItem value="annual">
                                                    Annual (once per year)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Period mode records achievement in each execution period.
                                            Annual mode records one achievement for the year on the
                                            annual plan view (for one-shot KPIs like &quot;train 1
                                            person&quot;).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="assignment_sharing_mode"
                            render={({ field }) => (
                                <FormItem className="rounded-lg border p-4 space-y-3">
                                    <div>
                                        <FormLabel>Assignment Mode</FormLabel>
                                        <FormDescription>
                                            Each node defines its own mode independently (not inherited
                                            from parent). Exclusive allows one active assignment.
                                            Shared allows multiple assignments and branch propagation.
                                            {nodeLevel === 1
                                                ? " At level 1, shared mode allows multiple sector assignments."
                                                : " Below level 1, assignments follow structure → department → user."}
                                        </FormDescription>
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        <span
                                            className={
                                                field.value === "exclusive"
                                                    ? "text-sm font-semibold text-foreground"
                                                    : "text-sm text-muted-foreground"
                                            }
                                        >
                                            Exclusive
                                        </span>
                                        <FormControl>
                                            <Switch
                                                checked={field.value === "shared"}
                                                onCheckedChange={(checked) =>
                                                    field.onChange(checked ? "shared" : "exclusive")
                                                }
                                            />
                                        </FormControl>
                                        <span
                                            className={
                                                field.value === "shared"
                                                    ? "text-sm font-semibold text-foreground"
                                                    : "text-sm text-muted-foreground"
                                            }
                                        >
                                            Shared
                                        </span>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={`Enter ${levelLabel.toLowerCase()} title`}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter description"
                                            className="min-h-[100px]"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                            </div>
                        </div>

                        <DialogFooter className="mt-0 shrink-0 border-t px-6 py-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isCreating || isUpdating}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || isUpdating}>
                                {isCreating || isUpdating
                                    ? "Saving..."
                                    : node
                                      ? "Update"
                                      : "Add Node"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
