"use strict";

const { PlanVersion } = require("../models");
const {
  getActiveExecutionSnapshotId,
  buildLiveToSnapshotVersionMap,
  isExecutionSnapshotVersion,
} = require("./planExecutionSnapshotService");

function executionAccessFromStatus(executionStatus) {
  if (executionStatus === "open") {
    return {
      execution_status: "open",
      can_view: true,
      can_edit_actuals: true,
      can_complete: true,
      is_locked: false,
    };
  }

  if (executionStatus === "completed") {
    return {
      execution_status: "completed",
      can_view: true,
      can_edit_actuals: false,
      can_complete: false,
      is_locked: false,
    };
  }

  return {
    execution_status: "locked",
    can_view: true,
    can_edit_actuals: false,
    can_complete: false,
    is_locked: true,
  };
}

async function lockLivePlanningVersions(liveMasterVersionId, transaction) {
  const annualVersions = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: liveMasterVersionId,
      version_kind: "annual",
      execution_snapshot_of_version_id: null,
    },
    transaction,
  });

  for (const annual of annualVersions) {
    await annual.update({ is_locked: true, status: "locked" }, { transaction });

    const periods = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: annual.plan_version_id,
        version_kind: "execution_period",
        execution_snapshot_of_version_id: null,
      },
      transaction,
    });

    for (const period of periods) {
      await period.update({ is_locked: true, status: "locked" }, { transaction });
    }
  }
}

/**
 * After execution snapshot is created:
 * - Year 1 annual = open; later years = locked
 * - Within the open annual: Q1 = open; Q2+ = locked
 */
async function initializeExecutionGate(snapshotRootId, transaction) {
  const snapshotAnnuals = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: snapshotRootId,
      version_kind: "annual",
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  let activeAnnualAssigned = false;

  for (const annual of snapshotAnnuals) {
    const periods = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: annual.plan_version_id,
        version_kind: "execution_period",
      },
      order: [["sequence_index", "ASC"]],
      transaction,
    });

    if (!activeAnnualAssigned) {
      await annual.update(
        {
          execution_status: "open",
          is_locked: false,
          status: "active",
        },
        { transaction }
      );

      for (let index = 0; index < periods.length; index += 1) {
        const period = periods[index];
        if (index === 0) {
          await period.update(
            {
              execution_status: "open",
              is_locked: false,
              status: "active",
            },
            { transaction }
          );
        } else {
          await period.update(
            {
              execution_status: "locked",
              is_locked: true,
              status: "locked",
            },
            { transaction }
          );
        }
      }

      activeAnnualAssigned = true;
      continue;
    }

    await annual.update(
      {
        execution_status: "locked",
        is_locked: true,
        status: "locked",
      },
      { transaction }
    );

    for (const period of periods) {
      await period.update(
        {
          execution_status: "locked",
          is_locked: true,
          status: "locked",
        },
        { transaction }
      );
    }
  }
}

