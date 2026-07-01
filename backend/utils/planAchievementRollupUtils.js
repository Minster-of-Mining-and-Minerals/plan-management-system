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

  const requiresApproval = resolveRollupRequiresApprovalForNode(node, rollupContext);
  const status = resolveAchievementStatus(node);
  return isRollupEligibleAchievementStatus(status, { requiresApproval });
}

function isAchievementReadyForPeriodCompletion(node, rollupContext = {}) {
  if (!hasRecordedAchievementValue(node)) {
    return false;
  }

  return nodeContributesToRollup(node, rollupContext);
}

module.exports = {
  masterNodeRequiresApproval,
  resolveRollupRequiresApprovalForNode,
  nodeContributesToRollup,
  isAchievementReadyForPeriodCompletion,
};
