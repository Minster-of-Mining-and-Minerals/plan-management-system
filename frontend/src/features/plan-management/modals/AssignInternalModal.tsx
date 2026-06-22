"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { actionFeedback } from "@/components/action-feedback";
import {
    useCreateInternalAssignmentMutation,
    useGetPlanNodeAssignmentOptionsQuery,
} from "@/redux/api/planAssignmentApi";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AssignmentTargetSelector,
    AssignmentTargetSelection,
    createEmptySelection,
    getSelectionId,
} from "@/components/assignment-selectors";
import { PlanAssignmentScopeBanner } from "../components/PlanAssignmentScopeBanner";
import { AssignmentModeAlerts } from "../components/AssignmentModeAlerts";
import {
    formatPlanAssignmentButtonLabel,
    getPlanNodeAssignmentTypeLabel,
} from "@/utils/planAssignmentUtils";
import { PlanNode } from "@/redux/types/plan";

interface AssignInternalModalProps {
    isOpen: boolean;
    onClose: () => void;
    planNodeId: string;
    nodeType?: PlanNode["type"];
}

export function AssignInternalModal({
    isOpen,
    onClose,
    planNodeId,
    nodeType,
}: AssignInternalModalProps) {
    const [branchExternalId, setBranchExternalId] = useState<string | undefined>();
    const [branchInternalId, setBranchInternalId] = useState<string | undefined>();
    const [branchMode, setBranchMode] = useState<"auto" | "controlled">("auto");
    const [targetSelection, setTargetSelection] = useState<AssignmentTargetSelection | null>(null);

    const [createAssignment, { isLoading: isSubmitting }] = useCreateInternalAssignmentMutation();

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
    const allowRole = effectiveOptions?.allow_role ?? false;
    const branchOptions = initialOptions?.parent_branch_options ?? [];
    const supportsBranchSelection = initialOptions?.supports_branch_selection ?? false;
    const allowPropagateAll = initialOptions?.allow_propagate_all_branches ?? false;
    const inUserBranch = effectiveOptions?.in_user_branch ?? false;

    useEffect(() => {
        if (!isOpen) {
            setBranchExternalId(undefined);
            setBranchInternalId(undefined);
            setBranchMode("auto");
            setTargetSelection(null);
            return;
        }

        if (initialOptions) {
            setBranchMode(initialOptions.allow_propagate_all_branches ? "auto" : "controlled");
        }
    }, [isOpen, planNodeId, initialOptions?.allow_propagate_all_branches]);

    useEffect(() => {
        if (!isOpen || !effectiveOptions) return;

        const defaultType = effectiveOptions.allow_department
            ? "department"
            : effectiveOptions.allow_user
              ? "user"
              : "role";

        setTargetSelection(createEmptySelection(defaultType));
    }, [
        isOpen,
        planNodeId,
        effectiveOptions?.allow_department,
        effectiveOptions?.allow_user,
        effectiveOptions?.allow_role,
        branchMode,
        branchExternalId,
        branchInternalId,
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

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const selectedId = getSelectionId(targetSelection);
        if (!selectedId || !targetSelection) {
            actionFeedback.error("Please select a user, department, role, or permission group");
            return;
        }

        try {
            const propagateAll = allowPropagateAll && branchMode === "auto";
            const payload = {
                plan_node_id: planNodeId,
                user_id: targetSelection.type === "user" ? targetSelection.userId : null,
                internal_structure_id:
                    targetSelection.type === "department"
                        ? targetSelection.internalStructureId
                        : null,
                role_id: targetSelection.type === "role" ? targetSelection.roleId : null,
                permission_group_id:
                    targetSelection.type === "permission_group"
                        ? targetSelection.permissionGroupId
                        : null,
                branch_external_assignment_id: useControlledBranch ? (branchExternalId ?? null) : null,
                branch_internal_assignment_id: useControlledBranch ? (branchInternalId ?? null) : null,
                propagate_all_branches: propagateAll,
            };

            const result = await createAssignment(payload).unwrap();
            const branchCount = (result as { branches_created?: number }).branches_created;

            const successLabel = getPlanNodeAssignmentTypeLabel(nodeType);

            actionFeedback.success(
                branchCount && branchCount > 1
                    ? `${successLabel} assigned across ${branchCount} branches`
                    : `${successLabel} assigned successfully`
            );
            onClose();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Something went wrong");
        }
    }

    const departments = effectiveOptions?.departments ?? [];
    const users = effectiveOptions?.users ?? [];
    const roles = effectiveOptions?.roles ?? [];
    const permissionGroups = effectiveOptions?.permission_groups ?? [];
    const isExclusive = effectiveOptions?.assignment_sharing_mode === "exclusive";
    const hasActiveAssignment = (effectiveOptions?.active_assignment_count ?? 0) > 0;
    const branchReady =
        !useControlledBranch ||
        !supportsBranchSelection ||
        !!branchExternalId ||
        !!branchInternalId;

    const typeLabel = getPlanNodeAssignmentTypeLabel(nodeType);
    const modalTitle = `Assign ${typeLabel}`;
    const submitLabel = (() => {
        if (isSubmitting) return "Assigning...";
        return formatPlanAssignmentButtonLabel(nodeType, {
            reassign: isExclusive && hasActiveAssignment,
            allBranches: branchMode === "auto" && allowPropagateAll,
        });
    })();

    const isSubmitDisabled = (() => {
        if (isSubmitting || !branchReady || !effectiveOptions?.can_assign) return true;
        return !getSelectionId(targetSelection);
    })();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px] top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>
                        {modalTitle} (Level {effectiveOptions?.level ?? "—"})
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                        <div className="space-y-4 pb-4">
                            <PlanAssignmentScopeBanner
                                options={effectiveOptions}
                                isLoading={isLoadingOptions}
                                compact
                            />

                            <AssignmentModeAlerts options={effectiveOptions} />

                            {inUserBranch ? (
                                <p className="break-words rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                                    Parent branch is assigned to a user. Eligible targets follow the
                                    sector scope rules for this branch.
                                </p>
                            ) : null}

                            {supportsBranchSelection ? (
                                <div className="space-y-2">
                                    <Label>Branch Assignment Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Auto mode propagates to all active parent branches. Controlled mode
                                        assigns to one branch only.
                                    </p>
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
                                </div>
                            ) : null}

                            {supportsBranchSelection && useControlledBranch ? (
                                <div className="space-y-2">
                                    <Label>Parent Assignment Branch</Label>
                                    <Select
                                        onValueChange={handleBranchSelect}
                                        value={branchExternalId ?? branchInternalId ?? ""}
                                    >
                                        <SelectTrigger className="min-w-0">
                                            <SelectValue placeholder="Select parent branch" />
                                        </SelectTrigger>
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
                                </div>
                            ) : null}

                            {branchReady ? (
                                <AssignmentTargetSelector
                                    users={users}
                                    departments={departments}
                                    roles={roles}
                                    permissionGroups={permissionGroups}
                                    allowUser={allowUser}
                                    allowDepartment={allowDepartment}
                                    allowRole={allowRole}
                                    isLoading={isLoadingOptions}
                                    disabled={!effectiveOptions?.can_assign}
                                    value={targetSelection}
                                    onChange={setTargetSelection}
                                />
                            ) : null}
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
            </DialogContent>
        </Dialog>
    );
}
