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
    useCreateInternalAssignmentMutation,
    useGetAssignmentActionsQuery,
} from "@/redux/api/planAssignmentApi";
import { useGetInternalStructuresQuery } from "@/redux/api/internalStructureApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
    plan_node_id: z.string().uuid(),
    assignment_type: z.enum(["user", "structure"]),
    internal_structure_id: z.string().uuid().optional().nullable(),
    user_id: z.string().uuid().optional().nullable(),
    action_id: z.string().uuid({ message: "Action is required" }),
}).refine(data => {
    if (data.assignment_type === "user") return !!data.user_id;
    if (data.assignment_type === "structure") return !!data.internal_structure_id;
    return false;
}, {
    message: "Selection is required based on type",
    path: ["user_id"]
});

interface AssignInternalModalProps {
    isOpen: boolean;
    onClose: () => void;
    planNodeId: string;
}

export function AssignInternalModal({
    isOpen,
    onClose,
    planNodeId,
}: AssignInternalModalProps) {
    const [createAssignment, { isLoading: isSubmitting }] = useCreateInternalAssignmentMutation();
    const { data: actions = [] } = useGetAssignmentActionsQuery();
    const { data: structures = [] } = useGetInternalStructuresQuery();
    const { data: usersResponse } = useGetUsersQuery({});
    
    const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse as any)?.data || [];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            plan_node_id: planNodeId,
            assignment_type: "user",
            internal_structure_id: null,
            user_id: null,
            action_id: "",
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                plan_node_id: planNodeId,
                assignment_type: "user",
                internal_structure_id: null,
                user_id: null,
                action_id: "",
            });
        }
    }, [isOpen, planNodeId, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const payload = {
                plan_node_id: values.plan_node_id,
                action_id: values.action_id,
                user_id: values.assignment_type === "user" ? values.user_id : null,
                internal_structure_id: values.assignment_type === "structure" ? values.internal_structure_id : null,
            };

            await createAssignment(payload).unwrap();
            toast.success("Internal assignment created successfully");
            onClose();
        } catch (error: any) {
            toast.error(error.data?.message || "Something went wrong");
        }
    }

    const assignmentType = form.watch("assignment_type");

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assign User or Department</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="assignment_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assignment Type</FormLabel>
                                    <Tabs 
                                        defaultValue={field.value} 
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            form.setValue("user_id", null);
                                            form.setValue("internal_structure_id", null);
                                        }}
                                        className="w-full"
                                    >
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="user">User</TabsTrigger>
                                            <TabsTrigger value="structure">Department</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </FormItem>
                            )}
                        />

                        {assignmentType === "user" ? (
                            <FormField
                                control={form.control}
                                name="user_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select User</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a user" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {users.map((user: any) => (
                                                    <SelectItem key={user.user_id} value={user.user_id}>
                                                        {user.name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <FormField
                                control={form.control}
                                name="internal_structure_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Department</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select department" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {structures.map((struct: any) => (
                                                    <SelectItem key={struct.internal_structure_id} value={struct.internal_structure_id}>
                                                        {struct.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="action_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Action / Responsibility</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an action" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {actions.map((action) => (
                                                <SelectItem key={action.assignment_action_id} value={action.assignment_action_id}>
                                                    {action.name}
                                                </SelectItem>
                                            ))}
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
