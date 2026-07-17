"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  AMENDMENT_TYPE,
  AMENDMENT_TYPE_VALUES,
  AMENDMENT_TYPE_AVAILABILITY,
  normalizeAmendmentType,
  isKnownAmendmentType,
  isAmendmentTypeMarkedAvailable,
  amendmentTypeLabel,
} = require("../utils/planAmendmentTypes");
const {
  AMENDMENT_STATUS,
  canTransitionAmendmentStatus,
  isTerminalAmendmentStatus,
  isDraftAmendmentStatus,
  isPendingApprovalAmendmentStatus,
  buildDraftAmendmentWorkflowFields,
  buildPendingApprovalAmendmentWorkflowFields,
  buildApprovedAmendmentWorkflowFields,
  buildRejectedAmendmentWorkflowFields,
  buildCancelledAmendmentWorkflowFields,
  buildAppliedAmendmentWorkflowFields,
  amendmentStatusLabel,
} = require("../utils/planAmendmentWorkflowUtils");
const {
  REQUEST_AMENDMENT_KEY,
  APPROVE_AMENDMENT_KEY,
  userCanRequestAmendment,
  userCanApproveAmendment,
} = require("../utils/planAmendmentPermissionUtils");
const {
  registerDefaultAmendmentHandlers,
  resolveAmendmentHandler,
  listRegisteredAmendmentTypes,
  listAvailableAmendmentTypes,
  getAmendmentHandlerCatalog,
  clearAmendmentHandlers,
} = require("../services/planAmendment/planAmendmentRegistry");
const { PlanAmendmentHandler } = require("../services/planAmendment/handlers/PlanAmendmentHandler");

const root = path.join(__dirname, "..");

function runTypeTests() {
  assert.strictEqual(AMENDMENT_TYPE_VALUES.length, 11);
  assert.strictEqual(
    normalizeAmendmentType("TARGET_REALLOCATION"),
    AMENDMENT_TYPE.TARGET_REALLOCATION
  );
  assert.strictEqual(
    normalizeAmendmentType("target_reallocation"),
    AMENDMENT_TYPE.TARGET_REALLOCATION
  );
  assert.strictEqual(normalizeAmendmentType("nope"), null);
  assert.strictEqual(isKnownAmendmentType("kpi_addition"), true);
  assert.strictEqual(
    normalizeAmendmentType("node_addition"),
    AMENDMENT_TYPE.KPI_ADDITION
  );
  assert.strictEqual(isKnownAmendmentType("node_addition"), true);
  assert.strictEqual(isAmendmentTypeMarkedAvailable("node_addition"), false);
  assert.strictEqual(isAmendmentTypeMarkedAvailable("kpi_addition"), true);
  assert.strictEqual(isAmendmentTypeMarkedAvailable("target_reallocation"), true);
  assert.strictEqual(isAmendmentTypeMarkedAvailable("budget_increase"), false);
  assert.strictEqual(amendmentTypeLabel("target_reallocation"), "Target Reallocation");

  for (const type of AMENDMENT_TYPE_VALUES) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(AMENDMENT_TYPE_AVAILABILITY, type),
      `${type} must have availability flag`
    );
  }
}

function runWorkflowTests() {
  assert.strictEqual(
    canTransitionAmendmentStatus(AMENDMENT_STATUS.DRAFT, AMENDMENT_STATUS.PENDING_APPROVAL),
    true
  );
  assert.strictEqual(
    canTransitionAmendmentStatus(
      AMENDMENT_STATUS.PENDING_APPROVAL,
      AMENDMENT_STATUS.APPROVED
    ),
    true
  );
  assert.strictEqual(
    canTransitionAmendmentStatus(AMENDMENT_STATUS.APPROVED, AMENDMENT_STATUS.APPLIED),
    true
  );
  assert.strictEqual(
    canTransitionAmendmentStatus(
      AMENDMENT_STATUS.PENDING_APPROVAL,
      AMENDMENT_STATUS.APPLIED
    ),
    false
  );
  assert.strictEqual(
    canTransitionAmendmentStatus(AMENDMENT_STATUS.APPLIED, AMENDMENT_STATUS.DRAFT),
    false
  );

  assert.strictEqual(isDraftAmendmentStatus("DRAFT"), true);
  assert.strictEqual(isPendingApprovalAmendmentStatus("pending_approval"), true);
  assert.strictEqual(isTerminalAmendmentStatus(AMENDMENT_STATUS.APPLIED), true);
  assert.strictEqual(isTerminalAmendmentStatus(AMENDMENT_STATUS.DRAFT), false);

  const draft = buildDraftAmendmentWorkflowFields("user-1");
  assert.strictEqual(draft.status, AMENDMENT_STATUS.DRAFT);

  const pending = buildPendingApprovalAmendmentWorkflowFields("user-1");
  assert.strictEqual(pending.status, AMENDMENT_STATUS.PENDING_APPROVAL);

  const approved = buildApprovedAmendmentWorkflowFields("approver-1", "ok");
  assert.strictEqual(approved.status, AMENDMENT_STATUS.APPROVED);

  const rejected = buildRejectedAmendmentWorkflowFields("approver-1", "no");
  assert.strictEqual(rejected.status, AMENDMENT_STATUS.REJECTED);

  const cancelled = buildCancelledAmendmentWorkflowFields("user-1");
  assert.strictEqual(cancelled.status, AMENDMENT_STATUS.CANCELLED);
  assert.ok(cancelled.cancelled_at);

  const applied = buildAppliedAmendmentWorkflowFields(2);
  assert.strictEqual(applied.status, AMENDMENT_STATUS.APPLIED);
  assert.strictEqual(applied.version, 2);

  assert.strictEqual(amendmentStatusLabel("pending_approval"), "Pending Approval");
}

