"use strict";

const {
  resolveAchievementStatus,
  isRollupEligibleAchievementStatus,
  hasRecordedAchievementValue,
} = require("./planAchievementWorkflowUtils");
const { buildNodeById } = require("../services/planAchievementScopeUtils");

function masterNodeRequiresApproval(masterNodeId, masterNodes, approverGateNodeIds) {
  if (!masterNodeId || !approverGateNodeIds?.size) {
    return false;
  }

  const nodeById = buildNodeById(masterNodes);
  let current = nodeById.get(masterNodeId);

  while (current) {
    if (approverGateNodeIds.has(current.plan_node_id)) {
      return true;
    }
    current = current.parent_id ? nodeById.get(current.parent_id) : null;
  }

  return false;
}

function resolveRollupRequiresApprovalForNode(node, rollupContext = {}) {
  const { masterNodeIdByPeriodNodeId, requiresApprovalByMasterNodeId } = rollupContext;
  if (!masterNodeIdByPeriodNodeId || !requiresApprovalByMasterNodeId) {
    return false;
  }

  const masterNodeId = masterNodeIdByPeriodNodeId.get(node.plan_node_id);
  if (!masterNodeId) {
    return false;
  }

  return Boolean(requiresApprovalByMasterNodeId.get(masterNodeId));
}

function nodeContributesToRollup(node, rollupContext = {}) {
  if (!hasRecordedAchievementValue(node)) {
    return false;
  }

  const requiresValidation = resolveRollupRequiresValidationForNode(node, rollupContext);
  const status = resolveAchievementStatus(node);
  return isRollupEligibleAchievementStatus(status, { requiresValidation });
}

function isAchievementReadyForPeriodCompletion(node, rollupContext = {}) {
  if (!hasRecordedAchievementValue(node)) {
    return false;
  }

  return nodeContributesToRollup(node, rollupContext);
}

function resolveRollupRequiresValidationForNode(node, rollupContext = {}) {
  const { masterNodeIdByPeriodNodeId, requiresValidationByMasterNodeId } = rollupContext;
  if (!masterNodeIdByPeriodNodeId || !requiresValidationByMasterNodeId) {
    return false;
  }

  const masterNodeId = masterNodeIdByPeriodNodeId.get(node.plan_node_id);
  if (!masterNodeId) {
    return false;
  }

  return Boolean(requiresValidationByMasterNodeId.get(masterNodeId));
}

/**
 * Sector seed with publish gate ON and package not yet published.
 * Parents above this node must ignore its subtree until publish.
 */
function isUnpublishedSectorPublishBoundary(periodNodeId, rollupContext = {}) {
  const { publishBoundaryPeriodNodeIds, publishedBoundaryPeriodNodeIds } = rollupContext;
  if (!periodNodeId || !publishBoundaryPeriodNodeIds?.has(periodNodeId)) {
    return false;
  }
  return !publishedBoundaryPeriodNodeIds?.has(periodNodeId);
}

/**
 * Whether a direct child node's rolled metrics may count toward its parent.
 * In-sector (below / at seed internal calc) keeps normal eligibility.
 * Crossing a gated unpublished seed into parent structure is blocked.
 */
function childCountsTowardParent(childPeriodNodeId, rollupContext = {}) {
  return !isUnpublishedSectorPublishBoundary(childPeriodNodeId, rollupContext);
}

module.exports = {
  masterNodeRequiresApproval,
  resolveRollupRequiresApprovalForNode,
  resolveRollupRequiresValidationForNode,
  isUnpublishedSectorPublishBoundary,
  childCountsTowardParent,
  nodeContributesToRollup,
  isAchievementReadyForPeriodCompletion,
};
