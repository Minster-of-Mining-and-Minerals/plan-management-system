"use strict";

const { v4: uuidv4 } = require("uuid");
const {
    PlanVersion,
    PlanNode,
    ExternalAssignment,
    InternalAssignment,
} = require("../models");

function pickNodeFields(node) {
    return {
        type: node.type,
        title: node.title,
        description: node.description,
        weight: node.weight,
        weight_mode: node.weight_mode,
        target_unit: node.target_unit,
        level: node.level,
        order: node.order,
        is_active: node.is_active,
        assignment_sharing_mode: node.assignment_sharing_mode,
    };
}

async function findAnnualNodeForMaster(annualVersionId, masterNodeId, transaction) {
    return PlanNode.findOne({
        where: {
            plan_version_id: annualVersionId,
            source_plan_node_id: masterNodeId,
        },
        transaction,
    });
}

async function propagateMasterPlanNodeCreate(masterNode, transaction) {
    const annualVersions = await PlanVersion.findAll({
        where: {
            parent_plan_version_id: masterNode.plan_version_id,
            version_kind: "annual",
        },
        transaction,
    });

    for (const annualVersion of annualVersions) {
        let derivedParentId = null;
        if (masterNode.parent_id) {
            const parentAnnualNode = await findAnnualNodeForMaster(
                annualVersion.plan_version_id,
                masterNode.parent_id,
                transaction
            );
            derivedParentId = parentAnnualNode?.plan_node_id ?? null;
        }

        const annualNode = await PlanNode.create(
            {
                plan_node_id: uuidv4(),
                plan_version_id: annualVersion.plan_version_id,
                parent_id: derivedParentId,
                source_plan_node_id: masterNode.plan_node_id,
                ...pickNodeFields(masterNode),
                annual_target: null,
                period_target: null,
            },
            { transaction }
        );

        const periodVersions = await PlanVersion.findAll({
            where: {
                parent_plan_version_id: annualVersion.plan_version_id,
                version_kind: "execution_period",
            },
            transaction,
        });

        for (const periodVersion of periodVersions) {
            let periodParentId = null;
            if (derivedParentId) {
                const parentPeriodNode = await PlanNode.findOne({
                    where: {
                        plan_version_id: periodVersion.plan_version_id,
                        source_plan_node_id: derivedParentId,
                    },
                    transaction,
                });
                periodParentId = parentPeriodNode?.plan_node_id ?? null;
            }

            await PlanNode.create(
                {
                    plan_node_id: uuidv4(),
                    plan_version_id: periodVersion.plan_version_id,
                    parent_id: periodParentId,
                    source_plan_node_id: annualNode.plan_node_id,
                    ...pickNodeFields(masterNode),
                    annual_target: null,
                    period_target: null,
                },
                { transaction }
            );
        }
    }
}

async function propagateMasterPlanNodeUpdate(masterNode, transaction) {
    const fields = pickNodeFields(masterNode);

    const annualNodes = await PlanNode.findAll({
        where: { source_plan_node_id: masterNode.plan_node_id },
        transaction,
    });

    for (const annualNode of annualNodes) {
        await annualNode.update(fields, { transaction });

        const periodNodes = await PlanNode.findAll({
            where: { source_plan_node_id: annualNode.plan_node_id },
            transaction,
        });

        for (const periodNode of periodNodes) {
            await periodNode.update(fields, { transaction });
        }
    }
}

async function propagateMasterPlanNodeDelete(masterNodeId, transaction) {
    const annualNodes = await PlanNode.findAll({
        where: { source_plan_node_id: masterNodeId },
        attributes: ["plan_node_id"],
        transaction,
    });

    const annualNodeIds = annualNodes.map((node) => node.plan_node_id);
    if (annualNodeIds.length === 0) {
        return;
    }

    const periodNodes = await PlanNode.findAll({
        where: { source_plan_node_id: annualNodeIds },
        attributes: ["plan_node_id"],
        transaction,
    });

    const allDerivedIds = [...annualNodeIds, ...periodNodes.map((node) => node.plan_node_id)];

    await ExternalAssignment.destroy({
        where: { plan_node_id: allDerivedIds },
        transaction,
    });
    await InternalAssignment.destroy({
        where: { plan_node_id: allDerivedIds },
        transaction,
    });
    await PlanNode.destroy({
        where: { plan_node_id: allDerivedIds },
        transaction,
    });
}

async function propagateExternalAssignmentCreate(masterNodeId, assignment, transaction) {
    const annualNodes = await PlanNode.findAll({
        where: { source_plan_node_id: masterNodeId },
        attributes: ["plan_node_id"],
        transaction,
    });

    for (const annualNode of annualNodes) {
        await ExternalAssignment.create(
            {
                external_assignment_id: uuidv4(),
                plan_node_id: annualNode.plan_node_id,
                government_structure_id: assignment.government_structure_id,
                is_visible: assignment.is_visible,
                requires_report: assignment.requires_report,
                is_active: assignment.is_active,
            },
            { transaction }
        );
    }
}

async function propagateInternalAssignmentCreate(masterNodeId, assignment, transaction) {
    const annualNodes = await PlanNode.findAll({
        where: { source_plan_node_id: masterNodeId },
        attributes: ["plan_node_id"],
        transaction,
    });

    for (const annualNode of annualNodes) {
        await InternalAssignment.create(
            {
                internal_assignment_id: uuidv4(),
                plan_node_id: annualNode.plan_node_id,
                internal_structure_id: assignment.internal_structure_id,
                user_id: assignment.user_id,
                is_visible: assignment.is_visible,
                requires_report: assignment.requires_report,
                is_active: assignment.is_active,
            },
            { transaction }
        );
    }
}

async function masterHasDerivedAnnualVersions(masterVersionId, transaction) {
    const count = await PlanVersion.count({
        where: {
            parent_plan_version_id: masterVersionId,
            version_kind: "annual",
        },
        transaction,
    });
    return count > 0;
}

async function shouldPropagateMasterStructureChanges(planVersion, transaction) {
    if (!planVersion || planVersion.version_kind !== "master") {
        return false;
    }
    if (planVersion.status === "finalized") {
        return true;
    }
    return masterHasDerivedAnnualVersions(planVersion.plan_version_id, transaction);
}

async function syncAllDerivedNodesFromMaster(masterVersionId, transaction) {
    const masterNodes = await PlanNode.findAll({
        where: { plan_version_id: masterVersionId },
        transaction,
    });

    for (const masterNode of masterNodes) {
        await propagateMasterPlanNodeUpdate(masterNode, transaction);
    }
}

module.exports = {
    propagateMasterPlanNodeCreate,
    propagateMasterPlanNodeUpdate,
    propagateMasterPlanNodeDelete,
    propagateExternalAssignmentCreate,
    propagateInternalAssignmentCreate,
    masterHasDerivedAnnualVersions,
    shouldPropagateMasterStructureChanges,
    syncAllDerivedNodesFromMaster,
};