function runPermissionTests() {
  assert.strictEqual(REQUEST_AMENDMENT_KEY, "plan:request_amendment");
  assert.strictEqual(APPROVE_AMENDMENT_KEY, "plan:approve_amendment");

  assert.strictEqual(
    userCanRequestAmendment({ permissions: [REQUEST_AMENDMENT_KEY] }),
    true
  );
  assert.strictEqual(
    userCanRequestAmendment({
      permissions: ["plan:request_target_reallocation"],
    }),
    true
  );
  assert.strictEqual(userCanRequestAmendment({ permissions: [] }), false);

  assert.strictEqual(
    userCanApproveAmendment({ permissions: [APPROVE_AMENDMENT_KEY] }),
    true
  );
  assert.strictEqual(
    userCanApproveAmendment({
      permissions: ["plan:approve_target_reallocation"],
    }),
    true
  );
  assert.strictEqual(userCanApproveAmendment({ permissions: [] }), false);
}

function runRegistryTests() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();

  const registered = listRegisteredAmendmentTypes();
  assert.strictEqual(registered.length, AMENDMENT_TYPE_VALUES.length);

  for (const type of AMENDMENT_TYPE_VALUES) {
    const handler = resolveAmendmentHandler(type);
    assert.ok(handler, `${type} must resolve a handler`);
    assert.strictEqual(handler.supports(type), true);
  }

  const available = listAvailableAmendmentTypes();
  assert.deepStrictEqual(
    [...available].sort(),
    [
      AMENDMENT_TYPE.ANNUAL_TARGET_REVISION,
      AMENDMENT_TYPE.KPI_ADDITION,
      AMENDMENT_TYPE.TARGET_REALLOCATION,
    ].sort()
  );

  const targetHandler = resolveAmendmentHandler(AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.strictEqual(targetHandler.isAvailable(), true);

  const annualHandler = resolveAmendmentHandler(AMENDMENT_TYPE.ANNUAL_TARGET_REVISION);
  assert.strictEqual(annualHandler.isAvailable(), true);

  const kpiAdditionHandler = resolveAmendmentHandler(AMENDMENT_TYPE.KPI_ADDITION);
  assert.strictEqual(kpiAdditionHandler.isAvailable(), true);

  const budgetHandler = resolveAmendmentHandler(AMENDMENT_TYPE.BUDGET_INCREASE);
  assert.strictEqual(budgetHandler.isAvailable(), false);
  assert.match(budgetHandler.validate().message, /not available/i);

  const catalog = getAmendmentHandlerCatalog();
  assert.strictEqual(catalog.length, 11);
  const targetEntry = catalog.find((row) => row.type === AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.strictEqual(targetEntry.available, true);
  const annualEntry = catalog.find(
    (row) => row.type === AMENDMENT_TYPE.ANNUAL_TARGET_REVISION
  );
  assert.strictEqual(annualEntry.available, true);
  const kpiAdditionEntry = catalog.find(
    (row) => row.type === AMENDMENT_TYPE.KPI_ADDITION
  );
  assert.strictEqual(kpiAdditionEntry.available, true);

  assert.ok(PlanAmendmentHandler);

  return targetHandler.validate().then((validation) => {
    assert.strictEqual(validation.valid, false);
  });
}

function runArtifactTests() {
  const legacyDir = path.join(root, "migrations/_legacy/pre_squash_20260716");
  const migrationTables = path.join(
    legacyDir,
    "20260813000001-plan-amendment-tables.js"
  );
  const migrationPerms = path.join(
    legacyDir,
    "20260813000002-plan-amendment-permissions.js"
  );
  assert.ok(fs.existsSync(migrationTables));
  assert.ok(fs.existsSync(migrationPerms));
  assert.ok(fs.existsSync(path.join(root, "models/plan/PlanAmendment.js")));
  assert.ok(fs.existsSync(path.join(root, "models/plan/PlanAmendmentHistory.js")));

  const tablesSource = fs.readFileSync(migrationTables, "utf8");
  assert.match(tablesSource, /plan_amendments/);
  assert.match(tablesSource, /plan_amendment_histories/);
  assert.match(tablesSource, /pending_approval/);
  assert.match(tablesSource, /target_reallocation/);

  const permsSource = fs.readFileSync(migrationPerms, "utf8");
  assert.match(permsSource, /request_amendment/);
  assert.match(permsSource, /approve_amendment/);
}

function run() {
  runTypeTests();
  runWorkflowTests();
  runPermissionTests();
  return runRegistryTests().then(() => {
    runArtifactTests();
    console.log("Plan amendment Step 1 checks passed.");
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
