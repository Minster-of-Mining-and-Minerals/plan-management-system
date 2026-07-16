"use strict";

/**
 * Step 8 — full framework verification suite.
 * Covers: registration, permissions, transitions, preview shape, reallocation math,
 * version/history helpers, notifications, facade dual-write wiring, docs, API routes.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  AMENDMENT_TYPE,
  AMENDMENT_TYPE_VALUES,
  isAmendmentTypeMarkedAvailable,
  normalizeAmendmentType,
} = require("../utils/planAmendmentTypes");
const {
  AMENDMENT_STATUS,
  canTransitionAmendmentStatus,
  buildAppliedAmendmentWorkflowFields,
  buildPendingApprovalAmendmentWorkflowFields,
} = require("../utils/planAmendmentWorkflowUtils");
const {
  REQUEST_AMENDMENT_KEY,
  APPROVE_AMENDMENT_KEY,
  userCanRequestAmendment,
  userCanApproveAmendment,
} = require("../utils/planAmendmentPermissionUtils");
const {
  clearAmendmentHandlers,
  registerDefaultAmendmentHandlers,
  resolveAmendmentHandler,
  listAvailableAmendmentTypes,
  getAmendmentHandlerCatalog,
  registerAmendmentHandler,
} = require("../services/planAmendment/planAmendmentRegistry");
const { PlanAmendmentHandler } = require("../services/planAmendment/handlers/PlanAmendmentHandler");
const { TargetReallocationHandler } = require("../services/planAmendment/handlers/targetReallocationHandler");
const {
  normalizeTargetReallocationMetadata,
  buildTargetReallocationPreviewData,
  buildAmendmentHistoryRows,
} = require("../services/planAmendment/targetReallocationDomain");
const { validateReallocationBusinessRules } = require("../services/planTargetReallocationService");
const {
  mapAmendmentStatusToReallocationStatus,
  serializeTargetReallocationRequest,
} = require("../services/planTargetReallocationService");
const { REALLOCATION_STATUS } = require("../utils/planTargetReallocationWorkflowUtils");
const {
  PLAN_AMENDMENT_EVENTS,
  buildPlanAmendmentLink,
} = require("../services/planAmendment/planAmendmentNotificationService");
const {
  buildHandlerContext,
  resolveHandlerOrError,
  serializePlanAmendment,
  normalizeCreateAmendmentPayload,
  normalizeListAmendmentsQuery,
} = require("../services/planAmendment/planAmendmentEngine");

const root = path.join(__dirname, "..");
const docsFramework = fs.readFileSync(
  path.join(root, "../docs/PLAN_AMENDMENT_FRAMEWORK.md"),
  "utf8"
);
const docsReallocation = fs.readFileSync(
  path.join(root, "../docs/TARGET_REALLOCATION.md"),
  "utf8"
);
const routesSource = fs.readFileSync(path.join(root, "routers/plan/planRoutes.js"), "utf8");
const engineSource = fs.readFileSync(
  path.join(root, "services/planAmendment/planAmendmentEngine.js"),
  "utf8"
);
const facadeSource = fs.readFileSync(
  path.join(root, "services/planTargetReallocationService.js"),
  "utf8"
);

/** 1 — Handler registration */
function testHandlerRegistration() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();

  assert.strictEqual(listAvailableAmendmentTypes().length, 1);
  assert.strictEqual(
    listAvailableAmendmentTypes()[0],
    AMENDMENT_TYPE.TARGET_REALLOCATION
  );

  const catalog = getAmendmentHandlerCatalog();
  assert.strictEqual(catalog.length, AMENDMENT_TYPE_VALUES.length);
  for (const row of catalog) {
    assert.strictEqual(row.registered, true);
    if (row.type === AMENDMENT_TYPE.TARGET_REALLOCATION) {
      assert.strictEqual(row.available, true);
      assert.ok(resolveAmendmentHandler(row.type) instanceof TargetReallocationHandler);
    } else {
      assert.strictEqual(row.available, false);
      assert.strictEqual(isAmendmentTypeMarkedAvailable(row.type), false);
    }
  }
}

/** 2 — Permission enforcement (keys + aliases) */
function testPermissionEnforcement() {
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
}

