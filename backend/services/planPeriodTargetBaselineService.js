"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const { PlanVersion, PlanNode, PlanPeriodTargetBaseline } = require("../models");
const { normalizeTargetValue } = require("../utils/planTargetReallocationValidationUtils");

async function capturePeriodTargetBaselinesForSnapshot(
  liveMasterVersionId,
  snapshotRootId,
  transaction = null
) {
  const snapshotPeriods = await PlanVersion.findAll({
    where: {
      execution_snapshot_root_id: snapshotRootId,
      version_kind: "execution_period",
    },
    transaction,
  });

  let captured = 0;

  for (const snapshotPeriod of snapshotPeriods) {
    const livePeriodVersionId = snapshotPeriod.execution_snapshot_of_version_id;
    if (!livePeriodVersionId) continue;

    const snapshotAnnual = await PlanVersion.findByPk(snapshotPeriod.parent_plan_version_id, {
      transaction,
    });
    const liveAnnualVersionId = snapshotAnnual?.execution_snapshot_of_version_id;
    if (!liveAnnualVersionId) continue;

    const periodKpiNodes = await PlanNode.findAll({
      where: {
        plan_version_id: snapshotPeriod.plan_version_id,
        type: "kpi",
        is_active: true,
      },
      transaction,
    });

    for (const periodNode of periodKpiNodes) {
      if (!periodNode.source_plan_node_id) continue;

      const snapshotAnnualKpi = await PlanNode.findByPk(periodNode.source_plan_node_id, {
        transaction,
      });
      if (!snapshotAnnualKpi?.source_plan_node_id) continue;

      const snapshotMasterKpi = await PlanNode.findByPk(snapshotAnnualKpi.source_plan_node_id, {
        transaction,
      });
      const liveMasterKpiId = snapshotMasterKpi?.source_plan_node_id;
      if (!liveMasterKpiId) continue;

      const liveAnnualKpi = await PlanNode.findOne({
        where: {
          plan_version_id: liveAnnualVersionId,
          source_plan_node_id: liveMasterKpiId,
          type: "kpi",
          is_active: true,
        },
        transaction,
      });
      if (!liveAnnualKpi) continue;

      const [baseline, created] = await PlanPeriodTargetBaseline.findOrCreate({
        where: {
          execution_snapshot_root_id: snapshotRootId,
          snapshot_period_plan_node_id: periodNode.plan_node_id,
        },
        defaults: {
          plan_period_target_baseline_id: uuidv4(),
          master_plan_version_id: liveMasterVersionId,
          annual_plan_version_id: liveAnnualVersionId,
          annual_kpi_plan_node_id: liveAnnualKpi.plan_node_id,
          period_version_id: livePeriodVersionId,
          original_target: normalizeTargetValue(periodNode.period_target),
        },
        transaction,
      });

      if (created) {
        captured += 1;
      }
    }
  }

  return { captured };
}

async function loadBaselinesForMaster(masterPlanVersionId, snapshotRootId, transaction = null) {
  const rows = await PlanPeriodTargetBaseline.findAll({
    where: {
      master_plan_version_id: masterPlanVersionId,
      execution_snapshot_root_id: snapshotRootId,
    },
    transaction,
  });

  const byPeriodKpiKey = new Map();
  const bySnapshotNodeId = new Map();

  for (const row of rows) {
    const key = `${row.annual_kpi_plan_node_id}:${row.period_version_id}`;
    byPeriodKpiKey.set(key, row);
    bySnapshotNodeId.set(row.snapshot_period_plan_node_id, row);
  }

  return { rows, byPeriodKpiKey, bySnapshotNodeId };
}

async function loadBaselinesForFilters(filters = {}, transaction = null) {
  const where = {};

  if (filters.master_plan_version_id) {
    where.master_plan_version_id = filters.master_plan_version_id;
  }
  if (filters.execution_snapshot_root_id) {
    where.execution_snapshot_root_id = filters.execution_snapshot_root_id;
  }
  if (filters.annual_kpi_plan_node_id) {
    where.annual_kpi_plan_node_id = filters.annual_kpi_plan_node_id;
  }
  if (filters.period_version_id) {
    where.period_version_id = filters.period_version_id;
  }
  if (filters.annual_plan_version_id) {
    where.annual_plan_version_id = filters.annual_plan_version_id;
  }

  return PlanPeriodTargetBaseline.findAll({
    where,
    transaction,
  });
}

module.exports = {
  capturePeriodTargetBaselinesForSnapshot,
  loadBaselinesForMaster,
  loadBaselinesForFilters,
};
