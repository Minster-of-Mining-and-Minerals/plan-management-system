"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const {
  PlanVersion,
  PlanNode,
  TargetReallocationRequest,
  TargetAllocationHistory,
  PlanAmendment,
  PlanAmendmentAction,
  sequelize,
} = require("../models");
const { resolveMasterVersionId } = require("./planReviewVisibilityService");
const { buildLiveToSnapshotVersionMap } = require("./planExecutionSnapshotService");
const { resolveVersionExecutionAccess } = require("./planExecutionGateService");
const { loadBaselinesForMaster } = require("./planPeriodTargetBaselineService");
const {
  assertUserCanRequestTargetReallocationOnKpi,
  assertUserCanApproveTargetReallocationOnKpi,
  resolveTargetReallocationApproverUsers,
  resolveMasterKpiIdForAnnualKpi,
  resolveSnapshotMasterKpiNode,
  resolveSnapshotAnnualKpiNode,
  resolveSnapshotPeriodKpiNode,
} = require("./planTargetReallocationScopeService");
const {
  REALLOCATION_VALIDATION_MESSAGES,
  validateReallocationAmount,
  validateDistinctPeriods,
  computeMovableTarget,
  validateMovableAmount,
  validateResultingTargets,
  isFinalizedExecutionPeriod,
  normalizeTargetValue,
  normalizeCreatePayload,
} = require("../utils/planTargetReallocationValidationUtils");
const {
  buildPendingReallocationWorkflowFields,
  buildApprovedReallocationWorkflowFields,
  buildRejectedReallocationWorkflowFields,
  buildCancelledReallocationWorkflowFields,
  buildAppliedReallocationWorkflowFields,
  canTransitionReallocationStatus,
  isPendingReallocationStatus,
  REALLOCATION_STATUS,
  ALLOCATION_CHANGE_TYPE,
} = require("../utils/planTargetReallocationWorkflowUtils");
const {
  resolveOriginalTargetFromBaseline,
  computeReallocationReportingFields,
} = require("../utils/planTargetReallocationBaselineUtils");
const { AMENDMENT_TYPE } = require("../utils/planAmendmentTypes");
const {
  buildPendingApprovalAmendmentWorkflowFields,
} = require("../utils/planAmendmentWorkflowUtils");
const { AUDIT_MODULES, recordSystemAuditLog } = require("./auditLogService");
const {
  emitTargetReallocationSubmittedEvent,
  emitTargetReallocationApprovedEvent,
  emitTargetReallocationRejectedEvent,
} = require("./planTargetReallocationNotificationService");

function buildReallocationAmendmentTitle(amount) {
  return `Target Reallocation (${amount})`;
}

function mapAmendmentStatusToReallocationStatus(amendmentStatus) {
  switch (String(amendmentStatus)) {
    case "pending_approval":
      return REALLOCATION_STATUS.PENDING;
    case "approved":
      return REALLOCATION_STATUS.APPROVED;
    case "applied":
      return REALLOCATION_STATUS.APPLIED;
    case "rejected":
      return REALLOCATION_STATUS.REJECTED;
    case "cancelled":
      return REALLOCATION_STATUS.CANCELLED;
    default:
      return REALLOCATION_STATUS.PENDING;
  }
}

async function syncTargetReallocationRequestFromAmendment(requestId, transaction = null) {
  const request = await TargetReallocationRequest.findByPk(requestId, { transaction });
  if (!request?.plan_amendment_id) {
    return request;
  }

  const amendment = await PlanAmendment.findByPk(request.plan_amendment_id, { transaction });
  if (!amendment) {
    return request;
  }

  await request.update(
    {
      status: mapAmendmentStatusToReallocationStatus(amendment.status),
      reviewed_by: amendment.reviewed_by,
      reviewed_at: amendment.reviewed_at,
      review_comment: amendment.review_comment,
      applied_at: amendment.applied_at,
    },
    { transaction }
  );

  return request;
}

async function loadExecutionPeriodVersion(periodVersionId, transaction) {
  const version = await PlanVersion.findByPk(periodVersionId, { transaction });
  if (!version || version.version_kind !== "execution_period") {
    return null;
  }
  if (version.execution_snapshot_of_version_id) {
    return null;
  }
  return version;
}

