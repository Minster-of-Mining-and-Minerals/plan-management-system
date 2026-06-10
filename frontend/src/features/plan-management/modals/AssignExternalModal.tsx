"use client";

import { useEffect } from "react";
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
    is_visible: z.boolean().default(true),
    requires_report: z.boolean().default(true),
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
        resolver: zodResolver(formSchema),
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assign Sector (Level {options?.level ?? "—"})</DialogTitle>
                </DialogHeader>

                {isExclusive && hasActiveAssignment && (
                    <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        Exclusive mode: assigning a new sector will replace the current active assignment.
                        Previous assignments are kept in history.
                    </p>
                )}

                {options?.assignment_sharing_mode === "shared" && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                        Shared mode: multiple sectors can be assigned to this node. Each child node
                        defines its own sharing mode independently.
                    </p>
                )}

                {options?.message && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        {options.message}
                    </p>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                            <SelectTrigger>
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

                        <div className="space-y-4 pt-2 border-t">
                            <FormField
                                control={form.control}
                                name="is_visible"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Open for Visibility</FormLabel>
                                            <FormDescription>
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
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Mandatory Reporting</FormLabel>
                                            <FormDescription>
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

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !options?.can_assign || sectors.length === 0}
                            >
                                {isSubmitting
                                    ? "Assigning..."
                                    : isExclusive && hasActiveAssignment
                                      ? "Reassign Sector"
                                      : "Assign Sector"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
