"use strict";

const { v4: uuidv4 } = require("uuid");
const { PlanVersion, PlanNode, sequelize } = require("../models");
const { copyNodesWithAssignments } = require("./planVersionLifecycleService");

function snapshotWorkflowFields(source) {
  return {
    status: source.status,
    is_locked: source.is_locked,
    finalized_at: source.finalized_at,
    annual_targets_finalized_at: source.annual_targets_finalized_at,
    period_targets_finalized_at: source.period_targets_finalized_at,
    period_subdivision_mode: source.period_subdivision_mode,
    process_started_at: source.process_started_at,
    execution_status: null,
  };
}

function isExecutionSnapshotVersion(version) {
  return Boolean(version?.execution_snapshot_of_version_id);
}

async function resolveLiveMasterFromExecutionSnapshot(snapshotVersionId, transaction = null) {
  const snapshot = await PlanVersion.findByPk(snapshotVersionId, { transaction });
  if (!snapshot) return null;

  if (snapshot.version_kind === "master" && snapshot.execution_snapshot_of_version_id) {
    return snapshot.execution_snapshot_of_version_id;
  }

  const rootId = snapshot.execution_snapshot_root_id;
  if (!rootId) return null;

  const root = await PlanVersion.findByPk(rootId, { transaction });
  return root?.execution_snapshot_of_version_id ?? null;
}

async function getActiveExecutionSnapshotId(liveMasterVersionId, transaction = null) {
  const master = await PlanVersion.findByPk(liveMasterVersionId, { transaction });
  if (!master || master.version_kind !== "master") return null;
  return master.active_execution_snapshot_id ?? null;
}

async function getNextExecutionVersionNumber(liveMasterVersionId, transaction) {
  const maxNumber = await PlanVersion.max("execution_version_number", {
    where: {
      execution_snapshot_of_version_id: liveMasterVersionId,
      version_kind: "master",
      parent_plan_version_id: null,
    },
    transaction,
  });

  return (maxNumber || 0) + 1;
}

async function copyExecutionSnapshotVersion(
  sourceVersion,
  parentSnapshotId,
  snapshotRootId,
  transaction,
  executionVersionNumber = null
) {
  const snapshotId = uuidv4();
  const snapshot = await PlanVersion.create(
    {
      plan_version_id: snapshotId,
      draft_name: sourceVersion.draft_name,
      planning_start_date: sourceVersion.planning_start_date,
      planning_end_date: sourceVersion.planning_end_date,
      start_year: sourceVersion.start_year,
      start_month: sourceVersion.start_month,
      end_year: sourceVersion.end_year,
      end_month: sourceVersion.end_month,
      planning_duration_years: sourceVersion.planning_duration_years,
      year: sourceVersion.year,
      version_number: sourceVersion.version_number,
      version_kind: sourceVersion.version_kind,
      government_structure_id: sourceVersion.government_structure_id,
      based_on_version_id: null,
      plan_rule_id: sourceVersion.plan_rule_id,
      parent_plan_version_id: parentSnapshotId,
      planning_year: sourceVersion.planning_year,
      sequence_index: sourceVersion.sequence_index,
      period_label: sourceVersion.period_label,
      execution_snapshot_of_version_id: sourceVersion.plan_version_id,
      execution_snapshot_root_id: snapshotRootId,
      execution_version_number:
        sourceVersion.version_kind === "master" && parentSnapshotId === null
          ? executionVersionNumber
          : null,
      review_snapshot_of_version_id: null,
      review_snapshot_root_id: null,
      review_status: null,
      published_for_review_at: null,
      review_unlocked_at: null,
      review_completed_at: null,
      active_review_snapshot_id: null,
      active_execution_snapshot_id: null,
      review_version_number: null,
      ...snapshotWorkflowFields(sourceVersion),
    },
    { transaction }
  );

  return snapshot;
}

/**
 * Deep-clone the live plan tree into an execution snapshot when process starts.
 * Planning targets are preserved; execution actuals will be recorded on this copy.
 */
