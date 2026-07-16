"use strict";

const { PlanNode } = require("../models");
const {
  userCanRequestTargetReallocation,
  userCanApproveTargetReallocation,
} = require("../utils/planTargetReallocationPermissionUtils");
const { userQualifiesForAchievementAssignmentBypass } = require("../utils/planAchievementBypassUtils");
const {
  loadAchievementScopeContext,
} = require("./planAchievementScopeService");
const {
  userCanExecuteOnMasterNode,
  userCanApproveLeafMasterNode,
  userCanAccessPlanSector,
} = require("./planAchievementScopeUtils");
const {
  collectCandidateApproverUserIds,
  loadSectorApproverUsers,
  loadUsersWithEffectivePermissions,
} = require("./planAchievementUserService");
const { loadMasterPlanAssignments } = require("./planTreeVisibilityUtils");

async function assertUserCanRequestTargetReallocationOnKpi(
  user,
  masterKpiPlanNodeId,
  masterVersionId,
  transaction = null
) {
  if (!userCanRequestTargetReallocation(user)) {
    return {
      allowed: false,
      message: "Plan request target reallocation permission required",
    };
  }

  if (userQualifiesForAchievementAssignmentBypass(user)) {
    return { allowed: true };
  }

  const context = await loadAchievementScopeContext(masterVersionId, transaction);
  const allowed = userCanExecuteOnMasterNode({ user, ...context }, masterKpiPlanNodeId);

  if (!allowed) {
    return {
      allowed: false,
      message:
        "You must be assigned to this KPI in your sector to request target reallocation",
    };
  }

  return { allowed: true };
}

async function assertUserCanApproveTargetReallocationOnKpi(
  user,
  masterKpiPlanNodeId,
  masterVersionId,
  transaction = null
) {
  if (!userCanApproveTargetReallocation(user)) {
    return {
      allowed: false,
      message: "Plan approve target reallocation permission required",
    };
  }

  if (userQualifiesForAchievementAssignmentBypass(user)) {
    return { allowed: true };
  }

  const context = await loadAchievementScopeContext(masterVersionId, transaction);
  const allowed = userCanApproveLeafMasterNode({ user, ...context }, masterKpiPlanNodeId);

  if (!allowed) {
    return {
      allowed: false,
      message:
        "You must be assigned within this plan branch in your sector to approve target reallocation",
    };
  }

  return { allowed: true };
}

async function resolveTargetReallocationApproverUsers(
  masterVersionId,
  leafMasterNodeId,
  transaction = null
) {
  if (!masterVersionId || !leafMasterNodeId) {
    return [];
  }

  const context = await loadMasterPlanAssignments(masterVersionId, transaction);
  const candidateUserIds = await collectCandidateApproverUserIds(
    context.internalAssignments,
    transaction
  );
  const { planSectorId, structureIndex, users: sectorApprovers } =
    await loadSectorApproverUsers(masterVersionId, transaction);
  const allCandidateIds = [
    ...new Set([
      ...candidateUserIds,
      ...sectorApprovers.map((user) => user.user_id),
    ]),
  ];
  const users = await loadUsersWithEffectivePermissions(allCandidateIds, transaction);
  const seen = new Set();
  const approvers = [];

  for (const user of users) {
    if (!userCanApproveTargetReallocation(user) || seen.has(user.user_id)) {
      continue;
    }

    const assignmentScoped = userCanApproveLeafMasterNode(
      { user, ...context },
      leafMasterNodeId
    );
    const sectorScoped =
      planSectorId &&
      userCanAccessPlanSector(user, planSectorId, structureIndex);

    if (assignmentScoped || sectorScoped) {
      seen.add(user.user_id);
      approvers.push(user);
    }
  }

  return approvers;
}

async function resolveMasterKpiIdForAnnualKpi(annualKpiNode) {
  return annualKpiNode?.source_plan_node_id ?? null;
}

async function resolveSnapshotMasterKpiNode(
  snapshotRootId,
  liveMasterKpiId,
  transaction = null
) {
  return PlanNode.findOne({
    where: {
      plan_version_id: snapshotRootId,
      source_plan_node_id: liveMasterKpiId,
      is_active: true,
    },
    transaction,
  });
}

async function resolveSnapshotAnnualKpiNode(
  snapshotAnnualVersionId,
  snapshotMasterKpiNodeId,
  transaction = null
) {
  return PlanNode.findOne({
    where: {
      plan_version_id: snapshotAnnualVersionId,
      source_plan_node_id: snapshotMasterKpiNodeId,
      is_active: true,
    },
    transaction,
  });
}

async function resolveSnapshotPeriodKpiNode(
  snapshotPeriodVersionId,
  snapshotAnnualKpiNodeId,
  transaction = null
) {
  return PlanNode.findOne({
    where: {
      plan_version_id: snapshotPeriodVersionId,
      source_plan_node_id: snapshotAnnualKpiNodeId,
      is_active: true,
    },
    transaction,
  });
}

async function resolveMasterKpiIdForPeriodNode(periodNode, transaction = null) {
  if (!periodNode?.source_plan_node_id) {
    return null;
  }

  const annualNode = await PlanNode.findByPk(periodNode.source_plan_node_id, { transaction });
  return annualNode?.source_plan_node_id ?? null;
}

module.exports = {
  assertUserCanRequestTargetReallocationOnKpi,
  assertUserCanApproveTargetReallocationOnKpi,
  resolveTargetReallocationApproverUsers,
  resolveMasterKpiIdForAnnualKpi,
  resolveSnapshotMasterKpiNode,
  resolveSnapshotAnnualKpiNode,
  resolveSnapshotPeriodKpiNode,
  resolveMasterKpiIdForPeriodNode,
};
