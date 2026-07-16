"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const {
  PlanAmendment,
  PlanAmendmentAction,
  sequelize,
} = require("../../models");
const { AMENDMENT_MESSAGES } = require("../../utils/planAmendmentMessages");
const {
  AMENDMENT_TYPE,
  normalizeAmendmentType,
  amendmentTypeLabel,
} = require("../../utils/planAmendmentTypes");
const {
  AMENDMENT_STATUS,
  canTransitionAmendmentStatus,
  isDraftAmendmentStatus,
  isPendingApprovalAmendmentStatus,
  buildDraftAmendmentWorkflowFields,
  buildPendingApprovalAmendmentWorkflowFields,
  buildApprovedAmendmentWorkflowFields,
  buildRejectedAmendmentWorkflowFields,
  buildCancelledAmendmentWorkflowFields,
  buildAppliedAmendmentWorkflowFields,
} = require("../../utils/planAmendmentWorkflowUtils");
const {
  normalizeActionInput,
  normalizeEffectiveMode,
  EFFECTIVE_MODE,
  serializePlanAmendmentAction,
  ACTION_STATUS,
  sortActionsBySequence,
} = require("../../utils/planAmendmentActionUtils");
const {
  resolveAmendmentHandler,
  ensureDefaultAmendmentHandlers,
} = require("./planAmendmentRegistry");
const {
  assertUserCanRequestAmendmentOnDraft,
  assertUserCanApproveAmendmentOnDraft,
  loadLiveMasterForAmendment,
  resolveAmendmentApproverUsers,
} = require("./planAmendmentScopeService");
const { AUDIT_MODULES, recordSystemAuditLog } = require("../auditLogService");
const {
  emitPlanAmendmentSubmittedEvent,
  emitPlanAmendmentApprovedEvent,
  emitPlanAmendmentRejectedEvent,
} = require("./planAmendmentNotificationService");
const {
  resolveActionHandlerOrError,
  ensureAmendmentActions,
  createAmendmentActions,
  validateAllActions,
  previewAllActions,
  applyAllActions,
  recordAmendmentHistoryRows,
  loadAmendmentActions,
  buildActionHandlerContext,
} = require("./planAmendmentActionRunner");
const {
  loadAmendmentPolicyForMaster,
  evaluateAmendmentPolicy,
} = require("./planAmendmentPolicyService");
const {
  resolveEffectiveContext,
  validateEffectiveDateForCreate,
} = require("./planAmendmentEffectiveDate");
const { detectAmendmentConflicts } = require("./planAmendmentConflictService");
const { aggregateAmendmentImpact } = require("./planAmendmentImpactService");
const {
  resolveNextAmendmentVersion,
  resolveCurrentAmendmentVersion,
} = require("./planAmendmentVersionUtils");
const {
  getPlanAmendmentReporting,
  getAmendmentHistory,
  getAmendmentActions,
} = require("./planAmendmentReportingService");

