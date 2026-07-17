"use strict";

/**
 * Execution Window Reopening — domain, handler, gate, and registry checks.
 * Pure unit tests (no DB) where possible.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  EXECUTION_WINDOW_REOPENING_MESSAGES,
  EXECUTION_WINDOW_REOPENING_REASONS,
  normalizeExecutionWindowReopeningMetadata,
  validateDateWindow,
  buildExecutionWindowReopeningPreviewData,
  buildExecutionWindowReopeningImpactData,
  buildExecutionWindowReopeningHistoryRows,
} = require("../services/planAmendment/executionWindowReopeningDomain");
const {
  ExecutionWindowReopeningHandler,
} = require("../services/planAmendment/handlers/executionWindowReopeningHandler");
const { AMENDMENT_TYPE, AMENDMENT_TYPE_VALUES } = require("../utils/planAmendmentTypes");
const {
  clearAmendmentHandlers,
  registerDefaultAmendmentHandlers,
  resolveAmendmentHandler,
  listAvailableAmendmentTypes,
  getAmendmentHandlerCatalog,
} = require("../services/planAmendment/planAmendmentRegistry");
const {
  fingerprintsOverlap,
} = require("../services/planAmendment/planAmendmentConflictService");
const {
  REQUEST_EXECUTION_REOPENING_KEY,
  APPROVE_EXECUTION_REOPENING_KEY,
} = require("../utils/planExecutionReopeningPermissionUtils");
const {
  DEFAULT_AMENDMENT_POLICY,
  mergeAmendmentPolicy,
} = require("../utils/planAmendmentActionUtils");

const root = path.join(__dirname, "..");

function samplePrepared(overrides = {}) {
  const reopenStart = new Date("2026-07-01T00:00:00.000Z");
  const reopenEnd = new Date("2026-07-15T23:59:59.000Z");
  return {
    success: true,
    metadata: {
      reason: "Late procurement",
      reasonCode: "late_procurement",
      periodVersionIds: ["period-1", "period-2"],
    },
    liveMaster: { plan_version_id: "master-1" },
    periods: [
      {
        livePeriodId: "period-1",
        snapshotPeriodId: "snap-period-1",
        periodLabel: "Q1",
        sequenceIndex: 1,
        previousExecutionStatus: "completed",
      },
      {
        livePeriodId: "period-2",
        snapshotPeriodId: "snap-period-2",
        periodLabel: "Q2",
        sequenceIndex: 2,
        previousExecutionStatus: "completed",
      },
    ],
    reopenStart,
    reopenEnd,
    durationDays: 15,
    ...overrides,
  };
}

function testNormalization() {
  const plural = normalizeExecutionWindowReopeningMetadata({
    period_version_ids: ["p1", "p2"],
    reopen_start: "2026-07-01",
    reopen_end: "2026-07-10",
    reason: "Outage",
    reason_code: "internet_outage",
  });
  assert.deepStrictEqual(plural.periodVersionIds, ["p1", "p2"]);
  assert.strictEqual(plural.reasonCode, "internet_outage");

  const singular = normalizeExecutionWindowReopeningMetadata({
    periodVersionId: "p9",
    reopenStart: "2026-07-01",
    reopenEnd: "2026-07-05",
    reason: "Other",
  });
  assert.deepStrictEqual(singular.periodVersionIds, ["p9"]);

  assert.ok(
    EXECUTION_WINDOW_REOPENING_REASONS.some((row) => row.code === "natural_disaster")
  );
}

function testDateValidation() {
  const policy = mergeAmendmentPolicy({ max_reopen_duration_days: 30 });

  const invalidStart = validateDateWindow(
    { reopenStart: "nope", reopenEnd: "2026-07-10" },
    policy
  );
  assert.strictEqual(invalidStart.valid, false);
  assert.strictEqual(
    invalidStart.message,
    EXECUTION_WINDOW_REOPENING_MESSAGES.INVALID_START_DATE
  );

  const endBeforeStart = validateDateWindow(
    { reopenStart: "2026-07-10", reopenEnd: "2026-07-01" },
    policy
  );
  assert.strictEqual(endBeforeStart.valid, false);
  assert.strictEqual(
    endBeforeStart.message,
    EXECUTION_WINDOW_REOPENING_MESSAGES.END_BEFORE_START
  );

  const tooLong = validateDateWindow(
    { reopenStart: "2026-01-01", reopenEnd: "2026-03-01" },
    policy
  );
  assert.strictEqual(tooLong.valid, false);
  assert.strictEqual(
    tooLong.message,
    EXECUTION_WINDOW_REOPENING_MESSAGES.DURATION_EXCEEDED
  );

  const ok = validateDateWindow(
    { reopenStart: "2026-07-01", reopenEnd: "2026-07-15" },
    policy
  );
  assert.strictEqual(ok.valid, true);
  assert.ok(ok.durationDays >= 14 && ok.durationDays <= 15);
}

function testPreviewImpactHistory() {
  const prepared = samplePrepared();
  const preview = buildExecutionWindowReopeningPreviewData(prepared);
  assert.strictEqual(preview.amendment_type, AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING);
  assert.strictEqual(preview.periods.length, 2);
  assert.strictEqual(preview.periods[0].unchanged_execution_status, true);

  const impact = buildExecutionWindowReopeningImpactData(prepared);
  assert.strictEqual(impact.periodIds.length, 2);
  assert.ok(impact.summary.some((line) => /overlay override/i.test(line)));

  const history = buildExecutionWindowReopeningHistoryRows(prepared, [
    { plan_execution_window_override_id: "ov-1" },
  ]);
  assert.ok(history.some((row) => row.entity_type === "plan_version"));
  assert.ok(history.some((row) => row.entity_type === "plan_execution_window_override"));
}

function testHandlerRegistrationAndConflictKeys() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();

  assert.ok(AMENDMENT_TYPE_VALUES.includes(AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING));
  assert.ok(listAvailableAmendmentTypes().includes(AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING));

  const handler = resolveAmendmentHandler(AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING);
  assert.ok(handler instanceof ExecutionWindowReopeningHandler);
  assert.strictEqual(handler.isAvailable(), true);

  const catalog = getAmendmentHandlerCatalog();
  const entry = catalog.find(
    (row) => row.type === AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING
  );
  assert.strictEqual(entry.available, true);
  assert.strictEqual(entry.registered, true);

  const keys = handler.conflictKeys({
    metadata: { periodVersionIds: ["p1", "p2"] },
  });
  assert.deepStrictEqual(keys.periodIds, ["p1", "p2"]);
  assert.deepStrictEqual(keys.entityKeys, [
    "execution_window:period:p1",
    "execution_window:period:p2",
  ]);

  const overlap = fingerprintsOverlap(
    { kpiIds: [], periodIds: ["p1"], entityKeys: keys.entityKeys },
    {
      kpiIds: [],
      periodIds: ["p1"],
      entityKeys: ["execution_window:period:p1"],
    }
  );
  assert.strictEqual(overlap.overlaps, true);
}

function testPolicyDefaults() {
  assert.strictEqual(DEFAULT_AMENDMENT_POLICY.allow_execution_window_reopening, true);
  assert.strictEqual(DEFAULT_AMENDMENT_POLICY.max_reopen_duration_days, 30);
  const merged = mergeAmendmentPolicy({ max_reopen_duration_days: 7 });
  assert.strictEqual(merged.max_reopen_duration_days, 7);
}

function testPermissionKeys() {
  assert.strictEqual(REQUEST_EXECUTION_REOPENING_KEY, "plan:request_execution_reopening");
  assert.strictEqual(APPROVE_EXECUTION_REOPENING_KEY, "plan:approve_execution_reopening");
}

function testGateAndEngineArtifacts() {
  const gateSource = fs.readFileSync(
    path.join(root, "services/planExecutionGateService.js"),
    "utf8"
  );
  assert.match(gateSource, /execution_reopening/);
  assert.match(gateSource, /getActiveOverrideAccessPatch/);

  const engineSource = fs.readFileSync(
    path.join(root, "services/planAmendment/planAmendmentEngine.js"),
    "utf8"
  );
  assert.doesNotMatch(engineSource, /case\s+['"]execution_window_reopening['"]/);
  assert.doesNotMatch(engineSource, /ExecutionWindowReopeningHandler/);

  const routesSource = fs.readFileSync(
    path.join(root, "routers/plan/planRoutes.js"),
    "utf8"
  );
  assert.match(routesSource, /execution-window-reopening-reporting/);
  assert.match(routesSource, /REQUEST_EXECUTION_REOPENING/);

  const notificationSource = fs.readFileSync(
    path.join(root, "services/planAmendment/planAmendmentNotificationService.js"),
    "utf8"
  );
  assert.match(notificationSource, /execution-window-reopening/);

  const docs = fs.readFileSync(
    path.join(root, "../docs/PLAN_AMENDMENT_FRAMEWORK.md"),
    "utf8"
  );
  assert.match(docs, /execution_window_reopening/);
}

function run() {
  testNormalization();
  testDateValidation();
  testPreviewImpactHistory();
  testHandlerRegistrationAndConflictKeys();
  testPolicyDefaults();
  testPermissionKeys();
  testGateAndEngineArtifacts();
  console.log("Execution Window Reopening checks passed.");
}

run();
