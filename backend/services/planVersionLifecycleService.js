"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const {
    PlanVersion,
    PlanNode,
    ExternalAssignment,
    InternalAssignment,
    PlanNodeActionLog,
    PlanAssignmentAction,
    sequelize,
} = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { stepRequiresWeight } = require("./planRuleStepUtils");
const {
    getEffectivePlanningConfigForStructure,
    resolvePeriodLabels,
    resolvePeriodLabelsForMode,
    normalizeCustomPeriods,
} = require("./planningConfigurationService");
const { syncAllDerivedNodesFromMaster } = require("./planMasterEditService");
const { syncPlanNodeAssignmentContext } = require("./planAssignmentScopeService");
const {
    hasBeenPublishedForReview,
    isMasterReviewCompleted,
} = require("../utils/planReviewUtils");

function enumeratePlanningYears(master) {
    const years = [];
    for (let i = 0; i < master.planning_duration_years; i += 1) {
        years.push(master.start_year + i);
    }
    return years;
}

async function ensureAssignmentActionsExist(actionIds, transaction) {
    const uniqueIds = [...new Set(actionIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    const existing = await PlanAssignmentAction.findAll({
        where: { assignment_action_id: { [Op.in]: uniqueIds } },
        attributes: ["assignment_action_id"],
        transaction,
    });
    const existingIds = new Set(existing.map((row) => row.assignment_action_id));

    for (const actionId of uniqueIds) {
        if (existingIds.has(actionId)) continue;

        await PlanAssignmentAction.create(
            {
                assignment_action_id: actionId,
                name: "Recovered assignment action",
                code: `recovered_${actionId.replace(/-/g, "").slice(0, 32)}`,
                description: "Auto-restored so plan assignments can be copied for review snapshots.",
                is_approval: false,
                is_execution: true,
                is_reporting: false,
            },
            { transaction }
        );
    }
}

async function copyNodesWithAssignments(
    sourceVersionId,
    targetVersionId,
    transaction,
    options = {}
) {
    const {
        resolveSourcePlanNodeId = (sourceNode) => sourceNode.plan_node_id,
        preserveTargets = false,
        preservePeriodTarget = false,
        ensureAssignmentActions = false,
    } = options;

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
                source_plan_node_id: resolveSourcePlanNodeId(sourceNode),
                type: sourceNode.type,
                title: sourceNode.title,
                description: sourceNode.description,
                weight: sourceNode.weight,
                weight_mode: sourceNode.weight_mode,
                target_unit: sourceNode.target_unit,
                level: sourceNode.level,
                // Order is owned by the master draft; derived copies mirror source order.
                order: sourceNode.order,
                is_active: sourceNode.is_active,
                assignment_sharing_mode: sourceNode.assignment_sharing_mode,
                annual_target: preserveTargets ? sourceNode.annual_target : null,
                period_target: preservePeriodTarget ? sourceNode.period_target : null,
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

    if (ensureAssignmentActions) {
        await ensureAssignmentActionsExist(
            sourceInternals.map((assignment) => assignment.action_id),
            transaction
        );
    }

    for (const int of sourceInternals) {
        const newId = uuidv4();
        internalIdMap.set(int.internal_assignment_id, newId);
        await InternalAssignment.create(
            {
                internal_assignment_id: newId,
                plan_node_id: nodeIdMap.get(int.plan_node_id),
                internal_structure_id: int.internal_structure_id,
                user_id: int.user_id,
                role_id: int.role_id,
                permission_group_id: int.permission_group_id,
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

    for (const sourceNode of sourceNodes) {
        const newNodeId = nodeIdMap.get(sourceNode.plan_node_id);
        await syncPlanNodeAssignmentContext(newNodeId, transaction);
    }

    return nodeIdMap;
}

async function copyNodesAndAssignments(sourceVersionId, targetVersionId, transaction, options = {}) {
    const { resetAnnualTarget = true } = options;
    return copyNodesWithAssignments(sourceVersionId, targetVersionId, transaction, {
        resolveSourcePlanNodeId: (sourceNode) => sourceNode.plan_node_id,
        preserveTargets: !resetAnnualTarget,
        preservePeriodTarget: false,
    });
}

function freshDraftWorkflowFields() {
    return {
        status: "draft",
        is_locked: false,
        finalized_at: null,
        annual_targets_finalized_at: null,
        period_targets_finalized_at: null,
        process_started_at: null,
    };
}

/**
 * Deep-clone a master plan draft into a new independent version tree.
 * Copies hierarchy, assignments, and target values; resets workflow milestones.
 * The copy is not linked to the source (based_on_version_id is null).
 */
async function duplicateMasterPlanDraft(sourceMasterVersionId, options = {}) {
    const t = await sequelize.transaction();
    try {
        const sourceMaster = await PlanVersion.findByPk(sourceMasterVersionId, { transaction: t });
        if (!sourceMaster || sourceMaster.version_kind !== "master") {
            await t.rollback();
            return { success: false, message: "Master plan draft not found" };
        }

        const draftName =
            options.draft_name?.trim() || `Copy of ${sourceMaster.draft_name}`;

        const latestVersion = await PlanVersion.findOne({
            where: {
                start_year: sourceMaster.start_year,
                government_structure_id: sourceMaster.government_structure_id,
                version_kind: "master",
            },
            order: [["version_number", "DESC"]],
            transaction: t,
        });
        const version_number = latestVersion ? latestVersion.version_number + 1 : 1;

        const newMaster = await PlanVersion.create(
            {
                plan_version_id: uuidv4(),
                draft_name: draftName,
                planning_start_date: sourceMaster.planning_start_date,
                planning_end_date: sourceMaster.planning_end_date,
                start_year: sourceMaster.start_year,
                start_month: sourceMaster.start_month,
                end_year: sourceMaster.end_year,
                end_month: sourceMaster.end_month,
                planning_duration_years: sourceMaster.planning_duration_years,
                year: sourceMaster.year,
                version_number,
                version_kind: "master",
                government_structure_id: sourceMaster.government_structure_id,
                based_on_version_id: null,
                plan_rule_id: sourceMaster.plan_rule_id,
                period_subdivision_mode: sourceMaster.period_subdivision_mode,
                ...freshDraftWorkflowFields(),
            },
            { transaction: t }
        );

        const masterNodeIdMap = await copyNodesWithAssignments(
            sourceMaster.plan_version_id,
            newMaster.plan_version_id,
            t,
            {
                resolveSourcePlanNodeId: () => null,
                preserveTargets: true,
                preservePeriodTarget: true,
            }
        );

        const sourceAnnualVersions = await PlanVersion.findAll({
            where: {
                parent_plan_version_id: sourceMasterVersionId,
                version_kind: "annual",
            },
            order: [["sequence_index", "ASC"]],
            transaction: t,
        });

        for (const sourceAnnual of sourceAnnualVersions) {
            const planningYear = sourceAnnual.planning_year ?? sourceAnnual.year;
            const sequenceIndex = sourceAnnual.sequence_index ?? sourceAnnual.version_number;

            const newAnnual = await PlanVersion.create(
                {
                    plan_version_id: uuidv4(),
                    version_kind: "annual",
                    parent_plan_version_id: newMaster.plan_version_id,
                    planning_year: planningYear,
                    sequence_index: sequenceIndex,
                    draft_name: `${draftName} — Year ${sequenceIndex} (${planningYear})`,
                    planning_start_date: sourceAnnual.planning_start_date,
                    planning_end_date: sourceAnnual.planning_end_date,
                    start_year: sourceAnnual.start_year,
                    end_year: sourceAnnual.end_year,
                    start_month: sourceAnnual.start_month,
                    end_month: sourceAnnual.end_month,
                    planning_duration_years: sourceAnnual.planning_duration_years,
                    year: planningYear,
                    version_number: sourceAnnual.version_number,
                    government_structure_id: sourceAnnual.government_structure_id,
                    based_on_version_id: null,
                    plan_rule_id: sourceAnnual.plan_rule_id,
                    period_subdivision_mode: sourceAnnual.period_subdivision_mode,
                    ...freshDraftWorkflowFields(),
                },
                { transaction: t }
            );

            const annualNodeIdMap = await copyNodesWithAssignments(
                sourceAnnual.plan_version_id,
                newAnnual.plan_version_id,
                t,
                {
                    resolveSourcePlanNodeId: (sourceNode) =>
                        sourceNode.source_plan_node_id
                            ? masterNodeIdMap.get(sourceNode.source_plan_node_id) ?? null
                            : null,
                    preserveTargets: true,
                    preservePeriodTarget: true,
                }
            );

            const sourcePeriodVersions = await PlanVersion.findAll({
                where: {
                    parent_plan_version_id: sourceAnnual.plan_version_id,
                    version_kind: "execution_period",
                },
                order: [["sequence_index", "ASC"]],
                transaction: t,
            });

            for (const sourcePeriod of sourcePeriodVersions) {
                const periodYear = sourcePeriod.planning_year ?? planningYear;
                const periodSequence = sourcePeriod.sequence_index ?? 1;

                const newPeriod = await PlanVersion.create(
                    {
                        plan_version_id: uuidv4(),
                        version_kind: "execution_period",
                        parent_plan_version_id: newAnnual.plan_version_id,
                        period_label: sourcePeriod.period_label,
                        planning_year: periodYear,
                        sequence_index: periodSequence,
                        draft_name: `${newAnnual.draft_name} — ${sourcePeriod.period_label}`,
                        planning_start_date: sourcePeriod.planning_start_date,
                        planning_end_date: sourcePeriod.planning_end_date,
                        start_year: sourcePeriod.start_year,
                        end_year: sourcePeriod.end_year,
                        start_month: sourcePeriod.start_month,
                        end_month: sourcePeriod.end_month,
                        planning_duration_years: sourcePeriod.planning_duration_years,
                        year: periodYear,
                        version_number: sourcePeriod.version_number,
                        government_structure_id: sourcePeriod.government_structure_id,
                        based_on_version_id: null,
                        plan_rule_id: sourcePeriod.plan_rule_id,
                        ...freshDraftWorkflowFields(),
                    },
                    { transaction: t }
                );

                await copyNodesWithAssignments(
                    sourcePeriod.plan_version_id,
                    newPeriod.plan_version_id,
                    t,
                    {
                        resolveSourcePlanNodeId: (sourceNode) =>
                            sourceNode.source_plan_node_id
                                ? annualNodeIdMap.get(sourceNode.source_plan_node_id) ?? null
                                : null,
                        preserveTargets: true,
                        preservePeriodTarget: true,
                    }
                );
            }
        }

        await t.commit();

        return {
            success: true,
            data: await PlanVersion.findByPk(newMaster.plan_version_id, {
                include: [{ association: "annualVersions" }],
            }),
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
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

        const existingAnnual = await PlanVersion.findAll({
            where: { parent_plan_version_id: masterVersionId, version_kind: "annual" },
            order: [["sequence_index", "ASC"]],
            transaction: t,
        });

        if (existingAnnual.length > 0) {
            if (existingAnnual.length !== years.length) {
                await t.rollback();
                return {
                    success: false,
                    errors: [
                        "Annual version count does not match the planning duration. Adjust the draft or contact an administrator.",
                    ],
                };
            }

            await master.update(
                {
                    status: "finalized",
                    finalized_at: now,
                },
                { transaction: t }
            );

            await syncAllDerivedNodesFromMaster(masterVersionId, t);

            await t.commit();

            return {
                success: true,
                master: await PlanVersion.findByPk(masterVersionId, {
                    include: [{ association: "annualVersions" }],
                }),
                annualVersions: existingAnnual,
                refinalized: true,
            };
        }

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
    const master = await PlanVersion.findByPk(masterVersionId, {
        attributes: ["execution_snapshot_of_version_id"],
    });
    const where = {
        parent_plan_version_id: masterVersionId,
        version_kind: "annual",
    };
    if (!master?.execution_snapshot_of_version_id) {
        where.execution_snapshot_of_version_id = null;
    }

    return PlanVersion.findAll({
        where,
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
        if (master?.review_status === "under_review") {
            await t.rollback();
            return {
                success: false,
                message: "Plan is under review — annual targets cannot be edited",
            };
        }
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

        await PlanNode.update(
            { annual_target: annualTarget === null ? null : Number(annualTarget) },
            {
                where: { source_plan_node_id: node.plan_node_id },
                transaction: t,
            }
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
        const { isExecutionSnapshotVersion } = require("./planExecutionSnapshotService");
        const { advanceExecutionGateAfterAnnualComplete } = require("./planExecutionGateService");

        let resolvedAnnualId = annualVersionId;
        let version = await PlanVersion.findByPk(annualVersionId, { transaction: t });

        if (version && !isExecutionSnapshotVersion(version)) {
            const master = await getMasterForAnnualVersion(version, t);
            if (master?.active_execution_snapshot_id) {
                const { buildLiveToSnapshotVersionMap } = require("./planExecutionSnapshotService");
                const versionMap = await buildLiveToSnapshotVersionMap(
                    master.active_execution_snapshot_id,
                    t
                );
                const snapshotAnnual = versionMap.get(version.plan_version_id);
                if (snapshotAnnual) {
                    version = snapshotAnnual;
                    resolvedAnnualId = snapshotAnnual.plan_version_id;
                }
            }
        }

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

        if (!master.process_started_at) {
            await t.rollback();
            return {
                success: false,
                message: "Start process before completing an annual year",
            };
        }

        if (version.execution_status && version.execution_status !== "open") {
            await t.rollback();
            return {
                success: false,
                message: "Only the open annual year can be completed",
            };
        }

        const periods = await PlanVersion.findAll({
            where: {
                parent_plan_version_id: resolvedAnnualId,
                version_kind: "execution_period",
            },
            transaction: t,
        });

        const incompletePeriod = periods.find(
            (period) =>
                period.execution_status !== "completed" && period.status !== "completed"
        );
        if (incompletePeriod) {
            await t.rollback();
            return {
                success: false,
                message: "Complete all execution periods for this year before completing the annual year",
            };
        }

        let unlockedVersion = null;
        if (isExecutionSnapshotVersion(version)) {
            unlockedVersion = await advanceExecutionGateAfterAnnualComplete(
                resolvedAnnualId,
                t
            );
        } else {
            await version.update({ status: "completed", is_locked: false }, { transaction: t });
        }

        await t.commit();
        return {
            success: true,
            data: await PlanVersion.findByPk(resolvedAnnualId),
            unlockedVersion,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function generateExecutionPeriods(annualVersionId, transaction, options = {}) {
    const { subdivisionMode = null, customPeriods = [] } = options;
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
        const config = await getEffectivePlanningConfigForStructure(
            annualVersion.government_structure_id,
            transaction
        );
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

    return { success: true, executionPeriods };
}

/** Removes execution period versions that exist without a formal initialize action (e.g. legacy seed data). */
async function deleteUninitializedExecutionPeriodsForAnnual(annualVersionId, transaction) {
    const periods = await PlanVersion.findAll({
        where: {
            parent_plan_version_id: annualVersionId,
            version_kind: "execution_period",
        },
        transaction,
    });

    if (periods.length === 0) {
        return;
    }

    const periodVersionIds = periods.map((period) => period.plan_version_id);
    const nodes = await PlanNode.findAll({
        where: { plan_version_id: periodVersionIds },
        attributes: ["plan_node_id"],
        transaction,
    });
    const nodeIds = nodes.map((node) => node.plan_node_id);

    if (nodeIds.length > 0) {
        if (PlanNodeActionLog) {
            await PlanNodeActionLog.destroy({
                where: { plan_node_id: nodeIds },
                transaction,
            });
        }
        await ExternalAssignment.destroy({ where: { plan_node_id: nodeIds }, transaction });
        await InternalAssignment.destroy({ where: { plan_node_id: nodeIds }, transaction });
        await PlanNode.destroy({ where: { plan_version_id: periodVersionIds }, transaction });
    }

    await PlanVersion.destroy({
        where: { plan_version_id: periodVersionIds },
        transaction,
    });
}

async function initializeExecutionPeriodsForMaster(masterVersionId, subdivisionMode, customPeriods = []) {
    const t = await sequelize.transaction();
    try {
        const master = await PlanVersion.findByPk(masterVersionId, { transaction: t });
        if (!master || master.version_kind !== "master") {
            await t.rollback();
            return { success: false, message: "Master plan version not found" };
        }

        if (!master.annual_targets_finalized_at) {
            await t.rollback();
            return {
                success: false,
                message: "Finalize annual execution targets before initializing execution periods",
            };
        }

        if (master.period_subdivision_mode) {
            await t.rollback();
            return { success: false, message: "Execution periods have already been initialized" };
        }

        const annualVersions = await PlanVersion.findAll({
            where: { parent_plan_version_id: masterVersionId, version_kind: "annual" },
            order: [["sequence_index", "ASC"]],
            transaction: t,
        });

        if (annualVersions.length === 0) {
            await t.rollback();
            return { success: false, message: "No annual execution versions exist" };
        }

        for (const annualVersion of annualVersions) {
            if (annualVersion.period_subdivision_mode) {
                await t.rollback();
                return {
                    success: false,
                    message: "Execution periods have already been initialized for one or more years",
                };
            }

            const existingCount = await PlanVersion.count({
                where: {
                    parent_plan_version_id: annualVersion.plan_version_id,
                    version_kind: "execution_period",
                },
                transaction: t,
            });

            if (existingCount > 0) {
                if (annualVersion.period_subdivision_mode) {
                    await t.rollback();
                    return {
                        success: false,
                        message: `Execution periods have already been initialized for ${annualVersion.planning_year ?? annualVersion.year}`,
                    };
                }
                await deleteUninitializedExecutionPeriodsForAnnual(
                    annualVersion.plan_version_id,
                    t
                );
            }
        }

        const allExecutionPeriods = [];

        for (const annualVersion of annualVersions) {
            const result = await generateExecutionPeriods(annualVersion.plan_version_id, t, {
                subdivisionMode,
                customPeriods,
            });

            if (!result.success) {
                await t.rollback();
                return result;
            }

            await annualVersion.update(
                { period_subdivision_mode: subdivisionMode },
                { transaction: t }
            );

            allExecutionPeriods.push(...result.executionPeriods);
        }

        await master.update({ period_subdivision_mode: subdivisionMode }, { transaction: t });

        await t.commit();

        return {
            success: true,
            data: await PlanVersion.findByPk(masterVersionId, {
                include: [{ association: "annualVersions" }],
            }),
            executionPeriods: allExecutionPeriods,
            annualVersions,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function initializeExecutionPeriods(versionId, subdivisionMode, customPeriods = []) {
    const version = await PlanVersion.findByPk(versionId);
    if (!version) {
        return { success: false, message: "Plan version not found" };
    }

    let masterVersionId = null;
    if (version.version_kind === "master") {
        masterVersionId = versionId;
    } else if (version.version_kind === "annual") {
        masterVersionId = version.parent_plan_version_id;
    } else {
        return {
            success: false,
            message: "Execution periods must be initialized from the master or annual plan version",
        };
    }

    if (!masterVersionId) {
        return { success: false, message: "Master plan version not found" };
    }

    return initializeExecutionPeriodsForMaster(masterVersionId, subdivisionMode, customPeriods);
}

async function validateExecutionPeriodFinalization(annualVersionId, transaction, options = {}) {
    const { ignoreFinalizedFlag = false } = options;
    const annualVersion = await PlanVersion.findByPk(annualVersionId, { transaction });
    if (!annualVersion || annualVersion.version_kind !== "annual") {
        return { ready: false, errors: ["Annual plan version not found"] };
    }

    if (!annualVersion.period_subdivision_mode) {
        return { ready: false, errors: ["Execution periods have not been initialized"] };
    }

    if (!ignoreFinalizedFlag && annualVersion.period_targets_finalized_at) {
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

    for (const period of periods) {
        const treeErrors = await validatePeriodClassificationTree(period.plan_version_id, transaction);
        for (const err of treeErrors) {
            errors.push(err);
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
    const annual = await PlanVersion.findByPk(annualVersionId, {
        attributes: ["execution_snapshot_of_version_id"],
    });
    const where = {
        parent_plan_version_id: annualVersionId,
        version_kind: "execution_period",
    };
    if (!annual?.execution_snapshot_of_version_id) {
        where.execution_snapshot_of_version_id = null;
    }

    return PlanVersion.findAll({
        where,
        order: [["sequence_index", "ASC"]],
        include: [{ association: "governmentStructure" }],
    });
}

async function validatePeriodTargetAllocation(annualPlanNodeId, periodTarget, excludeNodeId, transaction) {
    if (periodTarget === null || periodTarget === undefined) {
        return { valid: true };
    }

    const numericTarget = Number(periodTarget);
    if (Number.isNaN(numericTarget) || numericTarget <= 0) {
        return { valid: false, message: "Period target must be greater than 0" };
    }

    const annualNode = await PlanNode.findByPk(annualPlanNodeId, { transaction });
    if (!annualNode) {
        return { valid: false, message: "Source annual plan node not found" };
    }

    const annualTarget = Number(annualNode.annual_target) || 0;
    if (annualTarget <= 0) {
        return { valid: false, message: "This node has no annual target to allocate against" };
    }

    const periodVersions = await PlanVersion.findAll({
        where: {
            parent_plan_version_id: annualNode.plan_version_id,
            version_kind: "execution_period",
        },
        attributes: ["plan_version_id"],
        transaction,
    });
    const periodVersionIds = periodVersions.map((period) => period.plan_version_id);

    const periodNodes =
        periodVersionIds.length > 0
            ? await PlanNode.findAll({
                  where: {
                      source_plan_node_id: annualPlanNodeId,
                      plan_version_id: periodVersionIds,
                  },
                  transaction,
              })
            : [];

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
        if (annualVersion?.parent_plan_version_id) {
            const reviewMaster = await PlanVersion.findByPk(annualVersion.parent_plan_version_id, {
                transaction: t,
            });
            if (reviewMaster?.review_status === "under_review") {
                await t.rollback();
                return {
                    success: false,
                    message: "Plan is under review — period targets cannot be edited",
                };
            }
        }
        if (annualVersion?.period_targets_finalized_at) {
            await t.rollback();
            return {
                success: false,
                message: "Period targets are finalized for this annual year and cannot be changed",
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
        let version = await PlanVersion.findByPk(periodVersionId, { transaction: t });
        if (!version || version.version_kind !== "execution_period") {
            await t.rollback();
            return { success: false, message: "Execution period version not found" };
        }

        const { isExecutionSnapshotVersion, buildLiveToSnapshotVersionMap } = require(
            "./planExecutionSnapshotService"
        );

        if (!isExecutionSnapshotVersion(version)) {
            const annual = await PlanVersion.findByPk(version.parent_plan_version_id, {
                transaction: t,
            });
            const master = annual?.parent_plan_version_id
                ? await PlanVersion.findByPk(annual.parent_plan_version_id, { transaction: t })
                : null;
            const liveMaster =
                master?.execution_snapshot_of_version_id
                    ? await PlanVersion.findByPk(master.execution_snapshot_of_version_id, {
                          transaction: t,
                      })
                    : master;

            if (liveMaster?.active_execution_snapshot_id) {
                const versionMap = await buildLiveToSnapshotVersionMap(
                    liveMaster.active_execution_snapshot_id,
                    t
                );
                const snapshotPeriod = versionMap.get(version.plan_version_id);
                if (snapshotPeriod) {
                    version = snapshotPeriod;
                    periodVersionId = snapshotPeriod.plan_version_id;
                }
            }
        }

        if (version.status === "completed" || version.execution_status === "completed") {
            await t.rollback();
            return { success: false, message: "This execution period is already completed" };
        }

        if (version.execution_status && version.execution_status !== "open") {
            await t.rollback();
            return {
                success: false,
                message: "Only the open execution period can be completed",
            };
        }

        const { validatePeriodReadyToComplete } = require("./planExecutionActualService");
        const actualsCheck = await validatePeriodReadyToComplete(periodVersionId, t);
        if (!actualsCheck.ready) {
            await t.rollback();
            return { success: false, message: actualsCheck.message };
        }

        const { advanceExecutionGateAfterPeriodComplete } = require("./planExecutionGateService");

        let unlockedVersion = null;
        if (isExecutionSnapshotVersion(version)) {
            unlockedVersion = await advanceExecutionGateAfterPeriodComplete(
                periodVersionId,
                t
            );
        } else {
            await version.update({ status: "completed", is_locked: false }, { transaction: t });
        }

        await t.commit();
        return {
            success: true,
            data: await PlanVersion.findByPk(periodVersionId),
            unlockedVersion,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function getPeriodTargetAllocationsForVersion(periodVersionId) {
    const version = await PlanVersion.findByPk(periodVersionId);
    if (!version || version.version_kind !== "execution_period") {
        return [];
    }

    const annualVersion = await PlanVersion.findByPk(version.parent_plan_version_id);
    if (annualVersion?.period_targets_finalized_at) {
        return [];
    }

    const nodesInVersion = await PlanNode.findAll({
        where: { plan_version_id: periodVersionId },
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

    const periodVersions = await PlanVersion.findAll({
        where: {
            parent_plan_version_id: annualVersion.plan_version_id,
            version_kind: "execution_period",
        },
        attributes: ["plan_version_id"],
    });
    const periodVersionIds = periodVersions.map((period) => period.plan_version_id);

    const [annualNodes, allPeriodNodes] = await Promise.all([
        PlanNode.findAll({
            where: {
                plan_node_id: sourceIds,
                plan_version_id: annualVersion.plan_version_id,
            },
        }),
        periodVersionIds.length > 0
            ? PlanNode.findAll({
                  where: {
                      source_plan_node_id: sourceIds,
                      plan_version_id: periodVersionIds,
                  },
              })
            : [],
    ]);

    const annualTargetBySourceId = new Map(
        annualNodes.map((node) => [node.plan_node_id, Number(node.annual_target) || 0])
    );

    const periodBySourceId = new Map();
    for (const periodNode of allPeriodNodes) {
        const sourceId = periodNode.source_plan_node_id;
        if (!periodBySourceId.has(sourceId)) {
            periodBySourceId.set(sourceId, []);
        }
        periodBySourceId.get(sourceId).push(periodNode);
    }

    const allocations = [];

    for (const node of nodesInVersion) {
        if (!node.source_plan_node_id) continue;

        const annualTarget = annualTargetBySourceId.get(node.source_plan_node_id) ?? 0;
        if (annualTarget <= 0) continue;

        const siblings = periodBySourceId.get(node.source_plan_node_id) ?? [];
        let allocatedOtherPeriods = 0;
        let currentPeriodValue = 0;

        for (const sibling of siblings) {
            const value = Number(sibling.period_target) || 0;
            if (sibling.plan_node_id === node.plan_node_id) {
                currentPeriodValue = value;
            } else {
                allocatedOtherPeriods += value;
            }
        }

        const allocatedTotal = allocatedOtherPeriods + currentPeriodValue;

        allocations.push({
            plan_node_id: node.plan_node_id,
            source_plan_node_id: node.source_plan_node_id,
            annual_target: annualTarget,
            allocated_other_periods: allocatedOtherPeriods,
            current_period_value: currentPeriodValue,
            allocated_total: allocatedTotal,
            remaining_for_this_period: Math.max(0, annualTarget - allocatedOtherPeriods),
            remaining_overall: Math.max(0, annualTarget - allocatedTotal),
        });
    }

    return allocations;
}

async function validateGlobalPeriodTargetFinalization(masterVersionId, transaction) {
    const master = await PlanVersion.findByPk(masterVersionId, { transaction });
    if (!master || master.version_kind !== "master") {
        return { ready: false, errors: ["Master plan version not found"] };
    }

    if (!master.annual_targets_finalized_at) {
        return {
            ready: false,
            errors: ["Finalize annual execution before finalizing period targets"],
        };
    }

    if (!master.period_subdivision_mode) {
        return {
            ready: false,
            errors: ["Initialize execution periods before finalizing period targets"],
        };
    }

    if (master.period_targets_finalized_at) {
        return { ready: false, errors: ["Period targets have already been finalized"] };
    }

    const annualVersions = await PlanVersion.findAll({
        where: { parent_plan_version_id: masterVersionId, version_kind: "annual" },
        order: [["sequence_index", "ASC"]],
        transaction,
    });

    if (annualVersions.length === 0) {
        return { ready: false, errors: ["No annual execution versions exist"] };
    }

    const errors = [];

    for (const annualVersion of annualVersions) {
        const yearLabel = annualVersion.planning_year ?? annualVersion.year;
        const result = await validateExecutionPeriodFinalization(
            annualVersion.plan_version_id,
            transaction
        );
        for (const err of result.errors ?? []) {
            errors.push(`${yearLabel}: ${err}`);
        }
    }

    return {
        ready: errors.length === 0,
        errors,
        master,
        annualVersions,
    };
}

async function getGlobalPeriodTargetFinalizationReadiness(masterVersionId) {
    const t = await sequelize.transaction();
    try {
        const result = await validateGlobalPeriodTargetFinalization(masterVersionId, t);
        await t.rollback();
        return {
            ready: result.ready,
            errors: result.errors,
            period_subdivision_mode: result.master?.period_subdivision_mode ?? null,
            period_targets_finalized_at: result.master?.period_targets_finalized_at ?? null,
            planning_years: (result.annualVersions ?? []).map(
                (version) => version.planning_year ?? version.year
            ),
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function finalizeGlobalPeriodTargets(masterVersionId) {
    const t = await sequelize.transaction();
    try {
        const validation = await validateGlobalPeriodTargetFinalization(masterVersionId, t);
        if (!validation.ready) {
            await t.rollback();
            return { success: false, errors: validation.errors };
        }

        const now = new Date();
        await validation.master.update({ period_targets_finalized_at: now }, { transaction: t });

        for (const annualVersion of validation.annualVersions) {
            await annualVersion.update({ period_targets_finalized_at: now }, { transaction: t });
        }

        await t.commit();
        return {
            success: true,
            data: await PlanVersion.findByPk(masterVersionId, {
                include: [{ association: "annualVersions" }],
            }),
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function validatePeriodClassificationTree(periodVersionId, transaction) {
    const periodVersion = await PlanVersion.findByPk(periodVersionId, { transaction });
    if (!periodVersion || periodVersion.version_kind !== "execution_period") {
        return ["Execution period version not found"];
    }

    const rule = await resolvePlanRuleForVersion(periodVersion, transaction);
    const nodes = await PlanNode.findAll({
        where: { plan_version_id: periodVersionId, is_active: true },
        transaction,
    });

    const errors = [];

    for (const node of nodes) {
        if (rule && !stepRequiresWeight(rule, node.level)) {
            continue;
        }

        const children = nodes.filter((candidate) => candidate.parent_id === node.plan_node_id);
        const weightedChildren = children.filter(
            (child) => !rule || stepRequiresWeight(rule, child.level)
        );

        if (weightedChildren.length > 0) {
            const parentTarget = Number(node.period_target) || 0;
            if (parentTarget <= 0) {
                errors.push(
                    `"${node.title}" in ${periodVersion.period_label} requires a period target before its children can be validated`
                );
                continue;
            }

            const childSum = weightedChildren.reduce(
                (sum, child) => sum + (Number(child.period_target) || 0),
                0
            );

            if (Math.abs(childSum - parentTarget) > 0.001) {
                errors.push(
                    `Children of "${node.title}" in ${periodVersion.period_label} sum to ${childSum} but parent period target is ${parentTarget}`
                );
            }
            continue;
        }

        if (!node.source_plan_node_id) {
            continue;
        }

        const annualNode = await PlanNode.findByPk(node.source_plan_node_id, { transaction });
        const annualTarget = Number(annualNode?.annual_target) || 0;
        if (annualTarget <= 0) {
            continue;
        }

        const periodTarget = Number(node.period_target) || 0;
        if (periodTarget <= 0) {
            errors.push(
                `Period target is not set for "${node.title}" in ${periodVersion.period_label}`
            );
        }
    }

    return errors;
}

/** Target pipeline checks shared by publish-for-review and start-process (no review or process gates). */
async function validatePlanTargetPipelineReadiness(masterVersionId, transaction) {
    const master = await PlanVersion.findByPk(masterVersionId, { transaction });
    if (!master || master.version_kind !== "master") {
        return { ready: false, errors: ["Master plan version not found"], master: null, annualVersions: [] };
    }

    if (master.status !== "finalized") {
        return {
            ready: false,
            errors: ["Strategic draft must be finalized first"],
            master,
            annualVersions: [],
        };
    }

    if (!master.annual_targets_finalized_at) {
        return {
            ready: false,
            errors: ["Finalize annual execution first"],
            master,
            annualVersions: [],
        };
    }

    if (!master.period_subdivision_mode) {
        return {
            ready: false,
            errors: ["Initialize execution periods first"],
            master,
            annualVersions: [],
        };
    }

    const annualVersions = await PlanVersion.findAll({
        where: { parent_plan_version_id: masterVersionId, version_kind: "annual" },
        order: [["sequence_index", "ASC"]],
        transaction,
    });

    const errors = [];

    for (const annualVersion of annualVersions) {
        const yearLabel = annualVersion.planning_year ?? annualVersion.year;
        if (!annualVersion.period_targets_finalized_at) {
            errors.push(`${yearLabel}: Finalize execution period targets for this year first`);
            continue;
        }

        const aggregateResult = await validateExecutionPeriodFinalization(
            annualVersion.plan_version_id,
            transaction,
            { ignoreFinalizedFlag: true }
        );
        for (const err of aggregateResult.errors ?? []) {
            errors.push(`${yearLabel}: ${err}`);
        }

        const periods = await PlanVersion.findAll({
            where: {
                parent_plan_version_id: annualVersion.plan_version_id,
                version_kind: "execution_period",
            },
            transaction,
        });

        for (const period of periods) {
            const treeErrors = await validatePeriodClassificationTree(
                period.plan_version_id,
                transaction
            );
            for (const err of treeErrors) {
                errors.push(`${yearLabel}: ${err}`);
            }
        }
    }

    return {
        ready: errors.length === 0,
        errors,
        master,
        annualVersions,
    };
}

async function validateStartProcessReadiness(masterVersionId, transaction) {
    const result = await validatePlanTargetPipelineReadiness(masterVersionId, transaction);
    const errors = [...(result.errors ?? [])];

    if (result.master?.process_started_at) {
        return {
            ready: false,
            errors: ["Process has already been started"],
            master: result.master,
            annualVersions: result.annualVersions,
        };
    }

    const master = result.master;
    if (master) {
        if (!hasBeenPublishedForReview(master)) {
            errors.push("Publish the plan for review at least once before starting process");
        }
        if (!isMasterReviewCompleted(master)) {
            errors.push("Complete and close plan review before starting process");
        }
    }

    return {
        ready: errors.length === 0,
        errors,
        master: result.master,
        annualVersions: result.annualVersions,
    };
}

async function getStartProcessReadiness(masterVersionId) {
    const t = await sequelize.transaction();
    try {
        const result = await validateStartProcessReadiness(masterVersionId, t);
        await t.rollback();
        return {
            ready: result.ready,
            errors: result.errors,
            process_started_at: result.master?.process_started_at ?? null,
            period_targets_finalized_at: result.master?.period_targets_finalized_at ?? null,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function startPlanProcess(masterVersionId) {
    const t = await sequelize.transaction();
    try {
        const validation = await validateStartProcessReadiness(masterVersionId, t);
        if (!validation.ready) {
            await t.rollback();
            return { success: false, errors: validation.errors };
        }

        const {
            createExecutionSnapshot,
        } = require("./planExecutionSnapshotService");
        const {
            lockLivePlanningVersions,
            initializeExecutionGate,
        } = require("./planExecutionGateService");

        const now = new Date();
        const snapshotMaster = await createExecutionSnapshot(masterVersionId, t);

        await validation.master.update(
            {
                process_started_at: now,
                active_execution_snapshot_id: snapshotMaster.plan_version_id,
            },
            { transaction: t }
        );

        await snapshotMaster.update({ process_started_at: now }, { transaction: t });

        await lockLivePlanningVersions(masterVersionId, t);
        await initializeExecutionGate(snapshotMaster.plan_version_id, t);

        await t.commit();
        return {
            success: true,
            data: await PlanVersion.findByPk(masterVersionId),
            executionSnapshot: snapshotMaster,
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

function isVersionEditable(planVersion) {
    if (!planVersion) return false;
    if (planVersion.version_kind === "master") {
        if (planVersion.review_status === "under_review") return false;
        return planVersion.status === "draft" || planVersion.review_status === "corrections_unlocked";
    }
    if (planVersion.version_kind === "annual" || planVersion.version_kind === "execution_period") {
        return planVersion.status !== "completed";
    }
    return false;
}

async function reopenFinalizedPlanForEdit(masterVersionId) {
    const t = await sequelize.transaction();
    try {
        const master = await PlanVersion.findByPk(masterVersionId, { transaction: t });
        if (!master || master.version_kind !== "master") {
            await t.rollback();
            return { success: false, message: "Master plan version not found" };
        }
        if (master.status !== "finalized") {
            await t.rollback();
            return {
                success: false,
                message: "Only finalized strategic plans can be reopened for editing",
            };
        }

        const annualVersions = await PlanVersion.findAll({
            where: { parent_plan_version_id: masterVersionId, version_kind: "annual" },
            transaction: t,
        });

        await master.update(
            {
                status: "draft",
                finalized_at: null,
                annual_targets_finalized_at: null,
                period_targets_finalized_at: null,
                process_started_at: null,
                active_execution_snapshot_id: null,
            },
            { transaction: t }
        );

        for (const annualVersion of annualVersions) {
            const updates = {
                period_targets_finalized_at: null,
                is_locked: false,
            };

            if (annualVersion.status !== "completed") {
                updates.status = "draft";
            }

            await annualVersion.update(updates, { transaction: t });

            const executionPeriods = await PlanVersion.findAll({
                where: {
                    parent_plan_version_id: annualVersion.plan_version_id,
                    version_kind: "execution_period",
                },
                transaction: t,
            });

            for (const period of executionPeriods) {
                if (period.status === "completed") continue;
                await period.update({ status: "draft", is_locked: false }, { transaction: t });
            }
        }

        await syncAllDerivedNodesFromMaster(masterVersionId, t);

        await t.commit();

        return {
            success: true,
            data: await PlanVersion.findByPk(masterVersionId, {
                include: [{ association: "annualVersions" }],
            }),
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

module.exports = {
    enumeratePlanningYears,
    copyNodesWithAssignments,
    copyNodesAndAssignments,
    duplicateMasterPlanDraft,
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
    initializeExecutionPeriodsForMaster,
    getExecutionPeriods,
    validateExecutionPeriodFinalization,
    getExecutionPeriodFinalizationReadiness,
    finalizeExecutionPeriodTargets,
    validatePeriodTargetAllocation,
    getPeriodTargetAllocationsForVersion,
    validateGlobalPeriodTargetFinalization,
    getGlobalPeriodTargetFinalizationReadiness,
    finalizeGlobalPeriodTargets,
    validatePeriodClassificationTree,
    validatePlanTargetPipelineReadiness,
    validateStartProcessReadiness,
    getStartProcessReadiness,
    startPlanProcess,
    setPeriodTarget,
    completeExecutionPeriod,
    isVersionEditable,
    reopenFinalizedPlanForEdit,
};
