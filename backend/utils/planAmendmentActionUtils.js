"use strict";

const { normalizeAmendmentType, amendmentTypeLabel } = require("./planAmendmentTypes");

const ACTION_STATUS = Object.freeze({
  PENDING: "pending",
  APPLIED: "applied",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

const ACTION_STATUS_VALUES = Object.freeze(Object.values(ACTION_STATUS));

const EFFECTIVE_MODE = Object.freeze({
  IMMEDIATE: "immediate",
  NEXT_PERIOD: "next_period",
  CUSTOM_DATE: "custom_date",
});

const EFFECTIVE_MODE_VALUES = Object.freeze(Object.values(EFFECTIVE_MODE));

const DEFAULT_AMENDMENT_POLICY = Object.freeze({
  completed_periods_editable: false,
  automatic_redistribution: "manual",
  allow_emergency_approvals: false,
  allow_structural_amendments_after_execution: true,
  allow_ownership_transfer: true,
});

function normalizeEffectiveMode(mode) {
  if (mode == null || mode === "") return EFFECTIVE_MODE.IMMEDIATE;
  const lower = String(mode).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (EFFECTIVE_MODE_VALUES.includes(lower)) return lower;
  if (lower === "effective_immediately" || lower === "now") {
    return EFFECTIVE_MODE.IMMEDIATE;
  }
  if (lower === "effective_next_period" || lower === "next") {
    return EFFECTIVE_MODE.NEXT_PERIOD;
  }
  if (lower === "effective_custom_date" || lower === "custom") {
    return EFFECTIVE_MODE.CUSTOM_DATE;
  }
  return null;
}

function normalizeActionStatus(status) {
  if (status == null || status === "") return null;
  const lower = String(status).trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ACTION_STATUS_VALUES.includes(lower) ? lower : null;
}

function normalizeActionInput(raw = {}, index = 0) {
  const actionType = normalizeAmendmentType(
    raw.actionType ?? raw.action_type ?? raw.type ?? raw.amendmentType ?? raw.amendment_type
  );
  const sequenceRaw = raw.sequence ?? raw.seq ?? index + 1;
  const sequence = Number(sequenceRaw);
  const dependsOn =
    raw.dependsOnSequence ?? raw.depends_on_sequence ?? raw.dependsOn ?? raw.depends_on ?? null;

  return {
    actionType,
    sequence: Number.isFinite(sequence) && sequence > 0 ? Math.floor(sequence) : index + 1,
    metadata:
      raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
        ? raw.metadata
        : {},
    dependsOnSequence:
      dependsOn == null || dependsOn === ""
        ? null
        : Number.isFinite(Number(dependsOn))
          ? Math.floor(Number(dependsOn))
          : null,
  };
}

function sortActionsBySequence(actions = []) {
  return [...actions].sort((a, b) => {
    const seqA = Number(a.sequence ?? a.get?.("sequence") ?? 0);
    const seqB = Number(b.sequence ?? b.get?.("sequence") ?? 0);
    return seqA - seqB;
  });
}

function validateActionDependencyOrder(actions = []) {
  const sorted = sortActionsBySequence(actions);
  const seen = new Set();
  for (const action of sorted) {
    const sequence = Number(action.sequence);
    const dependsOn = action.dependsOnSequence ?? action.depends_on_sequence ?? null;
    if (dependsOn != null) {
      if (!seen.has(Number(dependsOn))) {
        return {
          valid: false,
          message: `Action sequence ${sequence} depends on sequence ${dependsOn}, which is missing or ordered later.`,
        };
      }
      if (Number(dependsOn) >= sequence) {
        return {
          valid: false,
          message: `Action sequence ${sequence} cannot depend on the same or a later sequence (${dependsOn}).`,
        };
      }
    }
    seen.add(sequence);
  }
  return { valid: true };
}

function serializePlanAmendmentAction(action, extras = {}) {
  const plain = action.get ? action.get({ plain: true }) : action;
  return {
    id: plain.plan_amendment_action_id,
    plan_amendment_action_id: plain.plan_amendment_action_id,
    plan_amendment_id: plain.plan_amendment_id,
    action_type: plain.action_type,
    action_type_label: amendmentTypeLabel(plain.action_type),
    sequence: plain.sequence,
    status: plain.status,
    metadata: plain.metadata || {},
    preview: plain.preview ?? null,
    impact: plain.impact ?? null,
    depends_on_sequence: plain.depends_on_sequence ?? null,
    error_message: plain.error_message ?? null,
    applied_at: plain.applied_at ?? null,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    ...extras,
  };
}

function mergeAmendmentPolicy(raw = {}) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    completed_periods_editable: Boolean(
      source.completed_periods_editable ?? DEFAULT_AMENDMENT_POLICY.completed_periods_editable
    ),
    automatic_redistribution:
      source.automatic_redistribution === "proportional"
        ? "proportional"
        : DEFAULT_AMENDMENT_POLICY.automatic_redistribution,
    allow_emergency_approvals: Boolean(
      source.allow_emergency_approvals ?? DEFAULT_AMENDMENT_POLICY.allow_emergency_approvals
    ),
    allow_structural_amendments_after_execution: Boolean(
      source.allow_structural_amendments_after_execution ??
        DEFAULT_AMENDMENT_POLICY.allow_structural_amendments_after_execution
    ),
    allow_ownership_transfer: Boolean(
      source.allow_ownership_transfer ?? DEFAULT_AMENDMENT_POLICY.allow_ownership_transfer
    ),
  };
}

module.exports = {
  ACTION_STATUS,
  ACTION_STATUS_VALUES,
  EFFECTIVE_MODE,
  EFFECTIVE_MODE_VALUES,
  DEFAULT_AMENDMENT_POLICY,
  normalizeEffectiveMode,
  normalizeActionStatus,
  normalizeActionInput,
  sortActionsBySequence,
  validateActionDependencyOrder,
  serializePlanAmendmentAction,
  mergeAmendmentPolicy,
};
