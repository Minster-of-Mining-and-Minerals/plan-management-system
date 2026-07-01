"use strict";

const { loadMasterPlanAssignments } = require("./planTreeVisibilityUtils");
const { PlanNode } = require("../models");
const { resolveMasterVersionId } = require("./planReviewVisibilityService");
const {
  userCanExecuteAchievement,
  userCanApproveAchievement,
} = require("../utils/planAchievementPermissionUtils");
const {
  resolveExecutorLeafMasterNodeIds,
  resolveApproverScopeMasterNodeIds,
  userCanExecuteOnMasterNode,
  userCanApproveLeafMasterNode,
} = require("./planAchievementScopeUtils");

async function loadAchievementScopeContext(masterVersionId, transaction = null) {
  const { masterNodes, internalAssignments, externalAssignments } =
    await loadMasterPlanAssignments(masterVersionId, transaction);

  return {
    masterNodes,
    internalAssignments,
    externalAssignments,
  };
}

async function resolveExecutorLeafMasterNodeIdsForUser(
  masterVersionId,
  user,
  transaction = null
) {
  if (!userCanExecuteAchievement(user)) {
    return new Set();
  }

  const context = await loadAchievementScopeContext(masterVersionId, transaction);
  return resolveExecutorLeafMasterNodeIds({ user, ...context });
}

async function resolveApproverScopeMasterNodeIdsForUser(
  masterVersionId,
  user,
  transaction = null
) {
  if (!userCanApproveAchievement(user)) {
    return new Set();
  }

  const context = await loadAchievementScopeContext(masterVersionId, transaction);
  return resolveApproverScopeMasterNodeIds({ user, ...context });
}

async function assertUserCanExecuteAchievementOnMasterNode(
  user,
  masterNodeId,
  masterVersionId,
  transaction = null
) {
  if (!userCanExecuteAchievement(user)) {
    return {
      allowed: false,
      message: "Plan execute achievement permission required",
    };
  }

  const context = await loadAchievementScopeContext(masterVersionId, transaction);
  const allowed = userCanExecuteOnMasterNode({ user, ...context }, masterNodeId);

  if (!allowed) {
    return {
      allowed: false,
      message:
        "You must be assigned to this leaf node in your sector (directly or via department) to record achievement",
    };
  }

  return { allowed: true };
}

async function assertUserCanApproveAchievementForLeaf(
  user,
  leafMasterNodeId,
  masterVersionId,
  transaction = null
) {
  if (!userCanApproveAchievement(user)) {
    return {
      allowed: false,
      message: "Plan approve achievement permission required",
    };
  }

  const context = await loadAchievementScopeContext(masterVersionId, transaction);
  const allowed = userCanApproveLeafMasterNode({ user, ...context }, leafMasterNodeId);

  if (!allowed) {
    return {
      allowed: false,
      message:
        "You must be assigned within this plan branch in your sector to approve achievement for this node",
    };
  }

  return { allowed: true };
}

async function resolveMasterPlanNodeIdForPeriodNode(periodNode, transaction = null) {
  if (!periodNode?.source_plan_node_id) {
    return null;
  }

  const annualNode = await PlanNode.findByPk(periodNode.source_plan_node_id, {
    transaction,
  });

  return annualNode?.source_plan_node_id ?? null;
}

async function resolveAchievementScopeForPeriodNode(periodNode, transaction = null) {
  const masterVersionId = await resolveMasterVersionId(periodNode.plan_version_id);
  const masterPlanNodeId = await resolveMasterPlanNodeIdForPeriodNode(
    periodNode,
    transaction
  );

  return { masterVersionId, masterPlanNodeId };
}

module.exports = {
  loadAchievementScopeContext,
  resolveExecutorLeafMasterNodeIdsForUser,
  resolveApproverScopeMasterNodeIdsForUser,
  assertUserCanExecuteAchievementOnMasterNode,
  assertUserCanApproveAchievementForLeaf,
  resolveMasterPlanNodeIdForPeriodNode,
  resolveAchievementScopeForPeriodNode,
};