async function resolveReallocationExecutionContext(
  { kpiId, fromPeriodId, toPeriodId },
  transaction
) {
  const liveAnnualKpi = await PlanNode.findByPk(kpiId, {
    include: [{ association: "planVersion" }],
    transaction,
  });

  if (!liveAnnualKpi) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.KPI_NOT_FOUND };
  }

  if (liveAnnualKpi.type !== "kpi") {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.INVALID_KPI };
  }

  if (liveAnnualKpi.planVersion?.version_kind !== "annual") {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.INVALID_KPI };
  }

  const fromPeriod = await loadExecutionPeriodVersion(fromPeriodId, transaction);
  const toPeriod = await loadExecutionPeriodVersion(toPeriodId, transaction);

  if (!fromPeriod || !toPeriod) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.PERIOD_NOT_FOUND };
  }

  if (fromPeriod.parent_plan_version_id !== toPeriod.parent_plan_version_id) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.SAME_ANNUAL_YEAR };
  }

  if (liveAnnualKpi.plan_version_id !== fromPeriod.parent_plan_version_id) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.CROSS_KPI };
  }

  const liveMasterVersionId = await resolveMasterVersionId(fromPeriod.plan_version_id);
  if (!liveMasterVersionId) {
    return { success: false, message: "Master plan version was not found" };
  }

  const liveMaster = await PlanVersion.findByPk(liveMasterVersionId, { transaction });
  if (!liveMaster?.process_started_at || !liveMaster.active_execution_snapshot_id) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.PROCESS_NOT_STARTED };
  }

  const snapshotRootId = liveMaster.active_execution_snapshot_id;
  const versionMap = await buildLiveToSnapshotVersionMap(snapshotRootId, transaction);
  const snapshotFromPeriod = versionMap.get(fromPeriod.plan_version_id);
  const snapshotToPeriod = versionMap.get(toPeriod.plan_version_id);

  if (!snapshotFromPeriod || !snapshotToPeriod) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.PERIOD_NOT_FOUND };
  }

  const liveMasterKpiId = await resolveMasterKpiIdForAnnualKpi(liveAnnualKpi, transaction);
  if (!liveMasterKpiId) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.KPI_NOT_FOUND };
  }

  const snapshotMasterKpi = await resolveSnapshotMasterKpiNode(
    snapshotRootId,
    liveMasterKpiId,
    transaction
  );
  if (!snapshotMasterKpi) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.KPI_NOT_FOUND };
  }

  const snapshotAnnualVersionId = versionMap.get(liveAnnualKpi.plan_version_id)?.plan_version_id;
  if (!snapshotAnnualVersionId) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.KPI_NOT_FOUND };
  }

  const snapshotAnnualKpi = await resolveSnapshotAnnualKpiNode(
    snapshotAnnualVersionId,
    snapshotMasterKpi.plan_node_id,
    transaction
  );
  if (!snapshotAnnualKpi) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.KPI_NOT_FOUND };
  }

  const fromPeriodNode = await resolveSnapshotPeriodKpiNode(
    snapshotFromPeriod.plan_version_id,
    snapshotAnnualKpi.plan_node_id,
    transaction
  );
  const toPeriodNode = await resolveSnapshotPeriodKpiNode(
    snapshotToPeriod.plan_version_id,
    snapshotAnnualKpi.plan_node_id,
    transaction
  );

  if (!fromPeriodNode || !toPeriodNode) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.CROSS_KPI };
  }

  if (transaction) {
    await fromPeriodNode.reload({ transaction, lock: transaction.LOCK.UPDATE });
    await toPeriodNode.reload({ transaction, lock: transaction.LOCK.UPDATE });
  }

  const fromAccess = await resolveVersionExecutionAccess(
    snapshotFromPeriod.plan_version_id,
    transaction
  );

  return {
    success: true,
    data: {
      liveMaster,
      liveMasterVersionId,
      liveMasterKpiId,
      liveAnnualKpi,
      fromPeriod,
      toPeriod,
      snapshotRootId,
      snapshotAnnualVersionId,
      snapshotAnnualKpi,
      fromPeriodNode,
      toPeriodNode,
      fromExecutionStatus: fromAccess.access?.execution_status ?? null,
    },
  };
}

function validateReallocationBusinessRules({ amount, fromPeriodNode, toPeriodNode, fromExecutionStatus }) {
  const amountValidation = validateReallocationAmount(amount);
  if (!amountValidation.valid) {
    return amountValidation;
  }

  if (isFinalizedExecutionPeriod(fromExecutionStatus)) {
    return { valid: false, message: REALLOCATION_VALIDATION_MESSAGES.FINALIZED_SOURCE };
  }

  const movable = computeMovableTarget(fromPeriodNode.period_target, fromPeriodNode.period_actual);
  const movableValidation = validateMovableAmount(amountValidation.value, movable);
  if (!movableValidation.valid) {
    return movableValidation;
  }

  const resultingValidation = validateResultingTargets({
    fromTarget: fromPeriodNode.period_target,
    toTarget: toPeriodNode.period_target,
    amount: amountValidation.value,
  });
  if (!resultingValidation.valid) {
    return resultingValidation;
  }

  return {
    valid: true,
    amount: amountValidation.value,
    movableTarget: movable,
    fromResult: resultingValidation.fromResult,
    toResult: resultingValidation.toResult,
  };
}

function serializeTargetReallocationRequest(request, includes = {}) {
  const plain = request.get ? request.get({ plain: true }) : request;
  return {
    id: plain.target_reallocation_request_id,
    target_reallocation_request_id: plain.target_reallocation_request_id,
    plan_amendment_id: plain.plan_amendment_id ?? null,
    draft_id: plain.master_plan_version_id,
    master_plan_version_id: plain.master_plan_version_id,
    kpi_id: plain.annual_kpi_plan_node_id,
    annual_kpi_plan_node_id: plain.annual_kpi_plan_node_id,
    annual_plan_version_id: plain.annual_plan_version_id,
    from_period_id: plain.from_period_version_id,
    from_period_version_id: plain.from_period_version_id,
    to_period_id: plain.to_period_version_id,
    to_period_version_id: plain.to_period_version_id,
    from_period_plan_node_id: plain.from_period_plan_node_id,
    to_period_plan_node_id: plain.to_period_plan_node_id,
    amount: plain.amount,
    reason: plain.reason,
    status: plain.status,
    requested_by: plain.requested_by,
    requested_at: plain.requested_at,
    reviewed_by: plain.reviewed_by,
    reviewed_at: plain.reviewed_at,
    review_comment: plain.review_comment,
    applied_at: plain.applied_at,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    ...includes,
  };
}

