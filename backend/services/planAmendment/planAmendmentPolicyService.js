"use strict";

const { PlanVersion, PlanRule } = require("../../models");
const {
  DEFAULT_AMENDMENT_POLICY,
  mergeAmendmentPolicy,
} = require("../../utils/planAmendmentActionUtils");
const { AMENDMENT_TYPE } = require("../../utils/planAmendmentTypes");
const { AMENDMENT_MESSAGES } = require("../../utils/planAmendmentMessages");

async function loadAmendmentPolicyForMaster(masterPlanVersionId, transaction = null) {
  if (!masterPlanVersionId) {
    return { ...DEFAULT_AMENDMENT_POLICY };
  }

  const master = await PlanVersion.findByPk(masterPlanVersionId, {
    attributes: ["plan_version_id", "plan_rule_id"],
    include: [
      {
        model: PlanRule,
        as: "planRule",
        attributes: ["plan_rule_id", "amendment_policy"],
        required: false,
      },
    ],
    transaction,
  });

  if (!master?.planRule) {
    return { ...DEFAULT_AMENDMENT_POLICY };
  }

  return mergeAmendmentPolicy(master.planRule.amendment_policy);
}

/**
 * Framework-level policy gates applied before action handlers run.
 */
function evaluateAmendmentPolicy(policy, actions = [], options = {}) {
  const resolved = mergeAmendmentPolicy(policy);
  const errors = [];
  const emergencyRequested = Boolean(options.emergency);

  if (emergencyRequested && !resolved.allow_emergency_approvals) {
    errors.push("Emergency approvals are disabled by plan amendment policy.");
  }

  const actionTypes = actions.map((a) => a.actionType || a.action_type);

  const structuralTypes = new Set([
    AMENDMENT_TYPE.KPI_ADDITION,
    AMENDMENT_TYPE.KPI_REMOVAL,
    AMENDMENT_TYPE.PLAN_CORRECTION,
  ]);
  if (
    !resolved.allow_structural_amendments_after_execution &&
    actionTypes.some((t) => structuralTypes.has(t))
  ) {
    errors.push(
      "Structural amendments after execution are disabled by plan amendment policy."
    );
  }

  if (
    !resolved.allow_ownership_transfer &&
    actionTypes.includes(AMENDMENT_TYPE.OWNER_TRANSFER)
  ) {
    errors.push("Ownership transfer is disabled by plan amendment policy.");
  }

  return {
    valid: errors.length === 0,
    message: errors[0] || null,
    errors,
    policy: resolved,
  };
}

function assertCompletedPeriodsPolicy(policy, { periodIsCompleted = false } = {}) {
  const resolved = mergeAmendmentPolicy(policy);
  if (periodIsCompleted && !resolved.completed_periods_editable) {
    return {
      valid: false,
      message: "Completed periods are not editable under plan amendment policy.",
    };
  }
  return { valid: true, policy: resolved };
}

function redistributionMode(policy) {
  return mergeAmendmentPolicy(policy).automatic_redistribution;
}

module.exports = {
  DEFAULT_AMENDMENT_POLICY,
  loadAmendmentPolicyForMaster,
  evaluateAmendmentPolicy,
  assertCompletedPeriodsPolicy,
  redistributionMode,
  AMENDMENT_POLICY_MESSAGES: {
    POLICY_DENIED: AMENDMENT_MESSAGES.VALIDATION_FAILED,
  },
};