async function resolveVersionExecutionAccess(planVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!version) {
    return { found: false, access: null };
  }

  if (isExecutionSnapshotVersion(version)) {
    return {
      found: true,
      is_execution_snapshot: true,
      live_plan_version_id: version.execution_snapshot_of_version_id,
      snapshot_plan_version_id: version.plan_version_id,
      access: executionAccessFromStatus(version.execution_status),
    };
  }

  let master = null;
  if (version.version_kind === "master") {
    master = version;
  } else if (version.version_kind === "annual") {
    master = await PlanVersion.findByPk(version.parent_plan_version_id, { transaction });
  } else if (version.version_kind === "execution_period") {
    const annual = await PlanVersion.findByPk(version.parent_plan_version_id, { transaction });
    master = annual
      ? await PlanVersion.findByPk(annual.parent_plan_version_id, { transaction })
      : null;
  }

  if (!master?.process_started_at) {
    return {
      found: true,
      is_execution_snapshot: false,
      live_plan_version_id: version.plan_version_id,
      snapshot_plan_version_id: null,
      access: {
        execution_status: null,
        can_view: true,
        can_edit_actuals: false,
        can_complete: false,
        is_locked: Boolean(version.is_locked),
        planning_mode: true,
      },
    };
  }

  const snapshotRootId = master.active_execution_snapshot_id;
  if (!snapshotRootId) {
    return {
      found: true,
      is_execution_snapshot: false,
      live_plan_version_id: version.plan_version_id,
      snapshot_plan_version_id: null,
      access: {
        execution_status: "locked",
        can_view: true,
        can_edit_actuals: false,
        can_complete: false,
        is_locked: true,
        planning_mode: false,
      },
    };
  }

  const versionMap = await buildLiveToSnapshotVersionMap(snapshotRootId, transaction);
  const snapshotVersion = versionMap.get(version.plan_version_id);

  if (!snapshotVersion) {
    return {
      found: true,
      is_execution_snapshot: false,
      live_plan_version_id: version.plan_version_id,
      snapshot_plan_version_id: null,
      access: {
        execution_status: "locked",
        can_view: true,
        can_edit_actuals: false,
        can_complete: false,
        is_locked: true,
        planning_mode: false,
      },
    };
  }

  return {
    found: true,
    is_execution_snapshot: false,
    live_plan_version_id: version.plan_version_id,
    snapshot_plan_version_id: snapshotVersion.plan_version_id,
    access: executionAccessFromStatus(snapshotVersion.execution_status),
  };
}

function attachExecutionOverlay(liveVersion, snapshotVersion) {
  if (!liveVersion) {
    return {
      execution_snapshot_plan_version_id: null,
      execution_status: null,
      execution_access: null,
    };
  }

  if (!snapshotVersion) {
    return {
      execution_snapshot_plan_version_id: null,
      execution_status: null,
      execution_access: null,
    };
  }

  const access = executionAccessFromStatus(snapshotVersion.execution_status);
  return {
    execution_snapshot_plan_version_id: snapshotVersion.plan_version_id,
    execution_status: snapshotVersion.execution_status,
    execution_access: access,
    is_locked: access.is_locked,
  };
}

function enrichSnapshotVersionExecutionFields(version) {
  const plain = version?.toJSON ? version.toJSON() : { ...version };
  if (!plain?.execution_snapshot_of_version_id) {
    return plain;
  }
  return {
    ...plain,
    ...attachExecutionOverlay(plain, plain),
  };
}

async function applyExecutionProgressFields(version, snapshotVersionId, transaction = null) {
  if (!version || !snapshotVersionId) {
    return version;
  }

  const {
    computePeriodExecutionProgress,
    computeAnnualExecutionProgress,
    computeMasterExecutionProgress,
  } = require("./planExecutionRollupService");

  if (version.version_kind === "master") {
    const liveMasterId = version.execution_snapshot_of_version_id
      ? version.execution_snapshot_of_version_id
      : version.plan_version_id;
    const progress = await computeMasterExecutionProgress(liveMasterId, transaction);
    return {
      ...version,
      execution_progress_percent: progress.execution_progress_percent,
      execution_annual_progress: progress.execution_annual_progress,
      execution_has_contributing_progress: progress.has_contributing_data,
      execution_has_recorded_actuals: progress.has_contributing_data,
      active_planning_year: progress.active_planning_year,
      active_annual_plan_version_id: progress.active_annual_plan_version_id,
    };
  }

  if (version.version_kind === "execution_period") {
    const progress = await computePeriodExecutionProgress(snapshotVersionId, transaction);
    return {
      ...version,
      execution_progress_percent: progress.execution_progress_percent,
      computed_period_actual: progress.computed_period_actual,
      computed_period_target: progress.computed_period_target,
      execution_has_contributing_progress: progress.has_contributing_data,
      execution_has_recorded_actuals: progress.has_contributing_data,
    };
  }

  if (version.version_kind === "annual") {
    const annualProgress = await computeAnnualExecutionProgress(snapshotVersionId, transaction);
    return {
      ...version,
      execution_progress_percent: annualProgress.execution_progress_percent,
      execution_period_progress: annualProgress.execution_period_progress,
      execution_has_contributing_progress: annualProgress.has_contributing_data,
      execution_has_recorded_actuals: annualProgress.has_contributing_data,
    };
  }

  return version;
}