async function createTargetReallocationRequest(rawPayload, options = {}) {
  const payload = normalizeCreatePayload(rawPayload);
  const { user, ipAddress = null, io = null } = options;

  const distinctValidation = validateDistinctPeriods(payload.fromPeriodId, payload.toPeriodId);
  if (!distinctValidation.valid) {
    return { success: false, message: distinctValidation.message };
  }

  if (!payload.kpiId || !payload.fromPeriodId || !payload.toPeriodId) {
    return { success: false, message: "KPI, source period, and destination period are required" };
  }

  if (!payload.reason || !String(payload.reason).trim()) {
    return { success: false, message: "Reason is required" };
  }

  const t = await sequelize.transaction();

  try {
    const contextResult = await resolveReallocationExecutionContext(
      {
        kpiId: payload.kpiId,
        fromPeriodId: payload.fromPeriodId,
        toPeriodId: payload.toPeriodId,
      },
      t
    );

    if (!contextResult.success) {
      await t.rollback();
      return contextResult;
    }

    const context = contextResult.data;

    if (payload.draftId && String(payload.draftId) !== String(context.liveMasterVersionId)) {
      await t.rollback();
      return { success: false, message: "Draft plan does not match the selected periods" };
    }

    const scope = await assertUserCanRequestTargetReallocationOnKpi(
      user,
      context.liveMasterKpiId,
      context.liveMasterVersionId,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return {
        success: false,
        message: scope.message || REALLOCATION_VALIDATION_MESSAGES.SCOPE_DENIED,
      };
    }

    const validation = validateReallocationBusinessRules({
      amount: payload.amount,
      fromPeriodNode: context.fromPeriodNode,
      toPeriodNode: context.toPeriodNode,
      fromExecutionStatus: context.fromExecutionStatus,
    });

    if (!validation.valid) {
      await t.rollback();
      return { success: false, message: validation.message };
    }

    const annualTarget = normalizeTargetValue(context.liveAnnualKpi.annual_target);
    const currentFrom = normalizeTargetValue(context.fromPeriodNode.period_target);
    const currentTo = normalizeTargetValue(context.toPeriodNode.period_target);
    const projectedPeriodTotal = await sumOtherSnapshotPeriodTargets(
      context.snapshotAnnualKpi.plan_node_id,
      context.fromPeriodNode.plan_node_id,
      context.toPeriodNode.plan_node_id,
      validation.fromResult,
      validation.toResult,
      t
    );

    if (annualTarget > 0 && Math.abs(projectedPeriodTotal - annualTarget) > 0.001) {
      await t.rollback();
      return {
        success: false,
        message: "Period targets must continue to sum to the unchanged annual target",
      };
    }

    const requestedAt = new Date();
    const requestId = uuidv4();
    const amendmentId = uuidv4();
    const reason = String(payload.reason).trim();

    const reallocationMetadata = {
      kpiId: payload.kpiId,
      fromPeriodId: payload.fromPeriodId,
      toPeriodId: payload.toPeriodId,
      amount: validation.amount,
      reason,
      legacy_request_id: requestId,
      target_reallocation_request_id: requestId,
    };

    await PlanAmendment.create(
      {
        plan_amendment_id: amendmentId,
        master_plan_version_id: context.liveMasterVersionId,
        title: buildReallocationAmendmentTitle(validation.amount),
        description: reason,
        reason,
        amendment_type: AMENDMENT_TYPE.TARGET_REALLOCATION,
        is_package: false,
        effective_mode: "immediate",
        effective_date: null,
        metadata: reallocationMetadata,
        ...buildPendingApprovalAmendmentWorkflowFields(user.user_id, requestedAt),
      },
      { transaction: t }
    );

    await PlanAmendmentAction.create(
      {
        plan_amendment_action_id: uuidv4(),
        plan_amendment_id: amendmentId,
        action_type: AMENDMENT_TYPE.TARGET_REALLOCATION,
        sequence: 1,
        status: "pending",
        metadata: reallocationMetadata,
      },
      { transaction: t }
    );

    const request = await TargetReallocationRequest.create(
      {
        target_reallocation_request_id: requestId,
        plan_amendment_id: amendmentId,
        master_plan_version_id: context.liveMasterVersionId,
        execution_snapshot_root_id: context.snapshotRootId,
        annual_plan_version_id: context.fromPeriod.parent_plan_version_id,
        annual_kpi_plan_node_id: payload.kpiId,
        from_period_version_id: payload.fromPeriodId,
        to_period_version_id: payload.toPeriodId,
        from_period_plan_node_id: context.fromPeriodNode.plan_node_id,
        to_period_plan_node_id: context.toPeriodNode.plan_node_id,
        amount: validation.amount,
        reason,
        ...buildPendingReallocationWorkflowFields(user.user_id, requestedAt),
      },
      { transaction: t }
    );

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.PLANS,
        action: "target_reallocation_submitted",
        entityId: request.target_reallocation_request_id,
        entityLabel: context.liveAnnualKpi.title,
        summary: `Target reallocation requested: ${validation.amount} from period ${payload.fromPeriodId} to ${payload.toPeriodId}`,
        previousValues: {
          from_period_target: currentFrom,
          to_period_target: currentTo,
          annual_target: annualTarget,
        },
        newValues: {
          amount: validation.amount,
          reason: request.reason,
          status: request.status,
          movable_target: validation.movableTarget,
          plan_amendment_id: amendmentId,
        },
        changedBy: user.user_id,
        ipAddress,
      },
      t
    );

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.PLANS,
        action: "plan_amendment_submitted",
        entityId: amendmentId,
        entityLabel: buildReallocationAmendmentTitle(validation.amount),
        summary: `Plan amendment submitted for approval: ${buildReallocationAmendmentTitle(validation.amount)}`,
        previousValues: null,
        newValues: {
          amendment_type: AMENDMENT_TYPE.TARGET_REALLOCATION,
          status: "pending_approval",
          target_reallocation_request_id: requestId,
        },
        changedBy: user.user_id,
        ipAddress,
      },
      t
    );

    await t.commit();

    try {
      const approvers = await resolveTargetReallocationApproverUsers(
        context.liveMasterVersionId,
        context.liveMasterKpiId
      );
      await emitTargetReallocationSubmittedEvent(
        {
          request,
          kpiTitle: context.liveAnnualKpi.title,
          fromPeriodLabel: context.fromPeriod.period_label,
          toPeriodLabel: context.toPeriod.period_label,
          approvers,
          actor: user,
        },
        io
      );
    } catch (notifyError) {
      console.error("Target reallocation submit notification failed:", notifyError.message);
    }

    return {
      success: true,
      message: "Target reallocation request submitted",
      data: serializeTargetReallocationRequest(request, {
        movable_target: validation.movableTarget,
        projected_from_target: validation.fromResult,
        projected_to_target: validation.toResult,
      }),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function sumOtherSnapshotPeriodTargets(
  snapshotAnnualKpiNodeId,
  fromNodeId,
  toNodeId,
  fromResult,
  toResult,
  transaction
) {
  const periodNodes = await PlanNode.findAll({
    where: { source_plan_node_id: snapshotAnnualKpiNodeId, is_active: true },
    transaction,
  });

  let total = 0;
  for (const node of periodNodes) {
    if (node.plan_node_id === fromNodeId) {
      total += fromResult;
    } else if (node.plan_node_id === toNodeId) {
      total += toResult;
    } else {
      total += normalizeTargetValue(node.period_target);
    }
  }
  return total;
}

async function loadTargetReallocationRequest(requestId, transaction, { lock = false } = {}) {
  return TargetReallocationRequest.findByPk(requestId, {
    transaction,
    lock: lock ? transaction.LOCK.UPDATE : undefined,
  });
}

async function loadRequestReviewContext(request, transaction) {
  const liveAnnualKpi = await PlanNode.findByPk(request.annual_kpi_plan_node_id, { transaction });
  if (!liveAnnualKpi) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.KPI_NOT_FOUND };
  }

  const liveMasterKpiId = await resolveMasterKpiIdForAnnualKpi(liveAnnualKpi, transaction);
  if (!liveMasterKpiId) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.KPI_NOT_FOUND };
  }

  const lockOptions =
    transaction != null
      ? { transaction, lock: transaction.LOCK.UPDATE }
      : { transaction: null };

  const fromPeriodNode = await PlanNode.findByPk(request.from_period_plan_node_id, {
    include: [{ association: "planVersion" }],
    ...lockOptions,
  });
  const toPeriodNode = await PlanNode.findByPk(request.to_period_plan_node_id, {
    include: [{ association: "planVersion" }],
    ...lockOptions,
  });

  if (!fromPeriodNode || !toPeriodNode) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.PERIOD_NOT_FOUND };
  }

  const snapshotAnnualKpi = await PlanNode.findByPk(fromPeriodNode.source_plan_node_id, {
    transaction,
  });
  if (!snapshotAnnualKpi) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.KPI_NOT_FOUND };
  }

  const fromAccess = await resolveVersionExecutionAccess(
    fromPeriodNode.plan_version_id,
    transaction
  );

  return {
    success: true,
    data: {
      liveAnnualKpi,
      liveMasterKpiId,
      fromPeriodNode,
      toPeriodNode,
      snapshotAnnualKpi,
      fromExecutionStatus: fromAccess.access?.execution_status ?? null,
    },
  };
}

