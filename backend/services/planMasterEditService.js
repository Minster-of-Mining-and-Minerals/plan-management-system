"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
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

async function getAnnualVersionsForMaster(masterVersionId, transaction) {
    return PlanVersion.findAll({
        where: {
            parent_plan_version_id: masterVersionId,
            version_kind: "annual",
        },
        order: [["sequence_index", "ASC"]],
        transaction,
    });
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

async function resolveAnnualParentId(annualVersionId, masterParentId, transaction) {
    if (!masterParentId) {
        return null;
    }
    const parentAnnualNode = await findAnnualNodeForMaster(
        annualVersionId,
        masterParentId,
        transaction
    );
    return parentAnnualNode?.plan_node_id ?? null;
}

async function upsertAnnualCopyForMaster(masterNode, annualVersion, transaction) {
    const derivedParentId = await resolveAnnualParentId(
        annualVersion.plan_version_id,
        masterNode.parent_id,
        transaction
    );
    const existing = await findAnnualNodeForMaster(
        annualVersion.plan_version_id,
        masterNode.plan_node_id,
        transaction
    );
    const fields = {
        ...pickNodeFields(masterNode),
        parent_id: derivedParentId,
    };

    if (existing) {
        await existing.update(fields, { transaction });
        return existing;
    }

    return PlanNode.create(
        {
            plan_node_id: uuidv4(),
            plan_version_id: annualVersion.plan_version_id,
            source_plan_node_id: masterNode.plan_node_id,
            ...fields,
            annual_target: null,
            period_target: null,
        },
        { transaction }
    );
}

async function upsertPeriodCopiesForAnnualNode(
    annualNode,
    masterNode,
    annualVersionId,
    transaction
) {
    const periodVersions = await PlanVersion.findAll({
        where: {
            parent_plan_version_id: annualVersionId,
            version_kind: "execution_period",
        },
        transaction,
    });

    for (const periodVersion of periodVersions) {
        let periodParentId = null;
        if (annualNode.parent_id) {
            const parentPeriodNode = await PlanNode.findOne({
                where: {
                    plan_version_id: periodVersion.plan_version_id,
                    source_plan_node_id: annualNode.parent_id,
                },
                transaction,
            });
            periodParentId = parentPeriodNode?.plan_node_id ?? null;
        }

        const existing = await PlanNode.findOne({
            where: {
                plan_version_id: periodVersion.plan_version_id,
                source_plan_node_id: annualNode.plan_node_id,
            },
            transaction,
        });

        const fields = {
            ...pickNodeFields(masterNode),
            parent_id: periodParentId,
        };

        if (existing) {
            await existing.update(fields, { transaction });
        } else {
            await PlanNode.create(
                {
                    plan_node_id: uuidv4(),
                    plan_version_id: periodVersion.plan_version_id,
                    source_plan_node_id: annualNode.plan_node_id,
                    ...fields,
                    annual_target: null,
                    period_target: null,
                },
                { transaction }
            );
        }
    }
}

async function syncMasterNodeToDerivedCopies(masterNode, transaction) {
    const annualVersions = await getAnnualVersionsForMaster(
        masterNode.plan_version_id,
        transaction
    );

    for (const annualVersion of annualVersions) {
        const annualNode = await upsertAnnualCopyForMaster(
            masterNode,
            annualVersion,
            transaction
        );
        await upsertPeriodCopiesForAnnualNode(
            annualNode,
            masterNode,
            annualVersion.plan_version_id,
            transaction
        );
    }
}

async function destroyDerivedNodesByIds(nodeIds, transaction) {
    if (!nodeIds.length) {
        return;
    }

    await ExternalAssignment.destroy({
        where: { plan_node_id: nodeIds },
        transaction,
    });
    await InternalAssignment.destroy({
        where: { plan_node_id: nodeIds },
        transaction,
    });
    await PlanNode.destroy({
        where: { plan_node_id: nodeIds },
        transaction,
    });
}

async function removeOrphanDerivedNodes(masterVersionId, transaction) {
    const masterNodes = await PlanNode.findAll({
        where: { plan_version_id: masterVersionId },
        attributes: ["plan_node_id"],
        transaction,
    });
    const masterNodeIds = masterNodes.map((node) => node.plan_node_id);

    const annualVersions = await getAnnualVersionsForMaster(masterVersionId, transaction);

    for (const annualVersion of annualVersions) {
        const orphanWhere =
            masterNodeIds.length > 0
                ? {
                      plan_version_id: annualVersion.plan_version_id,
                      source_plan_node_id: { [Op.notIn]: masterNodeIds },
                  }
                : {
                      plan_version_id: annualVersion.plan_version_id,
                      source_plan_node_id: { [Op.ne]: null },
                  };

        const orphanAnnualNodes = await PlanNode.findAll({
            where: orphanWhere,
            attributes: ["plan_node_id"],
            transaction,
        });

        const orphanAnnualIds = orphanAnnualNodes.map((node) => node.plan_node_id);
        if (orphanAnnualIds.length === 0) {
            continue;
        }

        const orphanPeriodNodes = await PlanNode.findAll({
            where: { source_plan_node_id: orphanAnnualIds },
            attributes: ["plan_node_id"],
            transaction,
        });

        await destroyDerivedNodesByIds(
            [...orphanAnnualIds, ...orphanPeriodNodes.map((node) => node.plan_node_id)],
            transaction
        );
    }
}

async function propagateMasterPlanNodeCreate(masterNode, transaction) {
    await syncMasterNodeToDerivedCopies(masterNode, transaction);
}

async function propagateMasterPlanNodeUpdate(masterNode, transaction) {
    await syncMasterNodeToDerivedCopies(masterNode, transaction);
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

    await destroyDerivedNodesByIds(
        [...annualNodeIds, ...periodNodes.map((node) => node.plan_node_id)],
        transaction
    );
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

/**
 * Full reconcile: upsert every master node into annual/period copies (parents first),
 * then remove derived nodes whose master source no longer exists.
 */
async function syncAllDerivedNodesFromMaster(masterVersionId, transaction) {
    const hasAnnual = await masterHasDerivedAnnualVersions(masterVersionId, transaction);
    if (!hasAnnual) {
        return;
    }

    const masterNodes = await PlanNode.findAll({
        where: { plan_version_id: masterVersionId },
        order: [
            ["level", "ASC"],
            ["order", "ASC"],
            ["created_at", "ASC"],
        ],
        transaction,
    });

    for (const masterNode of masterNodes) {
        await syncMasterNodeToDerivedCopies(masterNode, transaction);
    }

    await removeOrphanDerivedNodes(masterVersionId, transaction);
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
