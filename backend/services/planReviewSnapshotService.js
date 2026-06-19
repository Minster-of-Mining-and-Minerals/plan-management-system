"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
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
  };
}

function isReviewSnapshotVersion(version) {
  return Boolean(version?.review_snapshot_of_version_id);
}

async function resolveLiveMasterFromSnapshot(snapshotVersionId, transaction = null) {
  const snapshot = await PlanVersion.findByPk(snapshotVersionId, { transaction });
  if (!snapshot) return null;

  if (snapshot.version_kind === "master" && snapshot.review_snapshot_of_version_id) {
    return snapshot.review_snapshot_of_version_id;
  }

  const rootId = snapshot.review_snapshot_root_id;
  if (!rootId) return null;

  const root = await PlanVersion.findByPk(rootId, { transaction });
  return root?.review_snapshot_of_version_id ?? null;
}

async function resolveReviewSnapshotRootId(planVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!version) return null;
  if (version.review_snapshot_root_id) {
    return version.review_snapshot_root_id;
  }
  if (version.version_kind === "master" && version.review_snapshot_of_version_id) {
    return version.plan_version_id;
  }
  return null;
}

async function getActiveReviewSnapshotId(liveMasterVersionId, transaction = null) {
  const master = await PlanVersion.findByPk(liveMasterVersionId, { transaction });
  if (!master || master.version_kind !== "master") return null;
  return master.active_review_snapshot_id ?? null;
}

async function getNextReviewVersionNumber(liveMasterVersionId, transaction) {
  const maxNumber = await PlanVersion.max("review_version_number", {
    where: {
      review_snapshot_of_version_id: liveMasterVersionId,
      version_kind: "master",
      parent_plan_version_id: null,
    },
    transaction,
  });

  return (maxNumber || 0) + 1;
}

async function copyReviewSnapshotVersion(
  sourceVersion,
  parentSnapshotId,
  snapshotRootId,
  transaction,
  reviewVersionNumber = null
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
      review_snapshot_of_version_id: sourceVersion.plan_version_id,
      review_snapshot_root_id: snapshotRootId,
      review_status: null,
      published_for_review_at: null,
      review_unlocked_at: null,
      review_completed_at: null,
      active_review_snapshot_id: null,
      review_version_number:
        sourceVersion.version_kind === "master" && parentSnapshotId === null
          ? reviewVersionNumber
          : null,
      ...snapshotWorkflowFields(sourceVersion),
    },
    { transaction }
  );

  return snapshot;
}

/**
 * Deep-clone the full published plan tree (master, annual, execution periods)
 * into a read-only review snapshot linked back to the live versions.
 */
async function createReviewSnapshot(liveMasterVersionId, transaction) {
  const sourceMaster = await PlanVersion.findByPk(liveMasterVersionId, { transaction });
  if (!sourceMaster || sourceMaster.version_kind !== "master") {
    const error = new Error("Master plan version not found");
    error.statusCode = 404;
    throw error;
  }

  const reviewVersionNumber = await getNextReviewVersionNumber(liveMasterVersionId, transaction);

  const snapshotMaster = await copyReviewSnapshotVersion(
    sourceMaster,
    null,
    null,
    transaction,
    reviewVersionNumber
  );
  const snapshotRootId = snapshotMaster.plan_version_id;

  await snapshotMaster.update({ review_snapshot_root_id: snapshotRootId }, { transaction });

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
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  for (const sourceAnnual of sourceAnnualVersions) {
    const snapshotAnnual = await copyReviewSnapshotVersion(
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
      },
      order: [["sequence_index", "ASC"]],
      transaction,
    });

    for (const sourcePeriod of sourcePeriodVersions) {
      const snapshotPeriod = await copyReviewSnapshotVersion(
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

  await assertReviewSnapshotCompleteness(liveMasterVersionId, snapshotRootId, transaction);

  return snapshotMaster;
}

async function assertReviewSnapshotCompleteness(liveMasterVersionId, snapshotRootId, transaction) {
  const countNodes = (versionId) =>
    PlanNode.count({ where: { plan_version_id: versionId }, transaction });

  const sourceAnnuals = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: liveMasterVersionId,
      version_kind: "annual",
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  const snapshotAnnuals = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: snapshotRootId,
      version_kind: "annual",
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  if (sourceAnnuals.length !== snapshotAnnuals.length) {
    const error = new Error(
      `Review snapshot is incomplete: expected ${sourceAnnuals.length} annual version(s), copied ${snapshotAnnuals.length}`
    );
    error.statusCode = 500;
    throw error;
  }

  const [sourceMasterCount, snapshotMasterCount] = await Promise.all([
    countNodes(liveMasterVersionId),
    countNodes(snapshotRootId),
  ]);

  if (sourceMasterCount !== snapshotMasterCount) {
    const error = new Error(
      `Review snapshot is incomplete: master has ${snapshotMasterCount}/${sourceMasterCount} nodes`
    );
    error.statusCode = 500;
    throw error;
  }

  for (let index = 0; index < sourceAnnuals.length; index += 1) {
    const sourceAnnual = sourceAnnuals[index];
    const snapshotAnnual = snapshotAnnuals[index];
    const yearLabel = sourceAnnual.planning_year ?? sourceAnnual.year ?? index + 1;

    const [sourceAnnualCount, snapshotAnnualCount] = await Promise.all([
      countNodes(sourceAnnual.plan_version_id),
      countNodes(snapshotAnnual.plan_version_id),
    ]);

    if (sourceAnnualCount !== snapshotAnnualCount) {
      const error = new Error(
        `Review snapshot is incomplete for year ${yearLabel}: ${snapshotAnnualCount}/${sourceAnnualCount} nodes copied`
      );
      error.statusCode = 500;
      throw error;
    }

    const sourcePeriods = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: sourceAnnual.plan_version_id,
        version_kind: "execution_period",
      },
      order: [["sequence_index", "ASC"]],
      transaction,
    });

    const snapshotPeriods = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: snapshotAnnual.plan_version_id,
        version_kind: "execution_period",
      },
      order: [["sequence_index", "ASC"]],
      transaction,
    });

    if (sourcePeriods.length !== snapshotPeriods.length) {
      const error = new Error(
        `Review snapshot is incomplete for year ${yearLabel}: expected ${sourcePeriods.length} execution period(s), copied ${snapshotPeriods.length}`
      );
      error.statusCode = 500;
      throw error;
    }

    for (let periodIndex = 0; periodIndex < sourcePeriods.length; periodIndex += 1) {
      const sourcePeriod = sourcePeriods[periodIndex];
      const snapshotPeriod = snapshotPeriods[periodIndex];
      const [sourcePeriodCount, snapshotPeriodCount] = await Promise.all([
        countNodes(sourcePeriod.plan_version_id),
        countNodes(snapshotPeriod.plan_version_id),
      ]);

      if (sourcePeriodCount !== snapshotPeriodCount) {
        const error = new Error(
          `Review snapshot is incomplete for year ${yearLabel} period ${periodIndex + 1}: ${snapshotPeriodCount}/${sourcePeriodCount} nodes copied`
        );
        error.statusCode = 500;
        throw error;
      }
    }
  }
}

