"use strict";

const { Op } = require("sequelize");
const {
  PlanVersion,
  PlanSectorAggregationPublish,
  GovernmentStructure,
  sequelize,
} = require("../models");
const { resolveMasterVersionId } = require("./planReviewVisibilityService");
const { resolveExecutionHierarchyVersionId } = require("./planExecutionGateService");
const {
  loadSectorPublishGates,
  assertUserCanPublishSectorAggregation,
} = require("./planAchievementUserService");

const PUBLISH_STATUS = Object.freeze({
  PENDING: "pending",
  PUBLISHED: "published",
  REJECTED: "rejected",
});

async function loadPublishRecordsForVersion(planVersionId, transaction = null) {
  const rows = await PlanSectorAggregationPublish.findAll({
    where: { plan_version_id: planVersionId },
    transaction,
  });
  return new Map(rows.map((row) => [row.external_assignment_id, row]));
}

async function resolvePeriodAndMaster(planVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(planVersionId, {
    attributes: [
      "plan_version_id",
      "version_kind",
      "execution_snapshot_of_version_id",
      "status",
    ],
    transaction,
  });

  if (!version) {
    return { success: false, message: "Plan version not found" };
  }

  if (version.version_kind !== "execution_period") {
    return {
      success: false,
      message: "Sector aggregation publish applies to execution period versions only",
    };
  }

  const hierarchyVersionId = await resolveExecutionHierarchyVersionId(
    planVersionId,
    transaction
  );
  const masterVersionId = await resolveMasterVersionId(hierarchyVersionId, transaction);
  if (!masterVersionId) {
    return { success: false, message: "Master plan version was not found" };
  }

  return {
    success: true,
    version,
    hierarchyVersionId,
    masterVersionId,
  };
}

async function listSectorAggregationPublishState(planVersionId, transaction = null) {
  const resolved = await resolvePeriodAndMaster(planVersionId, transaction);
  if (!resolved.success) {
    return resolved;
  }

  const { branches } = await loadSectorPublishGates(resolved.masterVersionId, transaction);
  const records = await loadPublishRecordsForVersion(planVersionId, transaction);
  const sectorIds = [
    ...new Set(branches.map((branch) => branch.government_structure_id).filter(Boolean)),
  ];
  const sectors = sectorIds.length
    ? await GovernmentStructure.findAll({
        where: { government_structure_id: { [Op.in]: sectorIds } },
        attributes: ["government_structure_id", "name"],
        transaction,
      })
    : [];
  const sectorNameById = new Map(
    sectors.map((sector) => [sector.government_structure_id, sector.name])
  );

  const items = branches.map((branch) => {
    const record = records.get(branch.external_assignment_id);
    const status = record?.status || PUBLISH_STATUS.PENDING;
    return {
      external_assignment_id: branch.external_assignment_id,
      government_structure_id: branch.government_structure_id,
      government_structure_name:
        sectorNameById.get(branch.government_structure_id) || "Sector",
      plan_node_id: branch.plan_node_id,
      has_gate: branch.has_gate,
      status,
      published_at: record?.published_at || null,
      published_by: record?.published_by || null,
      rejection_comment: record?.rejection_comment || null,
    };
  });

  return {
    success: true,
    data: {
      plan_version_id: planVersionId,
      has_sector_publish_gate: items.some((item) => item.has_gate),
      branches: items,
    },
  };
}

async function publishSectorAggregation(
  planVersionId,
  externalAssignmentId,
  options = {}
) {
  const { user, ipAddress } = options;
  const t = await sequelize.transaction();

  try {
    const resolved = await resolvePeriodAndMaster(planVersionId, t);
    if (!resolved.success) {
      await t.rollback();
      return resolved;
    }

    const access = await assertUserCanPublishSectorAggregation(
      user,
      resolved.masterVersionId,
      externalAssignmentId,
      t
    );
    if (!access.allowed) {
      await t.rollback();
      return { success: false, message: access.message };
    }

    const branch = access.branch;
    const now = new Date();
    const [record] = await PlanSectorAggregationPublish.findOrCreate({
      where: {
        plan_version_id: planVersionId,
        external_assignment_id: externalAssignmentId,
      },
      defaults: {
        government_structure_id: branch.government_structure_id,
        status: PUBLISH_STATUS.PUBLISHED,
        published_by: user.user_id,
        published_at: now,
        rejection_comment: null,
      },
      transaction: t,
    });

    if (record.status === PUBLISH_STATUS.PUBLISHED) {
      await t.commit();
      return { success: true, data: record, alreadyPublished: true };
    }

    await record.update(
      {
        government_structure_id: branch.government_structure_id,
        status: PUBLISH_STATUS.PUBLISHED,
        published_by: user.user_id,
        published_at: now,
        rejection_comment: null,
      },
      { transaction: t }
    );

    await t.commit();
    return { success: true, data: record, ipAddress };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function rejectSectorAggregationPublish(
  planVersionId,
  externalAssignmentId,
  comment,
  options = {}
) {
  const { user } = options;
  const t = await sequelize.transaction();

  try {
    const resolved = await resolvePeriodAndMaster(planVersionId, t);
    if (!resolved.success) {
      await t.rollback();
      return resolved;
    }

    const access = await assertUserCanPublishSectorAggregation(
      user,
      resolved.masterVersionId,
      externalAssignmentId,
      t
    );
    if (!access.allowed) {
      await t.rollback();
      return { success: false, message: access.message };
    }

    const branch = access.branch;
    const [record] = await PlanSectorAggregationPublish.findOrCreate({
      where: {
        plan_version_id: planVersionId,
        external_assignment_id: externalAssignmentId,
      },
      defaults: {
        government_structure_id: branch.government_structure_id,
        status: PUBLISH_STATUS.REJECTED,
        published_by: null,
        published_at: null,
        rejection_comment: comment || null,
      },
      transaction: t,
    });

    await record.update(
      {
        government_structure_id: branch.government_structure_id,
        status: PUBLISH_STATUS.REJECTED,
        published_by: null,
        published_at: null,
        rejection_comment: comment || null,
      },
      { transaction: t }
    );

    await t.commit();
    return { success: true, data: record };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

module.exports = {
  PUBLISH_STATUS,
  loadPublishRecordsForVersion,
  listSectorAggregationPublishState,
  publishSectorAggregation,
  rejectSectorAggregationPublish,
};
