"use strict";

/**
 * Execution Window Reopening — time-bounded overrides so closed periods
 * can accept actual edits without changing execution_status on PlanVersion.
 */

const { Op } = require("sequelize");
const { PlanVersion, PlanExecutionWindowOverride } = require("../../models");
const { buildLiveToSnapshotVersionMap } = require("../planExecutionSnapshotService");
const { AMENDMENT_TYPE } = require("../../utils/planAmendmentTypes");
const {
  mergeAmendmentPolicy,
  DEFAULT_AMENDMENT_POLICY,
} = require("../../utils/planAmendmentActionUtils");
const { loadRuleForPlanVersion } = require("./planAmendmentRuleUtils");

const EXECUTION_WINDOW_REOPENING_MESSAGES = Object.freeze({
  REASON_REQUIRED: "Reason is required.",
  PERIODS_REQUIRED: "At least one execution period is required.",
  PERIOD_NOT_FOUND: "Execution period was not found.",
  INVALID_PERIOD: "Each period must be a live execution period under an annual plan.",
  PROCESS_NOT_STARTED: "Execution window reopening is only available after execution has started.",
  PERIOD_NOT_CLOSED: "Period is not closed.",
  INVALID_START_DATE: "Reopen start date is invalid.",
  INVALID_END_DATE: "Reopen end date is invalid.",
  END_BEFORE_START: "Reopen end must be after reopen start.",
  DURATION_EXCEEDED: "Reopen duration exceeds the maximum allowed by plan policy.",
  POLICY_DISABLED: "Execution window reopening is not allowed by plan amendment policy.",
  ACTIVE_OVERRIDE_EXISTS: "An active execution window override already exists for this period.",
  ANNUAL_REQUIRED: "Annual plan version context could not be resolved.",
});

const EXECUTION_WINDOW_REOPENING_REASONS = Object.freeze([
  { code: "late_procurement", label: "Late Procurement" },
  { code: "internet_outage", label: "Internet Outage" },
  { code: "natural_disaster", label: "Natural Disaster" },
  { code: "government_instruction", label: "Government Instruction" },
  { code: "missing_documents", label: "Missing Documents" },
  { code: "delayed_field_activities", label: "Delayed Field Activities" },
  { code: "system_outage", label: "System Outage" },
  { code: "other", label: "Other" },
]);

const OVERRIDE_STATUS = Object.freeze({
  ACTIVE: "active",
  EXPIRED: "expired",
  REVOKED: "revoked",
});

