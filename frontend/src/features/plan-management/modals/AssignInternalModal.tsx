"use client";

import { useEffect, useState } from "react";
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
import { actionFeedback } from "@/components/action-feedback";
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
    const [branchExternalId, setBranchExternalId] = useState<string | undefined>();
    const [branchInternalId, setBranchInternalId] = useState<string | undefined>();
    const [branchMode, setBranchMode] = useState<"auto" | "controlled">("auto");

    const [createAssignment, { isLoading: isSubmitting }] = useCreateInternalAssignmentMutation();
    const { data: actions = [] } = useGetAssignmentActionsQuery(undefined, { skip: !isOpen });

    const { data: initialOptions } = useGetPlanNodeAssignmentOptionsQuery(
        { nodeId: planNodeId },
        { skip: !isOpen }
    );

    const useControlledBranch = branchMode === "controlled";

    const { data: branchOptionsData, isLoading: isLoadingOptions } = useGetPlanNodeAssignmentOptionsQuery(
        {
            nodeId: planNodeId,
            branchExternalAssignmentId: useControlledBranch ? branchExternalId : undefined,
            branchInternalAssignmentId: useControlledBranch ? branchInternalId : undefined,
        },
        { skip: !isOpen }
    );

    const effectiveOptions = branchOptionsData ?? initialOptions;
    const allowDepartment = effectiveOptions?.allow_department ?? false;
    const allowUser = effectiveOptions?.allow_user ?? false;
    const branchOptions = initialOptions?.parent_branch_options ?? [];
    const supportsBranchSelection = initialOptions?.supports_branch_selection ?? false;
    const allowPropagateAll = initialOptions?.allow_propagate_all_branches ?? false;

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
        if (!isOpen) {
            setBranchExternalId(undefined);
            setBranchInternalId(undefined);
            setBranchMode("auto");
            return;
        }

        if (initialOptions) {
            setBranchMode(initialOptions.allow_propagate_all_branches ? "auto" : "controlled");
        }
    }, [isOpen, planNodeId, initialOptions?.allow_propagate_all_branches]);

    useEffect(() => {
        if (!isOpen || !effectiveOptions) return;

        const initialType = effectiveOptions.allow_department
            ? "structure"
            : effectiveOptions.allow_user
                ? "user"
                : "user";
        form.reset({
            plan_node_id: planNodeId,
            assignment_type: initialType,
            internal_structure_id: null,
            user_id: null,
            action_id: "",
        });
    }, [isOpen, planNodeId, effectiveOptions?.allow_department, effectiveOptions?.allow_user, branchMode, branchExternalId, branchInternalId, form]);

    function handleBranchSelect(value: string) {
        const branch = branchOptions.find(
            (b) => b.external_assignment_id === value || b.internal_assignment_id === value
        );
        if (branch?.external_assignment_id) {
            setBranchExternalId(branch.external_assignment_id);
            setBranchInternalId(undefined);
        } else if (branch?.internal_assignment_id) {
            setBranchInternalId(branch.internal_assignment_id);
            setBranchExternalId(undefined);
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const propagateAll = allowPropagateAll && branchMode === "auto";
            const payload = {
                plan_node_id: values.plan_node_id,
                action_id: values.action_id,
                user_id: values.assignment_type === "user" ? values.user_id : null,
                internal_structure_id: values.assignment_type === "structure" ? values.internal_structure_id : null,
                branch_external_assignment_id: useControlledBranch ? (branchExternalId ?? null) : null,
                branch_internal_assignment_id: useControlledBranch ? (branchInternalId ?? null) : null,
                propagate_all_branches: propagateAll,
            };

            const result = await createAssignment(payload).unwrap();
            const branchCount = (result as { branches_created?: number }).branches_created;
            actionFeedback.success(
                branchCount && branchCount > 1
                    ? `Assignment created across ${branchCount} branches`
                    : "Assignment created successfully"
            );
            onClose();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Something went wrong");
        }
    }

    const assignmentType = form.watch("assignment_type");
    const departments = effectiveOptions?.departments ?? [];
    const users = effectiveOptions?.users ?? [];
    const showTypeToggle = allowDepartment && allowUser;
    const isExclusive = effectiveOptions?.assignment_sharing_mode === "exclusive";
    const hasActiveAssignment = (effectiveOptions?.active_assignment_count ?? 0) > 0;
    const branchReady =
        !useControlledBranch ||
        !supportsBranchSelection ||
        !!branchExternalId ||
        !!branchInternalId;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>
                        Assign {allowDepartment && !allowUser
                            ? "Department"
                            : allowUser && !allowDepartment
                                ? "User"
                                : "User or Department"} (Level {effectiveOptions?.level ?? "—"})
                    </DialogTitle>
                </DialogHeader>

                {isExclusive && hasActiveAssignment && (
                    <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        Exclusive mode: assigning a new target will replace the current active assignment.
                        Previous assignments are kept in history.
                    </p>
                )}

                {effectiveOptions?.assignment_sharing_mode === "shared" && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                        Shared mode: this node can hold multiple active assignments. Sharing mode is
                        independent of the parent node.
                    </p>
                )}

                {effectiveOptions?.parent_context && (
                    <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        Parent assigned to:{" "}
                        <span className="font-semibold text-gray-900">
                            {effectiveOptions.parent_context.label}
                        </span>{" "}
                        ({effectiveOptions.parent_context.type})
                    </p>
                )}

                {effectiveOptions?.message && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        {effectiveOptions.message}
                    </p>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {supportsBranchSelection && (
                            <FormItem>
                                <FormLabel>Branch Assignment Mode</FormLabel>
                                <FormDescription>
                                    Auto mode propagates to all active parent branches. Controlled mode
                                    assigns to one branch only.
                                </FormDescription>
                                <Tabs
                                    value={branchMode}
                                    onValueChange={(value) => {
                                        setBranchMode(value as "auto" | "controlled");
                                        setBranchExternalId(undefined);
                                        setBranchInternalId(undefined);
                                    }}
                                    className="w-full"
                                >
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="auto" disabled={!allowPropagateAll}>
                                            All Branches
                                        </TabsTrigger>
                                        <TabsTrigger value="controlled">
                                            Single Branch
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </FormItem>
                        )}

                        {supportsBranchSelection && useControlledBranch && (
                            <FormItem>
                                <FormLabel>Parent Assignment Branch</FormLabel>
                                <Select
                                    onValueChange={handleBranchSelect}
                                    value={branchExternalId ?? branchInternalId ?? ""}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select parent branch" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {branchOptions.map((branch) => {
                                            const value =
                                                branch.external_assignment_id ??
                                                branch.internal_assignment_id ??
                                                "";
                                            return (
                                                <SelectItem key={value} value={value}>
                                                    {branch.label}
                                                    {branch.type ? ` (${branch.type})` : ""}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}

                        {branchReady && showTypeToggle && (
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

                        {branchReady && !showTypeToggle && allowDepartment && (
                            <FormDescription>
                                Assign a department within the selected structure branch. Sector-level
                                assignment is not allowed below level 1.
                            </FormDescription>
                        )}

                        {branchReady && (assignmentType === "user" || (!allowDepartment && allowUser)) ? (
                            <FormField
                                control={form.control}
                                name="user_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select User</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ""}
                                            disabled={isLoadingOptions || !effectiveOptions?.can_assign}
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
                        ) : branchReady ? (
                            <FormField
                                control={form.control}
                                name="internal_structure_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Department</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ""}
                                            disabled={isLoadingOptions || !effectiveOptions?.can_assign}
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
                        ) : null}

                        {branchReady && (
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
                        )}

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
                                    !branchReady ||
                                    !effectiveOptions?.can_assign ||
                                    (assignmentType === "user" && users.length === 0) ||
                                    (assignmentType === "structure" && departments.length === 0)
                                }
                            >
                                {isSubmitting
                                    ? "Assigning..."
                                    : isExclusive && hasActiveAssignment
                                      ? "Reassign"
                                      : branchMode === "auto" && allowPropagateAll
                                        ? "Assign All Branches"
                                        : "Assign"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
