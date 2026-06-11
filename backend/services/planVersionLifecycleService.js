"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
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
    resolvePeriodLabelsForMode,
    normalizeCustomPeriods,
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
                    status: "draft",
                    is_locked: false,
                    government_structure_id: master.government_structure_id,
                    based_on_version_id: null,
                    plan_rule_id: master.plan_rule_id,
                },
                { transaction: t }
            );

            await copyNodesAndAssignments(master.plan_version_id, annualVersion.plan_version_id, t);
            annualVersions.push(annualVersion);
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

async function getMasterForAnnualVersion(annualVersion, transaction) {
    if (!annualVersion?.parent_plan_version_id) return null;
    return PlanVersion.findByPk(annualVersion.parent_plan_version_id, { transaction });
}

async function validateAnnualExecutionFinalization(masterVersionId, transaction) {
    const master = await PlanVersion.findByPk(masterVersionId, { transaction });
    if (!master || master.version_kind !== "master") {
        return { ready: false, errors: ["Master plan version not found"] };
    }
    if (master.status !== "finalized") {
        return { ready: false, errors: ["Strategic draft must be finalized before annual execution can be finalized"] };
    }
    if (master.annual_targets_finalized_at) {
        return { ready: false, errors: ["Annual execution targets have already been finalized"] };
    }

    const annualVersions = await PlanVersion.findAll({
        where: { parent_plan_version_id: masterVersionId, version_kind: "annual" },
        order: [["sequence_index", "ASC"]],
        transaction,
    });

    if (annualVersions.length === 0) {
        return { ready: false, errors: ["No annual execution versions exist"] };
    }

    const rule = await resolvePlanRuleForVersion(master, transaction);
    const masterNodes = await PlanNode.findAll({
        where: { plan_version_id: masterVersionId },
        transaction,
    });

    const errors = [];

    for (const masterNode of masterNodes) {
        if (rule && !stepRequiresWeight(rule, masterNode.level)) {
            continue;
        }

        const draftWeight = Number(masterNode.weight) || 0;
        if (draftWeight <= 0) {
            continue;
        }

        let allocatedSum = 0;

        for (const annualVersion of annualVersions) {
            const annualNode = await PlanNode.findOne({
                where: {
                    plan_version_id: annualVersion.plan_version_id,
                    source_plan_node_id: masterNode.plan_node_id,
                },
                transaction,
            });

            if (!annualNode) {
                errors.push(
                    `Missing annual node for "${masterNode.title}" in year ${annualVersion.planning_year ?? annualVersion.year}`
                );
                continue;
            }

            const annualTarget = Number(annualNode.annual_target);
            if (annualNode.annual_target == null || Number.isNaN(annualTarget)) {
                errors.push(
                    `Annual target is not set for "${masterNode.title}" in year ${annualVersion.planning_year ?? annualVersion.year}`
                );
                continue;
            }

            if (annualTarget <= 0) {
                errors.push(
                    `Annual target for "${masterNode.title}" in ${annualVersion.planning_year ?? annualVersion.year} must be greater than 0`
                );
                continue;
            }

            allocatedSum += annualTarget;
        }

        if (Math.abs(allocatedSum - draftWeight) > 0.001) {
            errors.push(
                `Total annual targets for "${masterNode.title}" (${allocatedSum}) must equal the draft target (${draftWeight})`
            );
        }
    }

    return {
        ready: errors.length === 0,
        errors,
        master,
        annualVersions,
        planning_years: annualVersions.map((v) => v.planning_year ?? v.year),
    };
}

