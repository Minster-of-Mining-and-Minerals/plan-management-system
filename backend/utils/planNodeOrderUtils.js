"use strict";

const { PlanNode } = require("../models");

/**
 * Returns the next sibling order index (0-based) within a parent level.
 * Uses sibling count so new nodes always append after existing ones.
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

module.exports = {
    getNextSiblingOrder,
    propagateOrderFromMasterPlanNode,
};
