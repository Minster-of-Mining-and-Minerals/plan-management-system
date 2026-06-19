"use strict";

const { Op } = require("sequelize");
const {
  PlanNode,
  PlanVersion,
  InternalAssignment,
  ExternalAssignment,
  User,
} = require("../models");
const { hasBeenPublishedForReview } = require("../utils/planReviewUtils");

const REVIEW_VISIBLE_STATUSES = [
  "under_review",
  "review_completed",
  "corrections_unlocked",
];

function hasFullPlanRead(user) {
  return Boolean(user?.permissions?.includes("plans:read"));
}

function hasAssignedReviewRead(user) {
  return Boolean(user?.permissions?.includes("plan:view_assigned_review"));
}

function isMasterVisibleForAssignedReviewer(master) {
  if (!master) return false;
  if (!hasBeenPublishedForReview(master)) return false;
  return REVIEW_VISIBLE_STATUSES.includes(master.review_status);
}

function internalAssignmentMatchesUser(
  assignment,
  user,
  internalById,
  externalById
) {
  if (assignment.user_id && assignment.user_id === user.user_id) {
    return true;
  }

  if (
    assignment.internal_structure_id &&
    user.internal_structure_id &&
    assignment.internal_structure_id === user.internal_structure_id
  ) {
    return true;
  }

  if (assignment.branch_external_assignment_id && user.government_structure_id) {
    const branchExternal = externalById.get(assignment.branch_external_assignment_id);
    if (
      branchExternal?.government_structure_id === user.government_structure_id
    ) {
      return true;
    }
  }

  if (assignment.branch_internal_assignment_id) {
    const visited = new Set();
    let currentId = assignment.branch_internal_assignment_id;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const branchAssignment = internalById.get(currentId);
      if (!branchAssignment) break;

      if (branchAssignment.user_id === user.user_id) {
        return true;
      }

      if (
        branchAssignment.internal_structure_id &&
        user.internal_structure_id &&
        branchAssignment.internal_structure_id === user.internal_structure_id
      ) {
        return true;
      }

      currentId = branchAssignment.branch_internal_assignment_id;
    }
  }

  return false;
}

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

  const [allInternal, allExternal] = await Promise.all([
    InternalAssignment.findAll({
      where: {
        plan_node_id: { [Op.in]: masterNodeIds },
        is_active: true,
      },
      transaction,
    }),
    ExternalAssignment.findAll({
      where: {
        plan_node_id: { [Op.in]: masterNodeIds },
        is_active: true,
        is_visible: true,
      },
      transaction,
    }),
  ]);

  const internalById = new Map(
    allInternal.map((assignment) => [assignment.internal_assignment_id, assignment])
  );
  const externalById = new Map(
    allExternal.map((assignment) => [assignment.external_assignment_id, assignment])
  );

  const seedIds = new Set();

  for (const assignment of allInternal) {
    if (
      internalAssignmentMatchesUser(assignment, user, internalById, externalById)
    ) {
      seedIds.add(assignment.plan_node_id);
    }
  }

  for (const assignment of allExternal) {
    if (
      user.government_structure_id &&
      assignment.government_structure_id === user.government_structure_id
    ) {
      seedIds.add(assignment.plan_node_id);
    }
  }

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
  const targetVersion = await PlanVersion.findByPk(targetVersionId, {
    attributes: ["plan_version_id", "version_kind", "parent_plan_version_id"],
    transaction,
  });
  if (!targetVersion) return new Set();

  const targetNodes = await PlanNode.findAll({
    where: { plan_version_id: targetVersionId, is_active: true },
    transaction,
  });

  if (targetVersion.version_kind === "master") {
    return new Set(
      targetNodes
        .filter((node) => masterVisibleIds.has(node.plan_node_id))
        .map((node) => node.plan_node_id)
    );
  }

  if (targetVersion.version_kind === "annual") {
    const visible = new Set();
    for (const node of targetNodes) {
      const masterSourceId = node.source_plan_node_id || node.plan_node_id;
      if (masterVisibleIds.has(masterSourceId)) {
        visible.add(node.plan_node_id);
      }
    }
    return visible;
  }

  if (targetVersion.version_kind === "execution_period") {
    const annualNodes = await PlanNode.findAll({
      where: {
        plan_version_id: targetVersion.parent_plan_version_id,
        is_active: true,
      },
      attributes: ["plan_node_id", "source_plan_node_id"],
      transaction,
    });

    const visibleAnnualIds = new Set();
    for (const annualNode of annualNodes) {
      const masterSourceId = annualNode.source_plan_node_id || annualNode.plan_node_id;
      if (masterVisibleIds.has(masterSourceId)) {
        visibleAnnualIds.add(annualNode.plan_node_id);
      }
    }

    const visible = new Set();
    for (const node of targetNodes) {
      const annualSourceId = node.source_plan_node_id || node.plan_node_id;
      if (visibleAnnualIds.has(annualSourceId)) {
        visible.add(node.plan_node_id);
      }
    }
    return visible;
  }

  return new Set();
}