async function getAnnualExecutionReadiness(masterVersionId) {
    const t = await sequelize.transaction();
    try {
        const result = await validateAnnualExecutionFinalization(masterVersionId, t);
        await t.rollback();
        return {
            ready: result.ready,
            errors: result.errors,
            planning_years: result.planning_years ?? [],
            annual_targets_finalized_at: result.master?.annual_targets_finalized_at ?? null,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function finalizeAnnualExecution(masterVersionId) {
    const t = await sequelize.transaction();
    try {
        const validation = await validateAnnualExecutionFinalization(masterVersionId, t);
        if (!validation.ready) {
            await t.rollback();
            return { success: false, errors: validation.errors };
        }

        const now = new Date();
        await validation.master.update({ annual_targets_finalized_at: now }, { transaction: t });

        for (const annualVersion of validation.annualVersions) {
            await annualVersion.update(
                {
                    status: "draft",
                    is_locked: false,
                },
                { transaction: t }
            );
        }

        const firstYear = validation.annualVersions.find((v) => v.sequence_index === 1)
            ?? validation.annualVersions[0];

        await t.commit();

        return {
            success: true,
            master: await PlanVersion.findByPk(masterVersionId, {
                include: [{ association: "annualVersions" }],
            }),
            activatedVersion: firstYear,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function lockAnnualVersion(annualVersionId) {
    const version = await PlanVersion.findByPk(annualVersionId);
    if (!version || version.version_kind !== "annual") {
        return { success: false, message: "Annual plan version not found" };
    }
    if (version.status !== "completed") {
        await version.update({ status: "draft", is_locked: false });
    }
    return { success: true, data: version };
}

async function unlockAnnualVersion(annualVersionId) {
    const version = await PlanVersion.findByPk(annualVersionId);
    if (!version || version.version_kind !== "annual") {
        return { success: false, message: "Annual plan version not found" };
    }
    if (version.status === "completed") {
        return { success: false, message: "Completed annual versions cannot be reopened" };
    }
    await version.update({ status: "draft", is_locked: false });
    return { success: true, data: version };
}

async function validateAnnualTargetAllocation(sourcePlanNodeId, annualTarget, excludeNodeId, transaction) {
    if (annualTarget === null || annualTarget === undefined) {
        return { valid: true };
    }

    const numericTarget = Number(annualTarget);
    if (Number.isNaN(numericTarget) || numericTarget <= 0) {
        return { valid: false, message: "Annual target must be greater than 0" };
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

async function getAnnualTargetAllocationsForVersion(annualVersionId) {
    const version = await PlanVersion.findByPk(annualVersionId);
    if (!version || version.version_kind !== "annual") {
        return [];
    }

    const master = await getMasterForAnnualVersion(version);
    if (master?.annual_targets_finalized_at) {
        return [];
    }

    const nodesInVersion = await PlanNode.findAll({
        where: { plan_version_id: annualVersionId },
    });

    const sourceIds = [
        ...new Set(
            nodesInVersion
                .map((node) => node.source_plan_node_id)
                .filter(Boolean)
        ),
    ];

    if (sourceIds.length === 0) {
        return [];
    }

    const [masterNodes, allAnnualNodes] = await Promise.all([
        PlanNode.findAll({ where: { plan_node_id: sourceIds } }),
        PlanNode.findAll({ where: { source_plan_node_id: sourceIds } }),
    ]);

    const draftBySourceId = new Map(
        masterNodes.map((node) => [node.plan_node_id, Number(node.weight) || 0])
    );

    const annualBySourceId = new Map();
    for (const annualNode of allAnnualNodes) {
        const sourceId = annualNode.source_plan_node_id;
        if (!annualBySourceId.has(sourceId)) {
            annualBySourceId.set(sourceId, []);
        }
        annualBySourceId.get(sourceId).push(annualNode);
    }

    const allocations = [];

    for (const node of nodesInVersion) {
        if (!node.source_plan_node_id) continue;

        const draftTarget = draftBySourceId.get(node.source_plan_node_id) ?? 0;
        if (draftTarget <= 0) continue;

        const siblings = annualBySourceId.get(node.source_plan_node_id) ?? [];
        let allocatedOtherYears = 0;
        let currentYearValue = 0;

        for (const sibling of siblings) {
            const value = Number(sibling.annual_target) || 0;
            if (sibling.plan_node_id === node.plan_node_id) {
                currentYearValue = value;
            } else {
                allocatedOtherYears += value;
            }
        }

        const allocatedTotal = allocatedOtherYears + currentYearValue;

        allocations.push({
            plan_node_id: node.plan_node_id,
            source_plan_node_id: node.source_plan_node_id,
            draft_target: draftTarget,
            allocated_other_years: allocatedOtherYears,
            current_year_value: currentYearValue,
            allocated_total: allocatedTotal,
            remaining_for_this_year: Math.max(0, draftTarget - allocatedOtherYears),
            remaining_overall: Math.max(0, draftTarget - allocatedTotal),
        });
    }

    return allocations;
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

        const master = await getMasterForAnnualVersion(node.planVersion, t);
        if (master?.annual_targets_finalized_at) {
            await t.rollback();
            return {
                success: false,
                message: "Annual targets are finalized — edit targets before finalizing annual execution",
            };
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

        const master = await getMasterForAnnualVersion(version, t);
        if (!master?.annual_targets_finalized_at) {
            await t.rollback();
            return {
                success: false,
                message: "Finalize annual execution targets before completing an annual year",
            };
        }

        if (!version.period_targets_finalized_at) {
            await t.rollback();
            return {
                success: false,
                message: "Finalize execution period targets before completing this annual year",
            };
        }

        await version.update({ status: "completed", is_locked: false }, { transaction: t });

        await t.commit();
        return { success: true, data: version, unlockedVersion: null };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function applyEqualPeriodTargetSplit(annualVersionId, transaction) {
    const periods = await PlanVersion.findAll({
        where: { parent_plan_version_id: annualVersionId, version_kind: "execution_period" },
        transaction,
    });
    const annualNodes = await PlanNode.findAll({
        where: { plan_version_id: annualVersionId },
        transaction,
    });

    const numPeriods = periods.length;
    if (numPeriods === 0) return;

    for (const annualNode of annualNodes) {
        const annualTarget = Number(annualNode.annual_target) || 0;
        if (annualTarget <= 0) continue;

        const perPeriod = annualTarget / numPeriods;
        for (const period of periods) {
            const periodNode = await PlanNode.findOne({
                where: {
                    plan_version_id: period.plan_version_id,
                    source_plan_node_id: annualNode.plan_node_id,
                },
                transaction,
            });
            if (periodNode) {
                await periodNode.update({ period_target: perPeriod }, { transaction });
            }
        }
    }
}

async function generateExecutionPeriods(annualVersionId, transaction, options = {}) {
    const { subdivisionMode = null, customPeriods = [], splitTargets = true } = options;
    const annualVersion = await PlanVersion.findByPk(annualVersionId, { transaction });
    if (!annualVersion || annualVersion.version_kind !== "annual") {
        return { success: false, message: "Annual plan version not found" };
    }

    const existingCount = await PlanVersion.count({
        where: { parent_plan_version_id: annualVersionId, version_kind: "execution_period" },
        transaction,
    });
    if (existingCount > 0) {
        return { success: false, message: "Execution periods already exist for this annual version" };
    }

    let periodLabels = [];
    if (subdivisionMode) {
        if (subdivisionMode === "custom") {
            const normalized = normalizeCustomPeriods(customPeriods);
            if (!normalized.valid) {
                return { success: false, message: normalized.message };
            }
            periodLabels = normalized.periods.map((p) => p.label);
        } else {
            periodLabels = resolvePeriodLabelsForMode(subdivisionMode, customPeriods);
        }
    } else {
        const config = await getOrCreateGlobalPlanningConfig(transaction);
        periodLabels = resolvePeriodLabels(config);
    }

    if (periodLabels.length === 0) {
        return { success: false, message: "No execution periods configured for the selected subdivision" };
    }

    const executionPeriods = [];
    const planningYear = annualVersion.planning_year ?? annualVersion.start_year;

    for (let i = 0; i < periodLabels.length; i += 1) {
        const sequenceIndex = i + 1;
        const periodLabel = periodLabels[i];

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
                status: "draft",
                is_locked: false,
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

    if (splitTargets) {
        await applyEqualPeriodTargetSplit(annualVersionId, transaction);
    }

    return { success: true, executionPeriods };
}

async function initializeExecutionPeriods(annualVersionId, subdivisionMode, customPeriods = []) {
    const t = await sequelize.transaction();
    try {
        const annualVersion = await PlanVersion.findByPk(annualVersionId, { transaction: t });
        if (!annualVersion || annualVersion.version_kind !== "annual") {
            await t.rollback();
            return { success: false, message: "Annual plan version not found" };
        }

        const master = await getMasterForAnnualVersion(annualVersion, t);
        if (!master?.annual_targets_finalized_at) {
            await t.rollback();
            return {
                success: false,
                message: "Finalize annual execution targets before initializing execution periods",
            };
        }

        if (annualVersion.period_subdivision_mode) {
            await t.rollback();
            return { success: false, message: "Execution periods have already been initialized" };
        }

        const result = await generateExecutionPeriods(annualVersionId, t, {
            subdivisionMode,
            customPeriods,
            splitTargets: true,
        });

        if (!result.success) {
            await t.rollback();
            return result;
        }

        await annualVersion.update(
            { period_subdivision_mode: subdivisionMode },
            { transaction: t }
        );

        await t.commit();
        return {
            success: true,
            data: await PlanVersion.findByPk(annualVersionId, {
                include: [{ association: "executionPeriodVersions" }],
            }),
            executionPeriods: result.executionPeriods,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function validateExecutionPeriodFinalization(annualVersionId, transaction) {
    const annualVersion = await PlanVersion.findByPk(annualVersionId, { transaction });
    if (!annualVersion || annualVersion.version_kind !== "annual") {
        return { ready: false, errors: ["Annual plan version not found"] };
    }

    if (!annualVersion.period_subdivision_mode) {
        return { ready: false, errors: ["Execution periods have not been initialized"] };
    }

    if (annualVersion.period_targets_finalized_at) {
        return { ready: false, errors: ["Period targets have already been finalized"] };
    }

    const periods = await PlanVersion.findAll({
        where: { parent_plan_version_id: annualVersionId, version_kind: "execution_period" },
        transaction,
    });

    if (periods.length === 0) {
        return { ready: false, errors: ["No execution periods exist"] };
    }

    const rule = await resolvePlanRuleForVersion(annualVersion, transaction);
    const annualNodes = await PlanNode.findAll({
        where: { plan_version_id: annualVersionId },
        transaction,
    });

    const errors = [];
    const numPeriods = periods.length;

    for (const annualNode of annualNodes) {
        if (rule && !stepRequiresWeight(rule, annualNode.level)) {
            continue;
        }

        const annualTarget = Number(annualNode.annual_target) || 0;
        if (annualTarget <= 0) {
            continue;
        }

        let allocatedSum = 0;

        for (const period of periods) {
            const periodNode = await PlanNode.findOne({
                where: {
                    plan_version_id: period.plan_version_id,
                    source_plan_node_id: annualNode.plan_node_id,
                },
                transaction,
            });

            if (!periodNode) {
                errors.push(`Missing period node for "${annualNode.title}" in ${period.period_label}`);
                continue;
            }

            const periodTarget = Number(periodNode.period_target);
            if (!periodTarget || periodTarget <= 0) {
                errors.push(
                    `Period target is not set for "${annualNode.title}" in ${period.period_label}`
                );
                continue;
            }

            allocatedSum += periodTarget;
        }

        if (Math.abs(allocatedSum - annualTarget) > 0.001) {
            errors.push(
                `Total period targets for "${annualNode.title}" (${allocatedSum}) must equal the annual target (${annualTarget})`
            );
        }
    }

    return { ready: errors.length === 0, errors, annualVersion, executionPeriods: periods };
}

async function getExecutionPeriodFinalizationReadiness(annualVersionId) {
    const t = await sequelize.transaction();
    try {
        const result = await validateExecutionPeriodFinalization(annualVersionId, t);
        await t.rollback();
        return {
            ready: result.ready,
            errors: result.errors,
            period_subdivision_mode: result.annualVersion?.period_subdivision_mode ?? null,
            period_targets_finalized_at: result.annualVersion?.period_targets_finalized_at ?? null,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function finalizeExecutionPeriodTargets(annualVersionId) {
    const t = await sequelize.transaction();
    try {
        const validation = await validateExecutionPeriodFinalization(annualVersionId, t);
        if (!validation.ready) {
            await t.rollback();
            return { success: false, errors: validation.errors };
        }

        const now = new Date();
        await validation.annualVersion.update({ period_targets_finalized_at: now }, { transaction: t });

        await t.commit();
        return {
            success: true,
            data: await PlanVersion.findByPk(annualVersionId, {
                include: [{ association: "executionPeriodVersions" }],
            }),
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
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

        const annualVersion = await PlanVersion.findByPk(node.planVersion.parent_plan_version_id, {
            transaction: t,
        });
        if (annualVersion?.period_targets_finalized_at) {
            await t.rollback();
            return {
                success: false,
                message: "Period targets are finalized — adjust targets before finalizing subdivision",
            };
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

        if (version.status === "completed") {
            await t.rollback();
            return { success: false, message: "This execution period is already completed" };
        }

        await version.update({ status: "completed", is_locked: false }, { transaction: t });

        await t.commit();
        return { success: true, data: version, unlockedVersion: null };
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
    if (planVersion.version_kind === "annual" || planVersion.version_kind === "execution_period") {
        return planVersion.status !== "completed";
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
    getAnnualTargetAllocationsForVersion,
    validateAnnualTargetAllocation,
    validateAnnualExecutionFinalization,
    getAnnualExecutionReadiness,
    finalizeAnnualExecution,
    lockAnnualVersion,
    unlockAnnualVersion,
    setAnnualTarget,
    completeAnnualVersion,
    generateExecutionPeriods,
    initializeExecutionPeriods,
    getExecutionPeriods,
    validateExecutionPeriodFinalization,
    getExecutionPeriodFinalizationReadiness,
    finalizeExecutionPeriodTargets,
    validatePeriodTargetAllocation,
    setPeriodTarget,
    completeExecutionPeriod,
    isVersionEditable,
};