async function recordAllocationHistoryEntries(
  {
    request,
    fromPeriodNode,
    toPeriodNode,
    fromOldTarget,
    toOldTarget,
    fromNewTarget,
    toNewTarget,
    changedBy,
    changedAt,
  },
  transaction
) {
  const shared = {
    master_plan_version_id: request.master_plan_version_id,
    annual_kpi_plan_node_id: request.annual_kpi_plan_node_id,
    change_type: ALLOCATION_CHANGE_TYPE.REALLOCATION,
    reference_id: request.target_reallocation_request_id,
    reason: request.reason,
    changed_by: changedBy,
    changed_at: changedAt,
  };

  await TargetAllocationHistory.create(
    {
      target_allocation_history_id: uuidv4(),
      period_version_id: request.from_period_version_id,
      period_plan_node_id: fromPeriodNode.plan_node_id,
      old_target: fromOldTarget,
      new_target: fromNewTarget,
      ...shared,
    },
    { transaction }
  );

  await TargetAllocationHistory.create(
    {
      target_allocation_history_id: uuidv4(),
      period_version_id: request.to_period_version_id,
      period_plan_node_id: toPeriodNode.plan_node_id,
      old_target: toOldTarget,
      new_target: toNewTarget,
      ...shared,
    },
    { transaction }
  );
}

async function applyApprovedTargetReallocation(request, reviewContext, options = {}) {
  const { user, ipAddress = null, comment = null } = options;
  const { liveAnnualKpi, liveMasterKpiId, fromPeriodNode, toPeriodNode, snapshotAnnualKpi, fromExecutionStatus } =
    reviewContext;

  const validation = validateReallocationBusinessRules({
    amount: request.amount,
    fromPeriodNode,
    toPeriodNode,
    fromExecutionStatus,
  });

  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const annualTarget = normalizeTargetValue(liveAnnualKpi.annual_target);
  const fromOldTarget = normalizeTargetValue(fromPeriodNode.period_target);
  const toOldTarget = normalizeTargetValue(toPeriodNode.period_target);
  const projectedPeriodTotal = await sumOtherSnapshotPeriodTargets(
    snapshotAnnualKpi.plan_node_id,
    fromPeriodNode.plan_node_id,
    toPeriodNode.plan_node_id,
    validation.fromResult,
    validation.toResult,
    options.transaction
  );

  if (annualTarget > 0 && Math.abs(projectedPeriodTotal - annualTarget) > 0.001) {
    return {
      success: false,
      message: "Period targets must continue to sum to the unchanged annual target",
    };
  }

  await fromPeriodNode.update({ period_target: validation.fromResult }, { transaction: options.transaction });
  await toPeriodNode.update({ period_target: validation.toResult }, { transaction: options.transaction });

  const reviewedAt = new Date();
  const appliedAt = new Date();
  await request.update(
    {
      ...buildApprovedReallocationWorkflowFields(user.user_id, comment, reviewedAt),
      ...buildAppliedReallocationWorkflowFields(appliedAt),
    },
    { transaction: options.transaction }
  );

  await recordAllocationHistoryEntries(
    {
      request,
      fromPeriodNode,
      toPeriodNode,
      fromOldTarget,
      toOldTarget,
      fromNewTarget: validation.fromResult,
      toNewTarget: validation.toResult,
      changedBy: user.user_id,
      changedAt: appliedAt,
    },
    options.transaction
  );

  await recordSystemAuditLog(
    {
      module: AUDIT_MODULES.PLANS,
      action: "target_reallocation_applied",
      entityId: request.target_reallocation_request_id,
      entityLabel: liveAnnualKpi.title,
      summary: `Target reallocation applied: ${validation.amount} moved between periods`,
      previousValues: {
        from_period_target: fromOldTarget,
        to_period_target: toOldTarget,
        annual_target: annualTarget,
        status: REALLOCATION_STATUS.PENDING,
      },
      newValues: {
        from_period_target: validation.fromResult,
        to_period_target: validation.toResult,
        annual_target: annualTarget,
        amount: validation.amount,
        status: REALLOCATION_STATUS.APPLIED,
        review_comment: comment,
      },
      changedBy: user.user_id,
      ipAddress,
    },
    options.transaction
  );

  return {
    success: true,
    data: {
      fromOldTarget,
      toOldTarget,
      fromNewTarget: validation.fromResult,
      toNewTarget: validation.toResult,
      annualTarget,
    },
  };
}