function normalizeCreateAmendmentPayload(body = {}) {
  const rawActions = Array.isArray(body.actions) ? body.actions : null;
  const legacyType = normalizeAmendmentType(
    body.amendmentType ?? body.amendment_type ?? body.type
  );
  const legacyMetadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

  let actions = null;
  if (rawActions && rawActions.length) {
    actions = rawActions.map((row, index) => normalizeActionInput(row, index));
  } else if (legacyType) {
    actions = [
      normalizeActionInput(
        {
          actionType: legacyType,
          metadata: legacyMetadata,
          sequence: 1,
        },
        0
      ),
    ];
  }

  const reasonRaw = body.reason ?? body.amendmentReason ?? body.amendment_reason ?? null;
  const description =
    body.description != null && String(body.description).trim()
      ? String(body.description).trim()
      : null;

  return {
    draftId:
      body.draftId ??
      body.draft_id ??
      body.masterPlanVersionId ??
      body.master_plan_version_id ??
      null,
    title: body.title != null ? String(body.title).trim() : "",
    description,
    reason:
      reasonRaw != null && String(reasonRaw).trim()
        ? String(reasonRaw).trim()
        : description,
    amendmentType: legacyType || (actions?.[0]?.actionType ?? null),
    metadata: legacyMetadata,
    actions,
    effectiveMode: normalizeEffectiveMode(
      body.effectiveMode ?? body.effective_mode ?? EFFECTIVE_MODE.IMMEDIATE
    ),
    effectiveDate: body.effectiveDate ?? body.effective_date ?? null,
    expectedVersion:
      body.expectedVersion ?? body.expected_version ?? body.baseVersion ?? null,
    compensatesAmendmentId:
      body.compensatesAmendmentId ??
      body.compensates_amendment_id ??
      body.compensates ??
      null,
    emergency: body.emergency === true || body.isEmergency === true,
    submit:
      body.submit === true ||
      body.submitImmediately === true ||
      body.status === AMENDMENT_STATUS.PENDING_APPROVAL ||
      body.status === "PENDING_APPROVAL",
    asDraft:
      body.asDraft === true ||
      body.as_draft === true ||
      body.status === AMENDMENT_STATUS.DRAFT ||
      body.status === "DRAFT",
  };
}

function serializePlanAmendment(amendment, extras = {}) {
  const plain = amendment.get ? amendment.get({ plain: true }) : amendment;
  return {
    id: plain.plan_amendment_id,
    plan_amendment_id: plain.plan_amendment_id,
    draft_id: plain.master_plan_version_id,
    master_plan_version_id: plain.master_plan_version_id,
    title: plain.title,
    description: plain.description,
    reason: plain.reason ?? plain.description ?? null,
    amendment_type: plain.amendment_type,
    is_package: Boolean(plain.is_package),
    status: plain.status,
    requested_by: plain.requested_by,
    requested_at: plain.requested_at,
    reviewed_by: plain.reviewed_by,
    reviewed_at: plain.reviewed_at,
    review_comment: plain.review_comment,
    applied_at: plain.applied_at,
    cancelled_at: plain.cancelled_at,
    effective_mode: plain.effective_mode ?? EFFECTIVE_MODE.IMMEDIATE,
    effective_date: plain.effective_date,
    expected_version: plain.expected_version ?? null,
    compensates_amendment_id: plain.compensates_amendment_id ?? null,
    version: plain.version,
    metadata: plain.metadata || {},
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    ...extras,
  };
}

async function loadPlanAmendment(amendmentId, transaction = null, { lock = false } = {}) {
  return PlanAmendment.findByPk(amendmentId, {
    transaction,
    lock: lock && transaction ? transaction.LOCK.UPDATE : undefined,
  });
}

function resolveHandlerOrError(amendmentType) {
  return resolveActionHandlerOrError(amendmentType);
}

/**
 * @deprecated Prefer buildActionHandlerContext. Kept for verify scripts / BC.
 */
function buildHandlerContext(amendment, user, transaction = null, options = {}) {
  return {
    amendment,
    action: null,
    metadata: amendment.metadata || {},
    user,
    transaction,
    policy: options.policy ?? null,
    effective: options.effective ?? null,
    options,
  };
}

async function preparePackageContext(amendment, user, options = {}) {
  const actions = await ensureAmendmentActions(amendment, options.transaction ?? null);
  const policy = await loadAmendmentPolicyForMaster(
    amendment.master_plan_version_id,
    options.transaction ?? null
  );
  const effectiveResult = resolveEffectiveContext(amendment);
  if (!effectiveResult.success) {
    return { success: false, message: effectiveResult.message };
  }

  const policyCheck = evaluateAmendmentPolicy(
    policy,
    actions.map((a) => ({ actionType: a.action_type })),
    { emergency: options.emergency === true }
  );
  if (!policyCheck.valid) {
    return {
      success: false,
      message: policyCheck.message,
      details: { errors: policyCheck.errors, policy: policyCheck.policy },
    };
  }

  return {
    success: true,
    actions,
    policy: policyCheck.policy,
    effective: effectiveResult.data,
  };
}

