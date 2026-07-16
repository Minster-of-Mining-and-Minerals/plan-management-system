"use strict";

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
  normalizeCreatePayload,
} = require("../utils/planTargetReallocationValidationUtils");
const {
  validateReallocationBusinessRules,
} = require("../services/planTargetReallocationService");
const {
  REQUEST_TARGET_REALLOCATION_KEY,
  userCanRequestTargetReallocation,
} = require("../utils/planTargetReallocationPermissionUtils");
const { validateCreateTargetReallocation } = require("../validators/plan/planTargetReallocationValidator");

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

function runValidationUnitTests() {
  assert.strictEqual(validateReallocationAmount(10).valid, true);
  assert.strictEqual(validateReallocationAmount(0).valid, false);
  assert.strictEqual(validateReallocationAmount(-1).valid, false);
  assert.strictEqual(
    validateReallocationAmount(0).message,
    REALLOCATION_VALIDATION_MESSAGES.AMOUNT_POSITIVE
  );

  assert.strictEqual(validateDistinctPeriods("a", "b").valid, true);
  assert.strictEqual(validateDistinctPeriods("same", "same").valid, false);
  assert.strictEqual(
    validateDistinctPeriods("same", "same").message,
    REALLOCATION_VALIDATION_MESSAGES.DISTINCT_PERIODS
  );

  assert.strictEqual(computeMovableTarget(25, 20), 5);
  assert.strictEqual(computeMovableTarget(25, null), 25);
  assert.strictEqual(computeMovableTarget(20, 25), 0);

  assert.strictEqual(validateMovableAmount(5, 5).valid, true);
  assert.strictEqual(validateMovableAmount(10, 5).valid, false);
  assert.strictEqual(
    validateMovableAmount(10, 5).message,
    REALLOCATION_VALIDATION_MESSAGES.EXCEEDS_MOVABLE
  );

  assert.strictEqual(
    validateResultingTargets({ fromTarget: 25, toTarget: 25, amount: 10 }).valid,
    true
  );
  assert.strictEqual(
    validateResultingTargets({ fromTarget: 25, toTarget: 25, amount: 10 }).fromResult,
    15
  );
  assert.strictEqual(
    validateResultingTargets({ fromTarget: 25, toTarget: 25, amount: 10 }).toResult,
    35
  );
  assert.strictEqual(
    validateResultingTargets({ fromTarget: 5, toTarget: 0, amount: 10 }).valid,
    false
  );

  assert.strictEqual(isFinalizedExecutionPeriod("completed"), true);
  assert.strictEqual(isFinalizedExecutionPeriod("open"), false);

  const businessValid = validateReallocationBusinessRules({
    amount: 5,
    fromPeriodNode: { period_target: 25, period_actual: 20 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "open",
  });
  assert.strictEqual(businessValid.valid, true);
  assert.strictEqual(businessValid.amount, 5);
  assert.strictEqual(businessValid.movableTarget, 5);

  const businessInvalid = validateReallocationBusinessRules({
    amount: 10,
    fromPeriodNode: { period_target: 25, period_actual: 20 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "open",
  });
  assert.strictEqual(businessInvalid.valid, false);
  assert.strictEqual(
    businessInvalid.message,
    REALLOCATION_VALIDATION_MESSAGES.EXCEEDS_MOVABLE
  );

  const finalized = validateReallocationBusinessRules({
    amount: 3,
    fromPeriodNode: { period_target: 25, period_actual: 20 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "completed",
  });
  assert.strictEqual(finalized.valid, false);
  assert.strictEqual(
    finalized.message,
    REALLOCATION_VALIDATION_MESSAGES.FINALIZED_SOURCE
  );

  const normalized = normalizeCreatePayload({
    kpi_id: "kpi-1",
    from_period_id: "from-1",
    to_period_id: "to-1",
    amount: 5,
    reason: "Venue unavailable",
  });
  assert.strictEqual(normalized.kpiId, "kpi-1");
  assert.strictEqual(normalized.fromPeriodId, "from-1");
  assert.strictEqual(normalized.toPeriodId, "to-1");
}

function runPermissionTests() {
  const requester = { permissions: [REQUEST_TARGET_REALLOCATION_KEY] };
  assert.strictEqual(userCanRequestTargetReallocation(requester), true);
  assert.strictEqual(userCanRequestTargetReallocation({ permissions: [] }), false);
}

function runApiWiringTests() {
  assertExportedFunction(controllerSource, "createTargetReallocationHandler");
  assertExportedFunction(serviceSource, "createTargetReallocationRequest");
  assertRouteWired("post", "/target-reallocations", "createTargetReallocationHandler");
  assert.ok(validateCreateTargetReallocation, "validateCreateTargetReallocation middleware must exist");
}

function run() {
  runValidationUnitTests();
  runPermissionTests();
  runApiWiringTests();
  console.log("Target reallocation Step 2 checks passed.");
}

run();
