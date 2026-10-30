"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { createFormResolver } from "@/lib/zod-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionFeedback } from "@/components/action-feedback";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";
import {
  useCreateRegionalPlanNodeMutation,
  useUpdateRegionalPlanNodeMutation,
} from "@/redux/api/regionalPlanApi";
import { useGetRegionalStructuresQuery } from "@/redux/api/regionApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import type { PlanRuleWeightMode } from "@/redux/types/plan";
import type {
  RegionalPlanNode,
  RegionalPlanRule,
  RegionalPlanningConfiguration,
  RegionalTargetUnit,
} from "@/redux/types/regionalPlan";
import {
  getStepLabel,
  getWeightTarget,
  getWeightUnitLabel,
  resolveNodeWeightMode,
  resolveNodeTargetUnit,
  getStepTargetRequirement,
  stepAllowsTarget,
  stepRequiresTarget,
  stepTargetIsOptional,
  stepRequiresWeight,
  stepRequiresContributionWeight,
  isWeightModeSelectionLevel,
  TARGET_FIELD_LABEL,
  CONTRIBUTION_FIELD_LABEL,
  getContributionSiblingTarget,
  levelToNodeType,
  WEIGHT_MODE_LABELS,
} from "@/utils/planRuleUtils";

const TARGET_UNIT_NONE_VALUE = "__none__";

interface CreateRegionalPlanNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  regionId: string;
  planVersionId: string;
  parentNode?: RegionalPlanNode | null;
  node?: RegionalPlanNode | null;
  rule?: RegionalPlanRule | null;
  planningConfig?: RegionalPlanningConfiguration | null;
  allNodes?: RegionalPlanNode[];
}

