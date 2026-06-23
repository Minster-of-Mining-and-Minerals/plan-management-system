"use strict";

const { Op } = require("sequelize");
const {
  PlanVersion,
  PlanNode,
  GovernmentStructure,
  ExternalAssignment,
} = require("../models");
const {
  isSuperAdminActor,
  buildVisibleGovernmentStructureIdSet,
} = require("../utils/structureScopeUtils");
const {
  resolveMasterVersionId,
  getAssignedMasterNodeIds,
  filterHierarchyNodes,
  mapMasterNodeIdsToVersion,
  hasFullPlanRead,
  userCanAccessPlanVersion,
} = require("./planReviewVisibilityService");

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
    ],
    transaction,
  });
  if (!version) return null;
  if (version.version_kind === "master") return version;

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
  if (isSuperAdminActor(req)) return true;

  const actorSectorId = req.user?.government_structure_id;
  if (!actorSectorId) return false;

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

/**
 * null = Super Admin (all master plans). Otherwise array of accessible master plan_version_ids.
 */
async function resolveAccessibleMasterPlanIds(req, transaction = null) {
  if (isSuperAdminActor(req)) return null;

  const structureIndex = await loadGovernmentStructureIndex();
  const actorSectorId = req.user?.government_structure_id;
  if (!actorSectorId) return [];

  const visibleSet = buildVisibleGovernmentStructureIdSet(
    structureIndex,
    actorSectorId
  );

  const ownedMasters = await PlanVersion.findAll({
    where: {
      version_kind: "master",
      review_snapshot_of_version_id: null,
      government_structure_id: { [Op.in]: [...visibleSet] },
    },
    attributes: ["plan_version_id"],
    transaction,
  });

  const participantMasterIds = await getParticipatingMasterPlanIds(
    req.user,
    transaction
  );

  const ids = new Set([
    ...ownedMasters.map((row) => row.plan_version_id),
    ...participantMasterIds,
  ]);

  return [...ids];
}

async function userCanAccessDraftPlan(req, planVersionId) {
  if (!hasFullPlanRead(req.user)) return false;

  const structureIndex = await loadGovernmentStructureIndex();
  if (await userHasOwnerPlanAccess(req, planVersionId, structureIndex)) {
    return true;
  }

  const master = await getMasterPlanVersion(planVersionId);
  if (!master) return false;

  const participantMasterIds = await getParticipatingMasterPlanIds(req.user);
  return participantMasterIds.includes(master.plan_version_id);
}

async function userCanReadPlanVersion(req, planVersionId) {
  if (await userCanAccessPlanVersion(planVersionId, req.user)) return true;
  return userCanAccessDraftPlan(req, planVersionId);
}

/**
 * full — owner or Super Admin: entire tree
 * participant — assigned branch only
 * none — no tree access
 */
async function resolvePlanTreeAccess(req, planVersionId, transaction = null) {
  if (isSuperAdminActor(req)) {
    return { mode: "full", visibleNodeIds: null };
  }

  const structureIndex = await loadGovernmentStructureIndex();
  if (await userHasOwnerPlanAccess(req, planVersionId, structureIndex)) {
    return { mode: "full", visibleNodeIds: null };
  }

  const masterId = await resolveMasterVersionId(planVersionId, transaction);
  if (!masterId) {
    return { mode: "none", visibleNodeIds: new Set() };
  }

  const assignedMasterNodeIds = await getAssignedMasterNodeIds(
    masterId,
    req.user.user_id,
    transaction
  );

  if (assignedMasterNodeIds.size === 0) {
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

module.exports = {
  loadGovernmentStructureIndex,
  getMasterPlanVersion,
  userHasOwnerPlanAccess,
  getParticipatingMasterPlanIds,
  resolveAccessibleMasterPlanIds,
  userCanAccessDraftPlan,
  userCanReadPlanVersion,
  resolvePlanTreeAccess,
  getVisibleNodeIdsForVersion,
  filterFlatPlanNodesByVisibility,
  filterNestedPlanNodes,
  filterHierarchyNodes,
};
