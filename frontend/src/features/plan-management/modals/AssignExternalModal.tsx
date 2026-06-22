"use client";

import { useEffect, useState } from "react";
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
import { useForm } from "react-hook-form";
import { createFormResolver } from "@/lib/zod-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { actionFeedback } from "@/components/action-feedback";
import {
    useCreateExternalAssignmentMutation,
    useGetPlanNodeAssignmentOptionsQuery,
} from "@/redux/api/planAssignmentApi";
import { AssignmentSectorsPanel } from "@/components/assignment-selectors";
import { PlanAssignmentScopeBanner } from "../components/PlanAssignmentScopeBanner";
import { AssignmentModeAlerts } from "../components/AssignmentModeAlerts";
import {
    formatPlanAssignmentButtonLabel,
    getPlanNodeAssignmentTypeLabel,
} from "@/utils/planAssignmentUtils";
import { PlanNode } from "@/redux/types/plan";

const formSchema = z.object({
    plan_node_id: z.string().uuid(),
    government_structure_id: z.string().uuid({ message: "Sector structure is required" }),
    is_visible: z.boolean(),
    requires_report: z.boolean(),
});

interface AssignExternalModalProps {
    isOpen: boolean;
    onClose: () => void;
    planNodeId: string;
    nodeType?: PlanNode["type"];
}

export function AssignExternalModal({
    isOpen,
    onClose,
    planNodeId,
    nodeType,
}: AssignExternalModalProps) {
    const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
    const [createAssignment, { isLoading: isSubmitting }] = useCreateExternalAssignmentMutation();
    const { data: options, isLoading: isLoadingOptions } = useGetPlanNodeAssignmentOptionsQuery(
        { nodeId: planNodeId },
        { skip: !isOpen }
    );

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
        defaultValues: {
            plan_node_id: planNodeId,
            government_structure_id: "",
            is_visible: true,
            requires_report: true,
        },
    });

    useEffect(() => {
        if (isOpen) {
            setSelectedSectorId(null);
            form.reset({
                plan_node_id: planNodeId,
                government_structure_id: "",
                is_visible: true,
                requires_report: true,
            });
        }
    }, [isOpen, planNodeId, form]);

    useEffect(() => {
        form.setValue("government_structure_id", selectedSectorId ?? "");
    }, [selectedSectorId, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!values.government_structure_id) {
            actionFeedback.error("Please select a sector");
            return;
        }

        try {
            await createAssignment(values).unwrap();
            actionFeedback.success(`${getPlanNodeAssignmentTypeLabel(nodeType)} assigned successfully`);
            onClose();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Something went wrong");
        }
    }

    const sectors = options?.sectors ?? [];
    const isExclusive = options?.assignment_sharing_mode === "exclusive";
    const hasActiveAssignment = (options?.active_assignment_count ?? 0) > 0;

    const typeLabel = getPlanNodeAssignmentTypeLabel(nodeType);
    const submitLabel = formatPlanAssignmentButtonLabel(nodeType, {
        reassign: isExclusive && hasActiveAssignment,
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px] top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>
                        Assign {typeLabel} (Level {options?.level ?? "—"})
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                            <div className="space-y-4 pb-4">
                                <PlanAssignmentScopeBanner
                                    options={options}
                                    isLoading={isLoadingOptions}
                                    compact
                                />

                                <AssignmentModeAlerts options={options} />

                                <FormField
                                    control={form.control}
                                    name="government_structure_id"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel>Select Sector Structure</FormLabel>
                                            <FormDescription>
                                                Root plans can only be assigned to this plan&apos;s sector
                                                or its child sectors.
                                            </FormDescription>
                                            <AssignmentSectorsPanel
                                                sectors={sectors}
                                                selectedId={selectedSectorId}
                                                onSelect={setSelectedSectorId}
                                                isLoading={isLoadingOptions}
                                                disabled={!options?.can_assign}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4 border-t pt-2">
                                    <FormField
                                        control={form.control}
                                        name="is_visible"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border p-4 shadow-sm">
                                                <div className="min-w-0 space-y-0.5">
                                                    <FormLabel>Open for Visibility</FormLabel>
                                                    <FormDescription className="break-words">
                                                        Allow this sector to view the node&apos;s progress
                                                        and details.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="requires_report"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border p-4 shadow-sm">
                                                <div className="min-w-0 space-y-0.5">
                                                    <FormLabel>Mandatory Reporting</FormLabel>
                                                    <FormDescription className="break-words">
                                                        Restricts the assigned person to provide a mandatory
                                                        report.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    !options?.can_assign ||
                                    sectors.length === 0 ||
                                    !selectedSectorId
                                }
                                className="min-w-0 w-full sm:w-auto"
                            >
                                <span className="truncate">
                                    {isSubmitting ? "Assigning..." : submitLabel}
                                </span>
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
