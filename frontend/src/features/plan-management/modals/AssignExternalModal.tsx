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
} from "@/redux/api/planAssignmentApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";

const formSchema = z.object({
    plan_node_id: z.string().uuid(),
    government_structure_id: z.string().uuid({ message: "Government structure is required" }),
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
    const { data: structures = [] } = useGetGovernmentStructuresQuery({});

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
            toast.success("External assignment created successfully");
            onClose();
        } catch (error: any) {
            toast.error(error.data?.message || "Something went wrong");
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assign External Government Structure</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="government_structure_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Government Structure</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a structure" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {structures.map((struct: any) => (
                                                <SelectItem key={struct.government_structure_id} value={struct.government_structure_id}>
                                                    {struct.name}
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
                                                Allow this structure to view the node's progress and details.
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
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Assigning..." : "Assign"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
