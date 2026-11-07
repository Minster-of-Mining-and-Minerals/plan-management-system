import { PlanVersion } from "@/redux/types/plan";
import type {
    ExecutionEvaluationStatus,
    PlanExecutionReadinessNode,
} from "@/redux/types/plan";

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
        approved_count?: number;
        pending_approval_count?: number;
        pending_approval_titles?: string[];
        pending_approval_nodes?: PlanExecutionReadinessNode[];
        pending_validation_count?: number;
        pending_validation_titles?: string[];
        pending_validation_nodes?: PlanExecutionReadinessNode[];
        pending_sector_publish_count?: number;
        pending_sector_publish_titles?: string[];
        pending_sector_publish_nodes?: PlanExecutionReadinessNode[];
        rejected_count?: number;
        rejected_titles?: string[];
        rejected_nodes?: PlanExecutionReadinessNode[];
        missing_count?: number;
        missing_titles?: string[];
        missing_nodes?: PlanExecutionReadinessNode[];
        ready: boolean;
    };
}

export function getExecutionStatusLabel(status: PlanExecutionStatus | null | undefined): string {
    if (status === "open") return "Open";
    if (status === "completed") return "Completed";
    if (status === "locked") return "Locked";
    return "Not started";
}

/** Planning workflow label, or execution gate label once process has started. */
export function resolvePlanVersionStatusLabel(
    version: Pick<
        PlanVersion,
        "version_kind" | "status" | "execution_status" | "sequence_index"
    >,
    processStarted: boolean,
    formatPlanningStatus: (version: Pick<PlanVersion, "status">) => string
): string {
    if (!processStarted) {
        return formatPlanningStatus(version);
    }

    if (version.version_kind === "master") {
        return "In execution";
    }

    if (
        version.version_kind === "annual" ||
        version.version_kind === "execution_period"
    ) {
        if (version.execution_status) {
            return getExecutionStatusLabel(version.execution_status);
        }
        if (version.version_kind === "annual" && version.sequence_index === 1) {
            return "Open";
        }
        return "Locked";
    }

    return formatPlanningStatus(version);
}

/** Status token for workflow badges once execution has started. */
export function resolveWorkflowDisplayStatus(
    version: Pick<PlanVersion, "status" | "execution_status">,
    processStarted: boolean
): string {
    if (!processStarted) {
        return version.status ?? "draft";
    }

    if (version.execution_status === "completed") {
        return "completed";
    }

    if (version.execution_status === "locked") {
        return "locked";
    }

    if (version.execution_status === "open") {
        return "active";
    }

    return version.status ?? "draft";
}

/** Closed execution periods should read as completed, not in-progress achievement. */
export function resolveExecutionEvaluationStatus(
    version: Pick<PlanVersion, "execution_status" | "execution_evaluation_status">,
    processStarted: boolean
): ExecutionEvaluationStatus | null | undefined {
    if (processStarted && version.execution_status === "completed") {
        return "completed";
    }

    return version.execution_evaluation_status;
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
    return canShowPeriodCompleteButton(version, processStarted, planningReady);
}

/** Show Complete on open periods once execution has started and planning is ready. */
export function canShowPeriodCompleteButton(
    version: PlanVersion & PlanVersionExecutionOverlay,
    processStarted: boolean,
    planningReady: boolean
): boolean {
    if (!processStarted || !planningReady) return false;
    if (version.status === "completed" || version.execution_status === "completed") {
        return false;
    }
    return version.execution_status === "open" || version.status === "active";
}

export function isPeriodReadyToComplete(
    version: PlanVersion & PlanVersionExecutionOverlay
): boolean {
    return version.execution_actuals_ready !== false;
}

function formatTitlePreview(titles: string[] | undefined, max = 3): string {
    const list = titles ?? [];
    if (!list.length) return "";
    const preview = list.slice(0, max).join(", ");
    const suffix = list.length > max ? ` and ${list.length - max} more` : "";
    return `${preview}${suffix}`;
}

