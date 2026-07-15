"use strict";

const { PlanVersion, PlanNode } = require("../models");
const { resolveMasterVersionId } = require("./planReviewVisibilityService");
const { resolveExecutionHierarchyVersionId } = require("./planExecutionGateService");
const { buildMasterNodeIdByPeriodNodeId, buildMasterNodeIdByAnnualNodeId, buildRollupContextForPeriod, buildRollupContextForAnnual } = require("./planAchievementRollupService");
const {
  loadAchievementScopeContext,
  resolveExecutorLeafMasterNodeIdsForUser,
} = require("./planAchievementScopeService");
const {
  userCanApproveAchievement,
  userCanValidateAchievement,
  userCanPublishSectorAggregation,
} = require("../utils/planAchievementPermissionUtils");
const {
  loadSectorValidationUsers,
  loadSectorPublishGates,
} = require("./planAchievementUserService");
const {
  loadPublishRecordsForVersion,
  PUBLISH_STATUS,
} = require("./planSectorAggregationPublishService");
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

  if (version.version_kind !== "execution_period" && version.version_kind !== "annual") {
    return {
      success: false,
      message: "Achievement workflow scope is only available for execution period or annual versions",
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
        validator_node_ids: [],
        has_validation_gate: false,
        has_sector_publish_gate: false,
        sector_publish_branches: [],
        publisher_branch_ids: [],
        assignment_bypass_active: userQualifiesForAchievementAssignmentBypass(user),
      },
    };
  }

  const isAnnual = version.version_kind === "annual" ||
    (await PlanVersion.findByPk(hierarchyVersionId, {
      attributes: ["version_kind"],
      transaction,
    }))?.version_kind === "annual";

  if (isAnnual) {
    const [
      executorMasterLeaves,
      scopeContext,
      masterNodeIdByAnnualNodeId,
      annualNodes,
      rollupContext,
    ] = await Promise.all([
      resolveExecutorLeafMasterNodeIdsForUser(masterVersionId, user, transaction),
      loadAchievementScopeContext(masterVersionId, transaction),
      buildMasterNodeIdByAnnualNodeId(hierarchyVersionId, transaction),
      PlanNode.findAll({
        where: { plan_version_id: hierarchyVersionId, is_active: true },
        attributes: ["plan_node_id", "parent_id", "achievement_mode"],
        transaction,
      }),
      buildRollupContextForAnnual(hierarchyVersionId, transaction),
    ]);

    const annualChildrenByParent = buildChildrenByParent(annualNodes);
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
    const validator_node_ids = [];
    const hasValidationGate = Boolean(rollupContext.hasValidationGate);

    let userIsSectorValidator = false;
    if (hasValidationGate && userCanValidateAchievement(user)) {
      const { users: validators } = await loadSectorValidationUsers(masterVersionId, transaction);
      userIsSectorValidator = validators.some((candidate) => candidate.user_id === user.user_id);
    }

    for (const annualNode of annualNodes) {
      if (!isMasterPlanLeaf(annualNode, annualChildrenByParent)) {
        continue;
      }
      if (annualNode.achievement_mode !== "annual") {
        continue;
      }

      const masterNodeId = masterNodeIdByAnnualNodeId.get(annualNode.plan_node_id);
      if (!masterNodeId) {
        continue;
      }

      if (executorMasterLeaves.has(masterNodeId)) {
        executor_node_ids.push(annualNode.plan_node_id);
      }
      if (approverMasterLeaves.has(masterNodeId)) {
        approver_node_ids.push(annualNode.plan_node_id);
      }
      if (userIsSectorValidator) {
        validator_node_ids.push(annualNode.plan_node_id);
      }
    }

    return {
      success: true,
      data: {
        master_version_id: masterVersionId,
        plan_version_id: hierarchyVersionId,
        executor_node_ids,
        approver_node_ids,
        validator_node_ids,
        has_validation_gate: hasValidationGate,
        has_sector_publish_gate: false,
        sector_publish_branches: [],
        publisher_branch_ids: [],
        assignment_bypass_active: bypassAssignment,
      },
    };
  }

  const [executorMasterLeaves, scopeContext, masterNodeIdByPeriodNodeId, periodNodes, rollupContext, publishGates, publishRecords] =
    await Promise.all([
      resolveExecutorLeafMasterNodeIdsForUser(masterVersionId, user, transaction),
      loadAchievementScopeContext(masterVersionId, transaction),
      buildMasterNodeIdByPeriodNodeId(hierarchyVersionId, transaction),
      PlanNode.findAll({
        where: { plan_version_id: hierarchyVersionId, is_active: true },
        attributes: ["plan_node_id", "parent_id"],
        transaction,
      }),
      buildRollupContextForPeriod(planVersionId, transaction),
      loadSectorPublishGates(masterVersionId, transaction),
      loadPublishRecordsForVersion(planVersionId, transaction),
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
  const validator_node_ids = [];
  const hasValidationGate = Boolean(rollupContext.hasValidationGate);

  let userIsSectorValidator = false;
  if (hasValidationGate && userCanValidateAchievement(user)) {
    const { users: validators } = await loadSectorValidationUsers(masterVersionId, transaction);
    userIsSectorValidator = validators.some((candidate) => candidate.user_id === user.user_id);
  }

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
    if (userIsSectorValidator) {
      validator_node_ids.push(periodNode.plan_node_id);
    }
  }

  const sector_publish_branches = (publishGates.branches || []).map((branch) => {
    const record = publishRecords.get(branch.external_assignment_id);
    return {
      external_assignment_id: branch.external_assignment_id,
      government_structure_id: branch.government_structure_id,
      plan_node_id: branch.plan_node_id,
      has_gate: branch.has_gate,
      publish_status: record?.status || PUBLISH_STATUS.PENDING,
      published_at: record?.published_at || null,
    };
  });

  const publisher_branch_ids = [];
  if (userCanPublishSectorAggregation(user)) {
    for (const branch of publishGates.branches || []) {
      if (
        branch.has_gate &&
        (branch.publisher_user_ids || []).includes(user.user_id)
      ) {
        publisher_branch_ids.push(branch.external_assignment_id);
      }
    }
  }

  return {
    success: true,
    data: {
      master_version_id: masterVersionId,
      plan_version_id: hierarchyVersionId,
      executor_node_ids,
      approver_node_ids,
      validator_node_ids,
      has_validation_gate: hasValidationGate,
      has_sector_publish_gate: Boolean(publishGates.hasSectorPublishGate),
      sector_publish_branches,
      publisher_branch_ids,
      assignment_bypass_active: bypassAssignment,
    },
  };
}

module.exports = {
  resolveAchievementWorkflowScopeForVersion,
};
