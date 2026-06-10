"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
} from "@/redux/api/planApi";
import { useGetPlanRuleForVersionQuery } from "@/redux/api/planRuleApi";
import { useGetPlanningConfigurationQuery } from "@/redux/api/planningConfigApi";
import { TARGET_UNIT_NONE_VALUE } from "@/redux/types/planningConfig";
import { PlanNode, PlanRuleWeightMode, AssignmentSharingMode } from "@/redux/types/plan";
import {
    getStepLabel,
    getWeightTarget,
    getWeightUnitLabel,
    resolveNodeWeightMode,
    resolveNodeTargetUnit,
    stepRequiresWeight,
    isWeightModeSelectionLevel,
    TARGET_FIELD_LABEL,
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
    const { data: planningConfig } = useGetPlanningConfigurationQuery(undefined, { skip: !isOpen });
    const configuredUnits = planningConfig?.target_units ?? [];

    const nodeLevel = node?.level ?? (parentNode ? parentNode.level + 1 : 1);
    const levelLabel = getStepLabel(rule, nodeLevel);
    const requiresWeight = stepRequiresWeight(rule, nodeLevel);
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
                target_unit: z.string().optional().nullable(),
                level: z.coerce.number().optional(),
                order: z.coerce.number().optional(),
                assignment_sharing_mode: z.enum(["exclusive", "shared"]).default("exclusive"),
            }),
        []
    );

    type FormValues = z.infer<typeof formSchema>;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            plan_version_id: planVersionId,
            parent_id: null,
            title: "",
            description: "",
            weight: 0,
            weight_mode: null,
            target_unit: null,
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

    const { data: siblings = [] } = useGetPlanNodesQuery(
        {
            plan_version_id: planVersionId,
            parent_id: node?.parent_id ?? parentNode?.plan_node_id ?? null,
            is_active: true,
        },
        { skip: !isOpen || !canEnterWeight }
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
                target_unit: node.target_unit,
                level: node.level,
                order: node.order,
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
                target_unit: null,
                level: nodeLevel,
                assignment_sharing_mode: "exclusive",
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

        try {
            const modeToSave = showWeightModeSelect
                ? values.weight_mode
                : inheritedMode;

            const submitData = {
                plan_version_id: values.plan_version_id,
                parent_id: normalizeOptionalId(values.parent_id),
                type: levelToNodeType(nodeLevel),
                title: values.title,
                description: values.description,
                weight: requiresWeight ? values.weight : 0,
                weight_mode: requiresWeight ? modeToSave : null,
                target_unit:
                    requiresWeight && modeToSave === "number"
                        ? showWeightModeSelect
                            ? values.target_unit || null
                            : inheritedTargetUnit
                        : null,
                level: nodeLevel,
                order: values.order,
                assignment_sharing_mode: values.assignment_sharing_mode,
            };

            if (node) {
                await updateNode({
                    id: node.plan_node_id,
                    data: submitData,
                }).unwrap();
                actionFeedback.success("Plan node updated successfully");
            } else {
                await createNode(submitData).unwrap();
                actionFeedback.success("Plan node created successfully");
            }
            onClose();
        } catch (error: unknown) {
            actionFeedback.error(getApiErrorMessage(error));
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {node
                            ? `Edit ${levelLabel}`
                            : parentNode
                              ? `Add ${levelLabel} under: ${parentNode.title}`
                              : `Add ${levelLabel}`}
                    </DialogTitle>
                </DialogHeader>

                {rule && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground -mt-2">
                        <span>Rule:</span>
                        <Badge variant="outline">{rule.name}</Badge>
                        <Badge variant="secondary">Level {nodeLevel}</Badge>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
