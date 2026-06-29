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
const {
  userCanViewSectorPlanHierarchy,
  userCanViewFullPlanHierarchy,
} = require("../utils/userPermissionsUtils");
const {
  resolveMasterVersionId,
  filterHierarchyNodes,
  mapMasterNodeIdsToVersion,
  hasFullPlanRead,
  userCanAccessPlanVersion,
} = require("./planReviewVisibilityService");
const {
  getDirectAssignmentMasterNodeIds,
  getSectorScopedMasterNodeIds,
  resolveTreeAccessMode,
} = require("./planTreeVisibilityUtils");

function isSuperAdminUser(user) {
  return Boolean(user?.roles?.includes("Super Admin"));
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

async function userHasAssignmentLinkedPlanAccess(user, masterVersionId, transaction = null) {
  const linkedMasterIds = await getAssignmentLinkedMasterPlanIds(user, transaction);
  return linkedMasterIds.includes(masterVersionId);
}

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

  return userHasAssignmentLinkedPlanAccess(req.user, master.plan_version_id);
}

async function userCanReadPlanVersion(req, planVersionId) {
  if (isSuperAdminActor(req) || isSuperAdminUser(req.user)) return true;
  if (await userCanAccessPlanVersion(planVersionId, req.user)) return true;
  return userCanAccessDraftPlan(req, planVersionId);
}

/**
 * full   — complete plan tree (PLAN:VIEW_FULL_PLAN_HIERARCHY or Super Admin)
 * sector — sector-assigned node subtree (PLAN:VIEW_SECTOR_PLAN_HIERARCHY + sector external assignment)
 * direct — exact user/department assigned nodes (+ ancestors only)
 * none   — no tree
 */
async function resolvePlanTreeAccess(req, planVersionId, transaction = null) {
  if (isSuperAdminActor(req) || isSuperAdminUser(req?.user)) {
    return { mode: "full", visibleNodeIds: null };
  }

  const masterId = await resolveMasterVersionId(planVersionId, transaction);
  if (!masterId) {
    return { mode: "none", visibleNodeIds: new Set() };
  }

  const canAccessPlan = await userHasAssignmentLinkedPlanAccess(
    req.user,
    masterId,
    transaction
  );
  if (!canAccessPlan) {
    return { mode: "none", visibleNodeIds: new Set() };
  }

  const hasFullPlanHierarchy = userCanViewFullPlanHierarchy(req.user);
  const hasSectorPlanHierarchy = userCanViewSectorPlanHierarchy(req.user);
  const hasSectorExternalAssignment = hasSectorPlanHierarchy
    ? await userSectorHasExternalAssignmentOnMaster(req.user, masterId, transaction)
    : false;

  const [sectorScopedMasterNodeIds, directAssignmentMasterNodeIds] = await Promise.all([
    hasSectorPlanHierarchy && hasSectorExternalAssignment
      ? getSectorScopedMasterNodeIds(masterId, req.user, transaction)
      : Promise.resolve(new Set()),
    getDirectAssignmentMasterNodeIds(masterId, req.user, transaction),
  ]);

  const mode = resolveTreeAccessMode({
    isSuperAdmin: false,
    hasFullPlanHierarchy,
    hasSectorPlanHierarchy,
    hasSectorExternalAssignment,
    sectorScopedNodeCount: sectorScopedMasterNodeIds.size,
    directAssignmentNodeCount: directAssignmentMasterNodeIds.size,
  });

  if (mode === "full") {
    return { mode: "full", visibleNodeIds: null };
  }

  if (mode === "none") {
    return { mode: "none", visibleNodeIds: new Set() };
  }

  const masterVisibleIds =
    mode === "sector" ? sectorScopedMasterNodeIds : directAssignmentMasterNodeIds;

  const visibleForVersion = await mapMasterNodeIdsToVersion(
    masterVisibleIds,
    planVersionId,
    transaction
  );

  return { mode, visibleNodeIds: visibleForVersion };
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
  const hasFullPlanHierarchy = userCanViewFullPlanHierarchy(req.user);
  const hasSectorPlanHierarchy = userCanViewSectorPlanHierarchy(req.user);
  const sectorMasterIds = hasSectorPlanHierarchy
    ? new Set(await getParticipatingMasterPlanIds(req.user))
    : new Set();

  for (const planVersionId of masterPlanVersionIds) {
    if (!linkedMasterIds.has(planVersionId)) {
      roles.set(planVersionId, "participant");
      continue;
    }

    if (hasFullPlanHierarchy) {
      roles.set(planVersionId, "global");
    } else if (sectorMasterIds.has(planVersionId)) {
      roles.set(planVersionId, "oversight");
    } else {
      roles.set(planVersionId, "participant");
    }
  }

  return roles;
}

module.exports = {
  isSuperAdminUser,
  loadGovernmentStructureIndex,
  getMasterPlanVersion,
  userHasOwnerPlanAccess,
  getParticipatingMasterPlanIds,
  getAssignmentLinkedMasterPlanIds,
  userSectorHasExternalAssignmentOnMaster,
  userHasAssignmentLinkedPlanAccess,
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
