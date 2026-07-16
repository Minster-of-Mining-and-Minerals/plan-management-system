"use strict";

const { Op } = require("sequelize");
const { PlanVersion, PlanNode, PlanAmendment, PlanAmendmentAction } = require("../../models");
const { resolveMasterVersionId } = require("../planReviewVisibilityService");
const { buildLiveToSnapshotVersionMap } = require("../planExecutionSnapshotService");
const {
  resolveMasterKpiIdForAnnualKpi,
  resolveSnapshotMasterKpiNode,
  resolveSnapshotAnnualKpiNode,
} = require("../planTargetReallocationScopeService");
const { normalizeTargetValue } = require("../../utils/planTargetReallocationValidationUtils");
const { AMENDMENT_TYPE } = require("../../utils/planAmendmentTypes");
const { AMENDMENT_STATUS } = require("../../utils/planAmendmentWorkflowUtils");

/**
 * Reporting: original (live) vs current effective (snapshot) annual targets,
 * plus applied annual target revision amendment history for the year.
 */
async function getAnnualTargetRevisionReporting(planVersionId, rawQuery = {}, transaction = null) {
  if (!planVersionId) {
    return { success: false, message: "Plan version is required." };
  }

  const version = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!version) {
    return { success: false, message: "Plan version was not found." };
  }

  const liveMasterVersionId = await resolveMasterVersionId(planVersionId);
  const liveMaster = liveMasterVersionId
    ? await PlanVersion.findByPk(liveMasterVersionId, { transaction })
    : null;

  if (!liveMaster?.process_started_at || !liveMaster.active_execution_snapshot_id) {
    return {
      success: true,
      data: {
        draft_id: liveMasterVersionId || planVersionId,
        process_started: false,
        kpis: [],
        applied_revisions: [],
        comparison_mode: {
          original_label: "Original Target",
          current_label: "Current Target",
          note: "Process has not started; effective plan equals planning targets.",
        },
      },
    };
  }

  const snapshotRootId = liveMaster.active_execution_snapshot_id;
  const versionMap = await buildLiveToSnapshotVersionMap(snapshotRootId, transaction);

  let liveAnnualVersionId = null;
  if (version.version_kind === "annual" && !version.execution_snapshot_of_version_id) {
    liveAnnualVersionId = version.plan_version_id;
  } else if (version.version_kind === "execution_period") {
    liveAnnualVersionId =
      version.execution_snapshot_of_version_id
        ? (
            await PlanVersion.findByPk(version.execution_snapshot_of_version_id, {
              transaction,
            })
          )?.parent_plan_version_id
        : version.parent_plan_version_id;
  } else if (version.execution_snapshot_of_version_id) {
    const live = await PlanVersion.findByPk(version.execution_snapshot_of_version_id, {
      transaction,
    });
    if (live?.version_kind === "annual") liveAnnualVersionId = live.plan_version_id;
  }

  if (!liveAnnualVersionId) {
    // Fall back: first annual under master
    const annual = await PlanVersion.findOne({
      where: {
        parent_plan_version_id: liveMaster.plan_version_id,
        version_kind: "annual",
        execution_snapshot_of_version_id: { [Op.is]: null },
      },
      order: [["year", "ASC"]],
      transaction,
    });
    liveAnnualVersionId = annual?.plan_version_id ?? null;
  }

  if (!liveAnnualVersionId) {
    return {
      success: true,
      data: {
        draft_id: liveMaster.plan_version_id,
        process_started: true,
        kpis: [],
        applied_revisions: [],
      },
    };
  }

  const liveAnnualKpis = await PlanNode.findAll({
    where: {
      plan_version_id: liveAnnualVersionId,
      type: "kpi",
      is_active: true,
    },
    transaction,
  });

  const snapshotAnnualVersionId = versionMap.get(liveAnnualVersionId)?.plan_version_id;
  const kpis = [];

  for (const liveKpi of liveAnnualKpis) {
    const liveMasterKpiId = await resolveMasterKpiIdForAnnualKpi(liveKpi, transaction);
    if (!liveMasterKpiId || !snapshotAnnualVersionId) continue;

    const snapshotMasterKpi = await resolveSnapshotMasterKpiNode(
      snapshotRootId,
      liveMasterKpiId,
      transaction
    );
    if (!snapshotMasterKpi) continue;

    const snapshotAnnualKpi = await resolveSnapshotAnnualKpiNode(
      snapshotAnnualVersionId,
      snapshotMasterKpi.plan_node_id,
      transaction
    );
    if (!snapshotAnnualKpi) continue;

    const original = normalizeTargetValue(liveKpi.annual_target);
    const current = normalizeTargetValue(snapshotAnnualKpi.annual_target);
    const actual = normalizeTargetValue(snapshotAnnualKpi.annual_actual);
    const difference = Math.round((current - original) * 1000) / 1000;
    const performance =
      current > 0 ? Math.round((actual / current) * 1000) / 10 : null;

    const periodRows = [];
    const livePeriods = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: liveAnnualVersionId,
        version_kind: "execution_period",
        execution_snapshot_of_version_id: { [Op.is]: null },
      },
      order: [
        ["sequence_index", "ASC"],
        ["period_label", "ASC"],
      ],
      transaction,
    });

    for (const livePeriod of livePeriods) {
      const snapshotPeriod = versionMap.get(livePeriod.plan_version_id);
      if (!snapshotPeriod) continue;
      const periodNode = await PlanNode.findOne({
        where: {
          plan_version_id: snapshotPeriod.plan_version_id,
          source_plan_node_id: snapshotAnnualKpi.plan_node_id,
          type: "kpi",
          is_active: true,
        },
        transaction,
      });
      if (!periodNode) continue;

      const { resolveVersionExecutionAccess } = require("../planExecutionGateService");
      const { isFinalizedExecutionPeriod } = require("../../utils/planTargetReallocationValidationUtils");
      const access = await resolveVersionExecutionAccess(
        snapshotPeriod.plan_version_id,
        transaction
      );
      const executionStatus = access.access?.execution_status ?? null;

      periodRows.push({
        period_id: livePeriod.plan_version_id,
        period_label: livePeriod.period_label,
        sequence_index: livePeriod.sequence_index,
        current_target: normalizeTargetValue(periodNode.period_target),
        period_actual: normalizeTargetValue(periodNode.period_actual),
        execution_status: executionStatus,
        finalized: isFinalizedExecutionPeriod(executionStatus),
      });
    }

    kpis.push({
      kpi_id: liveKpi.plan_node_id,
      kpi_title: liveKpi.title,
      original_annual_target: original,
      current_annual_target: current,
      difference,
      actual,
      performance_percent: performance,
      revised: Math.abs(difference) > 0.001,
      unit: liveKpi.target_unit || null,
      periods: periodRows,
    });
  }

  const kpiFilter = rawQuery.kpiId || rawQuery.kpi_id || null;
  const filteredKpis = kpiFilter
    ? kpis.filter((row) => String(row.kpi_id) === String(kpiFilter))
    : kpis;

  const applied = await PlanAmendment.findAll({
    where: {
      master_plan_version_id: liveMaster.plan_version_id,
      status: AMENDMENT_STATUS.APPLIED,
    },
    include: [
      {
        model: PlanAmendmentAction,
        as: "actions",
        required: false,
        where: { action_type: AMENDMENT_TYPE.ANNUAL_TARGET_REVISION },
      },
    ],
    order: [["version", "ASC"]],
    transaction,
  });

  const appliedRevisions = [];
  for (const amendment of applied) {
    const actions = (amendment.actions || []).filter(
      (a) => a.action_type === AMENDMENT_TYPE.ANNUAL_TARGET_REVISION
    );
    if (!actions.length && amendment.amendment_type !== AMENDMENT_TYPE.ANNUAL_TARGET_REVISION) {
      continue;
    }
    const actionList = actions.length
      ? actions
      : [
          {
            metadata: amendment.metadata || {},
            action_type: amendment.amendment_type,
          },
        ];

    for (const action of actionList) {
      const meta = action.metadata || {};
      appliedRevisions.push({
        plan_amendment_id: amendment.plan_amendment_id,
        version: amendment.version,
        title: amendment.title,
        reason: amendment.reason ?? meta.reason ?? null,
        reason_code: meta.reasonCode ?? meta.reason_code ?? null,
        effective_date: amendment.effective_date,
        effective_mode: amendment.effective_mode,
        applied_at: amendment.applied_at,
        kpi_id: meta.kpiId ?? meta.kpi_id ?? null,
        revised_annual_target:
          meta.revisedAnnualTarget ?? meta.revised_annual_target ?? null,
        redistribution_mode:
          meta.redistributionMode ?? meta.redistribution_mode ?? null,
      });
    }
  }

  return {
    success: true,
    data: {
      draft_id: liveMaster.plan_version_id,
      annual_version_id: liveAnnualVersionId,
      process_started: true,
      current_amendment_version: await PlanAmendment.max("version", {
        where: {
          master_plan_version_id: liveMaster.plan_version_id,
          version: { [Op.ne]: null },
        },
        transaction,
      }),
      kpis: filteredKpis,
      applied_revisions: appliedRevisions,
      comparison_mode: {
        original_label: "Original Target",
        current_label: "Current Target",
        actual_label: "Actual",
        revision_label: "Revision",
        performance_label: "Performance",
        note: "Performance uses the current effective annual target.",
      },
    },
  };
}

module.exports = {
  getAnnualTargetRevisionReporting,
};