async function approveTargetReallocationRequest(requestId, rawPayload = {}, options = {}) {
  const comment = rawPayload.comment ?? rawPayload.review_comment ?? null;
  const { user, ipAddress = null, io = null } = options;
  const t = await sequelize.transaction();

  try {
    const request = await loadTargetReallocationRequest(requestId, t, { lock: true });
    if (!request) {
      await t.rollback();
      return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.REQUEST_NOT_FOUND };
    }

    if (!isPendingReallocationStatus(request.status)) {
      await t.rollback();
      return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.REQUEST_NOT_PENDING };
    }

    if (!canTransitionReallocationStatus(request.status, REALLOCATION_STATUS.APPROVED)) {
      await t.rollback();
      return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.REQUEST_NOT_PENDING };
    }

    const reviewContextResult = await loadRequestReviewContext(request, t);
    if (!reviewContextResult.success) {
      await t.rollback();
      return reviewContextResult;
    }

    const reviewContext = reviewContextResult.data;
    const scope = await assertUserCanApproveTargetReallocationOnKpi(
      user,
      reviewContext.liveMasterKpiId,
      request.master_plan_version_id,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return {
        success: false,
        message: scope.message || REALLOCATION_VALIDATION_MESSAGES.APPROVE_SCOPE_DENIED,
      };
    }

    // Linked amendment: apply via amendment domain handler, sync both rows.
    if (request.plan_amendment_id) {
      const amendment = await PlanAmendment.findByPk(request.plan_amendment_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!amendment) {
        await t.rollback();
        return { success: false, message: "Linked plan amendment was not found" };
      }

      const {
        prepareTargetReallocationChange,
        applyPreparedTargetReallocation,
      } = require("./planAmendment/targetReallocationDomain");
      const {
        resolveNextAmendmentVersion,
        recordAmendmentHistoryRows,
      } = require("./planAmendment/planAmendmentEngine");
      const {
        buildApprovedAmendmentWorkflowFields,
        buildAppliedAmendmentWorkflowFields,
        AMENDMENT_STATUS,
      } = require("../utils/planAmendmentWorkflowUtils");

      const prepared = await prepareTargetReallocationChange(amendment.metadata, t);
      if (!prepared.success) {
        await t.rollback();
        return prepared;
      }

      const applyResult = await applyPreparedTargetReallocation(prepared, {
        user,
        transaction: t,
      });
      if (!applyResult.success) {
        await t.rollback();
        return applyResult;
      }

      const nextVersion = await resolveNextAmendmentVersion(
        amendment.master_plan_version_id,
        t
      );
      const reviewedAt = new Date();
      const appliedAt = new Date();
      const reviewComment = comment ? String(comment).trim() : null;

      await amendment.update(
        {
          ...buildApprovedAmendmentWorkflowFields(user.user_id, reviewComment, reviewedAt),
          ...buildAppliedAmendmentWorkflowFields(nextVersion, appliedAt),
        },
        { transaction: t }
      );

      const linkedAction = await PlanAmendmentAction.findOne({
        where: { plan_amendment_id: amendment.plan_amendment_id },
        order: [["sequence", "ASC"]],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (linkedAction) {
        await linkedAction.update(
          {
            status: "applied",
            applied_at: appliedAt,
            error_message: null,
          },
          { transaction: t }
        );
      }

      await recordAmendmentHistoryRows(
        amendment.plan_amendment_id,
        (applyResult.history || []).map((row) => ({
          ...row,
          plan_amendment_action_id: linkedAction?.plan_amendment_action_id ?? null,
        })),
        user.user_id,
        t,
        appliedAt
      );

      await request.update(
        {
          ...buildApprovedReallocationWorkflowFields(user.user_id, reviewComment, reviewedAt),
          ...buildAppliedReallocationWorkflowFields(appliedAt),
        },
        { transaction: t }
      );

      await recordSystemAuditLog(
        {
          module: AUDIT_MODULES.PLANS,
          action: "plan_amendment_applied",
          entityId: amendment.plan_amendment_id,
          entityLabel: amendment.title,
          summary: `Plan amendment approved and applied (v${nextVersion}): ${amendment.title}`,
          previousValues: { status: AMENDMENT_STATUS.PENDING_APPROVAL },
          newValues: {
            status: AMENDMENT_STATUS.APPLIED,
            version: nextVersion,
            target_reallocation_request_id: request.target_reallocation_request_id,
          },
          changedBy: user.user_id,
          ipAddress,
        },
        t
      );

      await t.commit();

      try {
        await emitTargetReallocationApprovedEvent(
          {
            request,
            kpiTitle: applyResult.data?.kpi_title || reviewContext.liveAnnualKpi.title,
            recipients: [{ user_id: request.requested_by }],
            actor: user,
          },
          io
        );
      } catch (notifyError) {
        console.error("Target reallocation approve notification failed:", notifyError.message);
      }

      return {
        success: true,
        message: "Target reallocation approved and applied",
        data: serializeTargetReallocationRequest(request, {
          from_period_target_before: applyResult.data.from_period_target_before,
          to_period_target_before: applyResult.data.to_period_target_before,
          from_period_target_after: applyResult.data.from_period_target_after,
          to_period_target_after: applyResult.data.to_period_target_after,
          annual_target: applyResult.data.annual_target,
          plan_amendment_version: nextVersion,
        }),
      };
    }

    const applyResult = await applyApprovedTargetReallocation(request, reviewContext, {
      user,
      ipAddress,
      comment: comment ? String(comment).trim() : null,
      transaction: t,
    });

    if (!applyResult.success) {
      await t.rollback();
      return applyResult;
    }

    await t.commit();

    try {
      await emitTargetReallocationApprovedEvent(
        {
          request,
          kpiTitle: reviewContext.liveAnnualKpi.title,
          recipients: [{ user_id: request.requested_by }],
          actor: user,
        },
        io
      );
    } catch (notifyError) {
      console.error("Target reallocation approve notification failed:", notifyError.message);
    }

    return {
      success: true,
      message: "Target reallocation approved and applied",
      data: serializeTargetReallocationRequest(request, {
        from_period_target_before: applyResult.data.fromOldTarget,
        to_period_target_before: applyResult.data.toOldTarget,
        from_period_target_after: applyResult.data.fromNewTarget,
        to_period_target_after: applyResult.data.toNewTarget,
        annual_target: applyResult.data.annualTarget,
      }),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function rejectTargetReallocationRequest(requestId, rawPayload = {}, options = {}) {
  const comment = rawPayload.comment ?? rawPayload.review_comment ?? null;
  const { user, ipAddress = null, io = null } = options;

  if (!comment || !String(comment).trim()) {
    return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.REVIEW_COMMENT_REQUIRED };
  }

  const t = await sequelize.transaction();

  try {
    const request = await loadTargetReallocationRequest(requestId, t, { lock: true });
    if (!request) {
      await t.rollback();
      return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.REQUEST_NOT_FOUND };
    }

    if (!isPendingReallocationStatus(request.status)) {
      await t.rollback();
      return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.REQUEST_NOT_PENDING };
    }

    const reviewContextResult = await loadRequestReviewContext(request, t);
    if (!reviewContextResult.success) {
      await t.rollback();
      return reviewContextResult;
    }

    const scope = await assertUserCanApproveTargetReallocationOnKpi(
      user,
      reviewContextResult.data.liveMasterKpiId,
      request.master_plan_version_id,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return {
        success: false,
        message: scope.message || REALLOCATION_VALIDATION_MESSAGES.APPROVE_SCOPE_DENIED,
      };
    }

    const previousStatus = request.status;
    const reviewComment = String(comment).trim();
    await request.update(
      buildRejectedReallocationWorkflowFields(user.user_id, reviewComment),
      { transaction: t }
    );

    if (request.plan_amendment_id) {
      const { buildRejectedAmendmentWorkflowFields } = require("../utils/planAmendmentWorkflowUtils");
      const amendment = await PlanAmendment.findByPk(request.plan_amendment_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (amendment) {
        await amendment.update(
          buildRejectedAmendmentWorkflowFields(user.user_id, reviewComment),
          { transaction: t }
        );
        await PlanAmendmentAction.update(
          { status: "cancelled" },
          {
            where: {
              plan_amendment_id: amendment.plan_amendment_id,
              status: "pending",
            },
            transaction: t,
          }
        );
      }
    }

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.PLANS,
        action: "target_reallocation_rejected",
        entityId: request.target_reallocation_request_id,
        entityLabel: reviewContextResult.data.liveAnnualKpi.title,
        summary: "Target reallocation request rejected",
        previousValues: { status: previousStatus },
        newValues: {
          status: request.status,
          review_comment: request.review_comment,
          plan_amendment_id: request.plan_amendment_id,
        },
        changedBy: user.user_id,
        ipAddress,
      },
      t
    );

    await t.commit();

    try {
      await emitTargetReallocationRejectedEvent(
        {
          request,
          kpiTitle: reviewContextResult.data.liveAnnualKpi.title,
          recipients: [{ user_id: request.requested_by }],
          actor: user,
          comment: request.review_comment,
        },
        io
      );
    } catch (notifyError) {
      console.error("Target reallocation reject notification failed:", notifyError.message);
    }

    return {
      success: true,
      message: "Target reallocation request rejected",
      data: serializeTargetReallocationRequest(request),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function cancelTargetReallocationRequest(requestId, options = {}) {
  const { user, ipAddress = null } = options;
  const t = await sequelize.transaction();

  try {
    const request = await loadTargetReallocationRequest(requestId, t, { lock: true });
    if (!request) {
      await t.rollback();
      return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.REQUEST_NOT_FOUND };
    }

    if (!isPendingReallocationStatus(request.status)) {
      await t.rollback();
      return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.REQUEST_NOT_PENDING };
    }

    if (String(request.requested_by) !== String(user.user_id)) {
      await t.rollback();
      return { success: false, message: REALLOCATION_VALIDATION_MESSAGES.CANCEL_NOT_ALLOWED };
    }

    const previousStatus = request.status;
    await request.update(buildCancelledReallocationWorkflowFields(user.user_id), { transaction: t });

    if (request.plan_amendment_id) {
      const { buildCancelledAmendmentWorkflowFields } = require("../utils/planAmendmentWorkflowUtils");
      const amendment = await PlanAmendment.findByPk(request.plan_amendment_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (amendment) {
        await PlanAmendmentAction.update(
          { status: "cancelled" },
          {
            where: {
              plan_amendment_id: amendment.plan_amendment_id,
              status: "pending",
            },
            transaction: t,
          }
        );
        await amendment.update(buildCancelledAmendmentWorkflowFields(user.user_id), {
          transaction: t,
        });
      }
    }

    const liveAnnualKpi = await PlanNode.findByPk(request.annual_kpi_plan_node_id, { transaction: t });

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.PLANS,
        action: "target_reallocation_cancelled",
        entityId: request.target_reallocation_request_id,
        entityLabel: liveAnnualKpi?.title || "Target reallocation",
        summary: "Target reallocation request cancelled",
        previousValues: { status: previousStatus },
        newValues: {
          status: request.status,
          plan_amendment_id: request.plan_amendment_id,
        },
        changedBy: user.user_id,
        ipAddress,
      },
      t
    );

    await t.commit();

    return {
      success: true,
      message: "Target reallocation request cancelled",
      data: serializeTargetReallocationRequest(request),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

const LIST_INCLUDES = [
  {
    association: "requester",
    attributes: ["user_id", "full_name", "email"],
  },
  {
    association: "reviewer",
    attributes: ["user_id", "full_name", "email"],
  },
  {
    association: "annualKpiPlanNode",
    attributes: ["plan_node_id", "title", "type"],
  },
  {
    association: "fromPeriodVersion",
    attributes: ["plan_version_id", "period_label", "sequence_index", "version_kind"],
  },
  {
    association: "toPeriodVersion",
    attributes: ["plan_version_id", "period_label", "sequence_index", "version_kind"],
  },
];

const LIST_SORT_FIELDS = new Set([
  "requested_at",
  "created_at",
  "updated_at",
  "status",
  "amount",
  "applied_at",
]);

function normalizeListQuery(query = {}) {
  return {
    draftId:
      query.draftId ??
      query.draft_id ??
      query.master_plan_version_id ??
      query.masterPlanVersionId ??
      null,
    kpiId: query.kpiId ?? query.kpi_id ?? null,
    periodId: query.periodId ?? query.period_id ?? null,
    requestorId: query.requestorId ?? query.requestor_id ?? query.requested_by ?? null,
    status: query.status ?? null,
    requestedFrom: query.requestedFrom ?? query.requested_from ?? null,
    requestedTo: query.requestedTo ?? query.requested_to ?? null,
    page: Number(query.page ?? 1),
    limit: Number(query.limit ?? 20),
    sortBy: query.sort_by ?? "requested_at",
    sortOrder: String(query.sort_order ?? "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC",
  };
}

function composeTargetReallocationWhere(normalized) {
  const where = {};

  if (normalized.draftId) {
    where.master_plan_version_id = normalized.draftId;
  }
  if (normalized.kpiId) {
    where.annual_kpi_plan_node_id = normalized.kpiId;
  }
  if (normalized.requestorId) {
    where.requested_by = normalized.requestorId;
  }
  if (normalized.status) {
    where.status = String(normalized.status).toLowerCase();
  }
  if (normalized.periodId) {
    where[Op.or] = [
      { from_period_version_id: normalized.periodId },
      { to_period_version_id: normalized.periodId },
    ];
  }
  if (normalized.requestedFrom || normalized.requestedTo) {
    where.requested_at = {};
    if (normalized.requestedFrom) {
      where.requested_at[Op.gte] = new Date(normalized.requestedFrom);
    }
    if (normalized.requestedTo) {
      where.requested_at[Op.lte] = new Date(normalized.requestedTo);
    }
  }

  return where;
}

function serializeUserSummary(user) {
  if (!user) return null;
  const plain = user.get ? user.get({ plain: true }) : user;
  return {
    user_id: plain.user_id,
    full_name: plain.full_name,
    email: plain.email,
  };
}

function serializeTargetReallocationRequestDetailed(request) {
  const base = serializeTargetReallocationRequest(request);
  const plain = request.get ? request.get({ plain: true }) : request;

  return {
    ...base,
    kpi_title: plain.annualKpiPlanNode?.title ?? null,
    from_period_label: plain.fromPeriodVersion?.period_label ?? null,
    to_period_label: plain.toPeriodVersion?.period_label ?? null,
    requested_by_user: serializeUserSummary(plain.requester),
    reviewed_by_user: serializeUserSummary(plain.reviewer),
  };
}

async function listTargetReallocationRequests(rawQuery = {}) {
  const normalized = normalizeListQuery(rawQuery);
  const where = composeTargetReallocationWhere(normalized);
  const sortField = LIST_SORT_FIELDS.has(normalized.sortBy) ? normalized.sortBy : "requested_at";
  const limit = Math.min(Math.max(normalized.limit, 1), 100);
  const page = Math.max(normalized.page, 1);
  const offset = (page - 1) * limit;

  const { rows, count } = await TargetReallocationRequest.findAndCountAll({
    where,
    include: LIST_INCLUDES,
    order: [[sortField, normalized.sortOrder]],
    limit,
    offset,
    distinct: true,
  });

  return {
    success: true,
    data: rows.map(serializeTargetReallocationRequestDetailed),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

async function loadAppliedReallocationTotals(masterPlanVersionId, filters = {}, transaction = null) {
  const where = {
    master_plan_version_id: masterPlanVersionId,
    status: REALLOCATION_STATUS.APPLIED,
  };

  if (filters.annual_kpi_plan_node_id) {
    where.annual_kpi_plan_node_id = filters.annual_kpi_plan_node_id;
  }
  if (filters.annual_plan_version_id) {
    where.annual_plan_version_id = filters.annual_plan_version_id;
  }

  const rows = await TargetReallocationRequest.findAll({
    where,
    attributes: [
      "annual_kpi_plan_node_id",
      "from_period_version_id",
      "to_period_version_id",
      "amount",
    ],
    transaction,
  });

  const outTotals = new Map();
  const inTotals = new Map();

  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    const outKey = `${row.annual_kpi_plan_node_id}:${row.from_period_version_id}`;
    const inKey = `${row.annual_kpi_plan_node_id}:${row.to_period_version_id}`;
    outTotals.set(outKey, (outTotals.get(outKey) ?? 0) + amount);
    inTotals.set(inKey, (inTotals.get(inKey) ?? 0) + amount);
  }

  return { outTotals, inTotals };
}

async function resolveReportingScope(planVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!version) {
    return { success: false, message: "Plan version not found" };
  }

  const masterVersionId = await resolveMasterVersionId(planVersionId);
  if (!masterVersionId) {
    return { success: false, message: "Master plan version was not found" };
  }

  const liveMaster = await PlanVersion.findByPk(masterVersionId, { transaction });
  if (!liveMaster?.active_execution_snapshot_id) {
    return {
      success: true,
      data: {
        masterVersionId,
        snapshotRootId: null,
        livePeriodVersionIds: [],
        annualPlanVersionId: null,
        annualKpiPlanNodeId: null,
      },
    };
  }

  const snapshotRootId = liveMaster.active_execution_snapshot_id;
  const versionMap = await buildLiveToSnapshotVersionMap(snapshotRootId, transaction);
  let livePeriodVersionIds = [];
  let annualPlanVersionId = null;

  if (version.version_kind === "execution_period") {
    const livePeriodId = version.execution_snapshot_of_version_id || version.plan_version_id;
    livePeriodVersionIds = [livePeriodId];
    const livePeriod = await PlanVersion.findByPk(livePeriodId, { transaction });
    annualPlanVersionId = livePeriod?.parent_plan_version_id ?? null;
  } else if (version.version_kind === "annual") {
    const liveAnnualId = version.execution_snapshot_of_version_id || version.plan_version_id;
    annualPlanVersionId = liveAnnualId;
    const periods = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: liveAnnualId,
        version_kind: "execution_period",
        execution_snapshot_of_version_id: null,
      },
      attributes: ["plan_version_id"],
      transaction,
    });
    livePeriodVersionIds = periods.map((period) => period.plan_version_id);
  } else if (version.version_kind === "master") {
    const annuals = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: masterVersionId,
        version_kind: "annual",
        execution_snapshot_of_version_id: null,
      },
      attributes: ["plan_version_id"],
      transaction,
    });
    for (const annual of annuals) {
      const periods = await PlanVersion.findAll({
        where: {
          parent_plan_version_id: annual.plan_version_id,
          version_kind: "execution_period",
          execution_snapshot_of_version_id: null,
        },
        attributes: ["plan_version_id"],
        transaction,
      });
      livePeriodVersionIds.push(...periods.map((period) => period.plan_version_id));
    }
  }

  return {
    success: true,
    data: {
      masterVersionId,
      snapshotRootId,
      livePeriodVersionIds,
      annualPlanVersionId,
    },
  };
}

