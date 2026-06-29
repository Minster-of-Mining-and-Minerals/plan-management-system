"use strict";

const { Op } = require("sequelize");
const {
  PlanVersion,
  PlanNode,
  GovernmentStructure,
  ExternalAssignment,
  InternalAssignment,
} = require("../models");
const {
  isSuperAdminActor,
} = require("../utils/structureScopeUtils");
const { userCanViewSectorPlanHierarchy } = require("../utils/userPermissionsUtils");
const {
  resolveMasterVersionId,
  getAssignedMasterNodeIds,
  filterHierarchyNodes,
  mapMasterNodeIdsToVersion,
  hasFullPlanRead,
  userCanAccessPlanVersion,
} = require("./planReviewVisibilityService");

function isSuperAdminUser(user) {
  return Boolean(user?.roles?.includes("Super Admin"));
}

/**
 * Pure decision helper for tree access (unit-tested).
 */
function resolveTreeAccessMode({
  isSuperAdmin = false,
  hasSectorOversight = false,
  hasSectorExternalAssignment = false,
  assignedNodeCount = 0,
} = {}) {
  if (isSuperAdmin) return "full";
  if (hasSectorOversight && hasSectorExternalAssignment) return "full";
  if (assignedNodeCount > 0) return "participant";
  return "none";
}

async function loadGovernmentStructureIndex() {
  return GovernmentStructure.findAll({
    attributes: ["government_structure_id", "parent_id"],
  });
}

async function getMasterPlanVersion(planVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(planVersionId, {
    attributes: [
      "plan_version_id",
      "version_kind",
      "parent_plan_version_id",
      "government_structure_id",
      "review_snapshot_of_version_id",
      "execution_snapshot_of_version_id",
    ],
    transaction,
  });
  if (!version) return null;
  if (version.version_kind === "master") {
    if (version.execution_snapshot_of_version_id) {
      return PlanVersion.findByPk(version.execution_snapshot_of_version_id, {
        attributes: [
          "plan_version_id",
          "version_kind",
          "parent_plan_version_id",
          "government_structure_id",
          "review_snapshot_of_version_id",
        ],
        transaction,
      });
    }
    return version;
  }

  const masterId = await resolveMasterVersionId(planVersionId);
  if (!masterId) return null;

  return PlanVersion.findByPk(masterId, {
    attributes: [
      "plan_version_id",
      "version_kind",
      "parent_plan_version_id",
      "government_structure_id",
      "review_snapshot_of_version_id",
    ],
    transaction,
  });
}

/**
 * @deprecated Owner-sector visibility no longer grants plan access in Phase B.
 * Kept for callers that still need structure ownership checks outside tree visibility.
 */
async function userHasOwnerPlanAccess(req, planVersionId, structureIndex = null) {
  if (isSuperAdminActor(req) || isSuperAdminUser(req?.user)) return true;

  const actorSectorId = req.user?.government_structure_id;
  if (!actorSectorId) return false;

  const { buildVisibleGovernmentStructureIdSet } = require("../utils/structureScopeUtils");
  const index = structureIndex || (await loadGovernmentStructureIndex());
  const visibleSet = buildVisibleGovernmentStructureIdSet(index, actorSectorId);
  const master = await getMasterPlanVersion(planVersionId);
  if (!master) return false;

  return visibleSet.has(master.government_structure_id);
}

/**
 * Master plan IDs where the user's sector has an active external assignment on any node.
 */
async function getParticipatingMasterPlanIds(user, transaction = null) {
  if (!user?.government_structure_id) return [];

  const externalAssignments = await ExternalAssignment.findAll({
    where: {
      government_structure_id: user.government_structure_id,
      is_active: true,
      is_visible: true,
    },
    include: [
      {
        model: PlanNode,
        as: "planNode",
        required: true,
        where: { is_active: true },
        attributes: ["plan_node_id", "plan_version_id"],
      },
    ],
    transaction,
  });

  const masterIds = new Set();
  for (const assignment of externalAssignments) {
    const masterId = await resolveMasterVersionId(
      assignment.planNode.plan_version_id,
      transaction
    );
    if (masterId) masterIds.add(masterId);
  }

  return [...masterIds];
}

async function userSectorHasExternalAssignmentOnMaster(
  user,
  masterVersionId,
  transaction = null
) {
  if (!user?.government_structure_id) return false;
  const participatingMasterIds = await getParticipatingMasterPlanIds(user, transaction);
  return participatingMasterIds.includes(masterVersionId);
}

/**
 * Master plans reachable through external sector assignment or direct internal/user assignment.
 */
async function getAssignmentLinkedMasterPlanIds(user, transaction = null) {
  const masterIds = new Set(
    await getParticipatingMasterPlanIds(user, transaction)
  );

  if (!user?.user_id) {
    return [...masterIds];
  }

  const assignmentFilters = [{ user_id: user.user_id }];
  if (user.internal_structure_id) {
    assignmentFilters.push({ internal_structure_id: user.internal_structure_id });
  }

  const internalAssignments = await InternalAssignment.findAll({
    where: {
      is_active: true,
      [Op.or]: assignmentFilters,
    },
    include: [
      {
        model: PlanNode,
        as: "planNode",
        required: true,
        where: { is_active: true },
        attributes: ["plan_version_id"],
      },
    ],
    transaction,
  });

  for (const assignment of internalAssignments) {
    const masterId = await resolveMasterVersionId(
      assignment.planNode.plan_version_id,
      transaction
    );
    if (masterId) masterIds.add(masterId);
  }

  return [...masterIds];
}

