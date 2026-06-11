"use strict";

const { PlanNode, PlanVersion } = require("../models");

function compareSortMeta(aMeta, bMeta) {
    const orderDiff = (aMeta.order ?? 0) - (bMeta.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    const aTime = aMeta.created_at ? new Date(aMeta.created_at).getTime() : 0;
    const bTime = bMeta.created_at ? new Date(bMeta.created_at).getTime() : 0;
    return aTime - bTime;
}

function localNodeSortMeta(node) {
    return { order: node.order ?? 0, created_at: node.created_at ?? null };
}

/**
 * Maps each node in a version to draft-aligned sort metadata (order + created_at from master draft).
 */
async function buildDraftAlignedSortMeta(planVersion, nodes) {
    const meta = new Map();

    if (!planVersion || planVersion.version_kind === "master") {
        for (const node of nodes) {
            meta.set(node.plan_node_id, localNodeSortMeta(node));
        }
        return meta;
    }

    let masterVersionId = null;
    let annualToMaster = new Map();

    if (planVersion.version_kind === "annual") {
        masterVersionId = planVersion.parent_plan_version_id;
    } else if (planVersion.version_kind === "execution_period") {
        const annualVersion = await PlanVersion.findByPk(planVersion.parent_plan_version_id, {
            attributes: ["plan_version_id", "parent_plan_version_id"],
        });
        masterVersionId = annualVersion?.parent_plan_version_id ?? null;
        if (planVersion.parent_plan_version_id) {
            const annualNodes = await PlanNode.findAll({
                where: { plan_version_id: planVersion.parent_plan_version_id },
                attributes: ["plan_node_id", "source_plan_node_id"],
            });
            annualToMaster = new Map(
                annualNodes.map((node) => [node.plan_node_id, node.source_plan_node_id])
            );
        }
    }

    const masterMeta = new Map();
    if (masterVersionId) {
        const masterNodes = await PlanNode.findAll({
            where: { plan_version_id: masterVersionId },
            attributes: ["plan_node_id", "order", "created_at"],
        });
        for (const masterNode of masterNodes) {
            masterMeta.set(masterNode.plan_node_id, localNodeSortMeta(masterNode));
        }
    }

    for (const node of nodes) {
        let masterNodeId = null;
        if (planVersion.version_kind === "annual") {
            masterNodeId = node.source_plan_node_id;
        } else if (planVersion.version_kind === "execution_period") {
            masterNodeId = annualToMaster.get(node.source_plan_node_id) ?? null;
        }

        const draftMeta = masterNodeId ? masterMeta.get(masterNodeId) : null;
        meta.set(node.plan_node_id, draftMeta ?? localNodeSortMeta(node));
    }

    return meta;
}

function sortHierarchyTree(nodes, sortMetaByNodeId) {
    const sorted = [...nodes].sort((a, b) =>
        compareSortMeta(
            sortMetaByNodeId.get(a.plan_node_id) ?? localNodeSortMeta(a),
            sortMetaByNodeId.get(b.plan_node_id) ?? localNodeSortMeta(b)
        )
    );

    for (const node of sorted) {
        if (Array.isArray(node.children) && node.children.length > 0) {
            node.children = sortHierarchyTree(node.children, sortMetaByNodeId);
        }
    }

    return sorted;
}

/**
 * Overlays live annual_target from the parent annual version onto execution-period nodes.
 */
async function enrichPeriodNodesWithLiveAnnualTargets(planVersion, nodeMap, nodes) {
    if (!planVersion || planVersion.version_kind !== "execution_period") {
        return;
    }

    const sourceIds = [
        ...new Set(nodes.map((node) => node.source_plan_node_id).filter(Boolean)),
    ];
    if (sourceIds.length === 0) {
        return;
    }

    const annualNodes = await PlanNode.findAll({
        where: {
            plan_node_id: sourceIds,
            plan_version_id: planVersion.parent_plan_version_id,
        },
        attributes: ["plan_node_id", "annual_target"],
    });

    const annualTargetBySourceId = new Map(
        annualNodes.map((node) => [node.plan_node_id, node.annual_target])
    );

    for (const node of nodes) {
        if (!node.source_plan_node_id) continue;
        const liveAnnualTarget = annualTargetBySourceId.get(node.source_plan_node_id);
        if (liveAnnualTarget === undefined) continue;
        const enriched = nodeMap.get(node.plan_node_id);
        if (enriched) {
            enriched.annual_target = liveAnnualTarget;
        }
    }
}

module.exports = {
    buildDraftAlignedSortMeta,
    sortHierarchyTree,
    compareSortMeta,
    enrichPeriodNodesWithLiveAnnualTargets,
};
