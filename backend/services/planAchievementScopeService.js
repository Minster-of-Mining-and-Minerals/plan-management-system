"use strict";

const { loadMasterPlanAssignments } = require("./planTreeVisibilityUtils");
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

module.exports = {
  loadAchievementScopeContext,
  resolveExecutorLeafMasterNodeIdsForUser,
  resolveApproverScopeMasterNodeIdsForUser,
  assertUserCanExecuteAchievementOnMasterNode,
  assertUserCanApproveAchievementForLeaf,
};