/** 3 — Status transitions */
function testStatusTransitions() {
  assert.strictEqual(
    canTransitionAmendmentStatus(
      AMENDMENT_STATUS.DRAFT,
      AMENDMENT_STATUS.PENDING_APPROVAL
    ),
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

  const pending = buildPendingApprovalAmendmentWorkflowFields("u1");
  assert.strictEqual(pending.status, AMENDMENT_STATUS.PENDING_APPROVAL);

  const applied = buildAppliedAmendmentWorkflowFields(3);
  assert.strictEqual(applied.status, AMENDMENT_STATUS.APPLIED);
  assert.strictEqual(applied.version, 3);
}

/** 4 — Handler resolution + create payload */
function testHandlerResolutionAndCreatePayload() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();

  const ok = resolveHandlerOrError(AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.strictEqual(ok.success, true);

  const blocked = resolveHandlerOrError(AMENDMENT_TYPE.BUDGET_INCREASE);
  assert.strictEqual(blocked.success, false);

  const payload = normalizeCreateAmendmentPayload({
    draft_id: "11111111-1111-4111-8111-111111111111",
    title: "Move targets",
    amendment_type: "TARGET_REALLOCATION",
    submit: true,
    metadata: { amount: 10 },
  });
  assert.strictEqual(payload.amendmentType, AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.strictEqual(payload.submit, true);
}

/** 5 — Preview generation (Q2→Q3 shape) */
function testPreviewGeneration() {
  const business = validateReallocationBusinessRules({
    amount: 10,
    fromPeriodNode: { period_target: 25, period_actual: 0 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "open",
  });
  assert.strictEqual(business.valid, true);

  const prepared = {
    metadata: normalizeTargetReallocationMetadata({
      kpiId: "kpi",
      fromPeriodId: "q2",
      toPeriodId: "q3",
      amount: 10,
      reason: "Venue",
    }),
    context: {
      liveAnnualKpi: { title: "Train Staff", annual_target: 100 },
      fromPeriod: { period_label: "Q2" },
      toPeriod: { period_label: "Q3" },
      fromPeriodNode: { plan_node_id: "from-node" },
      toPeriodNode: { plan_node_id: "to-node" },
    },
    validation: business,
    annualTarget: 100,
    fromOldTarget: 25,
    toOldTarget: 25,
    fromNewTarget: 15,
    toNewTarget: 35,
  };

  const preview = buildTargetReallocationPreviewData(prepared);
  assert.strictEqual(preview.from_period.current_target, 25);
  assert.strictEqual(preview.from_period.preview_target, 15);
  assert.strictEqual(preview.to_period.preview_target, 35);
  assert.strictEqual(preview.annual_target, 100);
}

/** 6 — Target reallocation execution math + annual sum */
function testTargetReallocationExecution() {
  const q1 = 25;
  const q2 = 25;
  const q3 = 25;
  const q4 = 25;
  const annual = 100;

  const moved = validateReallocationBusinessRules({
    amount: 10,
    fromPeriodNode: { period_target: q2, period_actual: 0 },
    toPeriodNode: { period_target: q3, period_actual: 0 },
    fromExecutionStatus: "open",
  });
  assert.strictEqual(moved.fromResult, 15);
  assert.strictEqual(moved.toResult, 35);
  assert.strictEqual(q1 + moved.fromResult + moved.toResult + q4, annual);

  const exceeds = validateReallocationBusinessRules({
    amount: 10,
    fromPeriodNode: { period_target: 25, period_actual: 20 },
    toPeriodNode: { period_target: 25, period_actual: 0 },
    fromExecutionStatus: "open",
  });
  assert.strictEqual(exceeds.valid, false);
}

/** 7 — Version increment fields + audit history rows */
function testVersionAndAuditHistory() {
  const applied = buildAppliedAmendmentWorkflowFields(1);
  const next = buildAppliedAmendmentWorkflowFields(2);
  assert.strictEqual(applied.version, 1);
  assert.strictEqual(next.version, 2);

  const history = buildAmendmentHistoryRows({
    context: {
      fromPeriodNode: { plan_node_id: "a" },
      toPeriodNode: { plan_node_id: "b" },
    },
    fromOldTarget: 25,
    toOldTarget: 25,
    fromNewTarget: 15,
    toNewTarget: 35,
  });
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].field_name, "period_target");
  assert.strictEqual(history[0].old_value, "25");
  assert.strictEqual(history[1].new_value, "35");

  assert.match(engineSource, /resolveNextAmendmentVersion/);
  assert.match(engineSource, /recordAmendmentHistoryRows/);
  assert.match(engineSource, /plan_amendment_applied/);
}

/** 8 — Notification events */
function testNotificationEvents() {
  assert.strictEqual(PLAN_AMENDMENT_EVENTS.SUBMITTED, "plan_amendment_submitted");
  assert.strictEqual(PLAN_AMENDMENT_EVENTS.APPROVED, "plan_amendment_approved");
  assert.strictEqual(PLAN_AMENDMENT_EVENTS.REJECTED, "plan_amendment_rejected");
  assert.match(
    buildPlanAmendmentLink("m1", "target_reallocation"),
    /focus=reallocation/
  );
  assert.match(engineSource, /emitPlanAmendmentSubmittedEvent/);
  assert.match(engineSource, /emitPlanAmendmentApprovedEvent/);
  assert.match(engineSource, /emitPlanAmendmentRejectedEvent/);
}

/** 9 — Facade dual-write + status mapping */
function testFacadeDualWrite() {
  assert.strictEqual(
    mapAmendmentStatusToReallocationStatus(AMENDMENT_STATUS.PENDING_APPROVAL),
    REALLOCATION_STATUS.PENDING
  );
  assert.strictEqual(
    mapAmendmentStatusToReallocationStatus(AMENDMENT_STATUS.APPLIED),
    REALLOCATION_STATUS.APPLIED
  );

  const serialized = serializeTargetReallocationRequest({
    target_reallocation_request_id: "r1",
    plan_amendment_id: "a1",
    master_plan_version_id: "m1",
    annual_kpi_plan_node_id: "k1",
    annual_plan_version_id: "an1",
    from_period_version_id: "p1",
    to_period_version_id: "p2",
    from_period_plan_node_id: "n1",
    to_period_plan_node_id: "n2",
    amount: 10,
    reason: "x",
    status: "pending",
    requested_by: "u1",
    requested_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_comment: null,
    applied_at: null,
    created_at: null,
    updated_at: null,
  });
  assert.strictEqual(serialized.plan_amendment_id, "a1");

  assert.match(facadeSource, /PlanAmendment\.create/);
  assert.match(facadeSource, /legacy_request_id/);
  assert.match(facadeSource, /prepareTargetReallocationChange/);
  assert.match(facadeSource, /applyPreparedTargetReallocation/);
}

/** 10 — Docs + API routes + open/closed registry */
function testDocsApisAndExtensibility() {
  assert.match(docsFramework, /Plan Amendment Framework/);
  assert.match(docsFramework, /How to add a new amendment type/);
  assert.match(docsFramework, /target_reallocation/);
  assert.match(docsFramework, /Open\/Closed|Do not.*change the engine/i);
  assert.match(docsReallocation, /PLAN_AMENDMENT_FRAMEWORK/);
  assert.match(docsReallocation, /dual-write|plan_amendments/);

  assert.match(routesSource, /\/plan-amendments/);
  assert.match(routesSource, /\/plan-amendments\/:id\/preview/);
  assert.match(routesSource, /\/target-reallocations/);

  // Open/closed: can register a custom handler without editing engine source
  class TempHandler extends PlanAmendmentHandler {
    get type() {
      return AMENDMENT_TYPE.CUSTOM;
    }
    isAvailable() {
      return true;
    }
  }
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();
  registerAmendmentHandler(new TempHandler());
  assert.strictEqual(resolveAmendmentHandler(AMENDMENT_TYPE.CUSTOM).isAvailable(), true);

  const listQuery = normalizeListAmendmentsQuery({
    draft_id: "11111111-1111-4111-8111-111111111111",
    status: "applied",
    version: 1,
  });
  assert.strictEqual(listQuery.status, AMENDMENT_STATUS.APPLIED);

  const serialized = serializePlanAmendment({
    plan_amendment_id: "a1",
    master_plan_version_id: "m1",
    title: "t",
    description: null,
    amendment_type: AMENDMENT_TYPE.TARGET_REALLOCATION,
    status: AMENDMENT_STATUS.APPLIED,
    requested_by: "u1",
    requested_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_comment: null,
    applied_at: null,
    cancelled_at: null,
    effective_date: null,
    version: 1,
    metadata: {},
    created_at: null,
    updated_at: null,
  });
  assert.strictEqual(serialized.version, 1);

  const ctx = buildHandlerContext(
    { metadata: { amount: 1 }, plan_amendment_id: "a1" },
    { user_id: "u1" }
  );
  assert.strictEqual(ctx.metadata.amount, 1);
  assert.strictEqual(normalizeAmendmentType("TARGET_REALLOCATION"), "target_reallocation");
}

async function run() {
  testHandlerRegistration();
  testPermissionEnforcement();
  testStatusTransitions();
  testHandlerResolutionAndCreatePayload();
  testPreviewGeneration();
  testTargetReallocationExecution();
  testVersionAndAuditHistory();
  testNotificationEvents();
  testFacadeDualWrite();
  testDocsApisAndExtensibility();

  // Async validate empty metadata on real handler
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();
  const handler = resolveAmendmentHandler(AMENDMENT_TYPE.TARGET_REALLOCATION);
  const validation = await handler.validate({ metadata: {} });
  assert.strictEqual(validation.valid, false);

  console.log("Plan amendment Step 8 checks passed (full framework suite).");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
