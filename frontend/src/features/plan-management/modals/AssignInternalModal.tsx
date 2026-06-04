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
import { toast } from "sonner";
import {
    useCreateInternalAssignmentMutation,
    useGetAssignmentActionsQuery,
    useGetPlanNodeAssignmentOptionsQuery,
} from "@/redux/api/planAssignmentApi";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    const { data: actions = [] } = useGetAssignmentActionsQuery(undefined, { skip: !isOpen });
    const { data: options, isLoading: isLoadingOptions } = useGetPlanNodeAssignmentOptionsQuery(
        planNodeId,
        { skip: !isOpen }
    );

    const allowDepartment = options?.allow_department ?? false;
    const allowUser = options?.allow_user ?? false;

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
        if (isOpen && options) {
            const initialType = options.allow_department
                ? "structure"
                : options.allow_user
                    ? "user"
                    : "user";
            form.reset({
                plan_node_id: planNodeId,
                assignment_type: initialType,
                internal_structure_id: null,
                user_id: null,
                action_id: "",
            });
        }
    }, [isOpen, planNodeId, options, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const payload = {
                plan_node_id: values.plan_node_id,
                action_id: values.action_id,
                user_id: values.assignment_type === "user" ? values.user_id : null,
                internal_structure_id: values.assignment_type === "structure" ? values.internal_structure_id : null,
            };

            await createAssignment(payload).unwrap();
            toast.success("Assignment created successfully");
            onClose();
        } catch (error: any) {
            toast.error(error.data?.message || "Something went wrong");
        }
    }

    const assignmentType = form.watch("assignment_type");
    const departments = options?.departments ?? [];
    const users = options?.users ?? [];
    const showTypeToggle = allowDepartment && allowUser;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>
                        Assign {allowDepartment && !allowUser
                            ? "Department"
                            : allowUser && !allowDepartment
                                ? "User"
                                : "User or Department"} (Level {options?.level ?? "—"})
                    </DialogTitle>
                </DialogHeader>

                {options?.parent_context && (
                    <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        Parent assigned to:{" "}
                        <span className="font-semibold text-gray-900">
                            {options.parent_context.label}
                        </span>{" "}
                        ({options.parent_context.type})
                    </p>
                )}

                {options?.message && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        {options.message}
                    </p>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {showTypeToggle && (
                            <FormField
                                control={form.control}
                                name="assignment_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assignment Type</FormLabel>
                                        <Tabs
                                            value={field.value}
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                form.setValue("user_id", null);
                                                form.setValue("internal_structure_id", null);
                                            }}
                                            className="w-full"
                                        >
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="structure" disabled={!allowDepartment}>
                                                    Department
                                                </TabsTrigger>
                                                <TabsTrigger value="user" disabled={!allowUser}>
                                                    User
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </FormItem>
                                )}
                            />
                        )}

                        {!showTypeToggle && allowDepartment && (
                            <FormDescription>
                                This department has no sub-departments. Assign a user to continue the hierarchy.
                            </FormDescription>
                        )}

                        {(assignmentType === "user" || (!allowDepartment && allowUser)) ? (
                            <FormField
                                control={form.control}
                                name="user_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select User</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ""}
                                            disabled={isLoadingOptions || !options?.can_assign}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={
                                                        isLoadingOptions
                                                            ? "Loading users..."
                                                            : users.length
                                                                ? "Select a user"
                                                                : "No eligible users"
                                                    } />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {users.map((user) => (
                                                    <SelectItem key={user.user_id} value={user.user_id}>
                                                        {user.full_name} ({user.email})
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
                                            disabled={isLoadingOptions || !options?.can_assign}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={
                                                        isLoadingOptions
                                                            ? "Loading departments..."
                                                            : departments.length
                                                                ? "Select department"
                                                                : "No eligible departments"
                                                    } />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem
                                                        key={dept.internal_structure_id}
                                                        value={dept.internal_structure_id}
                                                    >
                                                        {dept.name}
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
                                                <SelectItem
                                                    key={action.assignment_action_id}
                                                    value={action.assignment_action_id}
                                                >
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
                            <Button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    !options?.can_assign ||
                                    (assignmentType === "user" && users.length === 0) ||
                                    (assignmentType === "structure" && departments.length === 0)
                                }
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
