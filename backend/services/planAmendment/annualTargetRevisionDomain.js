"use strict";

/**
 * Annual Target Revision domain — validation, redistribution, preview, apply.
 * Mutates execution-snapshot annual_target + open period targets only.
 * Live annual_target remains the original baseline for reporting.
 */

const { Op } = require("sequelize");
const { PlanNode, PlanVersion } = require("../../models");
const { resolveMasterVersionId } = require("../planReviewVisibilityService");
const { buildLiveToSnapshotVersionMap } = require("../planExecutionSnapshotService");
const { resolveVersionExecutionAccess } = require("../planExecutionGateService");
const {
  resolveMasterKpiIdForAnnualKpi,
  resolveSnapshotMasterKpiNode,
  resolveSnapshotAnnualKpiNode,
} = require("../planTargetReallocationScopeService");
const {
  isFinalizedExecutionPeriod,
  normalizeTargetValue,
} = require("../../utils/planTargetReallocationValidationUtils");
const { AMENDMENT_TYPE } = require("../../utils/planAmendmentTypes");
const {
  mergeAmendmentPolicy,
  DEFAULT_AMENDMENT_POLICY,
} = require("../../utils/planAmendmentActionUtils");
const { assertCompletedPeriodsPolicy } = require("./planAmendmentPolicyService");

const ATR_MESSAGES = Object.freeze({
  KPI_REQUIRED: "KPI is required.",
  KPI_NOT_FOUND: "KPI was not found.",
  INVALID_KPI: "Annual target revision requires an annual KPI node.",
  REVISED_REQUIRED: "Revised annual target is required.",
  REVISED_NEGATIVE: "Annual target cannot be negative.",
  ZERO_NOT_ALLOWED: "Zero annual target is not allowed by plan amendment policy.",
  BELOW_ACHIEVEMENT:
    "Annual target cannot be lower than recorded achievement.",
  REMAINING_NEGATIVE:
    "Revision would leave a negative remaining target after completed periods.",
  FINALIZED_PERIOD: "Finalized / completed period targets cannot be modified.",
  REDISTRIBUTION_MISMATCH:
    "Remaining period targets must sum exactly to the revised annual target minus completed period targets.",
  MANUAL_REQUIRED:
    "Manual redistribution requires a target for each remaining (open) period.",
  PROCESS_NOT_STARTED: "Annual target revision is only available after execution has started.",
  REASON_REQUIRED: "Reason is required.",
  NO_OPEN_PERIODS:
    "No open periods remain for redistribution. Annual revision cannot change completed-only years without remaining capacity.",
});

const REDISTRIBUTION_MODE = Object.freeze({
  MANUAL: "manual",
  PROPORTIONAL: "proportional",
  EQUAL: "equal",
});

function normalizeRedistributionMode(mode, policyFallback = "manual") {
  const raw = mode != null && String(mode).trim() ? String(mode).trim() : policyFallback;
  const lower = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (
    lower === "manual" ||
    lower === REDISTRIBUTION_MODE.MANUAL
  ) {
    return REDISTRIBUTION_MODE.MANUAL;
  }
  if (
    lower === "proportional" ||
    lower === "auto_proportional" ||
    lower === "automatic_proportional"
  ) {
    return REDISTRIBUTION_MODE.PROPORTIONAL;
  }
  if (
    lower === "equal" ||
    lower === "auto_equal" ||
    lower === "automatic_equal"
  ) {
    return REDISTRIBUTION_MODE.EQUAL;
  }
  return null;
}

/**
 * Configurable amendment reason codes (not hardcoded business logic).
 * UI and APIs should prefer this catalog; values may later move to DB/config.
 */
const ANNUAL_TARGET_REVISION_REASONS = Object.freeze([
  { code: "budget_reduction", label: "Budget Reduction" },
  { code: "budget_increase", label: "Budget Increase" },
  { code: "government_directive", label: "Government Directive" },
  { code: "cabinet_decision", label: "Cabinet Decision" },
  { code: "donor_funding", label: "Donor Funding" },
  { code: "funding_increase", label: "Funding Increase" },
  { code: "policy_change", label: "Policy Change" },
  { code: "scope_increase", label: "Scope Increase" },
  { code: "scope_reduction", label: "Scope Reduction" },
  { code: "scope_change", label: "Scope Change" },
  { code: "correction", label: "Correction" },
  { code: "other", label: "Other" },
]);