function parseDate(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function durationDaysInclusive(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function normalizeExecutionWindowReopeningMetadata(metadata = {}) {
  const source = metadata && typeof metadata === "object" ? metadata : {};

  const periodIdsRaw =
    source.periodVersionIds ??
    source.period_version_ids ??
    source.periodIds ??
    source.period_ids ??
    null;

  let periodVersionIds = [];
  if (Array.isArray(periodIdsRaw)) {
    periodVersionIds = periodIdsRaw.filter(Boolean).map(String);
  } else if (source.periodVersionId ?? source.period_version_id ?? source.periodId) {
    periodVersionIds = [
      String(
        source.periodVersionId ?? source.period_version_id ?? source.periodId
      ),
    ];
  }

  return {
    annualVersionId:
      source.annualVersionId ?? source.annual_version_id ?? null,
    periodVersionIds,
    reopenStart: source.reopenStart ?? source.reopen_start ?? null,
    reopenEnd: source.reopenEnd ?? source.reopen_end ?? null,
    reason:
      source.reason != null && String(source.reason).trim()
        ? String(source.reason).trim()
        : "",
    reasonCode:
      source.reasonCode ?? source.reason_code ?? source.reasonKey ?? null,
    kpiPlanNodeId: source.kpiPlanNodeId ?? source.kpi_plan_node_id ?? null,
    goalPlanNodeId: source.goalPlanNodeId ?? source.goal_plan_node_id ?? null,
    governmentStructureId:
      source.governmentStructureId ?? source.government_structure_id ?? null,
    description:
      source.description != null && String(source.description).trim()
        ? String(source.description).trim()
        : null,
  };
}

function validateDateWindow(metadata, policy) {
  const reopenStart = parseDate(metadata.reopenStart);
  const reopenEnd = parseDate(metadata.reopenEnd);

  if (!reopenStart) {
    return { valid: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.INVALID_START_DATE };
  }
  if (!reopenEnd) {
    return { valid: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.INVALID_END_DATE };
  }
  if (reopenEnd.getTime() <= reopenStart.getTime()) {
    return {
      valid: false,
      message: EXECUTION_WINDOW_REOPENING_MESSAGES.END_BEFORE_START,
    };
  }

  const maxDays =
    policy?.max_reopen_duration_days ?? DEFAULT_AMENDMENT_POLICY.max_reopen_duration_days;
  const days = durationDaysInclusive(reopenStart, reopenEnd);
  if (days > maxDays) {
    return {
      valid: false,
      message: EXECUTION_WINDOW_REOPENING_MESSAGES.DURATION_EXCEEDED,
      details: { duration_days: days, max_reopen_duration_days: maxDays },
    };
  }

  return { valid: true, reopenStart, reopenEnd, durationDays: days };
}

async function resolveLiveMasterForPeriod(livePeriod, transaction = null) {
  if (!livePeriod || livePeriod.version_kind !== "execution_period") {
    return null;
  }
  if (livePeriod.execution_snapshot_of_version_id) {
    return null;
  }

  const annual = await PlanVersion.findByPk(livePeriod.parent_plan_version_id, {
    transaction,
  });
  if (!annual?.parent_plan_version_id) return null;

  return PlanVersion.findByPk(annual.parent_plan_version_id, { transaction });
}

async function findActiveOverrideForSnapshotPeriod(
  snapshotPeriodVersionId,
  transaction = null,
  { lazyExpire = true } = {}
) {
  if (!snapshotPeriodVersionId) return null;

  const now = new Date();
  const override = await PlanExecutionWindowOverride.findOne({
    where: {
      snapshot_period_version_id: snapshotPeriodVersionId,
      status: OVERRIDE_STATUS.ACTIVE,
    },
    order: [["reopen_end", "DESC"]],
    transaction,
  });

  if (!override) return null;

  if (override.reopen_end < now) {
    if (lazyExpire) {
      await override.update(
        { status: OVERRIDE_STATUS.EXPIRED, expired_at: now },
        { transaction }
      );
    }
    return null;
  }

  if (override.reopen_start > now) {
    return null;
  }

  return override;
}

async function getActiveOverrideAccessPatch(snapshotPeriodVersionId, transaction = null) {
  const override = await findActiveOverrideForSnapshotPeriod(
    snapshotPeriodVersionId,
    transaction
  );
  if (!override) return null;

  return {
    can_edit_actuals: true,
    can_complete: false,
    execution_reopening: true,
    override_expires_at: override.reopen_end,
    plan_amendment_id: override.plan_amendment_id,
  };
}

async function checkActiveOverridesForPeriods(snapshotPeriodIds, transaction = null) {
  for (const snapshotPeriodId of snapshotPeriodIds) {
    const active = await findActiveOverrideForSnapshotPeriod(
      snapshotPeriodId,
      transaction,
      { lazyExpire: true }
    );
    if (active) {
      return {
        conflict: true,
        message: EXECUTION_WINDOW_REOPENING_MESSAGES.ACTIVE_OVERRIDE_EXISTS,
        snapshotPeriodVersionId: snapshotPeriodId,
      };
    }
  }
  return { conflict: false };
}

async function prepareExecutionWindowReopeningChange(rawMetadata = {}, options = {}) {
  const { transaction = null, policy: policyOverride = null } = options;
  const metadata = normalizeExecutionWindowReopeningMetadata(rawMetadata);

  if (!metadata.reason) {
    return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.REASON_REQUIRED };
  }

  if (!metadata.periodVersionIds.length) {
    return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.PERIODS_REQUIRED };
  }

  const firstPeriod = await PlanVersion.findByPk(metadata.periodVersionIds[0], {
    transaction,
  });
  if (!firstPeriod) {
    return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.PERIOD_NOT_FOUND };
  }

  const liveMaster = await resolveLiveMasterForPeriod(firstPeriod, transaction);
  if (!liveMaster) {
    return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.INVALID_PERIOD };
  }

  if (!liveMaster.process_started_at || !liveMaster.active_execution_snapshot_id) {
    return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.PROCESS_NOT_STARTED };
  }

  const rule = await loadRuleForPlanVersion(liveMaster.plan_version_id, transaction);
  const policy = mergeAmendmentPolicy({
    ...(rule?.amendment_policy || {}),
    ...(policyOverride || {}),
  });

  if (!policy.allow_execution_window_reopening) {
    return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.POLICY_DISABLED };
  }

  const dateValidation = validateDateWindow(metadata, policy);
  if (!dateValidation.valid) {
    return {
      success: false,
      message: dateValidation.message,
      details: dateValidation.details,
    };
  }

  const snapshotRootId = liveMaster.active_execution_snapshot_id;
  const versionMap = await buildLiveToSnapshotVersionMap(snapshotRootId, transaction);

  const periods = [];
  let liveAnnualVersionId = metadata.annualVersionId;

  for (const livePeriodId of metadata.periodVersionIds) {
    const livePeriod = await PlanVersion.findByPk(livePeriodId, { transaction });
    if (!livePeriod || livePeriod.version_kind !== "execution_period") {
      return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.INVALID_PERIOD };
    }
    if (livePeriod.execution_snapshot_of_version_id) {
      return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.INVALID_PERIOD };
    }

    const periodMaster = await resolveLiveMasterForPeriod(livePeriod, transaction);
    if (!periodMaster || periodMaster.plan_version_id !== liveMaster.plan_version_id) {
      return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.INVALID_PERIOD };
    }

    const snapshotPeriod = versionMap.get(livePeriod.plan_version_id);
    if (!snapshotPeriod) {
      return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.PERIOD_NOT_FOUND };
    }

    if (snapshotPeriod.execution_status !== "completed") {
      return { success: false, message: EXECUTION_WINDOW_REOPENING_MESSAGES.PERIOD_NOT_CLOSED };
    }

    if (!liveAnnualVersionId) {
      liveAnnualVersionId = livePeriod.parent_plan_version_id;
    }

    periods.push({
      livePeriodId: livePeriod.plan_version_id,
      livePeriod,
      snapshotPeriodId: snapshotPeriod.plan_version_id,
      snapshotPeriod,
      periodLabel: livePeriod.period_label,
      sequenceIndex: livePeriod.sequence_index,
      previousExecutionStatus: snapshotPeriod.execution_status,
    });
  }

  const snapshotPeriodIds = periods.map((row) => row.snapshotPeriodId);
  const overrideConflict = await checkActiveOverridesForPeriods(
    snapshotPeriodIds,
    transaction
  );
  if (overrideConflict.conflict) {
    return { success: false, message: overrideConflict.message };
  }

  return {
    success: true,
    metadata,
    policy,
    liveMaster,
    liveAnnualVersionId,
    snapshotRootId,
    periods,
    reopenStart: dateValidation.reopenStart,
    reopenEnd: dateValidation.reopenEnd,
    durationDays: dateValidation.durationDays,
  };
}

