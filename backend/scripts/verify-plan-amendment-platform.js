"use strict";

/**
 * Plan Amendment Platform — infrastructure finalization suite.
 * Covers multi-action packages, ordering, effective date, policy,
 * conflict fingerprints, impact aggregation, preview aggregation,
 * compensating strategy, version helpers, history levels, APIs, extensibility.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  AMENDMENT_TYPE,
  normalizeAmendmentType,
} = require("../utils/planAmendmentTypes");
const {
  ACTION_STATUS,
  EFFECTIVE_MODE,
  DEFAULT_AMENDMENT_POLICY,
  normalizeEffectiveMode,
  normalizeActionInput,
  sortActionsBySequence,
  validateActionDependencyOrder,
  mergeAmendmentPolicy,
  serializePlanAmendmentAction,
} = require("../utils/planAmendmentActionUtils");
const {
  evaluateAmendmentPolicy,
  assertCompletedPeriodsPolicy,
  redistributionMode,
} = require("../services/planAmendment/planAmendmentPolicyService");
const {
  resolveEffectiveContext,
  validateEffectiveDateForCreate,
} = require("../services/planAmendment/planAmendmentEffectiveDate");
const {
  buildEntityKeys,
  fingerprintsOverlap,
} = require("../services/planAmendment/planAmendmentConflictService");
const {
  clearAmendmentHandlers,
  registerDefaultAmendmentHandlers,
  registerAmendmentHandler,
  resolveAmendmentHandler,
} = require("../services/planAmendment/planAmendmentRegistry");
const { PlanAmendmentHandler } = require("../services/planAmendment/handlers/PlanAmendmentHandler");
const {
  normalizeCreateAmendmentPayload,
  serializePlanAmendment,
  buildHandlerContext,
} = require("../services/planAmendment/planAmendmentEngine");
const { AMENDMENT_MESSAGES } = require("../utils/planAmendmentMessages");

const root = path.join(__dirname, "..");
const docsFramework = fs.readFileSync(
  path.join(root, "../docs/PLAN_AMENDMENT_FRAMEWORK.md"),
  "utf8"
);
const routesSource = fs.readFileSync(path.join(root, "routers/plan/planRoutes.js"), "utf8");
const engineSource = fs.readFileSync(
  path.join(root, "services/planAmendment/planAmendmentEngine.js"),
  "utf8"
);
const runnerSource = fs.readFileSync(
  path.join(root, "services/planAmendment/planAmendmentActionRunner.js"),
  "utf8"
);
const migrationSource = fs.readFileSync(
  path.join(root, "migrations/20260814000001-plan-amendment-platform.js"),
  "utf8"
);
const facadeSource = fs.readFileSync(
  path.join(root, "services/planTargetReallocationService.js"),
  "utf8"
);

function testMultiActionCreatePayload() {
  const packagePayload = normalizeCreateAmendmentPayload({
    draftId: "11111111-1111-4111-8111-111111111111",
    title: "FY2027 Budget Reduction",
    reason: "Budget Reduction",
    effectiveMode: "next_period",
    expectedVersion: 2,
    actions: [
      {
        actionType: "annual_target_revision",
        sequence: 1,
        metadata: { annualTarget: 80 },
      },
      {
        actionType: "TARGET_REALLOCATION",
        sequence: 2,
        dependsOnSequence: 1,
        metadata: { amount: 10, kpiId: "k1", fromPeriodId: "p1", toPeriodId: "p2", reason: "x" },
      },
    ],
    submit: true,
  });

  assert.strictEqual(packagePayload.reason, "Budget Reduction");
  assert.strictEqual(packagePayload.effectiveMode, EFFECTIVE_MODE.NEXT_PERIOD);
  assert.strictEqual(packagePayload.actions.length, 2);
  assert.strictEqual(packagePayload.actions[0].actionType, AMENDMENT_TYPE.ANNUAL_TARGET_REVISION);
  assert.strictEqual(packagePayload.actions[1].actionType, AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.strictEqual(packagePayload.actions[1].dependsOnSequence, 1);
  assert.strictEqual(packagePayload.amendmentType, AMENDMENT_TYPE.ANNUAL_TARGET_REVISION);

  const legacy = normalizeCreateAmendmentPayload({
    draft_id: "11111111-1111-4111-8111-111111111111",
    title: "Move targets",
    amendment_type: "TARGET_REALLOCATION",
    metadata: { amount: 5 },
    submit: true,
  });
  assert.strictEqual(legacy.actions.length, 1);
  assert.strictEqual(legacy.actions[0].actionType, AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.strictEqual(legacy.actions[0].metadata.amount, 5);
}

function testActionOrderingAndDependencies() {
  const unordered = [
    normalizeActionInput({ actionType: "owner_transfer", sequence: 3 }, 0),
    normalizeActionInput({ actionType: "target_reallocation", sequence: 2, dependsOnSequence: 1 }, 1),
    normalizeActionInput({ actionType: "annual_target_revision", sequence: 1 }, 2),
  ];
  const sorted = sortActionsBySequence(unordered);
  assert.deepStrictEqual(
    sorted.map((a) => a.sequence),
    [1, 2, 3]
  );

  const ok = validateActionDependencyOrder(sorted);
  assert.strictEqual(ok.valid, true);

  const badOrder = validateActionDependencyOrder([
    normalizeActionInput({ actionType: "target_reallocation", sequence: 1, dependsOnSequence: 2 }, 0),
    normalizeActionInput({ actionType: "annual_target_revision", sequence: 2 }, 1),
  ]);
  assert.strictEqual(badOrder.valid, false);

  const missingDep = validateActionDependencyOrder([
    normalizeActionInput({ actionType: "target_reallocation", sequence: 1, dependsOnSequence: 9 }, 0),
  ]);
  assert.strictEqual(missingDep.valid, false);
}

function testEffectiveDate() {
  assert.strictEqual(normalizeEffectiveMode("IMMEDIATE"), EFFECTIVE_MODE.IMMEDIATE);
  assert.strictEqual(normalizeEffectiveMode("next_period"), EFFECTIVE_MODE.NEXT_PERIOD);
  assert.strictEqual(normalizeEffectiveMode("custom_date"), EFFECTIVE_MODE.CUSTOM_DATE);

  const immediate = resolveEffectiveContext({ effective_mode: "immediate" });
  assert.strictEqual(immediate.success, true);
  assert.strictEqual(immediate.data.applyImmediately, true);

  const next = resolveEffectiveContext({ effectiveMode: "next_period" });
  assert.strictEqual(next.data.applyNextPeriod, true);

  const customMissing = validateEffectiveDateForCreate({
    effectiveMode: "custom_date",
  });
  assert.strictEqual(customMissing.valid, false);

  const customOk = validateEffectiveDateForCreate({
    effectiveMode: "custom_date",
    effectiveDate: "2027-07-01",
  });
  assert.strictEqual(customOk.valid, true);
  assert.strictEqual(customOk.effective.effectiveDate, "2027-07-01");
}

function testPolicyEvaluation() {
  const defaults = mergeAmendmentPolicy({});
  assert.strictEqual(defaults.completed_periods_editable, false);
  assert.strictEqual(defaults.automatic_redistribution, "manual");
  assert.strictEqual(defaults.allow_emergency_approvals, false);

  const emergencyBlocked = evaluateAmendmentPolicy(DEFAULT_AMENDMENT_POLICY, [], {
    emergency: true,
  });
  assert.strictEqual(emergencyBlocked.valid, false);

  const ownershipBlocked = evaluateAmendmentPolicy(
    { allow_ownership_transfer: false },
    [{ actionType: AMENDMENT_TYPE.OWNER_TRANSFER }]
  );
  assert.strictEqual(ownershipBlocked.valid, false);

  const structuralBlocked = evaluateAmendmentPolicy(
    { allow_structural_amendments_after_execution: false },
    [{ actionType: AMENDMENT_TYPE.KPI_ADDITION }]
  );
  assert.strictEqual(structuralBlocked.valid, false);

  const completedLocked = assertCompletedPeriodsPolicy(
    { completed_periods_editable: false },
    { periodIsCompleted: true }
  );
  assert.strictEqual(completedLocked.valid, false);

  assert.strictEqual(redistributionMode({ automatic_redistribution: "proportional" }), "proportional");
}

function testConflictDetectionHelpers() {
  const keys = buildEntityKeys({
    kpiIds: ["k1", "k1"],
    periodIds: ["p1", "p2"],
    departmentIds: ["d1"],
    entityKeys: ["custom:x"],
  });
  assert.ok(keys.includes("kpi:k1"));
  assert.ok(keys.includes("period:p1"));
  assert.ok(keys.includes("department:d1"));
  assert.ok(keys.includes("custom:x"));

  const overlap = fingerprintsOverlap(
    { entityKeys: ["kpi:k1", "period:p2"], kpiIds: ["k1"], periodIds: ["p2"] },
    { entityKeys: ["kpi:k1"], kpiIds: ["k1"], periodIds: ["p9"] }
  );
  assert.strictEqual(overlap.overlaps, true);
  assert.ok(overlap.overlappingKpis.includes("k1"));

  const noOverlap = fingerprintsOverlap(
    { entityKeys: ["kpi:a"], kpiIds: ["a"], periodIds: [] },
    { entityKeys: ["kpi:b"], kpiIds: ["b"], periodIds: [] }
  );
  assert.strictEqual(noOverlap.overlaps, false);
}

function testPreviewAndImpactAggregationContracts() {
  assert.match(runnerSource, /previewAllActions/);
  assert.match(runnerSource, /applyAllActions/);
  assert.match(runnerSource, /validateAllActions/);
  assert.match(runnerSource, /recordAmendmentHistoryRows/);
  assert.match(runnerSource, /plan_amendment_action_id/);
  assert.match(engineSource, /aggregateAmendmentImpact/);
  assert.match(engineSource, /detectAmendmentConflicts/);
  assert.match(engineSource, /evaluateAmendmentPolicy/);
  assert.match(engineSource, /createCompensatingAmendment/);
  assert.match(engineSource, /legacy_preview/);

  // Reason independent of actions
  const payload = normalizeCreateAmendmentPayload({
    draftId: "11111111-1111-4111-8111-111111111111",
    title: "Restructure pack",
    reason: "Government Restructure",
    amendmentType: "owner_transfer",
    metadata: { fromDept: "A", toDept: "B" },
  });
  assert.strictEqual(payload.reason, "Government Restructure");
  assert.strictEqual(payload.actions[0].actionType, AMENDMENT_TYPE.OWNER_TRANSFER);
}

function testTransactionAndVersionInfrastructure() {
  assert.match(engineSource, /sequelize\.transaction/);
  assert.match(engineSource, /await t\.rollback\(\)/);
  assert.match(engineSource, /resolveNextAmendmentVersion/);
  assert.match(runnerSource, /ACTION_STATUS\.FAILED/);
  assert.match(migrationSource, /plan_amendment_actions/);
  assert.match(migrationSource, /amendment_policy/);
  assert.match(migrationSource, /effective_mode/);
  assert.match(migrationSource, /compensates_amendment_id/);
  assert.match(migrationSource, /plan_amendment_action_id/);
}

function testHistoryTwoLevels() {
  assert.match(migrationSource, /plan_amendment_histories.*plan_amendment_action_id|plan_amendment_action_id/s);
  assert.ok(fs.existsSync(path.join(root, "models/plan/PlanAmendmentAction.js")));
  assert.match(
    fs.readFileSync(path.join(root, "models/plan/PlanAmendmentHistory.js"), "utf8"),
    /plan_amendment_action_id/
  );
  assert.match(routesSource, /\/plan-amendments\/:id\/history/);
}

function testApisAndDocs() {
  assert.match(routesSource, /\/plan-amendments\/:id\/impact/);
  assert.match(routesSource, /\/plan-amendments\/:id\/actions/);
  assert.match(routesSource, /\/plan-amendments\/reporting/);
  assert.match(routesSource, /\/plan-amendments\/:id\/compensate/);
  assert.match(routesSource, /\/plan-amendments\/:id\/preview/);

  assert.match(docsFramework, /Plan Amendment Framework/);
  assert.match(docsFramework, /How to add a new amendment type/);
  assert.match(docsFramework, /Do not.*change the engine/i);
  assert.match(docsFramework, /compensating amendment/i);
  assert.match(docsFramework, /plan_amendment_actions/);
  assert.match(docsFramework, /amendment_policy/);
  assert.match(docsFramework, /Reason ≠ action|Reason never determines/i);

  assert.match(facadeSource, /PlanAmendmentAction\.create/);
  assert.strictEqual(AMENDMENT_MESSAGES.ACTIONS_REQUIRED.includes("action"), true);
}

async function testOpenClosedExtensibility() {
  class TempPackageActionHandler extends PlanAmendmentHandler {
    get type() {
      return AMENDMENT_TYPE.CUSTOM;
    }
    isAvailable() {
      return true;
    }
    validate() {
      return { valid: true };
    }
    preview() {
      return { success: true, data: { ok: true } };
    }
    impact() {
      return {
        success: true,
        data: {
          summary: ["Custom impact"],
          kpiIds: ["k-temp"],
          departmentIds: [],
          periodIds: [],
          changes: [],
        },
      };
    }
    conflictKeys() {
      return { kpiIds: ["k-temp"], periodIds: [], departmentIds: [], entityKeys: [] };
    }
    apply() {
      return { success: true, history: [], data: { applied: true } };
    }
  }

  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();
  registerAmendmentHandler(new TempPackageActionHandler());

  const handler = resolveAmendmentHandler(AMENDMENT_TYPE.CUSTOM);
  assert.strictEqual(handler.isAvailable(), true);
  const impact = await handler.impact({});
  assert.strictEqual(impact.success, true);
  assert.deepStrictEqual(impact.data.kpiIds, ["k-temp"]);
  const keys = handler.conflictKeys({});
  assert.deepStrictEqual(keys.kpiIds, ["k-temp"]);

  // Engine source must not switch on annual_target_revision / owner_transfer domain rules
  assert.doesNotMatch(engineSource, /case\s+['"]annual_target_revision['"]/);
  assert.doesNotMatch(engineSource, /case\s+['"]owner_transfer['"]/);
}

function testSerialization() {
  const serialized = serializePlanAmendment({
    plan_amendment_id: "a1",
    master_plan_version_id: "m1",
    title: "Pack",
    description: null,
    reason: "Budget Reduction",
    amendment_type: AMENDMENT_TYPE.TARGET_REALLOCATION,
    is_package: true,
    status: "pending_approval",
    requested_by: "u1",
    requested_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_comment: null,
    applied_at: null,
    cancelled_at: null,
    effective_mode: "next_period",
    effective_date: null,
    expected_version: 2,
    compensates_amendment_id: null,
    version: null,
    metadata: {},
    created_at: null,
    updated_at: null,
  });
  assert.strictEqual(serialized.reason, "Budget Reduction");
  assert.strictEqual(serialized.is_package, true);
  assert.strictEqual(serialized.effective_mode, "next_period");
  assert.strictEqual(serialized.expected_version, 2);

  const action = serializePlanAmendmentAction({
    plan_amendment_action_id: "act1",
    plan_amendment_id: "a1",
    action_type: AMENDMENT_TYPE.TARGET_REALLOCATION,
    sequence: 1,
    status: ACTION_STATUS.PENDING,
    metadata: { amount: 10 },
    preview: null,
    impact: null,
    depends_on_sequence: null,
    error_message: null,
    applied_at: null,
    created_at: null,
    updated_at: null,
  });
  assert.strictEqual(action.sequence, 1);
  assert.strictEqual(action.action_type_label, "Target Reallocation");

  const ctx = buildHandlerContext(
    { metadata: { amount: 1 }, plan_amendment_id: "a1" },
    { user_id: "u1" }
  );
  assert.strictEqual(ctx.metadata.amount, 1);
  assert.strictEqual(normalizeAmendmentType("TARGET_REALLOCATION"), "target_reallocation");
}

async function testTargetReallocationHandlerExtensions() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();
  const handler = resolveAmendmentHandler(AMENDMENT_TYPE.TARGET_REALLOCATION);
  const keys = handler.conflictKeys({
    metadata: {
      kpiId: "kpi-1",
      fromPeriodId: "p1",
      toPeriodId: "p2",
      amount: 10,
      reason: "x",
    },
  });
  assert.deepStrictEqual(keys.kpiIds, ["kpi-1"]);
  assert.ok(keys.periodIds.includes("p1"));
  assert.ok(keys.periodIds.includes("p2"));

  const rollback = await handler.rollback({});
  assert.strictEqual(rollback.success, false);
  assert.strictEqual(rollback.compensation.strategy, "compensating_amendment");
}

async function run() {
  testMultiActionCreatePayload();
  testActionOrderingAndDependencies();
  testEffectiveDate();
  testPolicyEvaluation();
  testConflictDetectionHelpers();
  testPreviewAndImpactAggregationContracts();
  testTransactionAndVersionInfrastructure();
  testHistoryTwoLevels();
  testApisAndDocs();
  testSerialization();
  await testOpenClosedExtensibility();
  await testTargetReallocationHandlerExtensions();

  console.log("Plan amendment platform checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
