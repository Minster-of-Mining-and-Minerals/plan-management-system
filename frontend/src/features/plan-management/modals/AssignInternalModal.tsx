"use client";

import { useEffect, useState } from "react";
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
import { actionFeedback } from "@/components/action-feedback";
import {
    useCreateInternalAssignmentMutation,
    useGetAssignmentActionsQuery,
    useGetPlanNodeAssignmentOptionsQuery,
} from "@/redux/api/planAssignmentApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, User as UserIcon } from "lucide-react";

type AssignmentTab = "structure" | "user";

const formSchema = z.object({
    plan_node_id: z.string().uuid(),
    internal_structure_id: z.string().uuid().optional().nullable(),
    user_id: z.string().uuid().optional().nullable(),
    action_id: z.string().uuid({ message: "Action is required" }),
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
    const [assignmentTab, setAssignmentTab] = useState<AssignmentTab>("structure");

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
    const showAssignmentTabs = allowDepartment && allowUser;
    const branchOptions = initialOptions?.parent_branch_options ?? [];
    const supportsBranchSelection = initialOptions?.supports_branch_selection ?? false;
    const allowPropagateAll = initialOptions?.allow_propagate_all_branches ?? false;
    const inUserBranch = effectiveOptions?.in_user_branch ?? false;
    const parentContextType = effectiveOptions?.parent_context?.type;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
        defaultValues: {
            plan_node_id: planNodeId,
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
            setAssignmentTab("structure");
            return;
        }

        if (initialOptions) {
            setBranchMode(initialOptions.allow_propagate_all_branches ? "auto" : "controlled");
        }
    }, [isOpen, planNodeId, initialOptions?.allow_propagate_all_branches]);

    useEffect(() => {
        if (!isOpen || !effectiveOptions) return;

        const defaultTab: AssignmentTab = effectiveOptions.allow_department
            ? "structure"
            : "user";

        setAssignmentTab(defaultTab);
        form.reset({
            plan_node_id: planNodeId,
            internal_structure_id: null,
            user_id: null,
            action_id: "",
        });
    }, [
        isOpen,
        planNodeId,
        effectiveOptions?.allow_department,
        effectiveOptions?.allow_user,
        branchMode,
        branchExternalId,
        branchInternalId,
        form,
    ]);

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

    function handleAssignmentTabChange(tab: string) {
        const nextTab = tab as AssignmentTab;
        setAssignmentTab(nextTab);
        form.setValue("internal_structure_id", null);
        form.setValue("user_id", null);
        form.setValue("action_id", "");
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const activeTab = showAssignmentTabs ? assignmentTab : allowDepartment ? "structure" : "user";

        if (activeTab === "structure" && !values.internal_structure_id) {
            form.setError("internal_structure_id", { message: "Department is required" });
            return;
        }
        if (activeTab === "user" && !values.user_id) {
            form.setError("user_id", { message: "User is required" });
            return;
        }
        if (!values.action_id) {
            form.setError("action_id", { message: "Action is required" });
            return;
        }

        try {
            const propagateAll = allowPropagateAll && branchMode === "auto";
            const payload = {
                plan_node_id: values.plan_node_id,
                action_id: values.action_id,
                user_id: activeTab === "user" ? values.user_id : null,
                internal_structure_id: activeTab === "structure" ? values.internal_structure_id : null,
                branch_external_assignment_id: useControlledBranch ? (branchExternalId ?? null) : null,
                branch_internal_assignment_id: useControlledBranch ? (branchInternalId ?? null) : null,
                propagate_all_branches: propagateAll,
            };

            const result = await createAssignment(payload).unwrap();
            const branchCount = (result as { branches_created?: number }).branches_created;
            actionFeedback.success(
                branchCount && branchCount > 1
                    ? `Assignment created across ${branchCount} branches`
                    : activeTab === "structure"
                      ? "Department assigned successfully"
                      : "User assigned successfully"
            );
            onClose();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Something went wrong");
        }
    }

    const departments = effectiveOptions?.departments ?? [];
    const users = effectiveOptions?.users ?? [];
    const isExclusive = effectiveOptions?.assignment_sharing_mode === "exclusive";
    const hasActiveAssignment = (effectiveOptions?.active_assignment_count ?? 0) > 0;
    const branchReady =
        !useControlledBranch ||
        !supportsBranchSelection ||
        !!branchExternalId ||
        !!branchInternalId;

    const modalTitle = (() => {
        if (inUserBranch || (allowUser && !allowDepartment)) return "Assign User";
        if (allowDepartment && !allowUser) return "Assign Department";
        return "Assign Department or User";
    })();

    const flowHint = (() => {
        if (inUserBranch) {
            return "This branch is assigned to a user. Deeper levels can only be assigned to users.";
        }
        if (parentContextType === "sector") {
            return "After sector assignment, assign a department to continue down the structure, or assign a user directly under the sector.";
        }
        if (parentContextType === "department" && allowUser && !allowDepartment) {
            return "After department assignment, assign a user to continue responsibility down this branch.";
        }
        if (parentContextType === "department" && allowDepartment && allowUser) {
            return "Assign a sub-department or assign a user within the parent department.";
        }
        return null;
    })();

    const submitLabel = (() => {
        if (isSubmitting) return "Assigning...";
        const tab = showAssignmentTabs ? assignmentTab : allowDepartment ? "structure" : "user";
        if (isExclusive && hasActiveAssignment) {
            return tab === "structure" ? "Reassign Department" : "Reassign User";
        }
        if (branchMode === "auto" && allowPropagateAll) {
            return tab === "structure" ? "Assign Department to All Branches" : "Assign User to All Branches";
        }
        return tab === "structure" ? "Assign Department" : "Assign User";
    })();

    const isSubmitDisabled = (() => {
        if (isSubmitting || !branchReady || !effectiveOptions?.can_assign) return true;
        const tab = showAssignmentTabs ? assignmentTab : allowDepartment ? "structure" : "user";
        if (tab === "structure") return departments.length === 0;
        return users.length === 0;
    })();

    const actionField = (
        <FormField
            control={form.control}
            name="action_id"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Action / Responsibility</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger className="min-w-0">
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
    );

    const departmentFields = (
        <>
            <FormDescription className="break-words">
                Select a department within the parent sector or department branch. Child nodes can
                then be assigned to users or sub-departments.
            </FormDescription>
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
                                <SelectTrigger className="min-w-0">
                                    <SelectValue
                                        placeholder={
                                            isLoadingOptions
                                                ? "Loading departments..."
                                                : departments.length
                                                  ? "Select department"
                                                  : "No eligible departments"
                                        }
                                    />
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
            {actionField}
        </>
    );

    const userFields = (
        <>
            <FormDescription className="break-words">
                {inUserBranch
                    ? "Assign a user responsible for this node. Further levels under this branch remain user-only."
                    : "Assign a user directly. Child nodes under this user branch will only allow user assignments."}
            </FormDescription>
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
                                <SelectTrigger className="min-w-0">
                                    <SelectValue
                                        placeholder={
                                            isLoadingOptions
                                                ? "Loading users..."
                                                : users.length
                                                  ? "Select a user"
                                                  : "No eligible users"
                                        }
                                    />
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
            {actionField}
        </>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px] top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>
                        {modalTitle} (Level {effectiveOptions?.level ?? "—"})
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                            <div className="space-y-4 pb-4">
                                {flowHint && (
                                    <p className="break-words rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                                        {flowHint}
                                    </p>
                                )}

                                {isExclusive && hasActiveAssignment && (
                                    <p className="break-words rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                                        Exclusive mode: assigning a new target will replace the current active assignment.
                                        Previous assignments are kept in history.
                                    </p>
                                )}

                                {effectiveOptions?.assignment_sharing_mode === "shared" && (
                                    <p className="break-words rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                        Shared mode: this node can hold multiple active assignments. Sharing mode is
                                        independent of the parent node.
                                    </p>
                                )}

                                {effectiveOptions?.parent_context && (
                                    <p className="break-words rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                        Parent assigned to:{" "}
                                        <span className="font-semibold text-gray-900">
                                            {effectiveOptions.parent_context.label}
                                        </span>{" "}
                                        ({effectiveOptions.parent_context.type})
                                    </p>
                                )}

                                {effectiveOptions?.message && (
                                    <p className="break-words rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                        {effectiveOptions.message}
                                    </p>
                                )}

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
                                                <TabsTrigger value="controlled">Single Branch</TabsTrigger>
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
                                                <SelectTrigger className="min-w-0">
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

                                {branchReady && showAssignmentTabs && (
                                    <Tabs
                                        value={assignmentTab}
                                        onValueChange={handleAssignmentTabChange}
                                        className="w-full"
                                    >
                                        <TabsList className="grid h-auto w-full grid-cols-2">
                                            <TabsTrigger
                                                value="structure"
                                                disabled={!allowDepartment}
                                                className="gap-1.5 py-2"
                                            >
                                                <Building className="h-4 w-4 shrink-0" />
                                                Department
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="user"
                                                disabled={!allowUser}
                                                className="gap-1.5 py-2"
                                            >
                                                <UserIcon className="h-4 w-4 shrink-0" />
                                                User
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="structure" className="mt-4 space-y-4">
                                            {departmentFields}
                                        </TabsContent>

                                        <TabsContent value="user" className="mt-4 space-y-4">
                                            {userFields}
                                        </TabsContent>
                                    </Tabs>
                                )}

                                {branchReady && allowDepartment && !showAssignmentTabs && (
                                    <div className="space-y-4">{departmentFields}</div>
                                )}

                                {branchReady && allowUser && !allowDepartment && (
                                    <div className="space-y-4">{userFields}</div>
                                )}
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
                                disabled={isSubmitDisabled}
                                className="min-w-0 w-full sm:w-auto"
                            >
                                <span className="truncate">{submitLabel}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