function normalizeAnnualTargetRevisionMetadata(metadata = {}) {
  const source = metadata && typeof metadata === "object" ? metadata : {};
  const revisedRaw =
    source.revisedAnnualTarget ??
    source.revised_annual_target ??
    source.annualTarget ??
    source.annual_target ??
    null;

  const periodAllocationsRaw =
    source.periodAllocations ??
    source.period_allocations ??
    source.remainingPeriodAllocation ??
    source.remaining_period_allocation ??
    [];

  const periodAllocations = Array.isArray(periodAllocationsRaw)
    ? periodAllocationsRaw.map((row) => ({
        periodId: row.periodId ?? row.period_id ?? row.livePeriodId ?? null,
        target:
          row.target ??
          row.periodTarget ??
          row.period_target ??
          row.amount ??
          null,
      }))
    : [];

  return {
    kpiId: source.kpiId ?? source.kpi_id ?? null,
    revisedAnnualTarget: revisedRaw,
    redistributionMode:
      source.redistributionMode ??
      source.redistribution_mode ??
      source.mode ??
      null,
    periodAllocations,
    reasonCode:
      source.reasonCode ??
      source.reason_code ??
      source.reasonKey ??
      null,
    reason:
      source.reason != null && String(source.reason).trim()
        ? String(source.reason).trim()
        : "",
    description:
      source.description != null && String(source.description).trim()
        ? String(source.description).trim()
        : null,
  };
}

function roundTarget(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function nearlyEqual(a, b, epsilon = 0.001) {
  return Math.abs(Number(a) - Number(b)) <= epsilon;
}

/**
 * Resolve live annual KPI + all snapshot period nodes with execution status.
 */
async function resolveAnnualTargetRevisionContext(kpiId, transaction = null) {
  const liveAnnualKpi = await PlanNode.findByPk(kpiId, {
    include: [{ association: "planVersion" }],
    transaction,
  });

  if (!liveAnnualKpi) {
    return { success: false, message: ATR_MESSAGES.KPI_NOT_FOUND };
  }
  if (liveAnnualKpi.type !== "kpi") {
    return { success: false, message: ATR_MESSAGES.INVALID_KPI };
  }
  if (liveAnnualKpi.planVersion?.version_kind !== "annual") {
    return { success: false, message: ATR_MESSAGES.INVALID_KPI };
  }

  const liveMasterVersionId = await resolveMasterVersionId(liveAnnualKpi.plan_version_id);
  if (!liveMasterVersionId) {
    return { success: false, message: "Master plan version was not found" };
  }

  const liveMaster = await PlanVersion.findByPk(liveMasterVersionId, { transaction });
  if (!liveMaster?.process_started_at || !liveMaster.active_execution_snapshot_id) {
    return { success: false, message: ATR_MESSAGES.PROCESS_NOT_STARTED };
  }

  const snapshotRootId = liveMaster.active_execution_snapshot_id;
  const versionMap = await buildLiveToSnapshotVersionMap(snapshotRootId, transaction);

  const liveMasterKpiId = await resolveMasterKpiIdForAnnualKpi(liveAnnualKpi, transaction);
  if (!liveMasterKpiId) {
    return { success: false, message: ATR_MESSAGES.KPI_NOT_FOUND };
  }

  const snapshotMasterKpi = await resolveSnapshotMasterKpiNode(
    snapshotRootId,
    liveMasterKpiId,
    transaction
  );
  if (!snapshotMasterKpi) {
    return { success: false, message: ATR_MESSAGES.KPI_NOT_FOUND };
  }

  const snapshotAnnualVersionId = versionMap.get(liveAnnualKpi.plan_version_id)?.plan_version_id;
  if (!snapshotAnnualVersionId) {
    return { success: false, message: ATR_MESSAGES.KPI_NOT_FOUND };
  }

  const snapshotAnnualKpi = await resolveSnapshotAnnualKpiNode(
    snapshotAnnualVersionId,
    snapshotMasterKpi.plan_node_id,
    transaction
  );
  if (!snapshotAnnualKpi) {
    return { success: false, message: ATR_MESSAGES.KPI_NOT_FOUND };
  }

  if (transaction) {
    await snapshotAnnualKpi.reload({ transaction, lock: transaction.LOCK.UPDATE });
  }

  const livePeriods = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: liveAnnualKpi.plan_version_id,
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

    const periodNode = await PlanNode.findOne({
      where: {
        plan_version_id: snapshotPeriod.plan_version_id,
        source_plan_node_id: snapshotAnnualKpi.plan_node_id,
        type: "kpi",
        is_active: true,
      },
      include: [{ association: "planVersion" }],
      transaction,
    });
    if (!periodNode) continue;

    if (transaction) {
      await periodNode.reload({ transaction, lock: transaction.LOCK.UPDATE });
    }

    const access = await resolveVersionExecutionAccess(
      snapshotPeriod.plan_version_id,
      transaction
    );
    const executionStatus = access.access?.execution_status ?? null;
    const finalized = isFinalizedExecutionPeriod(executionStatus);

    periods.push({
      livePeriodId: livePeriod.plan_version_id,
      snapshotPeriodId: snapshotPeriod.plan_version_id,
      periodLabel: livePeriod.period_label || snapshotPeriod.period_label || null,
      sequenceIndex: livePeriod.sequence_index ?? 0,
      periodNode,
      executionStatus,
      finalized,
      currentTarget: normalizeTargetValue(periodNode.period_target),
      periodActual: normalizeTargetValue(periodNode.period_actual),
    });
  }

  periods.sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0));

  return {
    success: true,
    data: {
      liveMaster,
      liveMasterVersionId,
      liveMasterKpiId,
      liveAnnualKpi,
      snapshotRootId,
      snapshotAnnualVersionId,
      snapshotAnnualKpi,
      snapshotMasterKpi,
      periods,
      originalAnnualTarget: normalizeTargetValue(liveAnnualKpi.annual_target),
      currentAnnualTarget: normalizeTargetValue(snapshotAnnualKpi.annual_target),
    },
  };
}

