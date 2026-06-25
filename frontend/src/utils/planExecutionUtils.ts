import { PlanVersion } from "@/redux/types/plan";

export type PlanExecutionStatus = "locked" | "open" | "completed";

export interface PlanExecutionAccess {
    execution_status: PlanExecutionStatus | null;
    can_view: boolean;
    can_edit_actuals: boolean;
    can_complete: boolean;
    is_locked: boolean;
    planning_mode?: boolean;
}

export interface PlanExecutionSnapshotMeta {
    snapshot_root_id: string;
    execution_version_number: number | null;
    snapshot_master_plan_version_id?: string;
}

export interface PlanVersionExecutionOverlay {
    execution_snapshot_plan_version_id?: string | null;
    execution_status?: PlanExecutionStatus | null;
    execution_access?: PlanExecutionAccess | null;
    execution_periods_total?: number;
    execution_periods_completed?: number;
    all_execution_periods_completed?: boolean;
    execution_actuals_ready?: boolean;
    execution_actuals_readiness?: {
        required_count: number;
        recorded_count: number;
        ready: boolean;
        missing_titles?: string[];
    };
}

export function getExecutionStatusLabel(status: PlanExecutionStatus | null | undefined): string {
    if (status === "open") return "Open";
    if (status === "completed") return "Completed";
    if (status === "locked") return "Locked";
    return "Not started";
}

export function resolvePlanNavigationVersionId(
    version: PlanVersion & PlanVersionExecutionOverlay,
    processStarted: boolean
): string {
    if (
        processStarted &&
        version.execution_snapshot_plan_version_id &&
        version.execution_access?.can_view
    ) {
        return version.execution_snapshot_plan_version_id;
    }
    return version.plan_version_id;
}

export function canEditPeriodActualForVersion(
    version: Pick<PlanVersion, "version_kind" | "execution_status"> | null | undefined,
    processStarted: boolean
): boolean {
    if (!processStarted) return false;
    if (!version || version.version_kind !== "execution_period") return false;
    return version.execution_status === "open";
}

export function canShowPeriodExecutionCompleteAction(
    version: PlanVersion & PlanVersionExecutionOverlay,
    processStarted: boolean,
    planningReady: boolean
): boolean {
    if (!processStarted || !planningReady) return false;
    if (version.status === "completed" || version.execution_status === "completed") {
        return false;
    }
    if (version.execution_status !== "open") return false;
    if (version.execution_actuals_ready === false) return false;
    return true;
}

/** Annual complete only after every period in that year is completed. */
export function canShowAnnualExecutionCompleteAction(
    version: PlanVersion & PlanVersionExecutionOverlay,
    processStarted: boolean,
    planningReady: boolean
): boolean {
    if (!processStarted || !planningReady) return false;
    if (version.status === "completed" || version.execution_status === "completed") {
        return false;
    }
    if (version.execution_status !== "open") return false;
    return Boolean(version.all_execution_periods_completed);
}

/** @deprecated Use canShowPeriodExecutionCompleteAction or canShowAnnualExecutionCompleteAction */
export function canShowExecutionCompleteAction(
    version: PlanVersion & PlanVersionExecutionOverlay,
    processStarted: boolean,
    planningReady: boolean
): boolean {
    return canShowPeriodExecutionCompleteAction(version, processStarted, planningReady);
}