/**
 * null = Super Admin (all master plans). Otherwise array of accessible master plan_version_ids.
 */
async function resolveAccessibleMasterPlanIds(req, transaction = null) {
  if (isSuperAdminActor(req)) return null;
  if (!req.user) return [];

  return getAssignmentLinkedMasterPlanIds(req.user, transaction);
}

async function userCanAccessDraftPlan(req, planVersionId) {
  if (!hasFullPlanRead(req.user)) return false;
  if (isSuperAdminUser(req.user)) return true;

  const master = await getMasterPlanVersion(planVersionId);
  if (!master) return false;

  const linkedMasterIds = await getAssignmentLinkedMasterPlanIds(req.user);
  if (linkedMasterIds.includes(master.plan_version_id)) {
    return true;
  }

  if (userCanViewSectorPlanHierarchy(req.user)) {
    return userSectorHasExternalAssignmentOnMaster(req.user, master.plan_version_id);
  }

  return false;
}

async function userCanReadPlanVersion(req, planVersionId) {
  if (isSuperAdminActor(req) || isSuperAdminUser(req.user)) return true;
  if (await userCanAccessPlanVersion(planVersionId, req.user)) return true;
  return userCanAccessDraftPlan(req, planVersionId);
}

/**
 * full — Super Admin or sector oversight (special permission + sector external assignment)
 * participant — assigned branch only
 * none — no tree access
 */
async function resolvePlanTreeAccess(req, planVersionId, transaction = null) {
  if (isSuperAdminActor(req) || isSuperAdminUser(req?.user)) {
    return { mode: "full", visibleNodeIds: null };
  }

  const masterId = await resolveMasterVersionId(planVersionId, transaction);
  if (!masterId) {
    return { mode: "none", visibleNodeIds: new Set() };
  }

  const hasSectorOversight = userCanViewSectorPlanHierarchy(req.user);
  const hasSectorExternalAssignment = hasSectorOversight
    ? await userSectorHasExternalAssignmentOnMaster(req.user, masterId, transaction)
    : false;

  const assignedMasterNodeIds = await getAssignedMasterNodeIds(
    masterId,
    req.user.user_id,
    transaction
  );

  const mode = resolveTreeAccessMode({
    isSuperAdmin: false,
    hasSectorOversight,
    hasSectorExternalAssignment,
    assignedNodeCount: assignedMasterNodeIds.size,
  });

  if (mode === "full") {
    return { mode: "full", visibleNodeIds: null };
  }

  if (mode === "none") {
    return { mode: "none", visibleNodeIds: new Set() };
  }

  const visibleForVersion = await mapMasterNodeIdsToVersion(
    assignedMasterNodeIds,
    planVersionId,
    transaction
  );

  return { mode: "participant", visibleNodeIds: visibleForVersion };
}

async function getVisibleNodeIdsForVersion(req, planVersionId, transaction = null) {
  const access = await resolvePlanTreeAccess(req, planVersionId, transaction);
  return access.visibleNodeIds;
}

function filterFlatPlanNodesByVisibility(nodes, visibleNodeIds) {
  if (!visibleNodeIds) return nodes;
  return nodes.filter((node) => visibleNodeIds.has(node.plan_node_id));
}

function filterNestedPlanNodes(nodes, visibleNodeIds) {
  if (!visibleNodeIds) return nodes;
  if (!Array.isArray(nodes)) return [];

  return nodes
    .filter((node) => visibleNodeIds.has(node.plan_node_id))
    .map((node) => ({
      ...node,
      children: filterNestedPlanNodes(node.children ?? [], visibleNodeIds),
    }));
}

/**
 * Batch-resolve access_role for master plan list rows.
 * owner — Super Admin only
 * oversight — sector external assignment + PLAN:VIEW_SECTOR_PLAN_HIERARCHY
 * participant — assignment-based access only
 */
async function resolvePlanAccessRolesForMasters(req, masterPlanVersionIds) {
  const roles = new Map();
  if (!masterPlanVersionIds?.length) {
    return roles;
  }

  if (isSuperAdminActor(req) || isSuperAdminUser(req?.user)) {
    for (const planVersionId of masterPlanVersionIds) {
      roles.set(planVersionId, "owner");
    }
    return roles;
  }

  const linkedMasterIds = new Set(
    await getAssignmentLinkedMasterPlanIds(req.user)
  );
  const hasSectorOversight = userCanViewSectorPlanHierarchy(req.user);
  const oversightMasterIds = hasSectorOversight
    ? new Set(await getParticipatingMasterPlanIds(req.user))
    : new Set();

  for (const planVersionId of masterPlanVersionIds) {
    if (!linkedMasterIds.has(planVersionId)) {
      roles.set(planVersionId, "participant");
      continue;
    }

    if (oversightMasterIds.has(planVersionId)) {
      roles.set(planVersionId, "oversight");
    } else {
      roles.set(planVersionId, "participant");
    }
  }

  return roles;
}

module.exports = {
  isSuperAdminUser,
  resolveTreeAccessMode,
  loadGovernmentStructureIndex,
  getMasterPlanVersion,
  userHasOwnerPlanAccess,
  getParticipatingMasterPlanIds,
  getAssignmentLinkedMasterPlanIds,
  userSectorHasExternalAssignmentOnMaster,
  resolveAccessibleMasterPlanIds,
  userCanAccessDraftPlan,
  userCanReadPlanVersion,
  resolvePlanTreeAccess,
  getVisibleNodeIdsForVersion,
  filterFlatPlanNodesByVisibility,
  filterNestedPlanNodes,
  filterHierarchyNodes,
  resolvePlanAccessRolesForMasters,
};
