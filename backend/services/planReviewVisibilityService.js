"use strict";

const { Op } = require("sequelize");
const {
  PlanNode,
  PlanVersion,
  InternalAssignment,
  ExternalAssignment,
  User,
  GovernmentStructure,
} = require("../models");
const { hasBeenPublishedForReview } = require("../utils/planReviewUtils");
const { loadUserAccessGraphs } = require("../utils/userAccessGraphLoader");

const REVIEW_VISIBLE_STATUSES = [
  "under_review",
  "review_completed",
  "corrections_unlocked",
];

function isSuperAdminUser(user) {
  return Boolean(user?.roles?.includes("Super Admin"));
}

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

async function resolveMasterVersionId(planVersionId, transaction = null, options = {}) {
  const cache = options?.contextCache?.masterVersionIdCache;
  if (cache && cache.has(planVersionId)) {
    return cache.get(planVersionId);
  }

  const pvCache = options?.contextCache?.planVersionById;
  const version = pvCache?.get(planVersionId) || (await PlanVersion.findByPk(planVersionId, { transaction }));
  if (!version) return null;

  if (version.version_kind === "master") {
    const res = version.execution_snapshot_of_version_id || version.plan_version_id;
    if (cache) cache.set(planVersionId, res);
    return res;
  }

  let masterId = null;
  if (version.version_kind === "annual") {
    masterId = version.parent_plan_version_id;
  } else if (version.version_kind === "execution_period") {
    const annual = pvCache?.get(version.parent_plan_version_id) || (await PlanVersion.findByPk(version.parent_plan_version_id, { transaction }));
    masterId = annual?.parent_plan_version_id ?? null;
  }

  if (!masterId) return null;

  const master = pvCache?.get(masterId) || (await PlanVersion.findByPk(masterId, { transaction }));
  if (!master) return null;

  const result = master.execution_snapshot_of_version_id || master.plan_version_id;
  if (cache) cache.set(planVersionId, result);
  return result;
}

async function getMasterNodes(masterVersionId, transaction = null, options = {}) {
  const cache = options?.contextCache?.masterNodesCache;
  if (cache && cache.has(masterVersionId)) {
    return cache.get(masterVersionId);
  }

  const nodes = await PlanNode.findAll({
    where: { plan_version_id: masterVersionId, is_active: true },
    transaction,
  });

  if (cache) cache.set(masterVersionId, nodes);
  return nodes;
}

/** Review coordinators see every plan published for review, with the full tree. */
const REVIEW_COORDINATOR_PERMISSIONS = [
  "plan:publish_for_review",
  "plan:complete_review",
  "plan:view_review_dashboard",
  "plan:republish_review",
  "plan:unlock_review_corrections",
];

function isReviewCoordinator(user) {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  return REVIEW_COORDINATOR_PERMISSIONS.some((key) => user.permissions?.includes(key));
}

function hasReviewParticipationPermission(user) {
  return hasAssignedReviewRead(user) || isReviewCoordinator(user);
}

async function loadStructureParentIndex(transaction = null) {
  const structures = await GovernmentStructure.findAll({
    attributes: ["government_structure_id", "parent_id"],
    transaction,
  });
  return new Map(structures.map((s) => [s.government_structure_id, s.parent_id]));
}

/** The structure itself plus all of its ancestors. */
function collectStructureLineage(structureId, parentById) {
  const lineage = new Set();
  let cursor = structureId;
  while (cursor && !lineage.has(cursor)) {
    lineage.add(cursor);
    cursor = parentById.get(cursor) ?? null;
  }
  return lineage;
}

async function resolvePlanOwnerStructureId(masterVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(masterVersionId, {
    attributes: ["plan_version_id", "government_structure_id", "review_snapshot_of_version_id"],
    transaction,
  });
  if (!version) return null;
  if (version.government_structure_id) return version.government_structure_id;
  if (!version.review_snapshot_of_version_id) return null;
  const live = await PlanVersion.findByPk(version.review_snapshot_of_version_id, {
    attributes: ["government_structure_id"],
    transaction,
  });
  return live?.government_structure_id ?? null;
}