async function userCanViewPlanInReview(masterVersionId, user, transaction = null) {
  if (!user) return false;
  if (hasFullPlanRead(user)) return true;
  if (!hasAssignedReviewRead(user)) return false;

  const version = await PlanVersion.findByPk(masterVersionId, {
    attributes: [
      "plan_version_id",
      "published_for_review_at",
      "review_status",
      "review_snapshot_of_version_id",
      "review_snapshot_root_id",
      "version_kind",
    ],
    transaction,
  });
  if (!version) return false;

  const liveMasterId = version.review_snapshot_of_version_id || masterVersionId;
  const assignmentVersionId =
    version.review_snapshot_root_id || version.review_snapshot_of_version_id
      ? version.review_snapshot_root_id || version.plan_version_id
      : masterVersionId;

  const liveMaster = await PlanVersion.findByPk(liveMasterId, {
    attributes: ["plan_version_id", "published_for_review_at", "review_status"],
    transaction,
  });
  if (!isMasterVisibleForAssignedReviewer(liveMaster)) return false;

  const assigned = await getAssignedMasterNodeIds(
    assignmentVersionId,
    user.user_id,
    transaction
  );
  return assigned.size > 0;
}

async function userCanAccessPlanVersion(planVersionId, user, transaction = null) {
  if (!user) return false;
  if (hasFullPlanRead(user)) return true;
  if (!hasAssignedReviewRead(user)) return false;

  const masterId = await resolveMasterVersionId(planVersionId);
  if (!masterId) return false;

  return userCanViewPlanInReview(masterId, user, transaction);
}

async function userCanAccessPlanNode(planNodeId, user, transaction = null) {
  const node = await PlanNode.findByPk(planNodeId, {
    attributes: ["plan_version_id"],
    transaction,
  });
  if (!node) return false;
  return userCanAccessPlanVersion(node.plan_version_id, user, transaction);
}

async function getAssignedReviewMasterVersionIds(user, transaction = null) {
  if (!user) return [];
  if (hasFullPlanRead(user)) return null;

  if (!hasAssignedReviewRead(user)) return [];

  const masters = await PlanVersion.findAll({
    where: {
      version_kind: "master",
      review_snapshot_of_version_id: null,
      active_review_snapshot_id: { [Op.ne]: null },
      published_for_review_at: { [Op.ne]: null },
      review_status: { [Op.in]: REVIEW_VISIBLE_STATUSES },
    },
    attributes: ["plan_version_id", "active_review_snapshot_id"],
    transaction,
  });

  const accessible = [];
  for (const master of masters) {
    const assigned = await getAssignedMasterNodeIds(
      master.active_review_snapshot_id,
      user.user_id,
      transaction
    );
    if (assigned.size > 0 && master.active_review_snapshot_id) {
      accessible.push(master.active_review_snapshot_id);
    }
  }
  return accessible;
}

module.exports = {
  resolveMasterVersionId,
  getMasterNodes,
  getAssignedMasterNodeIds,
  filterHierarchyNodes,
  mapMasterNodeIdsToVersion,
  userCanViewPlanInReview,
  userCanAccessPlanVersion,
  userCanAccessPlanNode,
  getAssignedReviewMasterVersionIds,
  hasFullPlanRead,
  hasAssignedReviewRead,
  isMasterVisibleForAssignedReviewer,
};
