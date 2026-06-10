"use strict";

const { validate: isUuid } = require("uuid");
const {
    getFinalizationReadiness,
    finalizeDraft,
    getAnnualVersions,
    setAnnualTarget,
    completeAnnualVersion,
    getExecutionPeriods,
    setPeriodTarget,
    completeExecutionPeriod,
} = require("../../services/planVersionLifecycleService");
const { PlanVersion } = require("../../models");

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
        return res.json({
            success: true,
            data: {
                master,
                annualVersions,
            },
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
        return res.json({
            success: true,
            data: {
                annual,
                executionPeriods,
            },
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

module.exports = {
    getDraftFinalizationReadiness,
    finalizePlanDraft,
    listAnnualVersions,
    updateAnnualTarget,
    completeAnnualPlanVersion,
    listExecutionPeriods,
    updatePeriodTarget,
    completeExecutionPeriodVersion,
};
