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
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    useCreateExternalAssignmentMutation,
} from "@/redux/api/planAssignmentApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";

const formSchema = z.object({
    plan_node_id: z.string().uuid(),
    government_structure_id: z.string().uuid({ message: "Government structure is required" }),
    role: z.enum(["owner", "collaborator"]),
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
            role: "collaborator",
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                plan_node_id: planNodeId,
                government_structure_id: "",
                role: "collaborator",
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="government_structure_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Government Structure</FormLabel>
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

                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assignment Role</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="owner">Owner / Responsible</SelectItem>
                                            <SelectItem value="collaborator">Collaborator / Participant</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-6">
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