export function CreateRegionalPlanNodeModal({
  isOpen,
  onClose,
  regionId,
  planVersionId,
  parentNode,
  node,
  rule,
  planningConfig,
  allNodes = [],
}: CreateRegionalPlanNodeModalProps) {
  const [createNode, { isLoading: isCreating }] = useCreateRegionalPlanNodeMutation();
  const [updateNode, { isLoading: isUpdating }] = useUpdateRegionalPlanNodeMutation();

  const { data: structures = [] } = useGetRegionalStructuresQuery(
    { region_id: regionId },
    { skip: !regionId || !isOpen }
  );
  const { data: users = [] } = useGetUsersQuery(
    { region_id: regionId },
    { skip: !regionId || !isOpen }
  );

  const configuredUnits: RegionalTargetUnit[] = useMemo(() => {
    const raw = planningConfig?.target_units;
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      return [
        { id: "person", label: "Person", symbol: "persons" },
        { id: "km", label: "Kilometer", symbol: "km" },
        { id: "birr", label: "Birr", symbol: "ETB" },
        { id: "ton", label: "Ton", symbol: "t" },
        { id: "unit", label: "Unit", symbol: "units" },
        { id: "kg", label: "Kilogram", symbol: "kg" },
      ];
    }
    return raw.map((u, i) => {
      if (typeof u === "string") {
        return { id: u.toLowerCase().replace(/\s+/g, "_") || `unit-${i}`, label: u, symbol: u };
      }
      return {
        id: u.id || `unit-${i}`,
        label: u.label || `Unit ${i + 1}`,
        symbol: u.symbol || u.label,
      };
    });
  }, [planningConfig?.target_units]);

  const nodeLevel = node?.level ?? (parentNode ? parentNode.level + 1 : 1);
  const levelLabel = getStepLabel(rule, nodeLevel);
  const targetRequirement = getStepTargetRequirement(rule, nodeLevel);
  const allowsTarget = stepAllowsTarget(rule, nodeLevel);
  const isTargetRequired = stepRequiresTarget(rule, nodeLevel);
  const isTargetOptional = stepTargetIsOptional(rule, nodeLevel);
  const requiresContribution = stepRequiresContributionWeight(rule, nodeLevel);
  const showWeightModeSelect = allowsTarget && isWeightModeSelectionLevel(rule, nodeLevel);
  const inheritedMode = resolveNodeWeightMode(rule as any, nodeLevel, parentNode as any, node as any);

  const formSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(2, "Title must be at least 2 characters").max(255),
        description: z.string().optional().nullable(),
        weight: z.coerce.number().min(0).default(0),
        weight_mode: z.preprocess(
          (val) => (val === "" || val === "__none__" ? null : val),
          z.enum(["number", "percentage", "frequency"]).optional().nullable()
        ),
        contribution_weight: z.coerce.number().min(0).max(100).default(0),
        target_unit: z.preprocess(
          (val) => (val === "" || val === "__none__" ? null : val),
          z.string().optional().nullable()
        ),
        target_allocation_mode: z.preprocess(
          (val) => (val === "lump" ? "lump" : "divisible"),
          z.enum(["divisible", "lump"]).default("divisible")
        ),
        achievement_mode: z.preprocess(
          (val) => (val === "annual" ? "annual" : "period"),
          z.enum(["period", "annual"]).default("period")
        ),
        regional_structure_id: z.preprocess(
          (val) => (val === "" || val === "__none__" ? null : val),
          z.string().optional().nullable()
        ),
        assigned_user_id: z.preprocess(
          (val) => (val === "" || val === "__none__" ? null : val),
          z.string().optional().nullable()
        ),
        assignment_sharing_mode: z
          .enum(["exclusive", "shared", "isolated"])
          .optional()
          .default("exclusive"),
      }),
    []
  );

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: createFormResolver<FormValues>(formSchema),
    defaultValues: {
      title: "",
      description: "",
      weight: 0,
      weight_mode: null,
      contribution_weight: 0,
      target_unit: null,
      target_allocation_mode: "divisible",
      achievement_mode: "period",
      regional_structure_id: null,
      assigned_user_id: null,
      assignment_sharing_mode: "exclusive",
    },
  });

  const selectedWeightMode = form.watch("weight_mode");
  const selectedTargetUnit = form.watch("target_unit");
  const effectiveWeightMode: PlanRuleWeightMode | null = showWeightModeSelect
    ? ((selectedWeightMode as PlanRuleWeightMode | null) ?? ((node?.weight_mode as PlanRuleWeightMode | null) || null))
    : inheritedMode;

  const inheritedTargetUnit = resolveNodeTargetUnit(rule as any, nodeLevel, parentNode as any, node as any);
  const effectiveTargetUnit =
    effectiveWeightMode === "number"
      ? showWeightModeSelect
        ? selectedTargetUnit ?? node?.target_unit ?? null
        : inheritedTargetUnit
      : null;

  const showTargetUnitSelect =
    allowsTarget && effectiveWeightMode === "number" && showWeightModeSelect;

  const canEnterWeight =
    allowsTarget && (!showWeightModeSelect || !!effectiveWeightMode);

  const canEnterContribution = requiresContribution;

  // Sibling calculations
  const targetParentId = node ? node.parent_id : parentNode ? parentNode.regional_plan_node_id : null;
  const siblings = useMemo(
    () => allNodes.filter((n) => (n.parent_id || null) === targetParentId),
    [allNodes, targetParentId]
  );

  const weightTarget = getWeightTarget(
    (parentNode ?? node?.parent) as any,
    effectiveWeightMode
  );
  const siblingUsed = siblings
    .filter((s) => s.regional_plan_node_id !== node?.regional_plan_node_id)
    .reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
  const remainingWeight =
    weightTarget !== null ? Math.max(0, weightTarget - siblingUsed) : null;
  const weightUnit = getWeightUnitLabel(
    effectiveWeightMode,
    effectiveTargetUnit,
    configuredUnits as any
  );

  const contributionTarget = getContributionSiblingTarget();
  const contributionSiblingUsed = siblings
    .filter((s) => s.regional_plan_node_id !== node?.regional_plan_node_id)
    .reduce((sum, s) => sum + (Number(s.contribution_weight) || 0), 0);
  const remainingContribution = Math.max(0, contributionTarget - contributionSiblingUsed);

  useEffect(() => {
    if (!isOpen) return;

    if (node) {
      form.reset({
        title: node.title,
        description: node.description || "",
        weight: node.weight || 0,
        weight_mode: (node.weight_mode as "number" | "percentage" | "frequency" | null) || null,
        contribution_weight: node.contribution_weight ?? 0,
        target_unit: node.target_unit || null,
        target_allocation_mode: node.target_allocation_mode === "lump" ? "lump" : "divisible",
        achievement_mode: node.achievement_mode === "annual" ? "annual" : "period",
        regional_structure_id:
          node.regional_structure_id ||
          node.internalAssignments?.[0]?.regional_structure_id ||
          null,
        assigned_user_id:
          node.assigned_user_id ||
          node.internalAssignments?.[0]?.assignedUser?.user_id ||
          null,
        assignment_sharing_mode:
          node.assignment_sharing_mode === "shared" ? "shared" : "exclusive",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        weight: 0,
        weight_mode: null,
        contribution_weight: requiresContribution ? (remainingContribution > 0 ? remainingContribution : 0) : 0,
        target_unit: null,
        target_allocation_mode: "divisible",
        achievement_mode: "period",
        regional_structure_id: parentNode?.regional_structure_id || null,
        assigned_user_id: null,
        assignment_sharing_mode:
          parentNode?.assignment_sharing_mode === "shared" ? "shared" : "exclusive",
      });
    }
  }, [node, parentNode, isOpen, form, remainingContribution, requiresContribution]);

  async function onSubmit(values: FormValues) {
    if (allowsTarget && showWeightModeSelect && !values.weight_mode) {
      form.setError("weight_mode", {
        message: `Select a ${TARGET_FIELD_LABEL.toLowerCase()} evaluation mode`,
      });
      return;
    }

    if (isTargetRequired && Number(values.weight) <= 0) {
      form.setError("weight", {
        message: `${TARGET_FIELD_LABEL} is required at this level`,
      });
      return;
    }

    if (
      allowsTarget &&
      weightTarget !== null &&
      Number(values.weight) > 0 &&
      siblingUsed + Number(values.weight) > weightTarget + 0.001
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
      const modeToSave = showWeightModeSelect ? values.weight_mode : inheritedMode;

      const payload = {
        title: values.title,
        description: values.description || null,
        weight: allowsTarget ? Number(values.weight) || 0 : 0,
        weight_mode: allowsTarget ? modeToSave : null,
        contribution_weight: requiresContribution ? Number(values.contribution_weight) : null,
        target_unit:
          allowsTarget && modeToSave === "number"
            ? showWeightModeSelect
              ? values.target_unit || null
              : inheritedTargetUnit
            : null,
        target_allocation_mode: allowsTarget ? values.target_allocation_mode : null,
        achievement_mode: allowsTarget ? values.achievement_mode : null,
        level: nodeLevel,
        assignment_sharing_mode: values.assignment_sharing_mode,
        regional_structure_id: values.regional_structure_id || null,
        assigned_user_id: values.assigned_user_id || null,
      };

      if (node) {
        await updateNode({
          id: node.regional_plan_node_id,
          region_id: regionId,
          data: payload as any,
        }).unwrap();
        actionFeedback.success(`${levelLabel} updated successfully`);
      } else {
        await createNode({
          region_id: regionId,
          data: {
            regional_plan_version_id: planVersionId,
            parent_id: parentNode ? parentNode.regional_plan_node_id : null,
            type: levelToNodeType(nodeLevel),
            ...payload,
          } as any,
        }).unwrap();
        actionFeedback.success(`${levelLabel} created successfully`);
      }
      onClose();
    } catch (error: unknown) {
      actionFeedback.error(getApiErrorMessage(error));
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[620px]")}>
        <DialogHeader className="px-6 pt-6 pb-3 pr-12">
          <DialogTitle>
            {node
              ? `Edit ${levelLabel}`
              : parentNode
              ? `Add ${levelLabel} under: ${parentNode.title}`
              : `Add ${levelLabel}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {node
              ? `Update details and configuration for this ${levelLabel.toLowerCase()}.`
              : `Configure details, targets, and assignments for this new ${levelLabel.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>

        {rule && (
          <div className="flex shrink-0 items-center gap-2 px-6 pb-2 text-xs text-muted-foreground">
            <span>Rule:</span>
            <Badge variant="outline" className="text-xs">
              {rule.name}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Level {nodeLevel}
            </Badge>
            {allowsTarget && (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                {isTargetRequired ? "Target Required" : "Target Optional"}
              </Badge>
            )}
            {requiresContribution && (
              <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                Contribution Weight
              </Badge>
            )}
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error("Regional Node Form Validation Errors:", errors);
              const firstErr = Object.values(errors)[0] as any;
              if (firstErr?.message) {
                actionFeedback.error(firstErr.message);
              } else {
                actionFeedback.error("Please fill in all required fields correctly.");
              }
            })}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className={cn(DIALOG_SCROLLABLE_BODY, "px-6 pb-4")}>
              <div className="space-y-4">
                {/* Mode selection if this is the selection level */}
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
                            {Object.entries(WEIGHT_MODE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Deeper levels in this branch inherit this evaluation mode.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Target Unit selection if number mode and selection level */}
                {showTargetUnitSelect && (
                  <FormField
                    control={form.control}
                    name="target_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Unit (optional)</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === TARGET_UNIT_NONE_VALUE ? null : value)
                          }
                          value={field.value ?? TARGET_UNIT_NONE_VALUE}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TARGET_UNIT_NONE_VALUE}>None</SelectItem>
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
                          Pick a unit configured for this region, or select None.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Target Value input if level requires target */}
                {canEnterWeight && (
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {TARGET_FIELD_LABEL}
                          {isTargetRequired ? " *" : " (Optional)"}
                          {weightUnit ? ` (${weightUnit.trim()})` : ""}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="any" {...field} />
                        </FormControl>
                        {remainingWeight !== null && weightTarget !== null && (
                          <FormDescription>
                            {siblingUsed > 0 ? `${siblingUsed}${weightUnit} used by siblings. ` : ""}
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

                {/* Contribution Weight input if level requires contribution */}
                {canEnterContribution && (
                  <FormField
                    control={form.control}
                    name="contribution_weight"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>{CONTRIBUTION_FIELD_LABEL} (%)</FormLabel>
                          {remainingContribution > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-primary"
                              onClick={() => field.onChange(remainingContribution)}
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
                          Remaining: {remainingContribution}%. Total siblings must not exceed 100%.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{levelLabel} Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={`Enter ${levelLabel.toLowerCase()} title...`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Enter description or notes for this ${levelLabel.toLowerCase()}...`}
                          rows={3}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Target allocation mode & achievement mode (if target allowed) */}
                {allowsTarget && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="target_allocation_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Allocation Mode</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="divisible">Divisible (Split across periods)</SelectItem>
                              <SelectItem value="lump">Lump Sum (Single deadline)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="achievement_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Achievement Mode</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="period">Periodic (Report every period)</SelectItem>
                              <SelectItem value="annual">Annual (Report once per year)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Department / Regional Structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="regional_structure_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Directorate / Structure</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                          value={field.value ?? "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select directorate" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">None (Inherit from parent)</SelectItem>
                            {structures.map((s: any) => (
                              <SelectItem key={s.regional_structure_id} value={s.regional_structure_id}>
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
                    name="assigned_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Officer / User</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                          value={field.value ?? "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select officer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Unassigned</SelectItem>
                            {users.map((u: any) => (
                              <SelectItem key={u.user_id} value={u.user_id}>
                                {u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email} ({u.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/20">
              <Button type="button" variant="outline" onClick={onClose} disabled={isCreating || isUpdating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? "Saving..." : node ? "Save Changes" : `Create ${levelLabel}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
