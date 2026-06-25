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

  const snapshot = snapshotVersion ?? liveVersion;
  const access = executionAccessFromStatus(snapshot.execution_status);
  return {
    execution_snapshot_plan_version_id: snapshot.plan_version_id,
    execution_status: snapshot.execution_status,
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

async function attachExecutionSnapshotContext(version, transaction = null) {
  if (!version) return version;

  const plain = version.toJSON ? version.toJSON() : { ...version };
  const { resolveMasterVersionId } = require("./planReviewVisibilityService");
  const liveMasterId = await resolveMasterVersionId(plain.plan_version_id);

  const withLiveMaster = {
    ...plain,
    live_master_version_id: liveMasterId ?? plain.live_master_version_id ?? null,
  };

  if (!plain.execution_snapshot_of_version_id && !plain.execution_snapshot_root_id) {
    return withLiveMaster;
  }

  return enrichSnapshotVersionExecutionFields(withLiveMaster);
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

async function enrichExecutionPeriodsWithExecution(liveAnnual, livePeriods, transaction = null) {
  const annualPlain = liveAnnual?.toJSON ? liveAnnual.toJSON() : { ...liveAnnual };

  if (annualPlain?.execution_snapshot_of_version_id) {
    const enrichedPeriods = livePeriods.map((period) =>
      enrichSnapshotVersionExecutionFields(period)
    );
    return {
      annual: enrichSnapshotVersionExecutionFields(liveAnnual),
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

  const enrichedPeriods = livePeriods.map((period) => {
    const plain = period.toJSON ? period.toJSON() : { ...period };
    const snapshotPeriod = versionMap.get(plain.plan_version_id);
    return {
      ...plain,
      ...attachExecutionOverlay(plain, snapshotPeriod),
    };
  });

  const snapshotMaster = versionMap.get(master.plan_version_id);

  return {
    annual: {
      ...annualPlain,
      ...attachExecutionOverlay(annualPlain, snapshotAnnual),
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
  const enrichedAnnuals = liveAnnualVersions.map((annual) => {
    const plain = annual.toJSON ? annual.toJSON() : { ...annual };
    const snapshotAnnual = versionMap.get(plain.plan_version_id);
    return {
      ...plain,
      ...attachExecutionOverlay(plain, snapshotAnnual),
    };
  });

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

module.exports = {
  lockLivePlanningVersions,
  initializeExecutionGate,
  resolveVersionExecutionAccess,
  enrichAnnualVersionsWithExecution,
  enrichExecutionPeriodsWithExecution,
  executionAccessFromStatus,
  getActiveExecutionSnapshotId,
  advanceExecutionGateAfterPeriodComplete,
  advanceExecutionGateAfterAnnualComplete,
  attachExecutionSnapshotContext,
  enrichSnapshotVersionExecutionFields,
};
