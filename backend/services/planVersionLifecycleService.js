"use strict";

const { v4: uuidv4 } = require("uuid");
const {
    PlanVersion,
    PlanNode,
    ExternalAssignment,
    InternalAssignment,
    sequelize,
} = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { stepRequiresWeight } = require("./planRuleStepUtils");
const {
    getOrCreateGlobalPlanningConfig,
    resolvePeriodLabels,
} = require("./planningConfigurationService");

function enumeratePlanningYears(master) {
    const years = [];
    for (let i = 0; i < master.planning_duration_years; i += 1) {
        years.push(master.start_year + i);
    }
    return years;
}

async function copyNodesAndAssignments(sourceVersionId, targetVersionId, transaction, options = {}) {
    const { resetAnnualTarget = true } = options;
    const sourceNodes = await PlanNode.findAll({
        where: { plan_version_id: sourceVersionId },
        order: [["level", "ASC"], ["order", "ASC"]],
        transaction,
    });

    const nodeIdMap = new Map();

    for (const sourceNode of sourceNodes) {
        const newNodeId = uuidv4();
        nodeIdMap.set(sourceNode.plan_node_id, newNodeId);

        await PlanNode.create(
            {
                plan_node_id: newNodeId,
                plan_version_id: targetVersionId,
                parent_id: null,
                source_plan_node_id: sourceNode.plan_node_id,
                type: sourceNode.type,
                title: sourceNode.title,
                description: sourceNode.description,
                weight: sourceNode.weight,
                weight_mode: sourceNode.weight_mode,
                target_unit: sourceNode.target_unit,
                level: sourceNode.level,
                order: sourceNode.order,
                is_active: sourceNode.is_active,
                assignment_sharing_mode: sourceNode.assignment_sharing_mode,
                annual_target: resetAnnualTarget ? null : sourceNode.annual_target,
                period_target: null,
            },
            { transaction }
        );
    }

    for (const sourceNode of sourceNodes) {
        if (sourceNode.parent_id) {
            const newParentId = nodeIdMap.get(sourceNode.parent_id);
            const newNodeId = nodeIdMap.get(sourceNode.plan_node_id);
            await PlanNode.update(
                { parent_id: newParentId },
                { where: { plan_node_id: newNodeId }, transaction }
            );
        }
    }

    const externalIdMap = new Map();
    const sourceExternals = await ExternalAssignment.findAll({
        where: { plan_node_id: sourceNodes.map((n) => n.plan_node_id) },
        transaction,
    });

    for (const ext of sourceExternals) {
        const newId = uuidv4();
        externalIdMap.set(ext.external_assignment_id, newId);
        await ExternalAssignment.create(
            {
                external_assignment_id: newId,
                plan_node_id: nodeIdMap.get(ext.plan_node_id),
                government_structure_id: ext.government_structure_id,
                is_visible: ext.is_visible,
                requires_report: ext.requires_report,
                is_active: ext.is_active,
            },
            { transaction }
        );
    }

    const internalIdMap = new Map();
    const sourceInternals = await InternalAssignment.findAll({
        where: { plan_node_id: sourceNodes.map((n) => n.plan_node_id) },
        order: [["created_at", "ASC"]],
        transaction,
    });

    for (const int of sourceInternals) {
        const newId = uuidv4();
        internalIdMap.set(int.internal_assignment_id, newId);
        await InternalAssignment.create(
            {
                internal_assignment_id: newId,
                plan_node_id: nodeIdMap.get(int.plan_node_id),
                internal_structure_id: int.internal_structure_id,
                user_id: int.user_id,
                action_id: int.action_id,
                is_active: int.is_active,
                branch_external_assignment_id: int.branch_external_assignment_id
                    ? externalIdMap.get(int.branch_external_assignment_id) ?? null
                    : null,
                branch_internal_assignment_id: int.branch_internal_assignment_id
                    ? internalIdMap.get(int.branch_internal_assignment_id) ?? null
                    : null,
            },
            { transaction }
        );
    }

    return nodeIdMap;
}