async function attachLiveExecutionOverlay(version, transaction = null) {
  const plain = version?.toJSON ? version.toJSON() : { ...version };
  if (!plain) {
    return version;
  }

  if (plain.execution_snapshot_of_version_id) {
    return enrichSnapshotVersionExecutionFields(plain);
  }

  const liveMaster = await resolveLiveMasterFromVersion(plain, transaction);
  const withMasterContext = {
    ...plain,
    process_started_at: liveMaster?.process_started_at ?? plain.process_started_at ?? null,
    active_execution_snapshot_id:
      liveMaster?.active_execution_snapshot_id ?? plain.active_execution_snapshot_id ?? null,
  };

  if (!liveMaster?.active_execution_snapshot_id) {
    return withMasterContext;
  }

  const versionMap = await buildLiveToSnapshotVersionMap(
    liveMaster.active_execution_snapshot_id,
    transaction
  );
  const snapshotVersion = versionMap.get(plain.plan_version_id) ?? null;

  let enriched = {
    ...withMasterContext,
    ...attachExecutionOverlay(plain, snapshotVersion),
  };

  if (plain.version_kind === "annual" && snapshotVersion) {
    const { computeAnnualPeriodsCompletion } = require("./planExecutionActualService");
    const periodMeta = await computeAnnualPeriodsCompletion(
      snapshotVersion.plan_version_id,
      transaction
    );
    enriched = { ...enriched, ...periodMeta };
  }

  if (snapshotVersion) {
    enriched = await applyExecutionProgressFields(
      enriched,
      snapshotVersion.plan_version_id,
      transaction
    );
  }

  return enriched;
}

async function enrichMasterVersionsWithExecutionProgress(versions, transaction = null) {
  const { computeMasterExecutionProgress } = require("./planExecutionRollupService");
  const enriched = [];

  for (const version of versions) {
    const plain =
      typeof version.get === "function" ? version.get({ plain: true }) : { ...version };

    if (plain.version_kind !== "master" || !plain.process_started_at) {
      enriched.push(plain);
      continue;
    }

    const progress = await computeMasterExecutionProgress(plain.plan_version_id, transaction);
    enriched.push({
      ...plain,
      execution_progress_percent: progress.execution_progress_percent,
      execution_annual_progress: progress.execution_annual_progress,
      execution_has_contributing_progress: progress.has_contributing_data,
      execution_has_recorded_actuals: progress.has_contributing_data,
      active_planning_year: progress.active_planning_year,
      active_annual_plan_version_id: progress.active_annual_plan_version_id,
    });
  }

  return enriched;
}

async function attachExecutionSnapshotContext(version, transaction = null) {
  if (!version) return version;

  const plain = version.toJSON ? version.toJSON() : { ...version };
  const { resolveMasterVersionId } = require("./planReviewVisibilityService");
  const liveMasterId = await resolveMasterVersionId(plain.plan_version_id);

  let enriched = await attachLiveExecutionOverlay(plain, transaction);
  enriched = {
    ...enriched,
    live_master_version_id: liveMasterId ?? enriched.live_master_version_id ?? null,
  };

  if (enriched.execution_snapshot_of_version_id) {
    enriched = await applyExecutionProgressFields(
      enriched,
      enriched.plan_version_id,
      transaction
    );
  }

  return enriched;
}

async function resolveLiveMasterFromVersion(version, transaction = null) {
  if (!version) return null;
  if (version.version_kind === "master") {
    if (version.execution_snapshot_of_version_id) {
      return PlanVersion.findByPk(version.execution_snapshot_of_version_id, { transaction });
    }
    return version;
  }

  const parentId = version.parent_plan_version_id;
  if (!parentId) return null;

  const parent = await PlanVersion.findByPk(parentId, { transaction });
  return resolveLiveMasterFromVersion(parent, transaction);
}