async function getReviewSnapshotHistory(liveMasterVersionId, transaction = null) {
  return PlanVersion.findAll({
    where: {
      review_snapshot_of_version_id: liveMasterVersionId,
      version_kind: "master",
      parent_plan_version_id: null,
    },
    attributes: [
      "plan_version_id",
      "review_version_number",
      "draft_name",
      "created_at",
    ],
    order: [["review_version_number", "ASC"]],
    transaction,
  });
}

const LIVE_REVIEW_FIELDS = [
  "review_status",
  "published_for_review_at",
  "review_completed_at",
  "review_unlocked_at",
  "active_review_snapshot_id",
];

async function enrichLiveMasterReviewFields(version, transaction = null) {
  if (!version) return version;

  const plain = version.toJSON ? version.toJSON() : { ...version };
  if (plain.review_snapshot_of_version_id) {
    return attachLiveReviewFields(version, transaction);
  }

  let enriched = { ...plain };

  if (plain.active_review_snapshot_id) {
    const activeSnapshot = await PlanVersion.findByPk(plain.active_review_snapshot_id, {
      attributes: ["plan_version_id", "review_version_number"],
      transaction,
    });
    enriched.active_review_version_number = activeSnapshot?.review_version_number ?? null;
  }

  const reviewRoundCount = await PlanVersion.count({
    where: {
      review_snapshot_of_version_id: plain.plan_version_id,
      version_kind: "master",
      parent_plan_version_id: null,
    },
    transaction,
  });
  enriched.review_round_count = reviewRoundCount;

  return enriched;
}

async function attachLiveReviewFields(version, transaction = null) {
  if (!version) return version;

  const plain = version.toJSON ? version.toJSON() : { ...version };
  if (!plain.review_snapshot_of_version_id && !plain.review_snapshot_root_id) {
    return plain;
  }

  let liveMasterId = plain.review_snapshot_of_version_id;
  if (!liveMasterId && plain.review_snapshot_root_id) {
    const root = await PlanVersion.findByPk(plain.review_snapshot_root_id, { transaction });
    liveMasterId = root?.review_snapshot_of_version_id ?? null;
  }

  if (!liveMasterId) return plain;

  const liveMaster = await PlanVersion.findByPk(liveMasterId, {
    attributes: [
      "plan_version_id",
      "version_number",
      "draft_name",
      ...LIVE_REVIEW_FIELDS,
    ],
    transaction,
  });
  if (!liveMaster) return plain;

  return {
    ...plain,
    live_master_version_id: liveMaster.plan_version_id,
    live_master_version_number: liveMaster.version_number,
    live_master_draft_name: liveMaster.draft_name,
    review_status: liveMaster.review_status,
    published_for_review_at: liveMaster.published_for_review_at,
    review_completed_at: liveMaster.review_completed_at,
    review_unlocked_at: liveMaster.review_unlocked_at,
    active_review_snapshot_id: liveMaster.active_review_snapshot_id,
  };
}

async function collectReviewSnapshotEntityIds(reviewSnapshotRootId, transaction = null) {
  const root = await PlanVersion.findByPk(reviewSnapshotRootId, { transaction });
  if (!root) {
    return { versionIds: [], nodeIds: [] };
  }

  const versions = await PlanVersion.findAll({
    where: {
      review_snapshot_root_id: reviewSnapshotRootId,
    },
    transaction,
  });

  const versionIds = versions.map((v) => v.plan_version_id);
  const nodes = await PlanNode.findAll({
    where: { plan_version_id: { [Op.in]: versionIds }, is_active: true },
    attributes: ["plan_node_id"],
    transaction,
  });

  return {
    versionIds,
    nodeIds: nodes.map((n) => n.plan_node_id),
  };
}

module.exports = {
  createReviewSnapshot,
  getNextReviewVersionNumber,
  getReviewSnapshotHistory,
  isReviewSnapshotVersion,
  resolveLiveMasterFromSnapshot,
  resolveReviewSnapshotRootId,
  getActiveReviewSnapshotId,
  attachLiveReviewFields,
  enrichLiveMasterReviewFields,
  collectReviewSnapshotEntityIds,
  snapshotWorkflowFields,
};
