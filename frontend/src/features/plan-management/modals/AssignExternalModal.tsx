"use client";

import { useEffect } from "react";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { actionFeedback } from "@/components/action-feedback";
import {
    useCreateExternalAssignmentMutation,
    useGetPlanNodeAssignmentOptionsQuery,
} from "@/redux/api/planAssignmentApi";

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
}

export function AssignExternalModal({
    isOpen,
    onClose,
    planNodeId,
}: AssignExternalModalProps) {
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
            form.reset({
                plan_node_id: planNodeId,
                government_structure_id: "",
                is_visible: true,
                requires_report: true,
            });
        }
    }, [isOpen, planNodeId, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await createAssignment(values).unwrap();
            actionFeedback.success("Sector assignment created successfully");
            onClose();
        } catch (error: any) {
            actionFeedback.error(error.data?.message || "Something went wrong");
        }
    }

    const sectors = options?.sectors ?? [];
    const isExclusive = options?.assignment_sharing_mode === "exclusive";
    const hasActiveAssignment = (options?.active_assignment_count ?? 0) > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px] top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>Assign Sector (Level {options?.level ?? "—"})</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                            <div className="space-y-6 pb-4">
                                {isExclusive && hasActiveAssignment && (
                                    <p className="break-words rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                                        Exclusive mode: assigning a new sector will replace the current active assignment.
                                        Previous assignments are kept in history.
                                    </p>
                                )}

                                {options?.assignment_sharing_mode === "shared" && (
                                    <p className="break-words rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                        Shared mode: multiple sectors can be assigned to this node. Each child node
                                        defines its own sharing mode independently.
                                    </p>
                                )}

                                {options?.message && (
                                    <p className="break-words rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                        {options.message}
                                    </p>
                                )}

                                <FormField
                                    control={form.control}
                                    name="government_structure_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Sector Structure</FormLabel>
                                            <FormDescription>
                                                Root plans can only be assigned to this plan&apos;s sector or its child sectors.
                                            </FormDescription>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                disabled={isLoadingOptions || !options?.can_assign}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="min-w-0">
                                                        <SelectValue placeholder={
                                                            isLoadingOptions
                                                                ? "Loading sectors..."
                                                                : sectors.length
                                                                    ? "Select sector structure"
                                                                    : "No eligible sectors"
                                                        } />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {sectors.map((struct) => (
                                                        <SelectItem
                                                            key={struct.government_structure_id}
                                                            value={struct.government_structure_id}
                                                        >
                                                            {struct.name}
                                                            {struct.level > 1 ? ` (Level ${struct.level})` : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                                                        Allow this sector to view the node&apos;s progress and details.
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
                                                        Restricts the assigned person to provide a mandatory report.
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
                                disabled={isSubmitting || !options?.can_assign || sectors.length === 0}
                                className="min-w-0 w-full sm:w-auto"
                            >
                                <span className="truncate">
                                    {isSubmitting
                                        ? "Assigning..."
                                        : isExclusive && hasActiveAssignment
                                          ? "Reassign Sector"
                                          : "Assign Sector"}
                                </span>
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
