"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  PlanNode,
  TargetAllocationHistory,
  TargetReallocationRequest,
} = require("../../models");
const {
  resolveReallocationExecutionContext,
  validateReallocationBusinessRules,
  sumOtherSnapshotPeriodTargets,
} = require("../planTargetReallocationService");
const {
  REALLOCATION_VALIDATION_MESSAGES,
  validateDistinctPeriods,
  normalizeTargetValue,
} = require("../../utils/planTargetReallocationValidationUtils");
const { ALLOCATION_CHANGE_TYPE } = require("../../utils/planTargetReallocationWorkflowUtils");
const { AMENDMENT_TYPE } = require("../../utils/planAmendmentTypes");

/**
 * Canonical metadata shape for TARGET_REALLOCATION amendments.
 */
function normalizeTargetReallocationMetadata(metadata = {}) {
  const source = metadata && typeof metadata === "object" ? metadata : {};
  return {
    kpiId: source.kpiId ?? source.kpi_id ?? null,
    fromPeriodId: source.fromPeriodId ?? source.from_period_id ?? null,
    toPeriodId: source.toPeriodId ?? source.to_period_id ?? null,
    amount: source.amount,
    reason:
      source.reason != null && String(source.reason).trim()
        ? String(source.reason).trim()
        : "",
    legacyRequestId:
      source.legacy_request_id ??
      source.target_reallocation_request_id ??
      source.legacyRequestId ??
      null,
  };
}

function buildTargetReallocationTitle(metadata) {
  const amount = metadata?.amount != null ? metadata.amount : "?";
  return `Target Reallocation (${amount})`;
}

/**
 * Resolve execution context + business rules + annual-sum check.
 * Shared by validate / preview / apply.
 */
async function prepareTargetReallocationChange(rawMetadata, transaction = null) {
  const metadata = normalizeTargetReallocationMetadata(rawMetadata);

  if (!metadata.kpiId || !metadata.fromPeriodId || !metadata.toPeriodId) {
    return {
      success: false,
      message: "KPI, source period, and destination period are required",
    };
  }

  if (!metadata.reason) {
    return { success: false, message: "Reason is required" };
  }

  const distinctValidation = validateDistinctPeriods(
    metadata.fromPeriodId,
    metadata.toPeriodId
  );
  if (!distinctValidation.valid) {
    return { success: false, message: distinctValidation.message };
  }

  const contextResult = await resolveReallocationExecutionContext(
    {
      kpiId: metadata.kpiId,
      fromPeriodId: metadata.fromPeriodId,
      toPeriodId: metadata.toPeriodId,
    },
    transaction
  );

  if (!contextResult.success) {
    return contextResult;
  }

  const context = contextResult.data;
  const validation = validateReallocationBusinessRules({
    amount: metadata.amount,
    fromPeriodNode: context.fromPeriodNode,
    toPeriodNode: context.toPeriodNode,
    fromExecutionStatus: context.fromExecutionStatus,
  });

  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const annualTarget = normalizeTargetValue(context.liveAnnualKpi.annual_target);
  const fromOldTarget = normalizeTargetValue(context.fromPeriodNode.period_target);
  const toOldTarget = normalizeTargetValue(context.toPeriodNode.period_target);

  const projectedPeriodTotal = await sumOtherSnapshotPeriodTargets(
    context.snapshotAnnualKpi.plan_node_id,
    context.fromPeriodNode.plan_node_id,
    context.toPeriodNode.plan_node_id,
    validation.fromResult,
    validation.toResult,
    transaction
  );

  if (annualTarget > 0 && Math.abs(projectedPeriodTotal - annualTarget) > 0.001) {
    return {
      success: false,
      message: "Period targets must continue to sum to the unchanged annual target",
    };
  }

  return {
    success: true,
    metadata,
    context,
    validation,
    annualTarget,
    fromOldTarget,
    toOldTarget,
    fromNewTarget: validation.fromResult,
    toNewTarget: validation.toResult,
  };
}

