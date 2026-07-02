"use strict";

const { buildVisibleGovernmentStructureIdSet } = require("../utils/structureScopeUtils");

function buildChildrenByParent(masterNodes) {
  const childrenByParent = new Map();
  for (const node of masterNodes) {
    if (!node.parent_id) continue;
    const list = childrenByParent.get(node.parent_id) ?? [];
    list.push(node);
    childrenByParent.set(node.parent_id, list);
  }
  return childrenByParent;
}

function getActiveChildren(node, childrenByParent) {
  return (childrenByParent.get(node.plan_node_id) ?? []).filter(
    (child) => child.is_active !== false
  );
}

function isMasterPlanLeaf(node, childrenByParent) {
  return getActiveChildren(node, childrenByParent).length === 0;
}

function buildNodeById(masterNodes) {
  return new Map(masterNodes.map((node) => [node.plan_node_id, node]));
}

function collectAncestorIds(nodeId, nodeById) {
  const ancestors = [];
  let current = nodeById.get(nodeId);
  while (current?.parent_id) {
    const parent = nodeById.get(current.parent_id);
    if (!parent) break;
    ancestors.push(parent.plan_node_id);
    current = parent;
  }
  return ancestors;
}

function collectDescendantIds(seedIds, masterNodes) {
  const childrenByParent = buildChildrenByParent(masterNodes);
  const descendants = new Set();

  const walk = (nodeId) => {
    if (descendants.has(nodeId)) return;
    descendants.add(nodeId);
    for (const child of getActiveChildren({ plan_node_id: nodeId }, childrenByParent)) {
      walk(child.plan_node_id);
    }
  };

  for (const seedId of seedIds) {
    walk(seedId);
  }

  return descendants;
}

function internalAssignmentMatchesUser(
  assignment,
  user,
  internalById,
  externalById
) {
  if (!assignment || assignment.is_active === false) return false;

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
    if (branchExternal?.government_structure_id === user.government_structure_id) {
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

function userHasSectorAccessToMasterNode(
  user,
  masterNodeId,
  masterNodes,
  externalAssignments
) {
  if (!user?.government_structure_id) return false;

  const nodeById = buildNodeById(masterNodes);
  let current = nodeById.get(masterNodeId);

  while (current) {
    const hasExternal = externalAssignments.some(
      (assignment) =>
        assignment.plan_node_id === current.plan_node_id &&
        assignment.is_active !== false &&
        assignment.government_structure_id === user.government_structure_id
    );
    if (hasExternal) return true;
    current = current.parent_id ? nodeById.get(current.parent_id) : null;
  }

  return false;
}

function collectInternallyAssignedMasterNodeIds(
  user,
  internalAssignments,
  internalById,
  externalById
) {
  const seedIds = new Set();

  for (const assignment of internalAssignments) {
    if (
      internalAssignmentMatchesUser(assignment, user, internalById, externalById)
    ) {
      seedIds.add(assignment.plan_node_id);
    }
  }

  return seedIds;
}

function resolveExecutorLeafMasterNodeIds({
  user,
  masterNodes,
  internalAssignments,
  externalAssignments,
}) {
  const internalById = new Map(
    internalAssignments.map((row) => [row.internal_assignment_id, row])
  );
  const externalById = new Map(
    externalAssignments.map((row) => [row.external_assignment_id, row])
  );
  const childrenByParent = buildChildrenByParent(masterNodes);
  const assignedIds = collectInternallyAssignedMasterNodeIds(
    user,
    internalAssignments,
    internalById,
    externalById
  );

  const leafIds = new Set();
  for (const nodeId of assignedIds) {
    const node = masterNodes.find((row) => row.plan_node_id === nodeId);
    if (!node || !isMasterPlanLeaf(node, childrenByParent)) continue;
    if (
      !userHasSectorAccessToMasterNode(
        user,
        nodeId,
        masterNodes,
        externalAssignments
      )
    ) {
      continue;
    }
    leafIds.add(nodeId);
  }

  return leafIds;
}

function resolveApproverAnchorMasterNodeIds({
  user,
  masterNodes,
  internalAssignments,
  externalAssignments,
}) {
  const internalById = new Map(
    internalAssignments.map((row) => [row.internal_assignment_id, row])
  );
  const externalById = new Map(
    externalAssignments.map((row) => [row.external_assignment_id, row])
  );
  const assignedIds = collectInternallyAssignedMasterNodeIds(
    user,
    internalAssignments,
    internalById,
    externalById
  );

  const anchorIds = new Set();
  for (const nodeId of assignedIds) {
    if (
      userHasSectorAccessToMasterNode(
        user,
        nodeId,
        masterNodes,
        externalAssignments
      )
    ) {
      anchorIds.add(nodeId);
    }
  }

  return anchorIds;
}

function resolveApproverScopeMasterNodeIds(scopeInput) {
  const anchorIds = resolveApproverAnchorMasterNodeIds(scopeInput);
  return collectDescendantIds(anchorIds, scopeInput.masterNodes);
}

function userCanExecuteOnMasterNode(scopeInput, masterNodeId) {
  const leafIds = resolveExecutorLeafMasterNodeIds(scopeInput);
  return leafIds.has(masterNodeId);
}

function userCanApproveLeafMasterNode(scopeInput, leafMasterNodeId) {
  const nodeById = buildNodeById(scopeInput.masterNodes);
  const anchorIds = resolveApproverAnchorMasterNodeIds(scopeInput);

  let current = nodeById.get(leafMasterNodeId);
  while (current) {
    if (anchorIds.has(current.plan_node_id)) {
      return true;
    }
    current = current.parent_id ? nodeById.get(current.parent_id) : null;
  }

  return false;
}

function userCanAccessPlanSector(user, planSectorId, structureIndex) {
  if (!planSectorId) {
    return false;
  }
  if (!user?.government_structure_id) {
    return true;
  }
  const visibleSet = buildVisibleGovernmentStructureIdSet(
    structureIndex,
    user.government_structure_id
  );
  return visibleSet.has(planSectorId);
}

function collectRootMasterNodeIds(masterNodes) {
  return masterNodes
    .filter((node) => node.is_active !== false && !node.parent_id)
    .map((node) => node.plan_node_id);
}

function collectAllMasterLeafIds(masterNodes) {
  const childrenByParent = buildChildrenByParent(masterNodes);
  return new Set(
    masterNodes
      .filter(
        (node) => node.is_active !== false && isMasterPlanLeaf(node, childrenByParent)
      )
      .map((node) => node.plan_node_id)
  );
}

module.exports = {
  buildChildrenByParent,
  getActiveChildren,
  isMasterPlanLeaf,
  buildNodeById,
  collectDescendantIds,
  collectAllMasterLeafIds,
  internalAssignmentMatchesUser,
  userHasSectorAccessToMasterNode,
  collectInternallyAssignedMasterNodeIds,
  resolveExecutorLeafMasterNodeIds,
  resolveApproverAnchorMasterNodeIds,
  resolveApproverScopeMasterNodeIds,
  userCanExecuteOnMasterNode,
  userCanApproveLeafMasterNode,
  userCanAccessPlanSector,
  collectRootMasterNodeIds,
};