async function createExecutionSnapshot(liveMasterVersionId, transaction) {
  const sourceMaster = await PlanVersion.findByPk(liveMasterVersionId, { transaction });
  if (!sourceMaster || sourceMaster.version_kind !== "master") {
    const error = new Error("Master plan version not found");
    error.statusCode = 404;
    throw error;
  }

  if (sourceMaster.active_execution_snapshot_id) {
    const error = new Error("An active execution snapshot already exists for this plan");
    error.statusCode = 409;
    throw error;
  }

  const executionVersionNumber = await getNextExecutionVersionNumber(
    liveMasterVersionId,
    transaction
  );

  const snapshotMaster = await copyExecutionSnapshotVersion(
    sourceMaster,
    null,
    null,
    transaction,
    executionVersionNumber
  );
  const snapshotRootId = snapshotMaster.plan_version_id;

  await snapshotMaster.update({ execution_snapshot_root_id: snapshotRootId }, { transaction });

  const masterNodeIdMap = await copyNodesWithAssignments(
    sourceMaster.plan_version_id,
    snapshotMaster.plan_version_id,
    transaction,
    {
      resolveSourcePlanNodeId: (sourceNode) => sourceNode.plan_node_id,
      preserveTargets: true,
      preservePeriodTarget: true,
      ensureAssignmentActions: true,
    }
  );

  const sourceAnnualVersions = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: liveMasterVersionId,
      version_kind: "annual",
      execution_snapshot_of_version_id: null,
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  for (const sourceAnnual of sourceAnnualVersions) {
    const snapshotAnnual = await copyExecutionSnapshotVersion(
      sourceAnnual,
      snapshotMaster.plan_version_id,
      snapshotRootId,
      transaction
    );

    const annualNodeIdMap = await copyNodesWithAssignments(
      sourceAnnual.plan_version_id,
      snapshotAnnual.plan_version_id,
      transaction,
      {
        resolveSourcePlanNodeId: (sourceNode) =>
          sourceNode.source_plan_node_id
            ? masterNodeIdMap.get(sourceNode.source_plan_node_id) ?? null
            : null,
        preserveTargets: true,
        preservePeriodTarget: true,
        ensureAssignmentActions: true,
      }
    );

    const sourcePeriodVersions = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: sourceAnnual.plan_version_id,
        version_kind: "execution_period",
        execution_snapshot_of_version_id: null,
      },
      order: [["sequence_index", "ASC"]],
      transaction,
    });

    for (const sourcePeriod of sourcePeriodVersions) {
      const snapshotPeriod = await copyExecutionSnapshotVersion(
        sourcePeriod,
        snapshotAnnual.plan_version_id,
        snapshotRootId,
        transaction
      );

      await copyNodesWithAssignments(
        sourcePeriod.plan_version_id,
        snapshotPeriod.plan_version_id,
        transaction,
        {
          resolveSourcePlanNodeId: (sourceNode) =>
            sourceNode.source_plan_node_id
              ? annualNodeIdMap.get(sourceNode.source_plan_node_id) ?? null
              : null,
          preserveTargets: true,
          preservePeriodTarget: true,
          ensureAssignmentActions: true,
        }
      );
    }
  }

  return snapshotMaster;
}

async function buildLiveToSnapshotVersionMap(snapshotRootId, transaction = null) {
  const snapshotVersions = await PlanVersion.findAll({
    where: { execution_snapshot_root_id: snapshotRootId },
    transaction,
  });

  const map = new Map();
  for (const snapshot of snapshotVersions) {
    if (snapshot.execution_snapshot_of_version_id) {
      map.set(snapshot.execution_snapshot_of_version_id, snapshot);
    }
  }
  return map;
}

module.exports = {
  createExecutionSnapshot,
  getNextExecutionVersionNumber,
  getActiveExecutionSnapshotId,
  isExecutionSnapshotVersion,
  resolveLiveMasterFromExecutionSnapshot,
  buildLiveToSnapshotVersionMap,
  snapshotWorkflowFields,
};