async function validateDraftForFinalization(masterVersionId, transaction) {
    const master = await PlanVersion.findByPk(masterVersionId, { transaction });
    if (!master) {
        return { ready: false, errors: ["Plan draft not found"] };
    }
    if (master.version_kind !== "master") {
        return { ready: false, errors: ["Only master plan drafts can be finalized"] };
    }
    if (master.status !== "draft") {
        return { ready: false, errors: ["Plan draft is not in draft status"] };
    }
    if (master.finalized_at) {
        return { ready: false, errors: ["Plan draft has already been finalized"] };
    }

    const existingAnnual = await PlanVersion.count({
        where: { parent_plan_version_id: masterVersionId, version_kind: "annual" },
        transaction,
    });
    if (existingAnnual > 0) {
        return { ready: false, errors: ["Annual versions already exist for this draft"] };
    }

    const errors = [];
    const nodes = await PlanNode.findAll({
        where: { plan_version_id: masterVersionId },
        transaction,
    });

    if (nodes.length === 0) {
        errors.push("Hierarchy is empty — add at least one plan node");
    }

    const rule = await resolvePlanRuleForVersion(master, transaction);

    for (const node of nodes) {
        if (rule && stepRequiresWeight(rule, node.level) && (!node.weight || node.weight <= 0)) {
            errors.push(`"${node.title}" requires a strategic target before finalization`);
        }

        const [extCount, intCount] = await Promise.all([
            ExternalAssignment.count({
                where: { plan_node_id: node.plan_node_id, is_active: true },
                transaction,
            }),
            InternalAssignment.count({
                where: { plan_node_id: node.plan_node_id, is_active: true },
                transaction,
            }),
        ]);

        if (extCount === 0 && intCount === 0) {
            errors.push(`"${node.title}" has no active assignments`);
        }
    }

    return { ready: errors.length === 0, errors, master, rule };
}