function computeRecordedAchievement(context) {
  const annualActual = normalizeTargetValue(context.snapshotAnnualKpi.annual_actual);
  const periodSum = context.periods.reduce(
    (sum, p) => sum + normalizeTargetValue(p.periodActual),
    0
  );
  return Math.max(annualActual, periodSum);
}

function buildRedistribution({
  mode,
  revisedAnnual,
  periods,
  periodAllocations,
}) {
  const completed = periods.filter((p) => p.finalized);
  const open = periods.filter((p) => !p.finalized);

  const completedSum = completed.reduce((sum, p) => sum + p.currentTarget, 0);
  const remainingBudget = roundTarget(revisedAnnual - completedSum);

  if (remainingBudget < -0.001) {
    return { valid: false, message: ATR_MESSAGES.REMAINING_NEGATIVE };
  }

  if (open.length === 0) {
    if (nearlyEqual(revisedAnnual, completedSum)) {
      return {
        valid: true,
        completed,
        open,
        completedSum,
        remainingBudget: 0,
        allocations: [],
      };
    }
    return { valid: false, message: ATR_MESSAGES.NO_OPEN_PERIODS };
  }

  let allocations = [];

  if (mode === REDISTRIBUTION_MODE.MANUAL) {
    const byPeriod = new Map(
      (periodAllocations || [])
        .filter((row) => row.periodId)
        .map((row) => [String(row.periodId), row.target])
    );

    for (const period of open) {
      if (!byPeriod.has(String(period.livePeriodId))) {
        return { valid: false, message: ATR_MESSAGES.MANUAL_REQUIRED };
      }
      const raw = byPeriod.get(String(period.livePeriodId));
      const target = Number(raw);
      if (!Number.isFinite(target)) {
        return { valid: false, message: ATR_MESSAGES.MANUAL_REQUIRED };
      }
      if (target < 0) {
        return { valid: false, message: ATR_MESSAGES.REVISED_NEGATIVE };
      }
      allocations.push({
        livePeriodId: period.livePeriodId,
        snapshotPeriodId: period.snapshotPeriodId,
        periodNodeId: period.periodNode.plan_node_id,
        periodLabel: period.periodLabel,
        oldTarget: period.currentTarget,
        newTarget: roundTarget(target),
      });
    }
  } else if (mode === REDISTRIBUTION_MODE.EQUAL) {
    const base = Math.floor((remainingBudget / open.length) * 1000) / 1000;
    let assigned = 0;
    allocations = open.map((period, index) => {
      const isLast = index === open.length - 1;
      const newTarget = isLast
        ? roundTarget(remainingBudget - assigned)
        : base;
      assigned = roundTarget(assigned + (isLast ? 0 : base));
      if (isLast) assigned = remainingBudget;
      return {
        livePeriodId: period.livePeriodId,
        snapshotPeriodId: period.snapshotPeriodId,
        periodNodeId: period.periodNode.plan_node_id,
        periodLabel: period.periodLabel,
        oldTarget: period.currentTarget,
        newTarget,
      };
    });
  } else if (mode === REDISTRIBUTION_MODE.PROPORTIONAL) {
    const weightSum = open.reduce((sum, p) => sum + Math.max(p.currentTarget, 0), 0);
    if (weightSum <= 0) {
      // Fall back to equal when all open targets are zero
      return buildRedistribution({
        mode: REDISTRIBUTION_MODE.EQUAL,
        revisedAnnual,
        periods,
        periodAllocations,
      });
    }
    let assigned = 0;
    allocations = open.map((period, index) => {
      const isLast = index === open.length - 1;
      const share = period.currentTarget / weightSum;
      const newTarget = isLast
        ? roundTarget(remainingBudget - assigned)
        : roundTarget(remainingBudget * share);
      if (!isLast) assigned = roundTarget(assigned + newTarget);
      return {
        livePeriodId: period.livePeriodId,
        snapshotPeriodId: period.snapshotPeriodId,
        periodNodeId: period.periodNode.plan_node_id,
        periodLabel: period.periodLabel,
        oldTarget: period.currentTarget,
        newTarget,
      };
    });
  } else {
    return { valid: false, message: "Invalid redistribution mode." };
  }

  for (const row of allocations) {
    if (row.newTarget < -0.001) {
      return { valid: false, message: ATR_MESSAGES.REVISED_NEGATIVE };
    }
  }

  const openSum = allocations.reduce((sum, row) => sum + row.newTarget, 0);
  if (!nearlyEqual(openSum, remainingBudget)) {
    return { valid: false, message: ATR_MESSAGES.REDISTRIBUTION_MISMATCH };
  }

  return {
    valid: true,
    completed,
    open,
    completedSum,
    remainingBudget,
    allocations,
  };
}

