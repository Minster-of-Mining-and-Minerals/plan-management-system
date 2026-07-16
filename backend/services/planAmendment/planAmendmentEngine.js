"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const { PlanAmendment, PlanAmendmentHistory, sequelize } = require("../../models");
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

function normalizeCreateAmendmentPayload(body = {}) {
  return {
    draftId:
      body.draftId ??
      body.draft_id ??
      body.masterPlanVersionId ??
      body.master_plan_version_id ??
      null,
    title: body.title != null ? String(body.title).trim() : "",
    description:
      body.description != null && String(body.description).trim()
        ? String(body.description).trim()
        : null,
    amendmentType: normalizeAmendmentType(
      body.amendmentType ?? body.amendment_type ?? body.type
    ),
    metadata:
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {},
    effectiveDate: body.effectiveDate ?? body.effective_date ?? null,
    /** When true (default for facade flows), create as pending_approval */
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
    amendment_type: plain.amendment_type,
    status: plain.status,
    requested_by: plain.requested_by,
    requested_at: plain.requested_at,
    reviewed_by: plain.reviewed_by,
    reviewed_at: plain.reviewed_at,
    review_comment: plain.review_comment,
    applied_at: plain.applied_at,
    cancelled_at: plain.cancelled_at,
    effective_date: plain.effective_date,
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
  ensureDefaultAmendmentHandlers();
  const type = normalizeAmendmentType(amendmentType);
  if (!type) {
    return { success: false, message: AMENDMENT_MESSAGES.TYPE_UNKNOWN };
  }

  const handler = resolveAmendmentHandler(type);
  if (!handler) {
    return { success: false, message: AMENDMENT_MESSAGES.HANDLER_MISSING };
  }

  if (!handler.isAvailable()) {
    return { success: false, message: AMENDMENT_MESSAGES.TYPE_UNAVAILABLE };
  }

  return { success: true, type, handler };
}

/**
 * Create a plan amendment as draft or pending_approval.
 * Domain handler.validate is deferred to Step 3/4 (preview/apply).
 */
async function createPlanAmendment(rawPayload = {}, options = {}) {
  const payload = normalizeCreateAmendmentPayload(rawPayload);
  const { user, ipAddress = null, io = null } = options;

  if (!payload.amendmentType) {
    const rawType = rawPayload.amendmentType ?? rawPayload.amendment_type ?? rawPayload.type;
    return {
      success: false,
      message: rawType ? AMENDMENT_MESSAGES.TYPE_UNKNOWN : AMENDMENT_MESSAGES.TYPE_REQUIRED,
    };
  }

  if (!payload.title) {
    return { success: false, message: AMENDMENT_MESSAGES.TITLE_REQUIRED };
  }

  const handlerResult = resolveHandlerOrError(payload.amendmentType);
  if (!handlerResult.success) {
    return handlerResult;
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
    const now = new Date();
    const workflowFields = createAsPending
      ? buildPendingApprovalAmendmentWorkflowFields(user.user_id, now)
      : buildDraftAmendmentWorkflowFields(user.user_id, now);

    const amendment = await PlanAmendment.create(
      {
        plan_amendment_id: uuidv4(),
        master_plan_version_id: master.plan_version_id,
        title: payload.title,
        description: payload.description,
        amendment_type: handlerResult.type,
        effective_date: payload.effectiveDate,
        metadata: payload.metadata,
        ...workflowFields,
      },
      { transaction: t }
    );

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
          status: amendment.status,
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

    const handlerResult = resolveHandlerOrError(amendment.amendment_type);
    if (!handlerResult.success) {
      await t.rollback();
      return handlerResult;
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
      data: serializePlanAmendment(amendment),
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
  return {
    success: true,
    data: serializePlanAmendment(amendment, {
      amendment_type_label: amendmentTypeLabel(amendment.amendment_type),
    }),
  };
}

function buildHandlerContext(amendment, user, transaction = null, options = {}) {
  return {
    amendment,
    metadata: amendment.metadata || {},
    user,
    transaction,
    options,
  };
}

async function resolveNextAmendmentVersion(masterPlanVersionId, transaction = null) {
  const currentMax = await PlanAmendment.max("version", {
    where: {
      master_plan_version_id: masterPlanVersionId,
      version: { [Op.ne]: null },
    },
    transaction,
  });
  return (Number(currentMax) || 0) + 1;
}

async function recordAmendmentHistoryRows(
  amendmentId,
  historyRows,
  changedBy,
  transaction,
  changedAt = new Date()
) {
  const rows = Array.isArray(historyRows) ? historyRows : [];
  if (!rows.length) {
    return [];
  }

  const created = [];
  for (const row of rows) {
    const history = await PlanAmendmentHistory.create(
      {
        plan_amendment_history_id: uuidv4(),
        plan_amendment_id: amendmentId,
        entity_type: String(row.entity_type),
        entity_id: row.entity_id,
        field_name: String(row.field_name),
        old_value:
          row.old_value === undefined || row.old_value === null
            ? null
            : String(row.old_value),
        new_value:
          row.new_value === undefined || row.new_value === null
            ? null
            : String(row.new_value),
        changed_at: changedAt,
        changed_by: changedBy,
      },
      { transaction }
    );
    created.push(history);
  }
  return created;
}

/**
 * Read-only preview via the type handler. Does not mutate the plan.
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

  const handlerResult = resolveHandlerOrError(amendment.amendment_type);
  if (!handlerResult.success) {
    return handlerResult;
  }

  const validation = await handlerResult.handler.validate(
    buildHandlerContext(amendment, user)
  );
  if (!validation?.valid) {
    return {
      success: false,
      message: validation?.message || AMENDMENT_MESSAGES.VALIDATION_FAILED,
      details: validation?.details,
    };
  }

  const preview = await handlerResult.handler.preview(
    buildHandlerContext(amendment, user)
  );
  if (!preview?.success) {
    return {
      success: false,
      message: preview?.message || AMENDMENT_MESSAGES.PREVIEW_FAILED,
      details: preview?.data,
    };
  }

  return {
    success: true,
    data: {
      amendment: serializePlanAmendment(amendment, {
        amendment_type_label: amendmentTypeLabel(amendment.amendment_type),
      }),
      preview: preview.data ?? null,
    },
  };
}

/**
 * Approve auto-applies in one transaction: validate → apply → history → version → applied.
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

    const handlerResult = resolveHandlerOrError(amendment.amendment_type);
    if (!handlerResult.success) {
      await t.rollback();
      return handlerResult;
    }

    const ctx = buildHandlerContext(amendment, user, t, { ipAddress, io });
    const validation = await handlerResult.handler.validate(ctx);
    if (!validation?.valid) {
      await t.rollback();
      return {
        success: false,
        message: validation?.message || AMENDMENT_MESSAGES.VALIDATION_FAILED,
        details: validation?.details,
      };
    }

    const applyResult = await handlerResult.handler.apply(ctx);
    if (!applyResult?.success) {
      await t.rollback();
      return {
        success: false,
        message: applyResult?.message || AMENDMENT_MESSAGES.APPLY_FAILED,
        details: applyResult?.data,
      };
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
      }),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
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
    ],
    order: [[sortField, normalized.sortOrder]],
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
  resolveNextAmendmentVersion,
  recordAmendmentHistoryRows,
  createPlanAmendment,
  submitPlanAmendment,
  previewPlanAmendment,
  approvePlanAmendment,
  rejectPlanAmendment,
  cancelPlanAmendment,
  getPlanAmendmentById,
  listPlanAmendments,
  loadLiveMasterForAmendment,
};
