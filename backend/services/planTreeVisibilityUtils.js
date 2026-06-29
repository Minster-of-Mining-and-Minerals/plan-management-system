"use strict";

const { Op } = require("sequelize");
const { InternalAssignment, ExternalAssignment } = require("../models");
const { getMasterNodes } = require("./planReviewVisibilityService");

function expandNodeVisibility(masterNodes, seedIds, { includeDescendants = true } = {}) {
  if (!seedIds?.size) return new Set();

  const nodeById = new Map(masterNodes.map((node) => [node.plan_node_id, node]));
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
    if (includeDescendants) {
      addDescendants(nodeId);
    } else if (!visible.has(nodeId)) {
      visible.add(nodeId);
    }
  }

  return visible;
}

function collectDirectAssignmentSeedIds(internalAssignments, user) {
  const seedIds = new Set();

  for (const assignment of internalAssignments) {
    if (assignment.user_id && assignment.user_id === user.user_id) {
      seedIds.add(assignment.plan_node_id);
    }

    if (
      assignment.internal_structure_id &&
      user.internal_structure_id &&
      assignment.internal_structure_id === user.internal_structure_id
    ) {
      seedIds.add(assignment.plan_node_id);
    }
  }

  return seedIds;
}

function collectSectorExternalSeedIds(externalAssignments, user) {
  const seedIds = new Set();

  if (!user?.government_structure_id) {
    return seedIds;
  }

  for (const assignment of externalAssignments) {
    if (assignment.government_structure_id === user.government_structure_id) {
      seedIds.add(assignment.plan_node_id);
    }
  }

  return seedIds;
}

async function loadMasterPlanAssignments(masterVersionId, transaction = null) {
  const masterNodes = await getMasterNodes(masterVersionId, transaction);
  const masterNodeIds = masterNodes.map((node) => node.plan_node_id);

  if (masterNodeIds.length === 0) {
    return { masterNodes, internalAssignments: [], externalAssignments: [] };
  }

  const [internalAssignments, externalAssignments] = await Promise.all([
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

  return { masterNodes, internalAssignments, externalAssignments };
}

async function getDirectAssignmentMasterNodeIds(masterVersionId, user, transaction = null) {
  const { masterNodes, internalAssignments } = await loadMasterPlanAssignments(
    masterVersionId,
    transaction
  );
  const seedIds = collectDirectAssignmentSeedIds(internalAssignments, user);
  return expandNodeVisibility(masterNodes, seedIds, { includeDescendants: false });
}

async function getSectorScopedMasterNodeIds(masterVersionId, user, transaction = null) {
  const { masterNodes, externalAssignments } = await loadMasterPlanAssignments(
    masterVersionId,
    transaction
  );
  const seedIds = collectSectorExternalSeedIds(externalAssignments, user);
  return expandNodeVisibility(masterNodes, seedIds, { includeDescendants: true });
}

/**
 * Pure decision helper for tree access (unit-tested).
 *
 * full     — complete plan tree (global)
 * sector   — sector-assigned node subtree(s)
 * direct   — exact user/department assigned nodes (+ ancestors)
 * none     — no tree
 */
function resolveTreeAccessMode({
  isSuperAdmin = false,
  hasFullPlanHierarchy = false,
  hasSectorPlanHierarchy = false,
  hasSectorExternalAssignment = false,
  sectorScopedNodeCount = 0,
  directAssignmentNodeCount = 0,
} = {}) {
  if (isSuperAdmin || hasFullPlanHierarchy) return "full";
  if (hasSectorPlanHierarchy && hasSectorExternalAssignment && sectorScopedNodeCount > 0) {
    return "sector";
  }
  if (directAssignmentNodeCount > 0) return "direct";
  return "none";
}

module.exports = {
  expandNodeVisibility,
  collectDirectAssignmentSeedIds,
  collectSectorExternalSeedIds,
  loadMasterPlanAssignments,
  getDirectAssignmentMasterNodeIds,
  getSectorScopedMasterNodeIds,
  resolveTreeAccessMode,
};
