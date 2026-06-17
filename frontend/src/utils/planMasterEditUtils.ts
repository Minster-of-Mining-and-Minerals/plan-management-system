import { PlanVersion } from "@/redux/types/plan";
import { actionFeedback } from "@/components/action-feedback";
import type { PermissionKey } from "@/lib/permissions";
import { PLAN_PERMISSIONS } from "./planPermissionUtils";

export const PLANS_EDIT_FINALIZED_PERMISSION = PLAN_PERMISSIONS.EDIT_FINALIZED;

export function canEditFinalizedMasterPlan(
    version: PlanVersion | undefined,
    can: (permission: PermissionKey) => boolean
): boolean {
    return (
        version?.version_kind === "master" &&
        version?.status === "finalized" &&
        can(PLAN_PERMISSIONS.EDIT_FINALIZED)
    );
}

export function canEditMasterPlanStructure(
    version: PlanVersion | undefined,
    can: (permission: PermissionKey) => boolean
): boolean {
    if (version?.version_kind === "master" && version?.status === "draft") {
        return can(PLAN_PERMISSIONS.UPDATE);
    }
    return canEditFinalizedMasterPlan(version, can);
}

export function isEditingFinalizedMasterPlan(
    version: PlanVersion | undefined,
    can: (permission: PermissionKey) => boolean
): boolean {
    return canEditFinalizedMasterPlan(version, can);
}

export async function confirmFinalizedPlanStructureEdit(actionLabel: string): Promise<boolean> {
    return actionFeedback.confirm(
        `This strategic plan is finalized. ${actionLabel} will change the locked structure and may affect annual and period targets. Are you sure you want to continue?`,
        {
            destructive: true,
            title: "Edit Finalized Plan",
            confirmLabel: "Yes, continue",
        }
    );
}

export async function confirmReopenFinalizedPlanForEdit(): Promise<boolean> {
    return actionFeedback.confirm(
        "This will reopen the strategic plan for editing. Targets, assignments, and annual data are preserved, but all validation steps (finalize draft, annual execution, period targets, and start process) must be completed again. Continue?",
        {
            destructive: true,
            title: "Reopen Plan for Editing",
            confirmLabel: "Reopen and edit",
        }
    );
}
