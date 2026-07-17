"use strict";

const { Op } = require("sequelize");
const {
  PlanVersion,
  PlanAmendment,
  PlanAmendmentAction,
  PlanExecutionWindowOverride,
} = require("../../models");
const { resolveMasterVersionId } = require("../planReviewVisibilityService");
const { buildLiveToSnapshotVersionMap } = require("../planExecutionSnapshotService");
const { resolveVersionExecutionAccess } = require("../planExecutionGateService");
const { isFinalizedExecutionPeriod } = require("../../utils/planTargetReallocationValidationUtils");
const { AMENDMENT_TYPE } = require("../../utils/planAmendmentTypes");
const { AMENDMENT_STATUS } = require("../../utils/planAmendmentWorkflowUtils");
const {
  findActiveOverrideForSnapshotPeriod,
  OVERRIDE_STATUS,
} = require("./executionWindowReopeningDomain");

/**
 * Reporting: execution periods with status, active overrides, and applied reopenings.
 */
async function getExecutionWindowReopeningReporting(planVersionId, transaction = null) {
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
        periods: [],
        applied_reopenings: [],
      },
    };
  }

  let liveAnnualVersionId = null;
  if (version.version_kind === "annual" && !version.execution_snapshot_of_version_id) {
    liveAnnualVersionId = version.plan_version_id;
  } else if (version.version_kind === "execution_period") {
    liveAnnualVersionId = version.execution_snapshot_of_version_id
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
        periods: [],
        applied_reopenings: [],
      },
    };
  }

  const versionMap = await buildLiveToSnapshotVersionMap(
    liveMaster.active_execution_snapshot_id,
    transaction
  );

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

  const periods = [];
  for (const livePeriod of livePeriods) {
    const snapshotPeriod = versionMap.get(livePeriod.plan_version_id);
    if (!snapshotPeriod) continue;

    const access = await resolveVersionExecutionAccess(
      snapshotPeriod.plan_version_id,
      transaction
    );
    const executionStatus = access.access?.execution_status ?? null;
    const activeOverride = await findActiveOverrideForSnapshotPeriod(
      snapshotPeriod.plan_version_id,
      transaction
    );

    periods.push({
      period_id: livePeriod.plan_version_id,
      snapshot_period_id: snapshotPeriod.plan_version_id,
      period_label: livePeriod.period_label,
      sequence_index: livePeriod.sequence_index,
      execution_status: executionStatus,
      finalized: isFinalizedExecutionPeriod(executionStatus),
      can_edit_actuals: Boolean(access.access?.can_edit_actuals),
      execution_reopening: Boolean(access.access?.execution_reopening),
      active_override: activeOverride
        ? {
            plan_execution_window_override_id:
              activeOverride.plan_execution_window_override_id,
            plan_amendment_id: activeOverride.plan_amendment_id,
            reopen_start: activeOverride.reopen_start,
            reopen_end: activeOverride.reopen_end,
            status: activeOverride.status,
          }
        : null,
    });
  }

  const appliedAmendments = await PlanAmendment.findAll({
    where: {
      master_plan_version_id: liveMaster.plan_version_id,
      status: AMENDMENT_STATUS.APPLIED,
    },
    include: [
      {
        model: PlanAmendmentAction,
        as: "actions",
        required: false,
        where: { action_type: AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING },
      },
    ],
    order: [["version", "ASC"]],
    transaction,
  });

  const appliedReopenings = [];
  for (const amendment of appliedAmendments) {
    const actions = (amendment.actions || []).filter(
      (a) => a.action_type === AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING
    );
    if (
      !actions.length &&
      amendment.amendment_type !== AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING
    ) {
      continue;
    }

    const actionList = actions.length
      ? actions
      : [{ metadata: amendment.metadata || {}, action_type: amendment.amendment_type }];

    const overrides = await PlanExecutionWindowOverride.findAll({
      where: { plan_amendment_id: amendment.plan_amendment_id },
      transaction,
    });

    for (const action of actionList) {
      const meta = action.metadata || {};
      appliedReopenings.push({
        plan_amendment_id: amendment.plan_amendment_id,
        version: amendment.version,
        title: amendment.title,
        reason: amendment.reason ?? meta.reason ?? null,
        reason_code: meta.reasonCode ?? meta.reason_code ?? null,
        applied_at: amendment.applied_at,
        reopen_start: meta.reopenStart ?? meta.reopen_start ?? null,
        reopen_end: meta.reopenEnd ?? meta.reopen_end ?? null,
        period_ids:
          meta.periodVersionIds ??
          meta.period_version_ids ??
          (meta.periodVersionId ? [meta.periodVersionId] : []),
        overrides: overrides.map((row) => ({
          plan_execution_window_override_id: row.plan_execution_window_override_id,
          live_period_version_id: row.live_period_version_id,
          snapshot_period_version_id: row.snapshot_period_version_id,
          status: row.status,
          reopen_start: row.reopen_start,
          reopen_end: row.reopen_end,
          expired_at: row.expired_at,
        })),
      });
    }
  }

  return {
    success: true,
    data: {
      draft_id: liveMaster.plan_version_id,
      annual_version_id: liveAnnualVersionId,
      process_started: true,
      periods,
      applied_reopenings: appliedReopenings,
      override_statuses: Object.values(OVERRIDE_STATUS),
    },
  };
}

module.exports = {
  getExecutionWindowReopeningReporting,
};