async function getFinalizationReadiness(masterVersionId) {
    const t = await sequelize.transaction();
    try {
        const result = await validateDraftForFinalization(masterVersionId, t);
        await t.rollback();
        return {
            ready: result.ready,
            errors: result.errors,
            planning_years: result.master ? enumeratePlanningYears(result.master) : [],
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function finalizeDraft(masterVersionId) {
    const t = await sequelize.transaction();
    try {
        const validation = await validateDraftForFinalization(masterVersionId, t);
        if (!validation.ready) {
            await t.rollback();
            return { success: false, errors: validation.errors };
        }

        const master = validation.master;
        const years = enumeratePlanningYears(master);
        const now = new Date();

        await master.update(
            {
                status: "finalized",
                finalized_at: now,
            },
            { transaction: t }
        );

        const annualVersions = [];

        for (let i = 0; i < years.length; i += 1) {
            const planningYear = years[i];
            const sequenceIndex = i + 1;
            const isFirstYear = sequenceIndex === 1;

            const annualVersion = await PlanVersion.create(
                {
                    plan_version_id: uuidv4(),
                    version_kind: "annual",
                    parent_plan_version_id: master.plan_version_id,
                    planning_year: planningYear,
                    sequence_index: sequenceIndex,
                    draft_name: `${master.draft_name} — Year ${sequenceIndex} (${planningYear})`,
                    planning_start_date: `${planningYear}-${String(master.start_month).padStart(2, "0")}-01`,
                    planning_end_date: `${planningYear}-${String(master.start_month).padStart(2, "0")}-01`,
                    start_year: planningYear,
                    end_year: planningYear,
                    start_month: master.start_month,
                    end_month: master.end_month,
                    planning_duration_years: 1,
                    year: planningYear,
                    version_number: sequenceIndex,
                    status: isFirstYear ? "active" : "locked",
                    is_locked: !isFirstYear,
                    government_structure_id: master.government_structure_id,
                    based_on_version_id: null,
                    plan_rule_id: master.plan_rule_id,
                },
                { transaction: t }
            );

            await copyNodesAndAssignments(master.plan_version_id, annualVersion.plan_version_id, t);
            annualVersions.push(annualVersion);

            if (isFirstYear) {
                await generateExecutionPeriods(annualVersion.plan_version_id, t);
            }
        }

        await t.commit();

        return {
            success: true,
            master: await PlanVersion.findByPk(masterVersionId, {
                include: [{ association: "annualVersions" }],
            }),
            annualVersions,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function getAnnualVersions(masterVersionId) {
    return PlanVersion.findAll({
        where: { parent_plan_version_id: masterVersionId, version_kind: "annual" },
        order: [["sequence_index", "ASC"]],
        include: [
            {
                association: "governmentStructure",
            },
        ],
    });
}

async function validateAnnualTargetAllocation(sourcePlanNodeId, annualTarget, excludeNodeId, transaction) {
    if (annualTarget === null || annualTarget === undefined) {
        return { valid: true };
    }

    const numericTarget = Number(annualTarget);
    if (Number.isNaN(numericTarget) || numericTarget < 0) {
        return { valid: false, message: "Annual target must be a non-negative number" };
    }

    const masterNode = await PlanNode.findByPk(sourcePlanNodeId, { transaction });
    if (!masterNode) {
        return { valid: false, message: "Source plan node not found" };
    }

    const draftTarget = Number(masterNode.weight) || 0;
    if (draftTarget <= 0) {
        return { valid: false, message: "This node has no draft target to allocate against" };
    }

    const annualNodes = await PlanNode.findAll({
        where: { source_plan_node_id: sourcePlanNodeId },
        transaction,
    });

    let allocatedTotal = 0;
    for (const node of annualNodes) {
        if (excludeNodeId && node.plan_node_id === excludeNodeId) continue;
        allocatedTotal += Number(node.annual_target) || 0;
    }

    if (allocatedTotal + numericTarget > draftTarget + 0.001) {
        return {
            valid: false,
            message: `Total annual targets (${allocatedTotal + numericTarget}) cannot exceed draft target (${draftTarget})`,
        };
    }

    return { valid: true, draftTarget, allocatedTotal, remaining: draftTarget - allocatedTotal - numericTarget };
}

async function setAnnualTarget(planNodeId, annualTarget) {
    const t = await sequelize.transaction();
    try {
        const node = await PlanNode.findByPk(planNodeId, {
            include: [{ association: "planVersion" }],
            transaction: t,
        });

        if (!node) {
            await t.rollback();
            return { success: false, message: "Plan node not found" };
        }

        if (node.planVersion.version_kind !== "annual") {
            await t.rollback();
            return { success: false, message: "Annual targets can only be set on annual plan versions" };
        }

        if (node.planVersion.is_locked || node.planVersion.status === "locked") {
            await t.rollback();
            return { success: false, message: "This annual version is locked" };
        }

        if (!node.source_plan_node_id) {
            await t.rollback();
            return { success: false, message: "Node is not linked to a master draft node" };
        }

        const validation = await validateAnnualTargetAllocation(
            node.source_plan_node_id,
            annualTarget,
            node.plan_node_id,
            t
        );

        if (!validation.valid) {
            await t.rollback();
            return { success: false, message: validation.message };
        }

        await node.update(
            { annual_target: annualTarget === null ? null : Number(annualTarget) },
            { transaction: t }
        );

        await t.commit();
        return { success: true, data: node };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function completeAnnualVersion(annualVersionId) {
    const t = await sequelize.transaction();
    try {
        const version = await PlanVersion.findByPk(annualVersionId, { transaction: t });
        if (!version || version.version_kind !== "annual") {
            await t.rollback();
            return { success: false, message: "Annual plan version not found" };
        }

        if (version.status !== "active") {
            await t.rollback();
            return { success: false, message: "Only active annual versions can be completed" };
        }

        await version.update({ status: "completed" }, { transaction: t });

        const nextVersion = await PlanVersion.findOne({
            where: {
                parent_plan_version_id: version.parent_plan_version_id,
                version_kind: "annual",
                sequence_index: version.sequence_index + 1,
            },
            transaction: t,
        });

        if (nextVersion) {
            await nextVersion.update(
                { status: "active", is_locked: false },
                { transaction: t }
            );
            await generateExecutionPeriods(nextVersion.plan_version_id, t);
        }

        await t.commit();
        return { success: true, data: version, unlockedVersion: nextVersion };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function generateExecutionPeriods(annualVersionId, transaction) {
    const annualVersion = await PlanVersion.findByPk(annualVersionId, { transaction });
    if (!annualVersion || annualVersion.version_kind !== "annual") {
        return { success: false, message: "Annual plan version not found" };
    }

    const existingCount = await PlanVersion.count({
        where: { parent_plan_version_id: annualVersionId, version_kind: "execution_period" },
        transaction,
    });
    if (existingCount > 0) {
        return { success: true, skipped: true };
    }

    const config = await getOrCreateGlobalPlanningConfig(transaction);
    const periodLabels = resolvePeriodLabels(config);
    if (periodLabels.length === 0) {
        return { success: false, message: "No execution periods configured" };
    }

    const executionPeriods = [];
    const planningYear = annualVersion.planning_year ?? annualVersion.start_year;

    for (let i = 0; i < periodLabels.length; i += 1) {
        const sequenceIndex = i + 1;
        const periodLabel = periodLabels[i];
        const isFirstPeriod = sequenceIndex === 1;

        const periodVersion = await PlanVersion.create(
            {
                plan_version_id: uuidv4(),
                version_kind: "execution_period",
                parent_plan_version_id: annualVersion.plan_version_id,
                period_label: periodLabel,
                planning_year: planningYear,
                sequence_index: sequenceIndex,
                draft_name: `${annualVersion.draft_name} — ${periodLabel}`,
                planning_start_date: annualVersion.planning_start_date,
                planning_end_date: annualVersion.planning_end_date,
                start_year: planningYear,
                end_year: planningYear,
                start_month: annualVersion.start_month,
                end_month: annualVersion.end_month,
                planning_duration_years: 1,
                year: planningYear,
                version_number: 100 + sequenceIndex,
                status: isFirstPeriod ? "active" : "locked",
                is_locked: !isFirstPeriod,
                government_structure_id: annualVersion.government_structure_id,
                based_on_version_id: null,
                plan_rule_id: annualVersion.plan_rule_id,
            },
            { transaction }
        );

        await copyNodesAndAssignments(
            annualVersion.plan_version_id,
            periodVersion.plan_version_id,
            transaction,
            { resetAnnualTarget: false }
        );
        executionPeriods.push(periodVersion);
    }

    return { success: true, executionPeriods };
}

async function getExecutionPeriods(annualVersionId) {
    return PlanVersion.findAll({
        where: { parent_plan_version_id: annualVersionId, version_kind: "execution_period" },
        order: [["sequence_index", "ASC"]],
        include: [{ association: "governmentStructure" }],
    });
}

async function validatePeriodTargetAllocation(annualPlanNodeId, periodTarget, excludeNodeId, transaction) {
    if (periodTarget === null || periodTarget === undefined) {
        return { valid: true };
    }

    const numericTarget = Number(periodTarget);
    if (Number.isNaN(numericTarget) || numericTarget < 0) {
        return { valid: false, message: "Period target must be a non-negative number" };
    }

    const annualNode = await PlanNode.findByPk(annualPlanNodeId, { transaction });
    if (!annualNode) {
        return { valid: false, message: "Source annual plan node not found" };
    }

    const annualTarget = Number(annualNode.annual_target) || 0;
    if (annualTarget <= 0) {
        return { valid: false, message: "This node has no annual target to allocate against" };
    }

    const periodNodes = await PlanNode.findAll({
        where: { source_plan_node_id: annualPlanNodeId },
        transaction,
    });

    let allocatedTotal = 0;
    for (const node of periodNodes) {
        if (excludeNodeId && node.plan_node_id === excludeNodeId) continue;
        allocatedTotal += Number(node.period_target) || 0;
    }

    if (allocatedTotal + numericTarget > annualTarget + 0.001) {
        return {
            valid: false,
            message: `Total period targets (${allocatedTotal + numericTarget}) cannot exceed annual target (${annualTarget})`,
        };
    }

    return {
        valid: true,
        annualTarget,
        allocatedTotal,
        remaining: annualTarget - allocatedTotal - numericTarget,
    };
}

async function setPeriodTarget(planNodeId, periodTarget) {
    const t = await sequelize.transaction();
    try {
        const node = await PlanNode.findByPk(planNodeId, {
            include: [{ association: "planVersion" }],
            transaction: t,
        });

        if (!node) {
            await t.rollback();
            return { success: false, message: "Plan node not found" };
        }

        if (node.planVersion.version_kind !== "execution_period") {
            await t.rollback();
            return { success: false, message: "Period targets can only be set on execution period versions" };
        }

        if (node.planVersion.is_locked || node.planVersion.status === "locked") {
            await t.rollback();
            return { success: false, message: "This execution period is locked" };
        }

        if (!node.source_plan_node_id) {
            await t.rollback();
            return { success: false, message: "Node is not linked to an annual plan node" };
        }

        const validation = await validatePeriodTargetAllocation(
            node.source_plan_node_id,
            periodTarget,
            node.plan_node_id,
            t
        );

        if (!validation.valid) {
            await t.rollback();
            return { success: false, message: validation.message };
        }

        await node.update(
            { period_target: periodTarget === null ? null : Number(periodTarget) },
            { transaction: t }
        );

        await t.commit();
        return { success: true, data: node };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function completeExecutionPeriod(periodVersionId) {
    const t = await sequelize.transaction();
    try {
        const version = await PlanVersion.findByPk(periodVersionId, { transaction: t });
        if (!version || version.version_kind !== "execution_period") {
            await t.rollback();
            return { success: false, message: "Execution period version not found" };
        }

        if (version.status !== "active") {
            await t.rollback();
            return { success: false, message: "Only active execution periods can be completed" };
        }

        await version.update({ status: "completed" }, { transaction: t });

        const nextVersion = await PlanVersion.findOne({
            where: {
                parent_plan_version_id: version.parent_plan_version_id,
                version_kind: "execution_period",
                sequence_index: version.sequence_index + 1,
            },
            transaction: t,
        });

        if (nextVersion) {
            await nextVersion.update(
                { status: "active", is_locked: false },
                { transaction: t }
            );
        }

        await t.commit();
        return { success: true, data: version, unlockedVersion: nextVersion };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

function isVersionEditable(planVersion) {
    if (!planVersion) return false;
    if (planVersion.version_kind === "master") {
        return planVersion.status === "draft";
    }
    if (planVersion.version_kind === "annual") {
        return planVersion.status === "active" && !planVersion.is_locked;
    }
    if (planVersion.version_kind === "execution_period") {
        return planVersion.status === "active" && !planVersion.is_locked;
    }
    return false;
}

module.exports = {
    enumeratePlanningYears,
    copyNodesAndAssignments,
    validateDraftForFinalization,
    getFinalizationReadiness,
    finalizeDraft,
    getAnnualVersions,
    validateAnnualTargetAllocation,
    setAnnualTarget,
    completeAnnualVersion,
    generateExecutionPeriods,
    getExecutionPeriods,
    validatePeriodTargetAllocation,
    setPeriodTarget,
    completeExecutionPeriod,
    isVersionEditable,
};