/**
 * Shared prepare pipeline for validate / preview / impact / apply.
 */
async function prepareAnnualTargetRevisionChange(rawMetadata, options = {}) {
  const metadata = normalizeAnnualTargetRevisionMetadata(rawMetadata);
  const policy = mergeAmendmentPolicy(options.policy || DEFAULT_AMENDMENT_POLICY);
  const transaction = options.transaction ?? null;

  if (!metadata.kpiId) {
    return { success: false, message: ATR_MESSAGES.KPI_REQUIRED };
  }
  if (!metadata.reason) {
    return { success: false, message: ATR_MESSAGES.REASON_REQUIRED };
  }

  const revised = Number(metadata.revisedAnnualTarget);
  if (!Number.isFinite(revised)) {
    return { success: false, message: ATR_MESSAGES.REVISED_REQUIRED };
  }
  if (revised < 0) {
    return { success: false, message: ATR_MESSAGES.REVISED_NEGATIVE };
  }
  if (revised === 0 && !policy.allow_zero_annual_target) {
    return { success: false, message: ATR_MESSAGES.ZERO_NOT_ALLOWED };
  }

  const mode = normalizeRedistributionMode(
    metadata.redistributionMode,
    policy.automatic_redistribution
  );
  if (!mode) {
    return {
      success: false,
      message: "Redistribution mode must be manual, proportional, or equal.",
    };
  }

  const contextResult = await resolveAnnualTargetRevisionContext(
    metadata.kpiId,
    transaction
  );
  if (!contextResult.success) {
    return contextResult;
  }
  const context = contextResult.data;

  const achieved = computeRecordedAchievement(context);
  if (revised + 0.001 < achieved) {
    return {
      success: false,
      message: ATR_MESSAGES.BELOW_ACHIEVEMENT,
      details: { revised, achieved },
    };
  }

  for (const period of context.periods) {
    if (period.finalized) {
      const periodPolicy = assertCompletedPeriodsPolicy(policy, {
        periodIsCompleted: true,
      });
      // Completed periods must never change; allocations must not include them.
      if (!periodPolicy.valid && mode === REDISTRIBUTION_MODE.MANUAL) {
        const touches = (metadata.periodAllocations || []).some(
          (row) =>
            String(row.periodId) === String(period.livePeriodId) &&
            Number(row.target) !== period.currentTarget
        );
        if (touches) {
          return { success: false, message: ATR_MESSAGES.FINALIZED_PERIOD };
        }
      }
    }
  }

  const redistribution = buildRedistribution({
    mode,
    revisedAnnual: roundTarget(revised),
    periods: context.periods,
    periodAllocations: metadata.periodAllocations,
  });

  if (!redistribution.valid) {
    return { success: false, message: redistribution.message };
  }

  return {
    success: true,
    metadata: {
      ...metadata,
      redistributionMode: mode,
      revisedAnnualTarget: roundTarget(revised),
    },
    context,
    policy,
    achieved,
    redistribution,
    originalAnnualTarget: context.originalAnnualTarget,
    currentAnnualTarget: context.currentAnnualTarget,
    revisedAnnualTarget: roundTarget(revised),
    delta: roundTarget(revised - context.currentAnnualTarget),
  };
}

