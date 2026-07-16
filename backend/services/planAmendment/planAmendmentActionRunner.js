"use strict";

const { v4: uuidv4 } = require("uuid");
const { PlanAmendmentAction, PlanAmendmentHistory } = require("../../models");
const { AMENDMENT_MESSAGES } = require("../../utils/planAmendmentMessages");
const {
  normalizeAmendmentType,
  amendmentTypeLabel,
} = require("../../utils/planAmendmentTypes");
const {
  ACTION_STATUS,
  sortActionsBySequence,
  serializePlanAmendmentAction,
  validateActionDependencyOrder,
} = require("../../utils/planAmendmentActionUtils");
const {
  resolveAmendmentHandler,
  ensureDefaultAmendmentHandlers,
} = require("./planAmendmentRegistry");

function resolveActionHandlerOrError(actionType) {
  ensureDefaultAmendmentHandlers();
  const type = normalizeAmendmentType(actionType);
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

function buildActionHandlerContext(amendment, action, user, transaction = null, extras = {}) {
  return {
    amendment,
    action,
    metadata: action.metadata || {},
    user,
    transaction,
    policy: extras.policy ?? null,
    effective: extras.effective ?? null,
    options: extras.options ?? extras,
  };
}

async function loadAmendmentActions(amendmentId, transaction = null) {
  const actions = await PlanAmendmentAction.findAll({
    where: { plan_amendment_id: amendmentId },
    order: [["sequence", "ASC"]],
    transaction,
  });
  return sortActionsBySequence(actions);
}

/**
 * Legacy amendments (or facade dual-write before migration) may lack action rows.
 * Synthesize a virtual action from amendment_type + metadata for engine processing.
 */
function synthesizeLegacyAction(amendment) {
  return {
    plan_amendment_action_id: null,
    plan_amendment_id: amendment.plan_amendment_id,
    action_type: amendment.amendment_type,
    sequence: 1,
    status: ACTION_STATUS.PENDING,
    metadata: amendment.metadata || {},
    preview: null,
    impact: null,
    depends_on_sequence: null,
    error_message: null,
    applied_at: null,
    _virtual: true,
  };
}

async function ensureAmendmentActions(amendment, transaction = null) {
  const existing = await loadAmendmentActions(amendment.plan_amendment_id, transaction);
  if (existing.length) {
    return existing;
  }
  return [synthesizeLegacyAction(amendment)];
}

async function createAmendmentActions(amendmentId, actionInputs = [], transaction = null) {
  const dependencyCheck = validateActionDependencyOrder(actionInputs);
  if (!dependencyCheck.valid) {
    return { success: false, message: dependencyCheck.message };
  }

  const created = [];
  for (const input of sortActionsBySequence(actionInputs)) {
    const handlerResult = resolveActionHandlerOrError(input.actionType);
    if (!handlerResult.success) {
      return handlerResult;
    }

    const row = await PlanAmendmentAction.create(
      {
        plan_amendment_action_id: uuidv4(),
        plan_amendment_id: amendmentId,
        action_type: handlerResult.type,
        sequence: input.sequence,
        status: ACTION_STATUS.PENDING,
        metadata: input.metadata || {},
        depends_on_sequence: input.dependsOnSequence,
      },
      { transaction }
    );
    created.push(row);
  }

  return { success: true, data: created };
}

async function validateAllActions(amendment, actions, user, extras = {}) {
  const sorted = sortActionsBySequence(actions);
  const dependencyCheck = validateActionDependencyOrder(
    sorted.map((a) => ({
      sequence: a.sequence,
      dependsOnSequence: a.depends_on_sequence,
      actionType: a.action_type,
      metadata: a.metadata,
    }))
  );
  if (!dependencyCheck.valid) {
    return { valid: false, message: dependencyCheck.message };
  }

  const details = [];
  for (const action of sorted) {
    const handlerResult = resolveActionHandlerOrError(action.action_type);
    if (!handlerResult.success) {
      return {
        valid: false,
        message: handlerResult.message,
        details: { sequence: action.sequence, action_type: action.action_type },
      };
    }

    const validation = await handlerResult.handler.validate(
      buildActionHandlerContext(amendment, action, user, extras.transaction, extras)
    );
    if (!validation?.valid) {
      return {
        valid: false,
        message: validation?.message || AMENDMENT_MESSAGES.VALIDATION_FAILED,
        details: {
          sequence: action.sequence,
          action_type: action.action_type,
          ...(validation?.details || {}),
        },
      };
    }
    details.push({
      sequence: action.sequence,
      action_type: action.action_type,
      details: validation.details ?? null,
    });
  }

  return { valid: true, details };
}

async function previewAllActions(amendment, actions, user, extras = {}) {
  const validation = await validateAllActions(amendment, actions, user, extras);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.message,
      details: validation.details,
    };
  }

  const sorted = sortActionsBySequence(actions);
  const actionPreviews = [];
  const differences = [];

  for (const action of sorted) {
    const handlerResult = resolveActionHandlerOrError(action.action_type);
    const preview = await handlerResult.handler.preview(
      buildActionHandlerContext(amendment, action, user, extras.transaction, extras)
    );
    if (!preview?.success) {
      return {
        success: false,
        message: preview?.message || AMENDMENT_MESSAGES.PREVIEW_FAILED,
        details: {
          sequence: action.sequence,
          action_type: action.action_type,
          ...(preview?.data || {}),
        },
      };
    }

    actionPreviews.push({
      sequence: action.sequence,
      action_type: action.action_type,
      action_type_label: amendmentTypeLabel(action.action_type),
      action: serializePlanAmendmentAction(action),
      preview: preview.data ?? null,
    });

    if (preview.data && typeof preview.data === "object") {
      differences.push({
        sequence: action.sequence,
        action_type: action.action_type,
        diff: preview.data,
      });
    }
  }

  return {
    success: true,
    data: {
      current: {
        version: amendment.version ?? null,
        status: amendment.status,
      },
      effective: {
        mode: amendment.effective_mode,
        date: amendment.effective_date,
        ...(extras.effective || {}),
      },
      differences,
      actions: actionPreviews,
    },
  };
}

