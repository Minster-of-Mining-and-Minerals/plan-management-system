"use strict";

const { Op } = require("sequelize");
const { PlanNode } = require("../models");
const { loadMasterPlanAssignments } = require("./planTreeVisibilityUtils");
const { resolveMasterVersionId } = require("./planReviewVisibilityService");
const { userCanApproveAchievement } = require("../utils/planAchievementPermissionUtils");
const { resolveApproverAnchorMasterNodeIds } = require("./planAchievementScopeUtils");
const { masterNodeRequiresApproval } = require("../utils/planAchievementRollupUtils");
const {
  collectCandidateApproverUserIds,
  loadUsersWithEffectivePermissions,
} = require("./planAchievementUserService");

async function resolveApproverGateMasterNodeIds(masterVersionId, transaction = null) {
  const context = await loadMasterPlanAssignments(masterVersionId, transaction);
  const candidateUserIds = await collectCandidateApproverUserIds(
    context.internalAssignments,
    transaction
  );
  const users = await loadUsersWithEffectivePermissions(candidateUserIds, transaction);
  const gateNodeIds = new Set();

  for (const user of users) {
    if (!userCanApproveAchievement(user)) {
      continue;
    }

    const anchorIds = resolveApproverAnchorMasterNodeIds({
      user,
      masterNodes: context.masterNodes,
      internalAssignments: context.internalAssignments,
      externalAssignments: context.externalAssignments,
    });

    for (const nodeId of anchorIds) {
      gateNodeIds.add(nodeId);
    }
  }

  return gateNodeIds;
}

async function buildMasterNodeIdByPeriodNodeId(periodVersionId, transaction = null) {
  const periodNodes = await PlanNode.findAll({
    where: { plan_version_id: periodVersionId, is_active: true },
    attributes: ["plan_node_id", "source_plan_node_id"],
    transaction,
  });

  const annualNodeIds = [
    ...new Set(periodNodes.map((node) => node.source_plan_node_id).filter(Boolean)),
  ];

  if (!annualNodeIds.length) {
    return new Map();
  }

  const annualNodes = await PlanNode.findAll({
    where: { plan_node_id: { [Op.in]: annualNodeIds } },
    attributes: ["plan_node_id", "source_plan_node_id"],
    transaction,
  });

  const annualToMaster = new Map(
    annualNodes.map((node) => [node.plan_node_id, node.source_plan_node_id])
  );

  const masterNodeIdByPeriodNodeId = new Map();
  for (const periodNode of periodNodes) {
    const masterNodeId = annualToMaster.get(periodNode.source_plan_node_id);
    if (masterNodeId) {
      masterNodeIdByPeriodNodeId.set(periodNode.plan_node_id, masterNodeId);
    }
  }

  return masterNodeIdByPeriodNodeId;
}

async function buildRollupContextForPeriod(periodVersionId, transaction = null) {
  const masterVersionId = await resolveMasterVersionId(periodVersionId, transaction);
  if (!masterVersionId) {
    return {
      masterNodes: [],
      approverGateNodeIds: new Set(),
      masterNodeIdByPeriodNodeId: new Map(),
      requiresApprovalByMasterNodeId: new Map(),
    };
  }

  const { masterNodes } = await loadMasterPlanAssignments(masterVersionId, transaction);
  const [approverGateNodeIds, masterNodeIdByPeriodNodeId] = await Promise.all([
    resolveApproverGateMasterNodeIds(masterVersionId, transaction),
    buildMasterNodeIdByPeriodNodeId(periodVersionId, transaction),
  ]);

  const requiresApprovalByMasterNodeId = new Map();
  for (const masterNodeId of new Set(masterNodeIdByPeriodNodeId.values())) {
    requiresApprovalByMasterNodeId.set(
      masterNodeId,
      masterNodeRequiresApproval(masterNodeId, masterNodes, approverGateNodeIds)
    );
  }

  return {
    masterNodes,
    approverGateNodeIds,
    masterNodeIdByPeriodNodeId,
    requiresApprovalByMasterNodeId,
  };
}

module.exports = {
  resolveApproverGateMasterNodeIds,
  buildMasterNodeIdByPeriodNodeId,
  buildRollupContextForPeriod,
  masterNodeRequiresApproval,
};
