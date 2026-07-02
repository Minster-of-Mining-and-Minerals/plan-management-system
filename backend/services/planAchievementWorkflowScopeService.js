"use strict";

const { PlanVersion, PlanNode } = require("../models");
const { resolveMasterVersionId } = require("./planReviewVisibilityService");
const { resolveExecutionHierarchyVersionId } = require("./planExecutionGateService");
const { buildMasterNodeIdByPeriodNodeId } = require("./planAchievementRollupService");
const {
  loadAchievementScopeContext,
  resolveExecutorLeafMasterNodeIdsForUser,
} = require("./planAchievementScopeService");
const {
  userCanApproveAchievement,
} = require("../utils/planAchievementPermissionUtils");
const { userQualifiesForAchievementAssignmentBypass } = require("../utils/planAchievementBypassUtils");
const {
  buildChildrenByParent,
  isMasterPlanLeaf,
  userCanApproveLeafMasterNode,
  collectAllMasterLeafIds,
} = require("./planAchievementScopeUtils");

async function resolveAchievementWorkflowScopeForVersion(planVersionId, user, transaction = null) {
  const version = await PlanVersion.findByPk(planVersionId, {
    attributes: ["plan_version_id", "version_kind", "execution_snapshot_of_version_id"],
    transaction,
  });

  if (!version) {
    return { success: false, message: "Plan version not found" };
  }

  if (version.version_kind !== "execution_period") {
    return {
      success: false,
      message: "Achievement workflow scope is only available for execution period versions",
    };
  }

  const hierarchyVersionId = await resolveExecutionHierarchyVersionId(
    planVersionId,
    transaction
  );
  const masterVersionId = await resolveMasterVersionId(hierarchyVersionId, transaction);

  if (!masterVersionId) {
    return {
      success: true,
      data: {
        master_version_id: null,
        plan_version_id: hierarchyVersionId,
        executor_node_ids: [],
        approver_node_ids: [],
        assignment_bypass_active: userQualifiesForAchievementAssignmentBypass(user),
      },
    };
  }

  const [executorMasterLeaves, scopeContext, masterNodeIdByPeriodNodeId, periodNodes] =
    await Promise.all([
      resolveExecutorLeafMasterNodeIdsForUser(masterVersionId, user, transaction),
      loadAchievementScopeContext(masterVersionId, transaction),
      buildMasterNodeIdByPeriodNodeId(hierarchyVersionId, transaction),
      PlanNode.findAll({
        where: { plan_version_id: hierarchyVersionId, is_active: true },
        attributes: ["plan_node_id", "parent_id"],
        transaction,
      }),
    ]);

  const periodChildrenByParent = buildChildrenByParent(periodNodes);
  const { masterNodes } = scopeContext;
  const masterChildrenByParent = buildChildrenByParent(masterNodes);

  const approverMasterLeaves = new Set();
  const bypassAssignment = userQualifiesForAchievementAssignmentBypass(user);
  if (userCanApproveAchievement(user)) {
    if (bypassAssignment) {
      for (const leafId of collectAllMasterLeafIds(masterNodes)) {
        approverMasterLeaves.add(leafId);
      }
    } else {
      for (const masterNode of masterNodes) {
        if (!isMasterPlanLeaf(masterNode, masterChildrenByParent)) {
          continue;
        }
        if (userCanApproveLeafMasterNode({ user, ...scopeContext }, masterNode.plan_node_id)) {
          approverMasterLeaves.add(masterNode.plan_node_id);
        }
      }
    }
  }

  const executor_node_ids = [];
  const approver_node_ids = [];

  for (const periodNode of periodNodes) {
    if (!isMasterPlanLeaf(periodNode, periodChildrenByParent)) {
      continue;
    }

    const masterNodeId = masterNodeIdByPeriodNodeId.get(periodNode.plan_node_id);
    if (!masterNodeId) {
      continue;
    }

    if (executorMasterLeaves.has(masterNodeId)) {
      executor_node_ids.push(periodNode.plan_node_id);
    }
    if (approverMasterLeaves.has(masterNodeId)) {
      approver_node_ids.push(periodNode.plan_node_id);
    }
  }

  return {
    success: true,
    data: {
      master_version_id: masterVersionId,
      plan_version_id: hierarchyVersionId,
      executor_node_ids,
      approver_node_ids,
      assignment_bypass_active: bypassAssignment,
    },
  };
}

module.exports = {
  resolveAchievementWorkflowScopeForVersion,
};