async function applyAllActions(amendment, actions, user, transaction, extras = {}) {
  const validation = await validateAllActions(amendment, actions, user, {
    ...extras,
    transaction,
  });
  if (!validation.valid) {
    return {
      success: false,
      message: validation.message,
      details: validation.details,
    };
  }

  const sorted = sortActionsBySequence(actions);
  const applied = [];
  const allHistory = [];

  for (const action of sorted) {
    const handlerResult = resolveActionHandlerOrError(action.action_type);
    const ctx = buildActionHandlerContext(amendment, action, user, transaction, extras);
    const applyResult = await handlerResult.handler.apply(ctx);

    if (!applyResult?.success) {
      if (action.plan_amendment_action_id && !action._virtual) {
        await action.update(
          {
            status: ACTION_STATUS.FAILED,
            error_message: applyResult?.message || AMENDMENT_MESSAGES.APPLY_FAILED,
          },
          { transaction }
        );
      }
      return {
        success: false,
        message: applyResult?.message || AMENDMENT_MESSAGES.APPLY_FAILED,
        details: {
          sequence: action.sequence,
          action_type: action.action_type,
          ...(applyResult?.data || {}),
        },
      };
    }

    const appliedAt = new Date();
    if (action.plan_amendment_action_id && !action._virtual) {
      await action.update(
        {
          status: ACTION_STATUS.APPLIED,
          applied_at: appliedAt,
          error_message: null,
          preview: applyResult.data ?? action.preview,
        },
        { transaction }
      );
    }

    const historyRows = (applyResult.history || []).map((row) => ({
      ...row,
      plan_amendment_action_id: action.plan_amendment_action_id || null,
    }));
    allHistory.push(...historyRows);

    applied.push({
      sequence: action.sequence,
      action_type: action.action_type,
      data: applyResult.data ?? null,
    });
  }

  return {
    success: true,
    data: { actions: applied },
    history: allHistory,
  };
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
        plan_amendment_action_id: row.plan_amendment_action_id ?? null,
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

module.exports = {
  resolveActionHandlerOrError,
  buildActionHandlerContext,
  loadAmendmentActions,
  synthesizeLegacyAction,
  ensureAmendmentActions,
  createAmendmentActions,
  validateAllActions,
  previewAllActions,
  applyAllActions,
  recordAmendmentHistoryRows,
};
