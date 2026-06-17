"use strict";

const { Op } = require("sequelize");
const {
  PlanNode,
  PlanVersion,
  InternalAssignment,
  ExternalAssignment,
  User,
} = require("../models");

async function resolveMasterVersionId(planVersionId) {
  const version = await PlanVersion.findByPk(planVersionId);
  if (!version) return null;
  if (version.version_kind === "master") return version.plan_version_id;

  if (version.version_kind === "annual") {
    return version.parent_plan_version_id;
  }

  if (version.version_kind === "execution_period") {
    const annual = await PlanVersion.findByPk(version.parent_plan_version_id);
    return annual?.parent_plan_version_id ?? null;
  }

  return null;
}

async function getMasterNodes(masterVersionId, transaction = null) {
  return PlanNode.findAll({
    where: { plan_version_id: masterVersionId, is_active: true },
    transaction,
  });
}

async function getAssignedMasterNodeIds(masterVersionId, userId, transaction = null) {
  const user = await User.findByPk(userId, { transaction });
  if (!user) return new Set();

  const masterNodes = await getMasterNodes(masterVersionId, transaction);
  const masterNodeIds = masterNodes.map((n) => n.plan_node_id);
  if (masterNodeIds.length === 0) return new Set();

  const [userAssignments, deptAssignments, sectorAssignments] = await Promise.all([
    InternalAssignment.findAll({
      where: {
        plan_node_id: { [Op.in]: masterNodeIds },
        user_id: userId,
        is_active: true,
      },
      transaction,
    }),
    user.internal_structure_id
      ? InternalAssignment.findAll({
          where: {
            plan_node_id: { [Op.in]: masterNodeIds },
            internal_structure_id: user.internal_structure_id,
            is_active: true,
          },
          transaction,
        })
      : [],
    user.government_structure_id
      ? ExternalAssignment.findAll({
          where: {
            plan_node_id: { [Op.in]: masterNodeIds },
            government_structure_id: user.government_structure_id,
            is_active: true,
            is_visible: true,
          },
          transaction,
        })
      : [],
  ]);

  const seedIds = new Set(
    [...userAssignments, ...deptAssignments, ...sectorAssignments].map(
      (a) => a.plan_node_id
    )
  );

  if (seedIds.size === 0) return new Set();

  const nodeById = new Map(masterNodes.map((n) => [n.plan_node_id, n]));
  const visible = new Set();

  const addAncestors = (nodeId) => {
    let current = nodeById.get(nodeId);
    while (current) {
      visible.add(current.plan_node_id);
      current = current.parent_id ? nodeById.get(current.parent_id) : null;
    }
  };

  const addDescendants = (nodeId) => {
    visible.add(nodeId);
    for (const child of masterNodes) {
      if (child.parent_id === nodeId) {
        addDescendants(child.plan_node_id);
      }
    }
  };

  for (const nodeId of seedIds) {
    addAncestors(nodeId);
    addDescendants(nodeId);
  }

  return visible;
}

function filterHierarchyNodes(nodes, visibleNodeIds) {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .filter((node) => visibleNodeIds.has(node.plan_node_id))
    .map((node) => ({
      ...node,
      children: filterHierarchyNodes(node.children ?? [], visibleNodeIds),
    }));
}

async function mapMasterNodeIdsToVersion(masterVisibleIds, targetVersionId, transaction = null) {
  const targetNodes = await PlanNode.findAll({
    where: { plan_version_id: targetVersionId, is_active: true },
    transaction,
  });

  const visible = new Set();
  for (const node of targetNodes) {
    const sourceId = node.source_plan_node_id || node.plan_node_id;
    if (masterVisibleIds.has(sourceId)) {
      visible.add(node.plan_node_id);
    }
  }
  return visible;
}

async function userCanViewPlanInReview(masterVersionId, user) {
  if (!user) return false;
  if (user.permissions?.includes("plans:read")) return true;
  if (!user.permissions?.includes("plan:view_assigned_review")) return false;

  const assigned = await getAssignedMasterNodeIds(masterVersionId, user.user_id);
  return assigned.size > 0;
}

module.exports = {
  resolveMasterVersionId,
  getMasterNodes,
  getAssignedMasterNodeIds,
  filterHierarchyNodes,
  mapMasterNodeIdsToVersion,
  userCanViewPlanInReview,
};