/**
 * Review participants:
 *  - users assigned to a node (directly, via department, or via a sector at/above theirs) —
 *    they see their assigned branches;
 *  - review coordinators / Super Admin, and staff of the plan's owning sector (or its
 *    sub-structures) — they see the whole plan.
 */
async function getAssignedMasterNodeIds(masterVersionId, userId, transaction = null) {
  const user = await User.findByPk(userId, { transaction });
  if (!user) return new Set();

  const masterNodes = await getMasterNodes(masterVersionId, transaction);
  const masterNodeIds = masterNodes.map((n) => n.plan_node_id);
  if (masterNodeIds.length === 0) return new Set();

  const accessGraph = (await loadUserAccessGraphs([userId], { transaction })).get(userId);
  const actor = {
    user_id: userId,
    roles: (accessGraph?.roles || []).map((r) => r.name),
    permissions: accessGraph?.permissions || [],
  };
  if (isReviewCoordinator(actor)) {
    return new Set(masterNodeIds);
  }

  const parentById = await loadStructureParentIndex(transaction);
  const userLineage = user.government_structure_id
    ? collectStructureLineage(user.government_structure_id, parentById)
    : new Set();

  const ownerStructureId = await resolvePlanOwnerStructureId(masterVersionId, transaction);
  if (ownerStructureId && userLineage.has(ownerStructureId)) {
    // User belongs to the owning sector or one of its sub-structures.
    return new Set(masterNodeIds);
  }

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
    // Assigned sector itself, or a sub-structure of it.
    if (
      assignment.government_structure_id &&
      userLineage.has(assignment.government_structure_id)
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

/**
 * Walk source_plan_node_id through annual/snapshot-master layers to the live master draft node id.
 */
async function resolveLiveMasterPlanNodeId(planNode, transaction = null) {
  if (!planNode) return null;

  let cursor = planNode;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!cursor.source_plan_node_id) {
      return cursor.plan_node_id;
    }

    const parentNode = await PlanNode.findByPk(cursor.source_plan_node_id, {
      attributes: ["plan_node_id", "source_plan_node_id", "plan_version_id"],
      transaction,
    });
    if (!parentNode) {
      return cursor.source_plan_node_id;
    }

    const parentVersion = await PlanVersion.findByPk(parentNode.plan_version_id, {
      attributes: ["version_kind"],
      transaction,
    });

    if (parentVersion?.version_kind === "master") {
      return parentNode.source_plan_node_id || parentNode.plan_node_id;
    }

    cursor = parentNode;
  }

  return cursor.plan_node_id;
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
        .filter((node) => {
          const liveMasterNodeId = node.source_plan_node_id || node.plan_node_id;
          return masterVisibleIds.has(liveMasterNodeId);
        })
        .map((node) => node.plan_node_id)
    );
  }

  if (
    targetVersion.version_kind === "annual" ||
    targetVersion.version_kind === "execution_period"
  ) {
    const visible = new Set();
    for (const node of targetNodes) {
      const liveMasterNodeId = await resolveLiveMasterPlanNodeId(node, transaction);
      if (liveMasterNodeId && masterVisibleIds.has(liveMasterNodeId)) {
        visible.add(node.plan_node_id);
      }
    }
    return visible;
  }

  return new Set();
}

async function userCanViewPlanInReview(masterVersionId, user, transaction = null) {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  if (!hasReviewParticipationPermission(user)) return false;

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
  if (isSuperAdminUser(user)) return true;
  if (!hasReviewParticipationPermission(user)) return false;

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
  if (isSuperAdminUser(user)) return null;
  if (!hasReviewParticipationPermission(user)) return [];

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
  resolveLiveMasterPlanNodeId,
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
  isSuperAdminUser,
};