function buildAnnualTargetRevisionPreviewData(prepared) {
  const {
    context,
    metadata,
    redistribution,
    originalAnnualTarget,
    currentAnnualTarget,
    revisedAnnualTarget,
    delta,
    achieved,
  } = prepared;

  const pctChange =
    currentAnnualTarget === 0
      ? null
      : roundTarget((delta / currentAnnualTarget) * 100);

  return {
    amendment_type: AMENDMENT_TYPE.ANNUAL_TARGET_REVISION,
    kpi_id: metadata.kpiId,
    kpi_title: context.liveAnnualKpi.title,
    reason: metadata.reason,
    reason_code: metadata.reasonCode,
    redistribution_mode: metadata.redistributionMode,
    original_annual_target: originalAnnualTarget,
    current_annual_target: currentAnnualTarget,
    revised_annual_target: revisedAnnualTarget,
    difference: delta,
    percentage_change: pctChange,
    recorded_achievement: achieved,
    completed_periods: redistribution.completed.map((p) => ({
      period_id: p.livePeriodId,
      period_label: p.periodLabel,
      target: p.currentTarget,
      status: p.executionStatus,
      unchanged: true,
    })),
    remaining_periods: redistribution.allocations.map((row) => ({
      period_id: row.livePeriodId,
      period_label: row.periodLabel,
      before: row.oldTarget,
      after: row.newTarget,
    })),
    summary: {
      completed_target_sum: redistribution.completedSum,
      remaining_target: redistribution.remainingBudget,
      redistribution: metadata.redistributionMode,
      performance_note:
        "Performance will use the revised (current effective) annual target after apply.",
    },
  };
}

