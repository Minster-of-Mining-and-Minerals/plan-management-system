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

module.exports = {
    getNextSiblingOrder,
};
