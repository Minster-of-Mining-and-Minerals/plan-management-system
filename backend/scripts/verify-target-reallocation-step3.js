"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  REALLOCATION_STATUS,
  canTransitionReallocationStatus,
  buildApprovedReallocationWorkflowFields,
  buildAppliedReallocationWorkflowFields,
  buildRejectedReallocationWorkflowFields,
  buildCancelledReallocationWorkflowFields,
} = require("../utils/planTargetReallocationWorkflowUtils");
const {
  validateReallocationBusinessRules,
} = require("../services/planTargetReallocationService");
const {
  validateResultingTargets,
} = require("../utils/planTargetReallocationValidationUtils");
const {
  APPROVE_TARGET_REALLOCATION_KEY,
  userCanApproveTargetReallocation,
} = require("../utils/planTargetReallocationPermissionUtils");
const {
  validateReviewTargetReallocation,
  validateRejectTargetReallocation,
} = require("../validators/plan/planTargetReallocationValidator");

const root = path.join(__dirname, "..");
const planRoutesSource = fs.readFileSync(path.join(root, "routers/plan/planRoutes.js"), "utf8");
const controllerSource = fs.readFileSync(
  path.join(root, "controllers/plan/planTargetReallocationController.js"),
  "utf8"
);
const serviceSource = fs.readFileSync(
  path.join(root, "services/planTargetReallocationService.js"),
  "utf8"
);

function assertRouteWired(method, pathFragment, handlerName) {
  const pattern = new RegExp(
    `router\\.${method.toLowerCase()}\\(\\s*["'\`]${pathFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`][\\s\\S]*?${handlerName}`
  );
  assert.match(planRoutesSource, pattern, `${method} ${pathFragment} must wire ${handlerName}`);
}

function assertExportedFunction(source, name) {
  assert.match(source, new RegExp(`(async\\s+)?function\\s+${name}\\b`), `${name} must be defined`);
  assert.match(source, new RegExp(`module\\.exports[\\s\\S]*${name}`), `${name} must be exported`);
}

function runWorkflowTests() {
  assert.strictEqual(
    canTransitionReallocationStatus(REALLOCATION_STATUS.PENDING, REALLOCATION_STATUS.APPROVED),
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

  const approved = buildApprovedReallocationWorkflowFields("approver-1", "Approved");
  const applied = buildAppliedReallocationWorkflowFields();
  const merged = { ...approved, ...applied };
  assert.strictEqual(merged.status, REALLOCATION_STATUS.APPLIED);
  assert.strictEqual(merged.reviewed_by, "approver-1");
  assert.strictEqual(merged.review_comment, "Approved");
  assert.ok(merged.applied_at);

  const rejected = buildRejectedReallocationWorkflowFields("approver-1", "Insufficient justification");
  assert.strictEqual(rejected.status, REALLOCATION_STATUS.REJECTED);

  const cancelled = buildCancelledReallocationWorkflowFields("requester-1");
  assert.strictEqual(cancelled.status, REALLOCATION_STATUS.CANCELLED);
}

function runApplyValidationTests() {
  const applyValidation = validateReallocationBusinessRules({
    amount: 10,
    fromPeriodNode: { period_target: 25, period_actual: 10 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "open",
  });
  assert.strictEqual(applyValidation.valid, true);
  assert.strictEqual(applyValidation.fromResult, 15);
  assert.strictEqual(applyValidation.toResult, 35);

  const annualPreserved =
    applyValidation.fromResult + applyValidation.toResult ===
    normalizePair(25, 25);
  assert.strictEqual(annualPreserved, true);

  const staleApply = validateReallocationBusinessRules({
    amount: 10,
    fromPeriodNode: { period_target: 25, period_actual: 20 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "completed",
  });
  assert.strictEqual(staleApply.valid, false);
}

function normalizePair(fromTarget, toTarget) {
  const moved = validateResultingTargets({
    fromTarget,
    toTarget,
    amount: 10,
  });
  return moved.fromResult + moved.toResult;
}

function runPermissionTests() {
  const approver = { permissions: [APPROVE_TARGET_REALLOCATION_KEY] };
  assert.strictEqual(userCanApproveTargetReallocation(approver), true);
  assert.strictEqual(userCanApproveTargetReallocation({ permissions: [] }), false);
}

function runApiWiringTests() {
  assertExportedFunction(controllerSource, "approveTargetReallocationHandler");
  assertExportedFunction(controllerSource, "rejectTargetReallocationHandler");
  assertExportedFunction(controllerSource, "cancelTargetReallocationHandler");
  assertExportedFunction(serviceSource, "approveTargetReallocationRequest");
  assertExportedFunction(serviceSource, "rejectTargetReallocationRequest");
  assertExportedFunction(serviceSource, "cancelTargetReallocationRequest");
  assertExportedFunction(serviceSource, "applyApprovedTargetReallocation");
  assertRouteWired("post", "/target-reallocations/:id/approve", "approveTargetReallocationHandler");
  assertRouteWired("post", "/target-reallocations/:id/reject", "rejectTargetReallocationHandler");
  assertRouteWired("post", "/target-reallocations/:id/cancel", "cancelTargetReallocationHandler");
  assert.ok(validateReviewTargetReallocation);
  assert.ok(validateRejectTargetReallocation);
}

function run() {
  runWorkflowTests();
  runApplyValidationTests();
  runPermissionTests();
  runApiWiringTests();
  console.log("Target reallocation Step 3 checks passed.");
}

run();