async function getPeriodTargetReallocationReporting(planVersionId, rawQuery = {}, transaction = null) {
  const kpiId = rawQuery.kpiId ?? rawQuery.kpi_id ?? null;
  const scopeResult = await resolveReportingScope(planVersionId, transaction);
  if (!scopeResult.success) {
    return scopeResult;
  }

  const { masterVersionId, snapshotRootId, livePeriodVersionIds, annualPlanVersionId } =
    scopeResult.data;

  if (!snapshotRootId || livePeriodVersionIds.length === 0) {
    return { success: true, data: { items: [], has_execution_snapshot: false } };
  }

  const versionMap = await buildLiveToSnapshotVersionMap(snapshotRootId, transaction);
  const { byPeriodKpiKey } = await loadBaselinesForMaster(
    masterVersionId,
    snapshotRootId,
    transaction
  );
  const { outTotals, inTotals } = await loadAppliedReallocationTotals(
    masterVersionId,
    {
      annual_kpi_plan_node_id: kpiId ?? undefined,
      annual_plan_version_id: annualPlanVersionId ?? undefined,
    },
    transaction
  );

  const livePeriodMeta = await PlanVersion.findAll({
    where: { plan_version_id: { [Op.in]: livePeriodVersionIds } },
    attributes: ["plan_version_id", "period_label", "sequence_index", "parent_plan_version_id"],
    transaction,
  });
  const periodMetaById = new Map(livePeriodMeta.map((period) => [period.plan_version_id, period]));

  const items = [];

  for (const livePeriodVersionId of livePeriodVersionIds) {
    const snapshotPeriod = versionMap.get(livePeriodVersionId);
    if (!snapshotPeriod) continue;

    const nodeWhere = {
      plan_version_id: snapshotPeriod.plan_version_id,
      type: "kpi",
      is_active: true,
    };

    const periodKpiNodes = await PlanNode.findAll({
      where: nodeWhere,
      include: [{ association: "sourcePlanNode", attributes: ["plan_node_id", "title"] }],
      transaction,
    });

    for (const periodNode of periodKpiNodes) {
      const snapshotAnnualKpi = periodNode.sourcePlanNode;
      if (!snapshotAnnualKpi?.source_plan_node_id) continue;

      const snapshotMasterKpi = await PlanNode.findByPk(snapshotAnnualKpi.source_plan_node_id, {
        transaction,
      });
      const liveMasterKpiId = snapshotMasterKpi?.source_plan_node_id;
      if (!liveMasterKpiId) continue;

      const liveAnnualKpi = await PlanNode.findOne({
        where: {
          source_plan_node_id: liveMasterKpiId,
          type: "kpi",
          is_active: true,
          plan_version_id: periodMetaById.get(livePeriodVersionId)?.parent_plan_version_id,
        },
        transaction,
      });
      if (!liveAnnualKpi) continue;
      if (kpiId && String(liveAnnualKpi.plan_node_id) !== String(kpiId)) continue;

      const baselineKey = `${liveAnnualKpi.plan_node_id}:${livePeriodVersionId}`;
      const baseline = byPeriodKpiKey.get(baselineKey);
      const currentTarget = normalizeTargetValue(periodNode.period_target);
      const originalTarget = resolveOriginalTargetFromBaseline(baseline, currentTarget);
      const outKey = `${liveAnnualKpi.plan_node_id}:${livePeriodVersionId}`;
      const reallocatedOut = outTotals.get(outKey) ?? 0;
      const reallocatedIn = inTotals.get(outKey) ?? 0;
      const reporting = computeReallocationReportingFields({
        originalTarget,
        currentTarget,
        reallocatedOut,
        reallocatedIn,
      });

      const periodMeta = periodMetaById.get(livePeriodVersionId);

      items.push({
        annual_kpi_plan_node_id: liveAnnualKpi.plan_node_id,
        kpi_id: liveAnnualKpi.plan_node_id,
        kpi_title: liveAnnualKpi.title,
        period_version_id: livePeriodVersionId,
        period_id: livePeriodVersionId,
        period_label: periodMeta?.period_label ?? null,
        snapshot_period_plan_node_id: periodNode.plan_node_id,
        ...reporting,
      });
    }
  }

  items.sort((a, b) => {
    const titleCompare = String(a.kpi_title ?? "").localeCompare(String(b.kpi_title ?? ""));
    if (titleCompare !== 0) return titleCompare;
    return Number(a.period_label?.replace(/\D/g, "") ?? 0) - Number(b.period_label?.replace(/\D/g, "") ?? 0);
  });

  return {
    success: true,
    data: {
      master_plan_version_id: masterVersionId,
      has_execution_snapshot: true,
      items,
    },
  };
}

module.exports = {
  resolveReallocationExecutionContext,
  validateReallocationBusinessRules,
  sumOtherSnapshotPeriodTargets,
  serializeTargetReallocationRequest,
  syncTargetReallocationRequestFromAmendment,
  mapAmendmentStatusToReallocationStatus,
  createTargetReallocationRequest,
  loadRequestReviewContext,
  applyApprovedTargetReallocation,
  approveTargetReallocationRequest,
  rejectTargetReallocationRequest,
  cancelTargetReallocationRequest,
  normalizeListQuery,
  listTargetReallocationRequests,
  getPeriodTargetReallocationReporting,
};
