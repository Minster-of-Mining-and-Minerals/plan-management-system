"use strict";

const { PlanNode, PlanVersion } = require("../models");

/**
 * Returns the next sibling order index (0-based) within a parent level.
 * Uses sibling count so new nodes always append after existing ones.
 * Only call for master draft plan versions — derived versions inherit order.
 */
async function getNextSiblingOrder(planVersionId, parentId, transaction) {
    const siblingCount = await PlanNode.count({
        where: {
            plan_version_id: planVersionId,
            parent_id: parentId,
            is_active: true,
        },
        transaction,
    });

    return siblingCount;
}

const { isMasterDraftVersion, isMasterFinalized } = require("./planMasterEditUtils");

const EDIT_FINALIZED_PERMISSION = "plans:edit_finalized";

function userCanEditFinalizedMaster(user) {
    return Boolean(user?.permissions?.includes(EDIT_FINALIZED_PERMISSION));
}

/**
 * Ensures reorder targets are sibling nodes on a single editable master plan version.
 */
async function validateMasterPlanReorderNodes(nodeOrders, parentId, user, transaction) {
    const nodeIds = nodeOrders.map((item) => item.plan_node_id);

    const nodes = await PlanNode.findAll({
        where: { plan_node_id: nodeIds },
        include: [
            {
                model: PlanVersion,
                as: "planVersion",
                attributes: ["plan_version_id", "version_kind", "status"],
            },
        ],
        transaction,
    });

    if (nodes.length !== nodeIds.length) {
        return { valid: false, message: "One or more nodes not found" };
    }

    const masterVersionId = nodes[0].plan_version_id;

    for (const node of nodes) {
        const isDraft = isMasterDraftVersion(node.planVersion);
        const isFinalizedEdit =
            isMasterFinalized(node.planVersion) && userCanEditFinalizedMaster(user);

        if (!isDraft && !isFinalizedEdit) {
            return {
                valid: false,
                message:
                    "Node order can only be changed on the draft master plan or with Edit Finalized Plan permission",
            };
        }
        if (node.plan_version_id !== masterVersionId) {
            return {
                valid: false,
                message: "All nodes must belong to the same master plan version",
            };
        }
        if ((node.parent_id ?? null) !== (parentId ?? null)) {
            return {
                valid: false,
                message: "All nodes must share the same parent for reordering",
            };
        }
    }

    return { valid: true, masterVersionId };
}

/** Copies master draft order to annual and execution-period copies of each node. */
async function propagateOrderFromMasterPlanNode(masterPlanNodeId, order, transaction) {
    const annualNodes = await PlanNode.findAll({
        where: { source_plan_node_id: masterPlanNodeId },
        attributes: ["plan_node_id"],
        transaction,
    });

    if (annualNodes.length === 0) {
        return;
    }

    await PlanNode.update(
        { order },
        { where: { source_plan_node_id: masterPlanNodeId }, transaction }
    );

    const annualIds = annualNodes.map((node) => node.plan_node_id);
    await PlanNode.update(
        { order },
        { where: { source_plan_node_id: annualIds }, transaction }
    );
}

/** Re-syncs all derived node order values from their source chain (master → annual → period). */
async function syncAllDerivedOrdersFromMaster(masterVersionId, transaction) {
    await PlanNode.sequelize.query(
        `
            UPDATE plan_nodes AS derived
            SET "order" = source."order"
            FROM plan_nodes AS source,
                 plan_versions AS derived_version
            WHERE derived.source_plan_node_id = source.plan_node_id
              AND derived.plan_version_id = derived_version.plan_version_id
              AND derived_version.version_kind = 'annual'
              AND derived_version.parent_plan_version_id = :masterVersionId
              AND source.plan_version_id = :masterVersionId
              AND derived."order" IS DISTINCT FROM source."order"
        `,
        { replacements: { masterVersionId }, transaction }
    );

    await PlanNode.sequelize.query(
        `
            UPDATE plan_nodes AS derived
            SET "order" = source."order"
            FROM plan_nodes AS source,
                 plan_versions AS period_version,
                 plan_versions AS annual_version
            WHERE derived.source_plan_node_id = source.plan_node_id
              AND derived.plan_version_id = period_version.plan_version_id
              AND period_version.version_kind = 'execution_period'
              AND period_version.parent_plan_version_id = annual_version.plan_version_id
              AND annual_version.version_kind = 'annual'
              AND annual_version.parent_plan_version_id = :masterVersionId
              AND source.plan_version_id = annual_version.plan_version_id
              AND derived."order" IS DISTINCT FROM source."order"
        `,
        { replacements: { masterVersionId }, transaction }
    );
}

module.exports = {
    getNextSiblingOrder,
    isMasterDraftVersion,
    validateMasterPlanReorderNodes,
    propagateOrderFromMasterPlanNode,
    syncAllDerivedOrdersFromMaster,
};