function buildExecutionWindowReopeningPreviewData(prepared) {
  const { metadata, periods, reopenStart, reopenEnd, durationDays } = prepared;

  return {
    amendment_type: AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING,
    reason: metadata.reason,
    reason_code: metadata.reasonCode,
    reopen_start: reopenStart.toISOString(),
    reopen_end: reopenEnd.toISOString(),
    duration_days: durationDays,
    scope: {
      kpi_plan_node_id: metadata.kpiPlanNodeId,
      goal_plan_node_id: metadata.goalPlanNodeId,
      government_structure_id: metadata.governmentStructureId,
    },
    periods: periods.map((row) => ({
      period_id: row.livePeriodId,
      period_label: row.periodLabel,
      sequence_index: row.sequenceIndex,
      execution_status: row.previousExecutionStatus,
      snapshot_period_id: row.snapshotPeriodId,
      unchanged_execution_status: true,
      can_edit_actuals_during_window: true,
    })),
    summary: {
      note:
        "Execution period status remains completed. Actual edits are allowed only while the override is active.",
      period_count: periods.length,
    },
  };
}

function buildExecutionWindowReopeningImpactData(prepared) {
  const preview = buildExecutionWindowReopeningPreviewData(prepared);
  const { metadata, periods } = prepared;

  return {
    summary: [
      `Reopen ${periods.length} closed execution period(s) for actual edits`,
      `Window: ${preview.reopen_start} → ${preview.reopen_end}`,
      "Period execution_status remains completed (overlay override only)",
    ],
    kpiIds: metadata.kpiPlanNodeId ? [String(metadata.kpiPlanNodeId)] : [],
    departmentIds: metadata.governmentStructureId
      ? [String(metadata.governmentStructureId)]
      : [],
    periodIds: periods.map((row) => String(row.livePeriodId)),
    changes: periods.map((row) => ({
      field: "execution_access",
      entity_id: row.snapshotPeriodId,
      period_id: row.livePeriodId,
      old: { can_edit_actuals: false, execution_status: row.previousExecutionStatus },
      new: {
        can_edit_actuals: true,
        execution_status: row.previousExecutionStatus,
        execution_reopening: true,
      },
    })),
    affected_periods: periods.length,
    preview,
  };
}