async function annualHasRecordedActuals(annualVersionId, transaction = null) {
  if (!annualVersionId) return false;
  const { computePeriodActualsReadiness } = require("./planExecutionActualService");
  const periods = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: annualVersionId,
      version_kind: "execution_period",
    },
    transaction,
  });
  for (const period of periods) {
    const readiness = await computePeriodActualsReadiness(period.plan_version_id, transaction);
    if (readiness.recorded_count > 0) {
      return true;
    }
  }
  return false;
}

async function enrichExecutionPeriodsWithExecution(liveAnnual, livePeriods, transaction = null) {
  const annualPlain = liveAnnual?.toJSON ? liveAnnual.toJSON() : { ...liveAnnual };
  const { computePeriodActualsReadiness, computeAnnualPeriodsCompletion } = require(
    "./planExecutionActualService"
  );
  const {
    computePeriodExecutionProgress,
    computeAnnualExecutionProgress,
  } = require("./planExecutionRollupService");

  async function enrichPeriodRow(periodRow, snapshotPeriodId) {
    const readiness = await computePeriodActualsReadiness(snapshotPeriodId, transaction);
    const progress = await computePeriodExecutionProgress(snapshotPeriodId, transaction);
    return {
      ...periodRow,
      execution_actuals_ready: readiness.ready,
      execution_actuals_readiness: readiness,
      execution_has_recorded_actuals: readiness.recorded_count > 0,
      execution_has_contributing_progress: progress.has_contributing_data,
      execution_progress_percent: progress.execution_progress_percent,
      computed_period_actual: progress.computed_period_actual,
      computed_period_target: progress.computed_period_target,
    };
  }

  if (annualPlain?.execution_snapshot_of_version_id) {
    const enrichedPeriods = [];
    for (const period of livePeriods) {
      const plain = enrichSnapshotVersionExecutionFields(period);
      enrichedPeriods.push(await enrichPeriodRow(plain, plain.plan_version_id));
    }

    const periodMeta = await computeAnnualPeriodsCompletion(liveAnnual.plan_version_id, transaction);
    const annualProgress = await computeAnnualExecutionProgress(
      liveAnnual.plan_version_id,
      transaction
    );
    const annualHasActuals = await annualHasRecordedActuals(liveAnnual.plan_version_id, transaction);

    return {
      annual: {
        ...enrichSnapshotVersionExecutionFields(liveAnnual),
        ...periodMeta,
        execution_has_recorded_actuals: annualHasActuals,
        execution_has_contributing_progress: annualProgress.has_contributing_data,
        execution_progress_percent: annualProgress.execution_progress_percent,
        execution_period_progress: annualProgress.execution_period_progress,
      },
      executionPeriods: enrichedPeriods,
      executionSnapshot: annualPlain.execution_snapshot_root_id
        ? {
            snapshot_root_id: annualPlain.execution_snapshot_root_id,
            execution_version_number: null,
          }
        : null,
    };
  }

  const master = await resolveLiveMasterFromVersion(liveAnnual, transaction);

  if (!master?.active_execution_snapshot_id) {
    return {
      annual: annualPlain,
      executionPeriods: livePeriods.map((period) =>
        period.toJSON ? period.toJSON() : { ...period }
      ),
      executionSnapshot: null,
    };
  }

  const versionMap = await buildLiveToSnapshotVersionMap(
    master.active_execution_snapshot_id,
    transaction
  );

  const snapshotAnnual = versionMap.get(annualPlain.plan_version_id);
  const enrichedPeriods = [];

  for (const period of livePeriods) {
    const plain = period.toJSON ? period.toJSON() : { ...period };
    const snapshotPeriod = versionMap.get(plain.plan_version_id);
    const periodRow = {
      ...plain,
      ...attachExecutionOverlay(plain, snapshotPeriod),
    };
    if (snapshotPeriod) {
      enrichedPeriods.push(await enrichPeriodRow(periodRow, snapshotPeriod.plan_version_id));
    } else {
      enrichedPeriods.push(periodRow);
    }
  }

  const snapshotMaster = versionMap.get(master.plan_version_id);
  const periodMeta = snapshotAnnual
    ? await computeAnnualPeriodsCompletion(snapshotAnnual.plan_version_id, transaction)
    : {
        execution_periods_total: 0,
        execution_periods_completed: 0,
        all_execution_periods_completed: false,
      };
  const annualProgress = snapshotAnnual
    ? await computeAnnualExecutionProgress(snapshotAnnual.plan_version_id, transaction)
    : {
        execution_progress_percent: null,
        execution_period_progress: [],
        has_contributing_data: false,
      };
  const annualHasActuals = snapshotAnnual
    ? await annualHasRecordedActuals(snapshotAnnual.plan_version_id, transaction)
    : false;

  return {
    annual: {
      ...annualPlain,
      ...attachExecutionOverlay(annualPlain, snapshotAnnual),
      ...periodMeta,
      execution_has_recorded_actuals: annualHasActuals,
      execution_has_contributing_progress: annualProgress.has_contributing_data,
      execution_progress_percent: annualProgress.execution_progress_percent,
      execution_period_progress: annualProgress.execution_period_progress,
    },
    executionPeriods: enrichedPeriods,
    executionSnapshot: snapshotMaster
      ? {
          snapshot_root_id: master.active_execution_snapshot_id,
          execution_version_number: snapshotMaster.execution_version_number,
        }
      : null,
  };
}

