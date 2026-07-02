"use strict";

const assert = require("assert");
const {
  ACHIEVEMENT_STATUS,
  normalizeAchievementStatus,
  resolveAchievementStatus,
  canTransitionAchievementStatus,
  isRollupEligibleAchievementStatus,
  buildSubmittedAchievementWorkflowFields,
  buildApprovedAchievementWorkflowFields,
  buildRejectedAchievementWorkflowFields,
  buildEmptyAchievementWorkflowFields,
} = require("../utils/planAchievementWorkflowUtils");

function run() {
  assert.strictEqual(normalizeAchievementStatus("SUBMITTED"), ACHIEVEMENT_STATUS.SUBMITTED);
  assert.strictEqual(normalizeAchievementStatus(undefined), ACHIEVEMENT_STATUS.EMPTY);
  assert.strictEqual(normalizeAchievementStatus("invalid"), ACHIEVEMENT_STATUS.EMPTY);

  assert.strictEqual(
    resolveAchievementStatus({ period_actual_status: "submitted" }),
    ACHIEVEMENT_STATUS.SUBMITTED
  );
  assert.strictEqual(
    resolveAchievementStatus({ period_actual: 42 }),
    ACHIEVEMENT_STATUS.APPROVED
  );
  assert.strictEqual(resolveAchievementStatus({}), ACHIEVEMENT_STATUS.EMPTY);

  assert.strictEqual(
    canTransitionAchievementStatus(ACHIEVEMENT_STATUS.EMPTY, ACHIEVEMENT_STATUS.SUBMITTED),
    true
  );
  assert.strictEqual(
    canTransitionAchievementStatus(ACHIEVEMENT_STATUS.SUBMITTED, ACHIEVEMENT_STATUS.APPROVED),
    true
  );
  assert.strictEqual(
    canTransitionAchievementStatus(ACHIEVEMENT_STATUS.APPROVED, ACHIEVEMENT_STATUS.SUBMITTED),
    false
  );
  assert.strictEqual(
    canTransitionAchievementStatus(ACHIEVEMENT_STATUS.REJECTED, ACHIEVEMENT_STATUS.SUBMITTED),
    true
  );

  assert.strictEqual(
    isRollupEligibleAchievementStatus(ACHIEVEMENT_STATUS.SUBMITTED),
    false
  );
  assert.strictEqual(
    isRollupEligibleAchievementStatus(ACHIEVEMENT_STATUS.APPROVED),
    true
  );
  assert.strictEqual(
    isRollupEligibleAchievementStatus(ACHIEVEMENT_STATUS.REJECTED),
    false
  );

  const submitted = buildSubmittedAchievementWorkflowFields("user-1");
  assert.strictEqual(submitted.period_actual_status, ACHIEVEMENT_STATUS.SUBMITTED);
  assert.strictEqual(submitted.period_actual_submitted_by, "user-1");

  const approved = buildApprovedAchievementWorkflowFields("approver-1");
  assert.strictEqual(approved.period_actual_status, ACHIEVEMENT_STATUS.APPROVED);
  assert.strictEqual(approved.period_actual_approved_by, "approver-1");

  const rejected = buildRejectedAchievementWorkflowFields("Needs revision");
  assert.strictEqual(rejected.period_actual_status, ACHIEVEMENT_STATUS.REJECTED);
  assert.strictEqual(rejected.period_actual_rejection_comment, "Needs revision");

  const cleared = buildEmptyAchievementWorkflowFields();
  assert.strictEqual(cleared.period_actual_status, ACHIEVEMENT_STATUS.EMPTY);

  console.log("Plan achievement Step 2 workflow checks passed.");
}

run();