export function buildPeriodCompleteValidationMessage(
    readiness: PlanVersionExecutionOverlay["execution_actuals_readiness"] | null | undefined
): string {
    if (!readiness || readiness.required_count === 0) {
        return "No required achievements are configured for this period.";
    }

    if ((readiness.pending_approval_count ?? 0) > 0) {
        return `Approve all pending achievements before completing this period (${formatTitlePreview(
            readiness.pending_approval_nodes?.map((node) => node.label) ??
                readiness.pending_approval_titles
        )})`;
    }

    if ((readiness.pending_validation_count ?? 0) > 0) {
        return `Validate all execution-approved achievements before completing this period (${formatTitlePreview(
            readiness.pending_validation_nodes?.map((node) => node.label) ??
                readiness.pending_validation_titles
        )})`;
    }

    if ((readiness.pending_sector_publish_count ?? 0) > 0) {
        return `Finalize sector packages for parent aggregation before completing this period (${formatTitlePreview(
            readiness.pending_sector_publish_nodes?.map((node) => node.label) ??
                readiness.pending_sector_publish_titles
        )})`;
    }

    if ((readiness.rejected_count ?? 0) > 0) {
        return `Resubmit rejected achievements before completing this period (${formatTitlePreview(
            readiness.rejected_nodes?.map((node) => node.label) ?? readiness.rejected_titles
        )})`;
    }

    if ((readiness.missing_count ?? 0) > 0) {
        return `Record and approve achievement for all required targets before completing this period (${formatTitlePreview(
            readiness.missing_nodes?.map((node) => node.label) ?? readiness.missing_titles
        )})`;
    }

    return "Complete all required achievements and approvals before closing this period.";
}

export type PeriodCompleteBlockingSection = {
    key: "approval" | "validation" | "sector_publish" | "rejected" | "missing";
    title: string;
    description: string;
    nodes: PlanExecutionReadinessNode[];
};

export function resolvePeriodCompleteBlockingSections(
    readiness: PlanVersionExecutionOverlay["execution_actuals_readiness"] | null | undefined
): PeriodCompleteBlockingSection[] {
    if (!readiness) return [];

    const sections: PeriodCompleteBlockingSection[] = [];

    if ((readiness.pending_approval_count ?? 0) > 0) {
        sections.push({
            key: "approval",
            title: "Pending approval",
            description: "Approve these achievements before completing this period.",
            nodes:
                readiness.pending_approval_nodes ??
                (readiness.pending_approval_titles ?? []).map((title, index) => ({
                    plan_node_id: `pending-${index}`,
                    title,
                    label: title,
                })),
        });
    }

    if ((readiness.pending_validation_count ?? 0) > 0) {
        sections.push({
            key: "validation",
            title: "Pending validation",
            description: "Validate these achievements before completing this period.",
            nodes:
                readiness.pending_validation_nodes ??
                (readiness.pending_validation_titles ?? []).map((title, index) => ({
                    plan_node_id: `validation-${index}`,
                    title,
                    label: title,
                })),
        });
    }

    if ((readiness.pending_sector_publish_count ?? 0) > 0) {
        sections.push({
            key: "sector_publish",
            title: "Pending sector finalize",
            description:
                "Publish sector packages so parent structures can aggregate before completing this period.",
            nodes:
                readiness.pending_sector_publish_nodes ??
                (readiness.pending_sector_publish_titles ?? []).map((title, index) => ({
                    plan_node_id: `sector-publish-${index}`,
                    title,
                    label: title,
                })),
        });
    }

    if ((readiness.rejected_count ?? 0) > 0) {
        sections.push({
            key: "rejected",
            title: "Rejected",
            description: "Resubmit these achievements before completing this period.",
            nodes:
                readiness.rejected_nodes ??
                (readiness.rejected_titles ?? []).map((title, index) => ({
                    plan_node_id: `rejected-${index}`,
                    title,
                    label: title,
                })),
        });
    }

    if ((readiness.missing_count ?? 0) > 0) {
        sections.push({
            key: "missing",
            title: "Not recorded",
            description: "Record and approve achievement for these targets.",
            nodes:
                readiness.missing_nodes ??
                (readiness.missing_titles ?? []).map((title, index) => ({
                    plan_node_id: `missing-${index}`,
                    title,
                    label: title,
                })),
        });
    }

    return sections;
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