async function enrichAnnualVersionsWithExecution(liveMaster, liveAnnualVersions, transaction = null) {
  if (!liveMaster?.active_execution_snapshot_id) {
    return {
      executionSnapshot: null,
      annualVersions: liveAnnualVersions.map((annual) => {
        const plain = annual.toJSON ? annual.toJSON() : { ...annual };
        return plain;
      }),
    };
  }

  const versionMap = await buildLiveToSnapshotVersionMap(
    liveMaster.active_execution_snapshot_id,
    transaction
  );

  const snapshotMaster = versionMap.get(liveMaster.plan_version_id);
  const { computeAnnualPeriodsCompletion } = require("./planExecutionActualService");
  const { computeAnnualExecutionProgress } = require("./planExecutionRollupService");
  const enrichedAnnuals = [];

  for (const annual of liveAnnualVersions) {
    const plain = annual.toJSON ? annual.toJSON() : { ...annual };
    const snapshotAnnual = versionMap.get(plain.plan_version_id);
    const periodMeta = snapshotAnnual
      ? await computeAnnualPeriodsCompletion(snapshotAnnual.plan_version_id, transaction)
      : {
          execution_periods_total: 0,
          execution_periods_completed: 0,
          all_execution_periods_completed: false,
        };
    const annualProgress = snapshotAnnual
      ? await computeAnnualExecutionProgress(snapshotAnnual.plan_version_id, transaction)
      : {
          execution_progress_percent: null,
          execution_period_progress: [],
          has_contributing_data: false,
        };
    const annualHasActuals = snapshotAnnual
      ? await annualHasRecordedActuals(snapshotAnnual.plan_version_id, transaction)
      : false;

    enrichedAnnuals.push({
      ...plain,
      ...attachExecutionOverlay(plain, snapshotAnnual),
      ...periodMeta,
      execution_has_recorded_actuals: annualHasActuals,
      execution_has_contributing_progress: annualProgress.has_contributing_data,
      execution_progress_percent: annualProgress.execution_progress_percent,
      execution_period_progress: annualProgress.execution_period_progress,
    });
  }

  return {
    executionSnapshot: snapshotMaster
      ? {
          snapshot_root_id: liveMaster.active_execution_snapshot_id,
          execution_version_number: snapshotMaster.execution_version_number,
          snapshot_master_plan_version_id: snapshotMaster.plan_version_id,
        }
      : null,
    annualVersions: enrichedAnnuals,
  };
}