function buildAnnualTargetRevisionImpactData(prepared) {
  const preview = buildAnnualTargetRevisionPreviewData(prepared);
  const { context, redistribution, originalAnnualTarget, revisedAnnualTarget, delta } =
    prepared;

  const pct =
    originalAnnualTarget === 0
      ? null
      : roundTarget((delta / originalAnnualTarget) * 100);

  return {
    summary: [
      `Annual target ${originalAnnualTarget} → ${revisedAnnualTarget} (${delta >= 0 ? "+" : ""}${delta})`,
      `Redistribute remaining ${redistribution.remainingBudget} across ${redistribution.allocations.length} open period(s)`,
      `${redistribution.completed.length} completed period(s) unchanged`,
    ],
    kpiIds: [String(context.liveAnnualKpi.plan_node_id)],
    departmentIds: [],
    periodIds: redistribution.allocations.map((row) => String(row.livePeriodId)),
    changes: [
      {
        field: "annual_target",
        entity_id: context.snapshotAnnualKpi.plan_node_id,
        old: prepared.currentAnnualTarget,
        new: revisedAnnualTarget,
      },
      ...redistribution.allocations.map((row) => ({
        field: "period_target",
        entity_id: row.periodNodeId,
        period_id: row.livePeriodId,
        old: row.oldTarget,
        new: row.newTarget,
      })),
    ],
    original_annual_target: originalAnnualTarget,
    revised_annual_target: revisedAnnualTarget,
    difference: delta,
    percentage_change: pct,
    affected_periods: redistribution.allocations.length,
    affected_kpi: context.liveAnnualKpi.title,
    affected_departments: 0,
    affected_rollups: true,
    preview,
  };
}

function buildAnnualTargetRevisionHistoryRows(prepared) {
  const rows = [
    {
      entity_type: "plan_node",
      entity_id: prepared.context.snapshotAnnualKpi.plan_node_id,
      field_name: "annual_target",
      old_value: String(prepared.currentAnnualTarget),
      new_value: String(prepared.revisedAnnualTarget),
    },
  ];

  for (const row of prepared.redistribution.allocations) {
    if (nearlyEqual(row.oldTarget, row.newTarget)) continue;
    rows.push({
      entity_type: "plan_node",
      entity_id: row.periodNodeId,
      field_name: "period_target",
      old_value: String(row.oldTarget),
      new_value: String(row.newTarget),
    });
  }

  return rows;
}

async function applyPreparedAnnualTargetRevision(prepared, options = {}) {
  const { transaction = null } = options;
  const { context, redistribution, revisedAnnualTarget } = prepared;

  await context.snapshotAnnualKpi.update(
    { annual_target: revisedAnnualTarget },
    { transaction }
  );

  // Keep snapshot master KPI annual_target aligned when present
  if (
    context.snapshotMasterKpi &&
    context.snapshotMasterKpi.plan_node_id !== context.snapshotAnnualKpi.plan_node_id
  ) {
    await context.snapshotMasterKpi.update(
      { annual_target: revisedAnnualTarget },
      { transaction }
    );
  }

  for (const row of redistribution.allocations) {
    if (nearlyEqual(row.oldTarget, row.newTarget)) continue;
    await PlanNode.update(
      { period_target: row.newTarget },
      {
        where: { plan_node_id: row.periodNodeId },
        transaction,
      }
    );
  }

  return {
    success: true,
    history: buildAnnualTargetRevisionHistoryRows(prepared),
    data: {
      kpi_id: prepared.metadata.kpiId,
      original_annual_target: prepared.originalAnnualTarget,
      previous_effective_annual_target: prepared.currentAnnualTarget,
      revised_annual_target: revisedAnnualTarget,
      difference: prepared.delta,
      redistribution_mode: prepared.metadata.redistributionMode,
      periods_updated: redistribution.allocations.filter(
        (row) => !nearlyEqual(row.oldTarget, row.newTarget)
      ).length,
      allocations: redistribution.allocations,
    },
  };
}

module.exports = {
  ATR_MESSAGES,
  REDISTRIBUTION_MODE,
  ANNUAL_TARGET_REVISION_REASONS,
  normalizeRedistributionMode,
  normalizeAnnualTargetRevisionMetadata,
  resolveAnnualTargetRevisionContext,
  computeRecordedAchievement,
  buildRedistribution,
  prepareAnnualTargetRevisionChange,
  buildAnnualTargetRevisionPreviewData,
  buildAnnualTargetRevisionImpactData,
  buildAnnualTargetRevisionHistoryRows,
  applyPreparedAnnualTargetRevision,
};
