"use strict";

const { loadMasterPlanAssignments } = require("./planTreeVisibilityUtils");
const { PlanNode, PlanVersion } = require("../models");
const { resolveMasterVersionId } = require("./planReviewVisibilityService");
const {
  userCanExecuteAchievement,
  userCanApproveAchievement,
} = require("../utils/planAchievementPermissionUtils");
const { userQualifiesForAchievementAssignmentBypass } = require("../utils/planAchievementBypassUtils");
const {
  resolveExecutorLeafMasterNodeIds,
  resolveApproverScopeMasterNodeIds,
  userCanExecuteOnMasterNode,
  userCanApproveLeafMasterNode,
  collectAllMasterLeafIds,
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
  if (userQualifiesForAchievementAssignmentBypass(user)) {
    return collectAllMasterLeafIds(context.masterNodes);
  }

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
  if (userQualifiesForAchievementAssignmentBypass(user)) {
    return collectAllMasterLeafIds(context.masterNodes);
  }

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

  if (userQualifiesForAchievementAssignmentBypass(user)) {
    return { allowed: true };
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

  if (userQualifiesForAchievementAssignmentBypass(user)) {
    return { allowed: true };
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

/**
 * Execution/review snapshots copy the master tree. Nodes of a snapshot master point back to the
 * live master node via source_plan_node_id. Assignments (and therefore executor/approver scope)
 * live on the LIVE master, so any node id resolved through a snapshot must be translated back.
 *
 * Returns Map<inputId, liveMasterNodeId>. Ids that already belong to a live master pass through.
 */
async function mapToLiveMasterNodeIds(nodeIds, transaction = null) {
  const ids = [...new Set((nodeIds || []).filter(Boolean))];
  const result = new Map(ids.map((id) => [id, id]));
  if (ids.length === 0) return result;

  const nodes = await PlanNode.findAll({
    where: { plan_node_id: ids },
    attributes: ["plan_node_id", "plan_version_id", "source_plan_node_id"],
    transaction,
  });
  const versionIds = [...new Set(nodes.map((n) => n.plan_version_id))];
  const versions = versionIds.length
    ? await PlanVersion.findAll({
        where: { plan_version_id: versionIds },
        attributes: [
          "plan_version_id",
          "version_kind",
          "execution_snapshot_of_version_id",
          "review_snapshot_of_version_id",
        ],
        transaction,
      })
    : [];
  const snapshotMasterVersionIds = new Set(
    versions
      .filter(
        (v) =>
          v.version_kind === "master" &&
          (v.execution_snapshot_of_version_id || v.review_snapshot_of_version_id)
      )
      .map((v) => v.plan_version_id)
  );

  for (const node of nodes) {
    if (snapshotMasterVersionIds.has(node.plan_version_id) && node.source_plan_node_id) {
      result.set(node.plan_node_id, node.source_plan_node_id);
    }
  }
  return result;
}

/** Re-key a Map<derivedNodeId, masterNodeId> so its values are live master node ids. */
async function toLiveMasterNodeIdMap(derivedToMaster, transaction = null) {
  const liveById = await mapToLiveMasterNodeIds([...derivedToMaster.values()], transaction);
  const translated = new Map();
  for (const [derivedId, masterId] of derivedToMaster.entries()) {
    translated.set(derivedId, liveById.get(masterId) ?? masterId);
  }
  return translated;
}

async function resolveMasterPlanNodeIdForPeriodNode(periodNode, transaction = null) {
  if (!periodNode?.source_plan_node_id) {
    return null;
  }

  const annualNode = await PlanNode.findByPk(periodNode.source_plan_node_id, {
    transaction,
  });

  const masterNodeId = annualNode?.source_plan_node_id ?? null;
  if (!masterNodeId) return null;

  // Period/annual nodes of an execution snapshot resolve to the snapshot master; translate to
  // the live master node where assignments are defined.
  const liveById = await mapToLiveMasterNodeIds([masterNodeId], transaction);
  return liveById.get(masterNodeId) ?? masterNodeId;
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
  mapToLiveMasterNodeIds,
  toLiveMasterNodeIdMap,
};