async function advanceExecutionGateAfterPeriodComplete(completedPeriodId, transaction) {
  const completedPeriod = await PlanVersion.findByPk(completedPeriodId, { transaction });
  if (!completedPeriod || !isExecutionSnapshotVersion(completedPeriod)) {
    return null;
  }

  await completedPeriod.update(
    {
      execution_status: "completed",
      status: "completed",
      is_locked: false,
    },
    { transaction }
  );

  const snapshotAnnual = await PlanVersion.findByPk(completedPeriod.parent_plan_version_id, {
    transaction,
  });
  if (!snapshotAnnual) return null;

  const periods = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: snapshotAnnual.plan_version_id,
      version_kind: "execution_period",
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  const currentIndex = periods.findIndex(
    (period) => period.plan_version_id === completedPeriod.plan_version_id
  );
  const nextPeriod = currentIndex >= 0 ? periods[currentIndex + 1] : null;

  if (nextPeriod) {
    await nextPeriod.update(
      {
        execution_status: "open",
        status: "active",
        is_locked: false,
      },
      { transaction }
    );
    return nextPeriod;
  }

  return null;
}

async function advanceExecutionGateAfterAnnualComplete(completedAnnualId, transaction) {
  const completedAnnual = await PlanVersion.findByPk(completedAnnualId, { transaction });
  if (!completedAnnual || !isExecutionSnapshotVersion(completedAnnual)) {
    return null;
  }

  await completedAnnual.update(
    {
      execution_status: "completed",
      status: "completed",
      is_locked: false,
    },
    { transaction }
  );

  const snapshotMaster = await PlanVersion.findByPk(completedAnnual.parent_plan_version_id, {
    transaction,
  });
  if (!snapshotMaster) return null;

  const annuals = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: snapshotMaster.plan_version_id,
      version_kind: "annual",
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  const currentIndex = annuals.findIndex(
    (annual) => annual.plan_version_id === completedAnnual.plan_version_id
  );
  const nextAnnual = currentIndex >= 0 ? annuals[currentIndex + 1] : null;

  if (!nextAnnual) return null;

  const nextPeriods = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: nextAnnual.plan_version_id,
      version_kind: "execution_period",
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  await nextAnnual.update(
    {
      execution_status: "open",
      status: "active",
      is_locked: false,
    },
    { transaction }
  );

  for (let index = 0; index < nextPeriods.length; index += 1) {
    const period = nextPeriods[index];
    if (index === 0) {
      await period.update(
        {
          execution_status: "open",
          status: "active",
          is_locked: false,
        },
        { transaction }
      );
    } else {
      await period.update(
        {
          execution_status: "locked",
          status: "locked",
          is_locked: true,
        },
        { transaction }
      );
    }
  }

  return nextAnnual;
}

/**
 * When process is active, live execution-period URLs should load snapshot nodes
 * (where period_actual is recorded) for hierarchy and rollup.
 */
async function resolveExecutionHierarchyVersionId(planVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!version || version.version_kind !== "execution_period") {
    return planVersionId;
  }

  if (version.execution_snapshot_of_version_id) {
    return planVersionId;
  }

  const master = await resolveLiveMasterFromVersion(version, transaction);
  if (!master?.active_execution_snapshot_id) {
    return planVersionId;
  }

  const versionMap = await buildLiveToSnapshotVersionMap(
    master.active_execution_snapshot_id,
    transaction
  );
  const snapshotPeriod = versionMap.get(planVersionId);
  return snapshotPeriod?.plan_version_id ?? planVersionId;
}

module.exports = {
  lockLivePlanningVersions,
  initializeExecutionGate,
  resolveVersionExecutionAccess,
  enrichMasterVersionsWithExecutionProgress,
  enrichAnnualVersionsWithExecution,
  enrichExecutionPeriodsWithExecution,
  executionAccessFromStatus,
  getActiveExecutionSnapshotId,
  advanceExecutionGateAfterPeriodComplete,
  advanceExecutionGateAfterAnnualComplete,
  attachExecutionSnapshotContext,
  enrichSnapshotVersionExecutionFields,
  attachLiveExecutionOverlay,
  resolveExecutionHierarchyVersionId,
};
