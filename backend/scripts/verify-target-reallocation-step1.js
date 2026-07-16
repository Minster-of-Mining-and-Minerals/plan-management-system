"use strict";

const assert = require("assert");
const {
  REALLOCATION_STATUS,
  normalizeReallocationStatus,
  canTransitionReallocationStatus,
  isTerminalReallocationStatus,
  isPendingReallocationStatus,
  buildPendingReallocationWorkflowFields,
  buildApprovedReallocationWorkflowFields,
  buildRejectedReallocationWorkflowFields,
  buildCancelledReallocationWorkflowFields,
  buildAppliedReallocationWorkflowFields,
  reallocationStatusLabel,
} = require("../utils/planTargetReallocationWorkflowUtils");
const {
  REQUEST_TARGET_REALLOCATION_KEY,
  APPROVE_TARGET_REALLOCATION_KEY,
  userCanRequestTargetReallocation,
  userCanApproveTargetReallocation,
} = require("../utils/planTargetReallocationPermissionUtils");
const {
  resolveOriginalTargetFromBaseline,
  computeReallocationReportingFields,
} = require("../utils/planTargetReallocationBaselineUtils");

function runWorkflowTests() {
  assert.strictEqual(normalizeReallocationStatus("PENDING"), REALLOCATION_STATUS.PENDING);
  assert.strictEqual(normalizeReallocationStatus(undefined), REALLOCATION_STATUS.PENDING);
  assert.strictEqual(normalizeReallocationStatus("invalid"), REALLOCATION_STATUS.PENDING);

  assert.strictEqual(
    canTransitionReallocationStatus(REALLOCATION_STATUS.PENDING, REALLOCATION_STATUS.APPROVED),
    true
  );
  assert.strictEqual(
    canTransitionReallocationStatus(REALLOCATION_STATUS.PENDING, REALLOCATION_STATUS.REJECTED),
    true
  );
  assert.strictEqual(
    canTransitionReallocationStatus(REALLOCATION_STATUS.PENDING, REALLOCATION_STATUS.CANCELLED),
    true
  );
  assert.strictEqual(
    canTransitionReallocationStatus(REALLOCATION_STATUS.APPROVED, REALLOCATION_STATUS.APPLIED),
    true
  );
  assert.strictEqual(
    canTransitionReallocationStatus(REALLOCATION_STATUS.PENDING, REALLOCATION_STATUS.APPLIED),
    false
  );
  assert.strictEqual(
    canTransitionReallocationStatus(REALLOCATION_STATUS.APPLIED, REALLOCATION_STATUS.PENDING),
    false
  );

  assert.strictEqual(isPendingReallocationStatus(REALLOCATION_STATUS.PENDING), true);
  assert.strictEqual(isPendingReallocationStatus(REALLOCATION_STATUS.APPLIED), false);
  assert.strictEqual(isTerminalReallocationStatus(REALLOCATION_STATUS.APPLIED), true);
  assert.strictEqual(isTerminalReallocationStatus(REALLOCATION_STATUS.PENDING), false);

  const pending = buildPendingReallocationWorkflowFields("user-1");
  assert.strictEqual(pending.status, REALLOCATION_STATUS.PENDING);
  assert.strictEqual(pending.requested_by, "user-1");

  const approved = buildApprovedReallocationWorkflowFields("approver-1", "Approved");
  assert.strictEqual(approved.status, REALLOCATION_STATUS.APPROVED);
  assert.strictEqual(approved.review_comment, "Approved");

  const rejected = buildRejectedReallocationWorkflowFields("approver-1", "Insufficient justification");
  assert.strictEqual(rejected.status, REALLOCATION_STATUS.REJECTED);

  const cancelled = buildCancelledReallocationWorkflowFields("user-1");
  assert.strictEqual(cancelled.status, REALLOCATION_STATUS.CANCELLED);

  const applied = buildAppliedReallocationWorkflowFields();
  assert.strictEqual(applied.status, REALLOCATION_STATUS.APPLIED);
  assert.ok(applied.applied_at);

  assert.strictEqual(reallocationStatusLabel(REALLOCATION_STATUS.PENDING), "Pending");
  assert.strictEqual(reallocationStatusLabel(REALLOCATION_STATUS.APPLIED), "Applied");
}

function runPermissionTests() {
  const requester = { permissions: [REQUEST_TARGET_REALLOCATION_KEY] };
  const approver = { permissions: [APPROVE_TARGET_REALLOCATION_KEY] };

  assert.strictEqual(userCanRequestTargetReallocation(requester), true);
  assert.strictEqual(userCanApproveTargetReallocation(requester), false);
  assert.strictEqual(userCanApproveTargetReallocation(approver), true);
  assert.strictEqual(userCanRequestTargetReallocation(approver), false);
}

function runBaselineTests() {
  assert.strictEqual(resolveOriginalTargetFromBaseline({ original_target: 25 }), 25);
  assert.strictEqual(resolveOriginalTargetFromBaseline(null, 20), 20);
  assert.strictEqual(resolveOriginalTargetFromBaseline(null, null), null);

  const reporting = computeReallocationReportingFields({
    originalTarget: 25,
    currentTarget: 15,
    reallocatedOut: 10,
    reallocatedIn: 0,
  });
  assert.strictEqual(reporting.original_target, 25);
  assert.strictEqual(reporting.current_target, 15);
  assert.strictEqual(reporting.reallocated_out, 10);
  assert.strictEqual(reporting.net_adjustment, -10);
}

function runModelSmokeTests() {
  const models = require("../models");
  assert.ok(models.TargetReallocationRequest, "TargetReallocationRequest model should load");
  assert.ok(models.TargetAllocationHistory, "TargetAllocationHistory model should load");
  assert.ok(models.PlanPeriodTargetBaseline, "PlanPeriodTargetBaseline model should load");
  assert.strictEqual(models.TargetReallocationRequest.tableName, "target_reallocation_requests");
  assert.strictEqual(models.TargetAllocationHistory.tableName, "target_allocation_histories");
  assert.strictEqual(models.PlanPeriodTargetBaseline.tableName, "plan_period_target_baselines");
}

function run() {
  runWorkflowTests();
  runPermissionTests();
  runBaselineTests();
  runModelSmokeTests();
  console.log("Target reallocation Step 1 checks passed.");
}

run();