/**
 * Create a plan amendment package (one or more actions) as draft or pending_approval.
 */
async function createPlanAmendment(rawPayload = {}, options = {}) {
  const payload = normalizeCreateAmendmentPayload(rawPayload);
  const { user, ipAddress = null, io = null } = options;

  if (!payload.actions?.length) {
    const rawType = rawPayload.amendmentType ?? rawPayload.amendment_type ?? rawPayload.type;
    return {
      success: false,
      message: rawType
        ? AMENDMENT_MESSAGES.TYPE_UNKNOWN
        : AMENDMENT_MESSAGES.ACTIONS_REQUIRED || AMENDMENT_MESSAGES.TYPE_REQUIRED,
    };
  }

  if (!payload.title) {
    return { success: false, message: AMENDMENT_MESSAGES.TITLE_REQUIRED };
  }

  if (payload.effectiveMode == null) {
    return {
      success: false,
      message: "Invalid effective mode. Use immediate, next_period, or custom_date.",
    };
  }

  const effectiveCheck = validateEffectiveDateForCreate({
    effectiveMode: payload.effectiveMode,
    effectiveDate: payload.effectiveDate,
  });
  if (!effectiveCheck.valid) {
    return { success: false, message: effectiveCheck.message };
  }

  for (const action of payload.actions) {
    if (!action.actionType) {
      return { success: false, message: AMENDMENT_MESSAGES.TYPE_UNKNOWN };
    }
    const handlerResult = resolveActionHandlerOrError(action.actionType);
    if (!handlerResult.success) {
      return handlerResult;
    }
  }

  const createAsPending = payload.submit && !payload.asDraft;
  const t = await sequelize.transaction();

  try {
    const scope = await assertUserCanRequestAmendmentOnDraft(user, payload.draftId, t);
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    const master = scope.master;
    const policy = await loadAmendmentPolicyForMaster(master.plan_version_id, t);
    const policyCheck = evaluateAmendmentPolicy(policy, payload.actions, {
      emergency: payload.emergency,
    });
    if (!policyCheck.valid) {
      await t.rollback();
      return {
        success: false,
        message: policyCheck.message,
        details: { errors: policyCheck.errors },
      };
    }

    const now = new Date();
    const workflowFields = createAsPending
      ? buildPendingApprovalAmendmentWorkflowFields(user.user_id, now)
      : buildDraftAmendmentWorkflowFields(user.user_id, now);

    const primaryType = payload.actions[0].actionType;
    const isPackage = payload.actions.length > 1;
    const amendmentId = uuidv4();

    // BC: keep first action metadata on amendment.metadata for single-action / facade reads.
    const packageMetadata =
      payload.actions.length === 1
        ? payload.actions[0].metadata
        : {
            package: true,
            action_types: payload.actions.map((a) => a.actionType),
            ...(payload.metadata || {}),
          };

    const amendment = await PlanAmendment.create(
      {
        plan_amendment_id: amendmentId,
        master_plan_version_id: master.plan_version_id,
        title: payload.title,
        description: payload.description,
        reason: payload.reason,
        amendment_type: primaryType,
        is_package: isPackage,
        effective_mode: payload.effectiveMode,
        effective_date: payload.effectiveDate,
        expected_version:
          payload.expectedVersion != null && payload.expectedVersion !== ""
            ? Number(payload.expectedVersion)
            : null,
        compensates_amendment_id: payload.compensatesAmendmentId,
        metadata: packageMetadata,
        ...workflowFields,
      },
      { transaction: t }
    );

    const actionsResult = await createAmendmentActions(
      amendmentId,
      payload.actions,
      t
    );
    if (!actionsResult.success) {
      await t.rollback();
      return actionsResult;
    }

    const prepared = {
      actions: actionsResult.data,
      policy: policyCheck.policy,
      effective: effectiveCheck.effective,
    };

    if (createAsPending) {
      const validation = await validateAllActions(amendment, prepared.actions, user, {
        transaction: t,
        policy: prepared.policy,
        effective: prepared.effective,
      });
      if (!validation.valid) {
        await t.rollback();
        return {
          success: false,
          message: validation.message,
          details: validation.details,
        };
      }

      const conflicts = await detectAmendmentConflicts(
        amendment,
        prepared.actions,
        user,
        {
          transaction: t,
          policy: prepared.policy,
          effective: prepared.effective,
        }
      );
      if (!conflicts.valid) {
        await t.rollback();
        return {
          success: false,
          message: conflicts.message,
          details: conflicts.details,
        };
      }
    }

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.PLANS,
        action: createAsPending ? "plan_amendment_submitted" : "plan_amendment_created",
        entityId: amendment.plan_amendment_id,
        entityLabel: amendment.title,
        summary: createAsPending
          ? `Plan amendment submitted for approval: ${amendment.title}`
          : `Plan amendment draft created: ${amendment.title}`,
        previousValues: null,
        newValues: {
          amendment_type: amendment.amendment_type,
          is_package: amendment.is_package,
          status: amendment.status,
          action_count: prepared.actions.length,
          master_plan_version_id: amendment.master_plan_version_id,
        },
        changedBy: user.user_id,
        ipAddress,
      },
      t
    );

    await t.commit();

    if (createAsPending) {
      try {
        const approvers = await resolveAmendmentApproverUsers(master.plan_version_id);
        await emitPlanAmendmentSubmittedEvent(
          { amendment, approvers, actor: user },
          options.io ?? io
        );
      } catch (notifyError) {
        console.error("Plan amendment submit notification failed:", notifyError.message);
      }
    }

    return {
      success: true,
      message: createAsPending
        ? "Plan amendment submitted for approval"
        : "Plan amendment draft created",
      data: serializePlanAmendment(amendment, {
        amendment_type_label: amendmentTypeLabel(amendment.amendment_type),
        actions: prepared.actions.map((row) => serializePlanAmendmentAction(row)),
      }),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function submitPlanAmendment(amendmentId, options = {}) {
  const { user, ipAddress = null, io = null } = options;
  const t = await sequelize.transaction();

  try {
    const amendment = await loadPlanAmendment(amendmentId, t, { lock: true });
    if (!amendment) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.AMENDMENT_NOT_FOUND };
    }

    if (!isDraftAmendmentStatus(amendment.status)) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.NOT_DRAFT };
    }

    if (
      !canTransitionAmendmentStatus(
        amendment.status,
        AMENDMENT_STATUS.PENDING_APPROVAL
      )
    ) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.INVALID_TRANSITION };
    }

    if (String(amendment.requested_by) !== String(user.user_id)) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.SUBMIT_NOT_ALLOWED };
    }

    const scope = await assertUserCanRequestAmendmentOnDraft(
      user,
      amendment.master_plan_version_id,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    const prepared = await preparePackageContext(amendment, user, { transaction: t });
    if (!prepared.success) {
      await t.rollback();
      return prepared;
    }

    const validation = await validateAllActions(amendment, prepared.actions, user, {
      transaction: t,
      policy: prepared.policy,
      effective: prepared.effective,
    });
    if (!validation.valid) {
      await t.rollback();
      return {
        success: false,
        message: validation.message,
        details: validation.details,
      };
    }

    const conflicts = await detectAmendmentConflicts(
      amendment,
      prepared.actions,
      user,
      {
        transaction: t,
        policy: prepared.policy,
        effective: prepared.effective,
      }
    );
    if (!conflicts.valid) {
      await t.rollback();
      return {
        success: false,
        message: conflicts.message,
        details: conflicts.details,
      };
    }

    const now = new Date();
    await amendment.update(
      {
        ...buildPendingApprovalAmendmentWorkflowFields(user.user_id, now),
      },
      { transaction: t }
    );

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.PLANS,
        action: "plan_amendment_submitted",
        entityId: amendment.plan_amendment_id,
        entityLabel: amendment.title,
        summary: `Plan amendment submitted for approval: ${amendment.title}`,
        previousValues: { status: AMENDMENT_STATUS.DRAFT },
        newValues: { status: AMENDMENT_STATUS.PENDING_APPROVAL },
        changedBy: user.user_id,
        ipAddress,
      },
      t
    );

    await t.commit();

    try {
      const approvers = await resolveAmendmentApproverUsers(
        amendment.master_plan_version_id
      );
      await emitPlanAmendmentSubmittedEvent(
        { amendment, approvers, actor: user },
        io
      );
    } catch (notifyError) {
      console.error("Plan amendment submit notification failed:", notifyError.message);
    }

    return {
      success: true,
      message: "Plan amendment submitted for approval",
      data: serializePlanAmendment(amendment, {
        actions: prepared.actions.map((row) => serializePlanAmendmentAction(row)),
      }),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function rejectPlanAmendment(amendmentId, rawPayload = {}, options = {}) {
  const comment = rawPayload.comment ?? rawPayload.review_comment ?? null;
  const { user, ipAddress = null, io = null } = options;

  if (!comment || !String(comment).trim()) {
    return { success: false, message: AMENDMENT_MESSAGES.REVIEW_COMMENT_REQUIRED };
  }

  const t = await sequelize.transaction();

  try {
    const amendment = await loadPlanAmendment(amendmentId, t, { lock: true });
    if (!amendment) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.AMENDMENT_NOT_FOUND };
    }

    if (!isPendingApprovalAmendmentStatus(amendment.status)) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.NOT_PENDING };
    }

    if (
      !canTransitionAmendmentStatus(amendment.status, AMENDMENT_STATUS.REJECTED)
    ) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.INVALID_TRANSITION };
    }

    const scope = await assertUserCanApproveAmendmentOnDraft(
      user,
      amendment.master_plan_version_id,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    const previousStatus = amendment.status;
    await amendment.update(
      buildRejectedAmendmentWorkflowFields(user.user_id, String(comment).trim()),
      { transaction: t }
    );

    await PlanAmendmentAction.update(
      { status: ACTION_STATUS.CANCELLED },
      {
        where: {
          plan_amendment_id: amendment.plan_amendment_id,
          status: ACTION_STATUS.PENDING,
        },
        transaction: t,
      }
    );

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.PLANS,
        action: "plan_amendment_rejected",
        entityId: amendment.plan_amendment_id,
        entityLabel: amendment.title,
        summary: `Plan amendment rejected: ${amendment.title}`,
        previousValues: { status: previousStatus },
        newValues: {
          status: AMENDMENT_STATUS.REJECTED,
          review_comment: String(comment).trim(),
        },
        changedBy: user.user_id,
        ipAddress,
      },
      t
    );

    await t.commit();

    try {
      await emitPlanAmendmentRejectedEvent(
        {
          amendment,
          recipients: [{ user_id: amendment.requested_by }],
          actor: user,
          comment: String(comment).trim(),
        },
        io
      );
    } catch (notifyError) {
      console.error("Plan amendment reject notification failed:", notifyError.message);
    }

    return {
      success: true,
      message: "Plan amendment rejected",
      data: serializePlanAmendment(amendment),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function cancelPlanAmendment(amendmentId, options = {}) {
  const { user, ipAddress = null } = options;
  const t = await sequelize.transaction();

  try {
    const amendment = await loadPlanAmendment(amendmentId, t, { lock: true });
    if (!amendment) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.AMENDMENT_NOT_FOUND };
    }

    const cancellable =
      isDraftAmendmentStatus(amendment.status) ||
      isPendingApprovalAmendmentStatus(amendment.status);

    if (!cancellable) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.CANCEL_NOT_ALLOWED };
    }

    if (String(amendment.requested_by) !== String(user.user_id)) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.CANCEL_NOT_ALLOWED };
    }

    if (!canTransitionAmendmentStatus(amendment.status, AMENDMENT_STATUS.CANCELLED)) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.INVALID_TRANSITION };
    }

    const previousStatus = amendment.status;
    await amendment.update(buildCancelledAmendmentWorkflowFields(user.user_id), {
      transaction: t,
    });

    await PlanAmendmentAction.update(
      { status: ACTION_STATUS.CANCELLED },
      {
        where: {
          plan_amendment_id: amendment.plan_amendment_id,
          status: ACTION_STATUS.PENDING,
        },
        transaction: t,
      }
    );

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.PLANS,
        action: "plan_amendment_cancelled",
        entityId: amendment.plan_amendment_id,
        entityLabel: amendment.title,
        summary: `Plan amendment cancelled: ${amendment.title}`,
        previousValues: { status: previousStatus },
        newValues: { status: AMENDMENT_STATUS.CANCELLED },
        changedBy: user.user_id,
        ipAddress,
      },
      t
    );

    await t.commit();

    return {
      success: true,
      message: "Plan amendment cancelled",
      data: serializePlanAmendment(amendment),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function getPlanAmendmentById(amendmentId) {
  const amendment = await loadPlanAmendment(amendmentId);
  if (!amendment) {
    return { success: false, message: AMENDMENT_MESSAGES.AMENDMENT_NOT_FOUND };
  }

  const actions = await ensureAmendmentActions(amendment);
  return {
    success: true,
    data: serializePlanAmendment(amendment, {
      amendment_type_label: amendmentTypeLabel(amendment.amendment_type),
      actions: actions.map((row) => serializePlanAmendmentAction(row)),
    }),
  };
}

/**
 * Read-only aggregated preview across all actions. Does not mutate the plan.
 */
async function previewPlanAmendment(amendmentId, options = {}) {
  const { user } = options;
  const amendment = await loadPlanAmendment(amendmentId);
  if (!amendment) {
    return { success: false, message: AMENDMENT_MESSAGES.AMENDMENT_NOT_FOUND };
  }

  const scope = await assertUserCanRequestAmendmentOnDraft(
    user,
    amendment.master_plan_version_id
  );
  const approveScope = scope.allowed
    ? scope
    : await assertUserCanApproveAmendmentOnDraft(user, amendment.master_plan_version_id);

  if (!approveScope.allowed) {
    return { success: false, message: approveScope.message || scope.message };
  }

  const prepared = await preparePackageContext(amendment, user);
  if (!prepared.success) {
    return prepared;
  }

  const preview = await previewAllActions(amendment, prepared.actions, user, {
    policy: prepared.policy,
    effective: prepared.effective,
  });
  if (!preview.success) {
    return preview;
  }

  return {
    success: true,
    data: {
      amendment: serializePlanAmendment(amendment, {
        amendment_type_label: amendmentTypeLabel(amendment.amendment_type),
        actions: prepared.actions.map((row) => serializePlanAmendmentAction(row)),
      }),
      preview: preview.data,
      // BC: single-action clients still receive top-level preview of first action
      legacy_preview:
        preview.data.actions?.length === 1 ? preview.data.actions[0].preview : null,
    },
  };
}

async function getPlanAmendmentImpact(amendmentId, options = {}) {
  const { user } = options;
  const amendment = await loadPlanAmendment(amendmentId);
  if (!amendment) {
    return { success: false, message: AMENDMENT_MESSAGES.AMENDMENT_NOT_FOUND };
  }

  const scope = await assertUserCanRequestAmendmentOnDraft(
    user,
    amendment.master_plan_version_id
  );
  const approveScope = scope.allowed
    ? scope
    : await assertUserCanApproveAmendmentOnDraft(user, amendment.master_plan_version_id);

  if (!approveScope.allowed) {
    return { success: false, message: approveScope.message || scope.message };
  }

  const prepared = await preparePackageContext(amendment, user);
  if (!prepared.success) {
    return prepared;
  }

  return aggregateAmendmentImpact(amendment, prepared.actions, user, {
    policy: prepared.policy,
    effective: prepared.effective,
  });
}

/**
 * Approve auto-applies all actions in one transaction.
 * If any action fails, the entire amendment rolls back (DB transaction).
 */
async function approvePlanAmendment(amendmentId, rawPayload = {}, options = {}) {
  const comment = rawPayload.comment ?? rawPayload.review_comment ?? null;
  const { user, ipAddress = null, io = null } = options;
  const t = await sequelize.transaction();

  try {
    const amendment = await loadPlanAmendment(amendmentId, t, { lock: true });
    if (!amendment) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.AMENDMENT_NOT_FOUND };
    }

    if (!isPendingApprovalAmendmentStatus(amendment.status)) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.NOT_PENDING };
    }

    if (!canTransitionAmendmentStatus(amendment.status, AMENDMENT_STATUS.APPROVED)) {
      await t.rollback();
      return { success: false, message: AMENDMENT_MESSAGES.INVALID_TRANSITION };
    }

    const scope = await assertUserCanApproveAmendmentOnDraft(
      user,
      amendment.master_plan_version_id,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    const prepared = await preparePackageContext(amendment, user, {
      transaction: t,
      emergency: rawPayload.emergency === true,
    });
    if (!prepared.success) {
      await t.rollback();
      return prepared;
    }

    const conflicts = await detectAmendmentConflicts(
      amendment,
      prepared.actions,
      user,
      {
        transaction: t,
        policy: prepared.policy,
        effective: prepared.effective,
      }
    );
    if (!conflicts.valid) {
      await t.rollback();
      return {
        success: false,
        message: conflicts.message,
        details: conflicts.details,
      };
    }

    const applyResult = await applyAllActions(
      amendment,
      prepared.actions,
      user,
      t,
      {
        policy: prepared.policy,
        effective: prepared.effective,
        options: { ipAddress, io },
      }
    );
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

    await amendment.update(
      {
        ...buildApprovedAmendmentWorkflowFields(
          user.user_id,
          comment ? String(comment).trim() : null,
          reviewedAt
        ),
        ...buildAppliedAmendmentWorkflowFields(nextVersion, appliedAt),
      },
      { transaction: t }
    );

    await recordAmendmentHistoryRows(
      amendment.plan_amendment_id,
      applyResult.history || [],
      user.user_id,
      t,
      appliedAt
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
          action_count: prepared.actions.length,
          review_comment: comment ? String(comment).trim() : null,
        },
        changedBy: user.user_id,
        ipAddress,
      },
      t
    );

    await t.commit();

    try {
      await emitPlanAmendmentApprovedEvent(
        {
          amendment,
          recipients: [{ user_id: amendment.requested_by }],
          actor: user,
        },
        io
      );
    } catch (notifyError) {
      console.error("Plan amendment approve notification failed:", notifyError.message);
    }

    return {
      success: true,
      message: "Plan amendment approved and applied",
      data: serializePlanAmendment(amendment, {
        amendment_type_label: amendmentTypeLabel(amendment.amendment_type),
        apply: applyResult.data ?? null,
        actions: prepared.actions.map((row) => serializePlanAmendmentAction(row)),
      }),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * Forward-only compensation: create a draft amendment that references an applied one.
 * Does not reverse SQL or delete history.
 */
async function createCompensatingAmendment(originalAmendmentId, rawPayload = {}, options = {}) {
  const original = await loadPlanAmendment(originalAmendmentId);
  if (!original) {
    return { success: false, message: AMENDMENT_MESSAGES.AMENDMENT_NOT_FOUND };
  }
  if (original.status !== AMENDMENT_STATUS.APPLIED) {
    return {
      success: false,
      message: "Only applied amendments can be compensated.",
    };
  }

  const title =
    rawPayload.title != null && String(rawPayload.title).trim()
      ? String(rawPayload.title).trim()
      : `Compensating amendment for: ${original.title}`;

  return createPlanAmendment(
    {
      draftId: original.master_plan_version_id,
      title,
      description: rawPayload.description ?? null,
      reason: rawPayload.reason ?? `Compensation for amendment ${original.plan_amendment_id}`,
      amendmentType: rawPayload.amendmentType ?? original.amendment_type,
      actions: rawPayload.actions,
      metadata: rawPayload.metadata ?? {},
      effectiveMode: rawPayload.effectiveMode ?? EFFECTIVE_MODE.IMMEDIATE,
      effectiveDate: rawPayload.effectiveDate ?? null,
      compensatesAmendmentId: original.plan_amendment_id,
      asDraft: true,
      submit: false,
    },
    options
  );
}

function normalizeListAmendmentsQuery(query = {}) {
  return {
    draftId:
      query.draftId ??
      query.draft_id ??
      query.master_plan_version_id ??
      query.masterPlanVersionId ??
      null,
    amendmentType: normalizeAmendmentType(
      query.amendmentType ?? query.amendment_type ?? query.type
    ),
    status: query.status
      ? String(query.status).trim().toLowerCase().replace(/[\s-]+/g, "_")
      : null,
    requestorId: query.requestorId ?? query.requestor_id ?? query.requested_by ?? null,
    requestedFrom: query.requestedFrom ?? query.requested_from ?? null,
    requestedTo: query.requestedTo ?? query.requested_to ?? null,
    version:
      query.version != null && query.version !== "" ? Number(query.version) : null,
    page: Number(query.page ?? 1),
    limit: Number(query.limit ?? 20),
    sortBy: query.sort_by ?? "requested_at",
    sortOrder: String(query.sort_order ?? "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC",
  };
}

async function listPlanAmendments(rawQuery = {}) {
  const normalized = normalizeListAmendmentsQuery(rawQuery);
  const where = {};

  if (normalized.draftId) {
    where.master_plan_version_id = normalized.draftId;
  }
  if (normalized.amendmentType) {
    where.amendment_type = normalized.amendmentType;
  }
  if (normalized.status) {
    where.status = normalized.status;
  }
  if (normalized.requestorId) {
    where.requested_by = normalized.requestorId;
  }
  if (normalized.version != null && Number.isFinite(normalized.version)) {
    where.version = normalized.version;
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

  const sortFields = new Set([
    "requested_at",
    "created_at",
    "updated_at",
    "status",
    "version",
    "applied_at",
  ]);
  const sortField = sortFields.has(normalized.sortBy) ? normalized.sortBy : "requested_at";
  const limit = Math.min(Math.max(normalized.limit, 1), 100);
  const page = Math.max(normalized.page, 1);
  const offset = (page - 1) * limit;

  const { rows, count } = await PlanAmendment.findAndCountAll({
    where,
    include: [
      {
        association: "requester",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        association: "reviewer",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        model: PlanAmendmentAction,
        as: "actions",
        required: false,
      },
    ],
    order: [
      [sortField, normalized.sortOrder],
      [{ model: PlanAmendmentAction, as: "actions" }, "sequence", "ASC"],
    ],
    limit,
    offset,
    distinct: true,
  });

  return {
    success: true,
    data: rows.map((row) =>
      serializePlanAmendment(row, {
        amendment_type_label: amendmentTypeLabel(row.amendment_type),
        requester: row.requester || null,
        reviewer: row.reviewer || null,
        actions: sortActionsBySequence(row.actions || []).map((action) =>
          serializePlanAmendmentAction(action)
        ),
      })
    ),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

module.exports = {
  AMENDMENT_TYPE,
  normalizeCreateAmendmentPayload,
  normalizeListAmendmentsQuery,
  serializePlanAmendment,
  loadPlanAmendment,
  resolveHandlerOrError,
  buildHandlerContext,
  buildActionHandlerContext,
  resolveNextAmendmentVersion,
  resolveCurrentAmendmentVersion,
  recordAmendmentHistoryRows,
  createPlanAmendment,
  submitPlanAmendment,
  previewPlanAmendment,
  getPlanAmendmentImpact,
  approvePlanAmendment,
  rejectPlanAmendment,
  cancelPlanAmendment,
  getPlanAmendmentById,
  listPlanAmendments,
  createCompensatingAmendment,
  getPlanAmendmentReporting,
  getAmendmentHistory,
  getAmendmentActions,
  loadAmendmentActions,
  ensureAmendmentActions,
  loadLiveMasterForAmendment,
  ensureDefaultAmendmentHandlers,
  resolveAmendmentHandler,
};
