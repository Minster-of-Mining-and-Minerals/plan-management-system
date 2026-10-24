"use strict";

/**
 * Step 7 — notifications, hardening, and full scenario coverage for Target Reallocation.
 * Scenarios map to the product validation rules + approve/apply + notify paths.
 * Uses utils + source wiring checks only (no DB / app bootstrap).
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  REALLOCATION_VALIDATION_MESSAGES,
  validateReallocationAmount,
  validateDistinctPeriods,
  computeMovableTarget,
  validateMovableAmount,
  validateResultingTargets,
  isFinalizedExecutionPeriod,
} = require("../utils/planTargetReallocationValidationUtils");
const {
  REALLOCATION_STATUS,
  canTransitionReallocationStatus,
  buildApprovedReallocationWorkflowFields,
  buildAppliedReallocationWorkflowFields,
  buildRejectedReallocationWorkflowFields,
  buildCancelledReallocationWorkflowFields,
} = require("../utils/planTargetReallocationWorkflowUtils");
const {
  computeReallocationReportingFields,
} = require("../utils/planTargetReallocationBaselineUtils");

const root = path.join(__dirname, "..");
const notificationSource = fs.readFileSync(
  path.join(root, "services/planTargetReallocationNotificationService.js"),
  "utf8"
);
const serviceSource = fs.readFileSync(
  path.join(root, "services/planTargetReallocationService.js"),
  "utf8"
);
const workflowSource = fs.readFileSync(
  path.join(root, "services/planAchievementWorkflowService.js"),
  "utf8"
);
const docsSource = fs.readFileSync(
  path.join(root, "../docs/TARGET_REALLOCATION.md"),
  "utf8"
);
const frontendSectionSource = fs.readFileSync(
  path.join(
    root,
    "../frontend/src/features/plan-management/components/PlanAmendmentWorkspace.tsx"
  ),
  "utf8"
);

/** Mirrors planTargetReallocationService.validateReallocationBusinessRules */
function validateReallocationBusinessRules({
  amount,
  fromPeriodNode,
  toPeriodNode,
  fromExecutionStatus,
}) {
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

/** Scenario 1 — amount must be > 0 */
function scenarioAmountPositive() {
  assert.strictEqual(validateReallocationAmount(0).valid, false);
  assert.strictEqual(
    validateReallocationAmount(0).message,
    REALLOCATION_VALIDATION_MESSAGES.AMOUNT_POSITIVE
  );
  assert.strictEqual(validateReallocationAmount(-5).valid, false);
  assert.strictEqual(validateReallocationAmount(10).valid, true);
}

/** Scenario 2 — source and destination periods must differ */
function scenarioDistinctPeriods() {
  assert.strictEqual(validateDistinctPeriods("q2", "q2").valid, false);
  assert.strictEqual(
    validateDistinctPeriods("q2", "q2").message,
    REALLOCATION_VALIDATION_MESSAGES.DISTINCT_PERIODS
  );
  assert.strictEqual(validateDistinctPeriods("q2", "q3").valid, true);
}

/** Scenario 3 — same-KPI / cross-KPI message contract */
function scenarioSameKpiContract() {
  assert.strictEqual(
    REALLOCATION_VALIDATION_MESSAGES.CROSS_KPI,
    "Source and destination periods must belong to the same KPI."
  );
  assert.match(serviceSource, /CROSS_KPI/);
}

/** Scenario 4 — annual target unchanged (period sum preserved on happy path) */
function scenarioAnnualSumPreserved() {
  const q1 = 25;
  const q2 = 25;
  const q3 = 25;
  const q4 = 25;
  const annual = 100;
  const amount = 10;

  const moved = validateResultingTargets({
    fromTarget: q2,
    toTarget: q3,
    amount,
  });
  assert.strictEqual(moved.valid, true);
  assert.strictEqual(moved.fromResult, 15);
  assert.strictEqual(moved.toResult, 35);

  const afterSum = q1 + moved.fromResult + moved.toResult + q4;
  assert.strictEqual(afterSum, annual);
  assert.match(
    serviceSource,
    /Period targets must continue to sum to the unchanged annual target/
  );
}

/** Scenario 5 — movable = target − actual; excess rejected */
function scenarioMovableAmount() {
  assert.strictEqual(computeMovableTarget(25, 20), 5);
  assert.strictEqual(validateMovableAmount(5, 5).valid, true);
  assert.strictEqual(validateMovableAmount(10, 5).valid, false);
  assert.strictEqual(
    validateMovableAmount(10, 5).message,
    REALLOCATION_VALIDATION_MESSAGES.EXCEEDS_MOVABLE
  );

  const business = validateReallocationBusinessRules({
    amount: 10,
    fromPeriodNode: { period_target: 25, period_actual: 20 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "open",
  });
  assert.strictEqual(business.valid, false);
  assert.strictEqual(business.message, REALLOCATION_VALIDATION_MESSAGES.EXCEEDS_MOVABLE);
}

/** Scenario 6 — negative resulting targets blocked */
function scenarioNoNegativeTargets() {
  const result = validateResultingTargets({
    fromTarget: 5,
    toTarget: 0,
    amount: 10,
  });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.message, REALLOCATION_VALIDATION_MESSAGES.NEGATIVE_RESULT);
}

/** Scenario 7 — cannot reallocate from finalized (completed) source */
function scenarioFinalizedSourceBlocked() {
  assert.strictEqual(isFinalizedExecutionPeriod("completed"), true);
  const business = validateReallocationBusinessRules({
    amount: 5,
    fromPeriodNode: { period_target: 25, period_actual: 0 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "completed",
  });
  assert.strictEqual(business.valid, false);
  assert.strictEqual(business.message, REALLOCATION_VALIDATION_MESSAGES.FINALIZED_SOURCE);
}

/** Scenario 8 — happy-path apply math + reporting (Q2→Q3 move 10) */
function scenarioHappyPathApplyAndReporting() {
  const business = validateReallocationBusinessRules({
    amount: 10,
    fromPeriodNode: { period_target: 25, period_actual: 0 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "open",
  });
  assert.strictEqual(business.valid, true);
  assert.strictEqual(business.fromResult, 15);
  assert.strictEqual(business.toResult, 35);

  const q2Report = computeReallocationReportingFields({
    originalTarget: 25,
    currentTarget: 15,
    reallocatedOut: 10,
    reallocatedIn: 0,
  });
  assert.strictEqual(q2Report.original_target, 25);
  assert.strictEqual(q2Report.current_target, 15);
  assert.strictEqual(q2Report.reallocated_out, 10);
  assert.strictEqual(q2Report.net_adjustment, -10);

  const q3Report = computeReallocationReportingFields({
    originalTarget: 25,
    currentTarget: 35,
    reallocatedOut: 0,
    reallocatedIn: 10,
  });
  assert.strictEqual(q3Report.net_adjustment, 10);
}

/** Scenario 9 — approve auto-applies; reject / cancel transitions */
function scenarioWorkflowTransitions() {
  assert.strictEqual(
    canTransitionReallocationStatus(REALLOCATION_STATUS.PENDING, REALLOCATION_STATUS.APPROVED),
    true
  );
  assert.strictEqual(
    canTransitionReallocationStatus(REALLOCATION_STATUS.APPROVED, REALLOCATION_STATUS.APPLIED),
    true
  );

  const applied = {
    ...buildApprovedReallocationWorkflowFields("approver-1", "Approved"),
    ...buildAppliedReallocationWorkflowFields(),
  };
  assert.strictEqual(applied.status, REALLOCATION_STATUS.APPLIED);
  assert.strictEqual(applied.reviewed_by, "approver-1");
  assert.ok(applied.applied_at);

  const rejected = buildRejectedReallocationWorkflowFields(
    "approver-1",
    "Insufficient justification"
  );
  assert.strictEqual(rejected.status, REALLOCATION_STATUS.REJECTED);

  const cancelled = buildCancelledReallocationWorkflowFields();
  assert.strictEqual(cancelled.status, REALLOCATION_STATUS.CANCELLED);

  assert.match(serviceSource, /emitTargetReallocationApprovedEvent/);
  assert.match(serviceSource, /emitTargetReallocationRejectedEvent/);
  assert.match(serviceSource, /applyApprovedTargetReallocation/);
}

/** Scenario 10 — notifications + hardening + docs + UI focus */
function scenarioNotificationsHardeningAndDocs() {
  assert.match(notificationSource, /plan_target_reallocation_submitted/);
  assert.match(notificationSource, /plan_target_reallocation_approved/);
  assert.match(notificationSource, /plan_target_reallocation_rejected/);
  assert.match(notificationSource, /focus=reallocation/);
  assert.match(notificationSource, /emitTargetReallocationSubmittedEvent/);
  assert.match(notificationSource, /emitTargetReallocationApprovedEvent/);
  assert.match(notificationSource, /emitTargetReallocationRejectedEvent/);

  assert.match(serviceSource, /emitTargetReallocationSubmittedEvent/);
  assert.match(serviceSource, /resolveTargetReallocationApproverUsers/);

  assert.match(
    workflowSource,
    /period targets can only change through Target Reallocation requests/i
  );
  assert.match(workflowSource, /process_started_at/);

  assert.match(docsSource, /Target Reallocation/);
  assert.match(docsSource, /PLAN:REQUEST_TARGET_REALLOCATION/);
  assert.match(docsSource, /focus=reallocation/);

  assert.match(frontendSectionSource, /focusReallocation|focus === "reallocation"/);
  assert.match(frontendSectionSource, /target-reallocation-section/);
}

function run() {
  scenarioAmountPositive();
  scenarioDistinctPeriods();
  scenarioSameKpiContract();
  scenarioAnnualSumPreserved();
  scenarioMovableAmount();
  scenarioNoNegativeTargets();
  scenarioFinalizedSourceBlocked();
  scenarioHappyPathApplyAndReporting();
  scenarioWorkflowTransitions();
  scenarioNotificationsHardeningAndDocs();
  console.log("Target reallocation Step 7 checks passed (10 scenarios).");
}

run();
