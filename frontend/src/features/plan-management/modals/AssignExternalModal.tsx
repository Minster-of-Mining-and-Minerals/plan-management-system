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
import { toast } from "sonner";
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
        planNodeId,
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
            toast.success("Sector assignment created successfully");
            onClose();
        } catch (error: any) {
            toast.error(error.data?.message || "Something went wrong");
        }
    }

    const sectors = options?.sectors ?? [];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assign Sector (Level {options?.level ?? "—"})</DialogTitle>
                </DialogHeader>

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
                                {isSubmitting ? "Assigning..." : "Assign"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