function buildTargetReallocationPreviewData(prepared) {
  const { context, metadata, fromOldTarget, toOldTarget, fromNewTarget, toNewTarget, annualTarget } =
    prepared;

  return {
    amendment_type: AMENDMENT_TYPE.TARGET_REALLOCATION,
    kpi_id: metadata.kpiId,
    kpi_title: context.liveAnnualKpi.title,
    annual_target: annualTarget,
    amount: prepared.validation.amount,
    reason: metadata.reason,
    from_period: {
      period_id: metadata.fromPeriodId,
      period_label: context.fromPeriod.period_label,
      period_plan_node_id: context.fromPeriodNode.plan_node_id,
      current_target: fromOldTarget,
      preview_target: fromNewTarget,
    },
    to_period: {
      period_id: metadata.toPeriodId,
      period_label: context.toPeriod.period_label,
      period_plan_node_id: context.toPeriodNode.plan_node_id,
      current_target: toOldTarget,
      preview_target: toNewTarget,
    },
  };
}

function buildAmendmentHistoryRows(prepared) {
  const { context, fromOldTarget, toOldTarget, fromNewTarget, toNewTarget } = prepared;
  return [
    {
      entity_type: "plan_node",
      entity_id: context.fromPeriodNode.plan_node_id,
      field_name: "period_target",
      old_value: String(fromOldTarget),
      new_value: String(fromNewTarget),
    },
    {
      entity_type: "plan_node",
      entity_id: context.toPeriodNode.plan_node_id,
      field_name: "period_target",
      old_value: String(toOldTarget),
      new_value: String(toNewTarget),
    },
  ];
}

/**
 * Mutate snapshot period targets. Optionally dual-write legacy allocation history
 * when metadata.legacyRequestId points at a target_reallocation_requests row.
 */
async function applyPreparedTargetReallocation(prepared, options = {}) {
  const { user, transaction = null } = options;
  const {
    context,
    metadata,
    validation,
    fromOldTarget,
    toOldTarget,
    fromNewTarget,
    toNewTarget,
    annualTarget,
  } = prepared;

  await context.fromPeriodNode.update(
    { period_target: fromNewTarget },
    { transaction }
  );
  await context.toPeriodNode.update(
    { period_target: toNewTarget },
    { transaction }
  );

  if (metadata.legacyRequestId) {
    const request = await TargetReallocationRequest.findByPk(metadata.legacyRequestId, {
      transaction,
    });
    if (request) {
      const changedAt = new Date();
      const shared = {
        master_plan_version_id: context.liveMasterVersionId,
        annual_kpi_plan_node_id: metadata.kpiId,
        change_type: ALLOCATION_CHANGE_TYPE.REALLOCATION,
        reference_id: request.target_reallocation_request_id,
        reason: metadata.reason,
        changed_by: user.user_id,
        changed_at: changedAt,
      };

      await TargetAllocationHistory.create(
        {
          target_allocation_history_id: uuidv4(),
          period_version_id: metadata.fromPeriodId,
          period_plan_node_id: context.fromPeriodNode.plan_node_id,
          old_target: fromOldTarget,
          new_target: fromNewTarget,
          ...shared,
        },
        { transaction }
      );

      await TargetAllocationHistory.create(
        {
          target_allocation_history_id: uuidv4(),
          period_version_id: metadata.toPeriodId,
          period_plan_node_id: context.toPeriodNode.plan_node_id,
          old_target: toOldTarget,
          new_target: toNewTarget,
          ...shared,
        },
        { transaction }
      );
    }
  }

  return {
    success: true,
    history: buildAmendmentHistoryRows(prepared),
    data: {
      amount: validation.amount,
      annual_target: annualTarget,
      from_period_plan_node_id: context.fromPeriodNode.plan_node_id,
      to_period_plan_node_id: context.toPeriodNode.plan_node_id,
      from_period_target_before: fromOldTarget,
      to_period_target_before: toOldTarget,
      from_period_target_after: fromNewTarget,
      to_period_target_after: toNewTarget,
      kpi_title: context.liveAnnualKpi.title,
    },
  };
}

module.exports = {
  normalizeTargetReallocationMetadata,
  buildTargetReallocationTitle,
  prepareTargetReallocationChange,
  buildTargetReallocationPreviewData,
  buildAmendmentHistoryRows,
  applyPreparedTargetReallocation,
  REALLOCATION_VALIDATION_MESSAGES,
};
