"use strict";

const { validate: isUuid } = require("uuid");
const {
    getFinalizationReadiness,
    finalizeDraft,
    getAnnualVersions,
    getAnnualTargetAllocationsForVersion,
    getAnnualExecutionReadiness,
    finalizeAnnualExecution,
    lockAnnualVersion,
    unlockAnnualVersion,
    setAnnualTarget,
    completeAnnualVersion,
    getExecutionPeriods,
    initializeExecutionPeriods,
    getExecutionPeriodFinalizationReadiness,
    finalizeExecutionPeriodTargets,
    getPeriodTargetAllocationsForVersion,
    getGlobalPeriodTargetFinalizationReadiness,
    finalizeGlobalPeriodTargets,
    getStartProcessReadiness,
    startPlanProcess,
    setPeriodTarget,
    completeExecutionPeriod,
    reopenFinalizedPlanForEdit,
    duplicateMasterPlanDraft,
} = require("../../services/planVersionLifecycleService");
const { PlanVersion } = require("../../models");
const {
    enrichAnnualVersionsWithExecution,
    enrichExecutionPeriodsWithExecution,
    resolveVersionExecutionAccess,
} = require("../../services/planExecutionGateService");

async function getDraftFinalizationReadiness(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await getFinalizationReadiness(id);
        return res.json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function finalizePlanDraft(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await finalizeDraft(id);
        if (!result.success) {
            return res.status(400).json({ success: false, message: "Finalization failed", errors: result.errors });
        }

        return res.json({
            success: true,
            message: "Plan draft finalized and annual versions generated",
            data: result.master,
            annualVersions: result.annualVersions,
        });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError" || error.name === "SequelizeValidationError") {
            return res.status(400).json({
                success: false,
                message: error.errors?.[0]?.message || error.message,
                errors: error.errors?.map((e) => e.message) ?? [error.message],
            });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function listAnnualVersions(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const master = await PlanVersion.findByPk(id);
        if (!master) {
            return res.status(404).json({ success: false, message: "Plan version not found" });
        }

        const annualVersions = await getAnnualVersions(id);
        const { annualVersions: enrichedAnnuals, executionSnapshot } =
            await enrichAnnualVersionsWithExecution(master, annualVersions);
        return res.json({
            success: true,
            data: {
                master,
                annualVersions: enrichedAnnuals,
                executionSnapshot,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function completeAnnualPlanVersion(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await completeAnnualVersion(id);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.json({
            success: true,
            message: result.unlockedVersion
                ? `Annual version completed. Year ${result.unlockedVersion.sequence_index} is now available.`
                : "Annual version completed",
            data: result.data,
            unlockedVersion: result.unlockedVersion,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function listExecutionPeriods(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const annual = await PlanVersion.findByPk(id);
        if (!annual || annual.version_kind !== "annual") {
            return res.status(404).json({ success: false, message: "Annual plan version not found" });
        }

        const executionPeriods = await getExecutionPeriods(id);
        const enriched = await enrichExecutionPeriodsWithExecution(annual, executionPeriods);
        return res.json({
            success: true,
            data: enriched,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function updatePeriodTarget(req, res) {
    try {
        const { id: nodeId } = req.params;
        const { period_target } = req.body;

        if (!isUuid(nodeId)) {
            return res.status(400).json({ success: false, message: "Invalid node ID" });
        }

        const result = await setPeriodTarget(nodeId, period_target);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.json({
            success: true,
            message: "Period target updated",
            data: result.data,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function updateAnnualTarget(req, res) {
    try {
        const { id: nodeId } = req.params;
        const { annual_target } = req.body;

        if (!isUuid(nodeId)) {
            return res.status(400).json({ success: false, message: "Invalid node ID" });
        }

        const result = await setAnnualTarget(nodeId, annual_target);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.json({
            success: true,
            message: "Annual target updated",
            data: result.data,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function listAnnualTargetAllocations(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const allocations = await getAnnualTargetAllocationsForVersion(id);
        return res.json({ success: true, data: allocations });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getAnnualExecutionFinalizationReadiness(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await getAnnualExecutionReadiness(id);
        return res.json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function finalizeAnnualExecutionPlan(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await finalizeAnnualExecution(id);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Annual execution finalization failed",
                errors: result.errors,
            });
        }

        return res.json({
            success: true,
            message: "Annual execution targets finalized. Year 1 is now active for operational execution.",
            data: result.master,
            activatedVersion: result.activatedVersion,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function lockAnnualPlanVersion(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await lockAnnualVersion(id);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.json({ success: true, message: "Annual version locked", data: result.data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function unlockAnnualPlanVersion(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await unlockAnnualVersion(id);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.json({ success: true, message: "Annual version unlocked", data: result.data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function initializeExecutionPeriodsForAnnual(req, res) {
    try {
        const { id } = req.params;
        const { subdivision_mode, custom_periods } = req.body;

        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        if (!["quarterly", "semi_annual", "custom"].includes(subdivision_mode)) {
            return res.status(400).json({ success: false, message: "Invalid subdivision mode" });
        }

        const result = await initializeExecutionPeriods(id, subdivision_mode, custom_periods ?? []);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.json({
            success: true,
            message: "Execution periods initialized for all annual years with the selected subdivision",
            data: result.data,
            executionPeriods: result.executionPeriods,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getExecutionPeriodFinalizationReadinessHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await getExecutionPeriodFinalizationReadiness(id);
        return res.json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function finalizeExecutionPeriodTargetsHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await finalizeExecutionPeriodTargets(id);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Execution period finalization failed",
                errors: result.errors,
            });
        }

        return res.json({
            success: true,
            message: "Execution period targets finalized",
            data: result.data,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function listPeriodTargetAllocations(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const allocations = await getPeriodTargetAllocationsForVersion(id);
        return res.json({ success: true, data: allocations });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getGlobalPeriodTargetFinalizationReadinessHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await getGlobalPeriodTargetFinalizationReadiness(id);
        return res.json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function finalizeGlobalPeriodTargetsHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await finalizeGlobalPeriodTargets(id);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Period target finalization failed",
                errors: result.errors,
            });
        }

        return res.json({
            success: true,
            message: "Period targets finalized for all years and periods",
            data: result.data,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getStartProcessReadinessHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await getStartProcessReadiness(id);
        return res.json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function startPlanProcessHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await startPlanProcess(id);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Cannot start process",
                errors: result.errors,
            });
        }

        return res.json({
            success: true,
            message: "Plan process started",
            data: result.data,
            executionSnapshot: result.executionSnapshot
                ? {
                      plan_version_id: result.executionSnapshot.plan_version_id,
                      execution_version_number: result.executionSnapshot.execution_version_number,
                  }
                : null,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function completeExecutionPeriodVersion(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await completeExecutionPeriod(id);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.json({
            success: true,
            message: result.unlockedVersion
                ? `${result.unlockedVersion.period_label} is now available for execution.`
                : "Execution period completed",
            data: result.data,
            unlockedVersion: result.unlockedVersion,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function reopenFinalizedPlanForEditHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await reopenFinalizedPlanForEdit(id);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.json({
            success: true,
            message:
                "Plan reopened for editing. Existing targets are preserved; complete all validation steps again.",
            data: result.data,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function duplicatePlanDraftHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await duplicateMasterPlanDraft(id, {
            draft_name: req.body?.draft_name,
        });

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        return res.status(201).json({
            success: true,
            message:
                "Plan draft duplicated. The copy is independent and workflow milestones have been reset.",
            data: result.data,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getExecutionAccessHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const result = await resolveVersionExecutionAccess(id);
        if (!result.found) {
            return res.status(404).json({ success: false, message: "Plan version not found" });
        }

        return res.json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    getDraftFinalizationReadiness,
    finalizePlanDraft,
    listAnnualVersions,
    listAnnualTargetAllocations,
    getAnnualExecutionFinalizationReadiness,
    finalizeAnnualExecutionPlan,
    lockAnnualPlanVersion,
    unlockAnnualPlanVersion,
    updateAnnualTarget,
    completeAnnualPlanVersion,
    listExecutionPeriods,
    initializeExecutionPeriodsForAnnual,
    getExecutionPeriodFinalizationReadinessHandler,
    finalizeExecutionPeriodTargetsHandler,
    listPeriodTargetAllocations,
    getGlobalPeriodTargetFinalizationReadinessHandler,
    finalizeGlobalPeriodTargetsHandler,
    getStartProcessReadinessHandler,
    startPlanProcessHandler,
    getExecutionAccessHandler,
    updatePeriodTarget,
    completeExecutionPeriodVersion,
    reopenFinalizedPlanForEditHandler,
    duplicatePlanDraftHandler,
};
