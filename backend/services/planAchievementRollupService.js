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
  resolveSectorApproverGateMasterNodeIds,
  loadSectorApproverUsers,
  loadSectorValidationUsers,
  loadSectorPublishGates,
} = require("./planAchievementUserService");
const {
  loadPublishRecordsForVersion,
  PUBLISH_STATUS,
} = require("./planSectorAggregationPublishService");

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

  const sectorGateIds = await resolveSectorApproverGateMasterNodeIds(
    masterVersionId,
    context.masterNodes,
    transaction
  );
  for (const nodeId of sectorGateIds) {
    gateNodeIds.add(nodeId);
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
      requiresValidationByMasterNodeId: new Map(),
      hasValidationGate: false,
      hasSectorPublishGate: false,
      publishBoundaryPeriodNodeIds: new Set(),
      publishedBoundaryPeriodNodeIds: new Set(),
      sectorPublishBranches: [],
    };
  }

  const { masterNodes } = await loadMasterPlanAssignments(masterVersionId, transaction);
  const [
    { users: sectorApprovers },
    { hasValidationGate },
    approverGateNodeIds,
    masterNodeIdByPeriodNodeId,
    publishGates,
    publishRecords,
  ] = await Promise.all([
    loadSectorApproverUsers(masterVersionId, transaction),
    loadSectorValidationUsers(masterVersionId, transaction),
    resolveApproverGateMasterNodeIds(masterVersionId, transaction),
    buildMasterNodeIdByPeriodNodeId(periodVersionId, transaction),
    loadSectorPublishGates(masterVersionId, transaction),
    loadPublishRecordsForVersion(periodVersionId, transaction),
  ]);
  const hasSectorApprovalOversight = sectorApprovers.length > 0;

  const requiresApprovalByMasterNodeId = new Map();
  const requiresValidationByMasterNodeId = new Map();
  for (const masterNodeId of new Set(masterNodeIdByPeriodNodeId.values())) {
    requiresApprovalByMasterNodeId.set(
      masterNodeId,
      hasSectorApprovalOversight ||
        masterNodeRequiresApproval(masterNodeId, masterNodes, approverGateNodeIds)
    );
    requiresValidationByMasterNodeId.set(masterNodeId, hasValidationGate);
  }

  const periodNodeIdByMasterNodeId = new Map();
  for (const [periodNodeId, masterNodeId] of masterNodeIdByPeriodNodeId.entries()) {
    periodNodeIdByMasterNodeId.set(masterNodeId, periodNodeId);
  }

  const publishBoundaryPeriodNodeIds = new Set();
  const publishedBoundaryPeriodNodeIds = new Set();
  const sectorPublishBranches = [];

  for (const branch of publishGates.branches || []) {
    const periodSeedId = periodNodeIdByMasterNodeId.get(branch.plan_node_id);
    const record = publishRecords.get(branch.external_assignment_id);
    const status = record?.status || PUBLISH_STATUS.PENDING;
    const isPublished = status === PUBLISH_STATUS.PUBLISHED;

    sectorPublishBranches.push({
      external_assignment_id: branch.external_assignment_id,
      government_structure_id: branch.government_structure_id,
      plan_node_id: branch.plan_node_id,
      period_node_id: periodSeedId || null,
      has_gate: branch.has_gate,
      publish_status: status,
    });

    if (!branch.has_gate || !periodSeedId) {
      continue;
    }

    publishBoundaryPeriodNodeIds.add(periodSeedId);
    if (isPublished) {
      publishedBoundaryPeriodNodeIds.add(periodSeedId);
    }
  }

  return {
    masterNodes,
    approverGateNodeIds,
    masterNodeIdByPeriodNodeId,
    requiresApprovalByMasterNodeId,
    requiresValidationByMasterNodeId,
    hasValidationGate,
    hasSectorPublishGate: Boolean(publishGates.hasSectorPublishGate),
    publishBoundaryPeriodNodeIds,
    publishedBoundaryPeriodNodeIds,
    sectorPublishBranches,
  };
}

async function buildMasterNodeIdByAnnualNodeId(annualVersionId, transaction = null) {
  const annualNodes = await PlanNode.findAll({
    where: { plan_version_id: annualVersionId, is_active: true },
    attributes: ["plan_node_id", "source_plan_node_id"],
    transaction,
  });

  const masterNodeIdByAnnualNodeId = new Map();
  for (const annualNode of annualNodes) {
    if (annualNode.source_plan_node_id) {
      masterNodeIdByAnnualNodeId.set(
        annualNode.plan_node_id,
        annualNode.source_plan_node_id
      );
    }
  }

  return masterNodeIdByAnnualNodeId;
}

/**
 * Same gate maps as period context, but node keys are annual plan_node_ids.
 * Reuses masterNodeIdByPeriodNodeId field name so shared rollup helpers work.
 */
async function buildRollupContextForAnnual(annualVersionId, transaction = null) {
  const masterVersionId = await resolveMasterVersionId(annualVersionId, transaction);
  if (!masterVersionId) {
    return {
      masterNodes: [],
      approverGateNodeIds: new Set(),
      masterNodeIdByPeriodNodeId: new Map(),
      requiresApprovalByMasterNodeId: new Map(),
      requiresValidationByMasterNodeId: new Map(),
      hasValidationGate: false,
      hasSectorPublishGate: false,
      publishBoundaryPeriodNodeIds: new Set(),
      publishedBoundaryPeriodNodeIds: new Set(),
      sectorPublishBranches: [],
    };
  }

  const { masterNodes } = await loadMasterPlanAssignments(masterVersionId, transaction);
  const [
    { users: sectorApprovers },
    { hasValidationGate },
    approverGateNodeIds,
    masterNodeIdByAnnualNodeId,
    publishGates,
  ] = await Promise.all([
    loadSectorApproverUsers(masterVersionId, transaction),
    loadSectorValidationUsers(masterVersionId, transaction),
    resolveApproverGateMasterNodeIds(masterVersionId, transaction),
    buildMasterNodeIdByAnnualNodeId(annualVersionId, transaction),
    loadSectorPublishGates(masterVersionId, transaction),
  ]);
  const hasSectorApprovalOversight = sectorApprovers.length > 0;

  const requiresApprovalByMasterNodeId = new Map();
  const requiresValidationByMasterNodeId = new Map();
  for (const masterNodeId of new Set(masterNodeIdByAnnualNodeId.values())) {
    requiresApprovalByMasterNodeId.set(
      masterNodeId,
      hasSectorApprovalOversight ||
        masterNodeRequiresApproval(masterNodeId, masterNodes, approverGateNodeIds)
    );
    requiresValidationByMasterNodeId.set(masterNodeId, hasValidationGate);
  }

  return {
    masterNodes,
    approverGateNodeIds,
    masterNodeIdByPeriodNodeId: masterNodeIdByAnnualNodeId,
    requiresApprovalByMasterNodeId,
    requiresValidationByMasterNodeId,
    hasValidationGate,
    hasSectorPublishGate: Boolean(publishGates.hasSectorPublishGate),
    publishBoundaryPeriodNodeIds: new Set(),
    publishedBoundaryPeriodNodeIds: new Set(),
    sectorPublishBranches: [],
  };
}

module.exports = {
  resolveApproverGateMasterNodeIds,
  buildMasterNodeIdByPeriodNodeId,
  buildMasterNodeIdByAnnualNodeId,
  buildRollupContextForPeriod,
  buildRollupContextForAnnual,
  masterNodeRequiresApproval,
};