function buildExecutionWindowReopeningHistoryRows(prepared, createdOverrides = []) {
  const rows = [];

  for (const row of prepared.periods) {
    rows.push({
      entity_type: "plan_version",
      entity_id: row.snapshotPeriodId,
      field_name: "execution_access",
      old_value: JSON.stringify({
        can_edit_actuals: false,
        execution_status: row.previousExecutionStatus,
      }),
      new_value: JSON.stringify({
        can_edit_actuals: true,
        execution_status: row.previousExecutionStatus,
        execution_reopening: true,
        reopen_start: prepared.reopenStart.toISOString(),
        reopen_end: prepared.reopenEnd.toISOString(),
      }),
    });
  }

  for (const override of createdOverrides) {
    rows.push({
      entity_type: "plan_execution_window_override",
      entity_id: override.plan_execution_window_override_id,
      field_name: "status",
      old_value: null,
      new_value: OVERRIDE_STATUS.ACTIVE,
    });
  }

  return rows;
}

async function applyPreparedExecutionWindowReopening(prepared, options = {}) {
  const { user, transaction = null, planAmendmentId = null, planAmendmentActionId = null } =
    options;

  if (!planAmendmentId) {
    return {
      success: false,
      message: "Plan amendment ID is required to apply execution window reopening.",
    };
  }

  const createdOverrides = [];

  for (const row of prepared.periods) {
    const override = await PlanExecutionWindowOverride.create(
      {
        plan_amendment_id: planAmendmentId,
        plan_amendment_action_id: planAmendmentActionId,
        master_plan_version_id: prepared.liveMaster.plan_version_id,
        live_period_version_id: row.livePeriodId,
        snapshot_period_version_id: row.snapshotPeriodId,
        previous_execution_status: row.previousExecutionStatus,
        reopen_start: prepared.reopenStart,
        reopen_end: prepared.reopenEnd,
        status: OVERRIDE_STATUS.ACTIVE,
        reason: prepared.metadata.reason,
        kpi_plan_node_id: prepared.metadata.kpiPlanNodeId,
        goal_plan_node_id: prepared.metadata.goalPlanNodeId,
        government_structure_id: prepared.metadata.governmentStructureId,
        created_by: user?.user_id ?? null,
      },
      { transaction }
    );
    createdOverrides.push(override);
  }

  return {
    success: true,
    history: buildExecutionWindowReopeningHistoryRows(prepared, createdOverrides),
    data: {
      override_count: createdOverrides.length,
      reopen_start: prepared.reopenStart.toISOString(),
      reopen_end: prepared.reopenEnd.toISOString(),
      periods: prepared.periods.map((row) => ({
        period_id: row.livePeriodId,
        snapshot_period_id: row.snapshotPeriodId,
        override_id: createdOverrides.find(
          (o) => o.live_period_version_id === row.livePeriodId
        )?.plan_execution_window_override_id,
      })),
    },
  };
}

async function expireDueExecutionWindowOverrides(transaction = null) {
  const now = new Date();
  const [count] = await PlanExecutionWindowOverride.update(
    {
      status: OVERRIDE_STATUS.EXPIRED,
      expired_at: now,
    },
    {
      where: {
        status: OVERRIDE_STATUS.ACTIVE,
        reopen_end: { [Op.lt]: now },
      },
      transaction,
    }
  );

  return count;
}

module.exports = {
  EXECUTION_WINDOW_REOPENING_MESSAGES,
  EXECUTION_WINDOW_REOPENING_REASONS,
  OVERRIDE_STATUS,
  normalizeExecutionWindowReopeningMetadata,
  validateDateWindow,
  prepareExecutionWindowReopeningChange,
  buildExecutionWindowReopeningPreviewData,
  buildExecutionWindowReopeningImpactData,
  buildExecutionWindowReopeningHistoryRows,
  applyPreparedExecutionWindowReopening,
  findActiveOverrideForSnapshotPeriod,
  expireDueExecutionWindowOverrides,
  getActiveOverrideAccessPatch,
};
