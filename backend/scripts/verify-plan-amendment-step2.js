"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { AMENDMENT_MESSAGES } = require("../utils/planAmendmentMessages");
const { AMENDMENT_TYPE } = require("../utils/planAmendmentTypes");
const {
  AMENDMENT_STATUS,
  canTransitionAmendmentStatus,
} = require("../utils/planAmendmentWorkflowUtils");
const {
  normalizeCreateAmendmentPayload,
  serializePlanAmendment,
  resolveHandlerOrError,
} = require("../services/planAmendment/planAmendmentEngine");
const {
  registerDefaultAmendmentHandlers,
  clearAmendmentHandlers,
} = require("../services/planAmendment/planAmendmentRegistry");

const root = path.join(__dirname, "..");
const engineSource = fs.readFileSync(
  path.join(root, "services/planAmendment/planAmendmentEngine.js"),
  "utf8"
);
const scopeSource = fs.readFileSync(
  path.join(root, "services/planAmendment/planAmendmentScopeService.js"),
  "utf8"
);

function runPayloadTests() {
  const pending = normalizeCreateAmendmentPayload({
    draft_id: "draft-1",
    title: "Move Q2 to Q3",
    amendment_type: "TARGET_REALLOCATION",
    metadata: { amount: 10 },
    submit: true,
  });
  assert.strictEqual(pending.draftId, "draft-1");
  assert.strictEqual(pending.amendmentType, AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.strictEqual(pending.submit, true);
  assert.strictEqual(pending.metadata.amount, 10);

  const draft = normalizeCreateAmendmentPayload({
    draftId: "draft-1",
    title: "Draft only",
    type: "target_reallocation",
    asDraft: true,
  });
  assert.strictEqual(draft.asDraft, true);

  const unknown = normalizeCreateAmendmentPayload({
    title: "x",
    amendmentType: "not_a_real_type",
  });
  assert.strictEqual(unknown.amendmentType, null);
}

function runSerializeTests() {
  const serialized = serializePlanAmendment({
    plan_amendment_id: "a1",
    master_plan_version_id: "m1",
    title: "Test",
    description: null,
    amendment_type: AMENDMENT_TYPE.TARGET_REALLOCATION,
    status: AMENDMENT_STATUS.DRAFT,
    requested_by: "u1",
    requested_at: "2026-01-01",
    reviewed_by: null,
    reviewed_at: null,
    review_comment: null,
    applied_at: null,
    cancelled_at: null,
    effective_date: null,
    version: null,
    metadata: { kpiId: "k1" },
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  });

  assert.strictEqual(serialized.id, "a1");
  assert.strictEqual(serialized.draft_id, "m1");
  assert.strictEqual(serialized.metadata.kpiId, "k1");
}

function runHandlerGateTests() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();

  const ok = resolveHandlerOrError(AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.strictEqual(ok.success, true);
  assert.ok(ok.handler);

  const unavailable = resolveHandlerOrError(AMENDMENT_TYPE.BUDGET_INCREASE);
  assert.strictEqual(unavailable.success, false);
  assert.strictEqual(unavailable.message, AMENDMENT_MESSAGES.TYPE_UNAVAILABLE);

  const unknown = resolveHandlerOrError("nope");
  assert.strictEqual(unknown.success, false);
  assert.strictEqual(unknown.message, AMENDMENT_MESSAGES.TYPE_UNKNOWN);
}

function runLifecycleContractTests() {
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
      AMENDMENT_STATUS.REJECTED
    ),
    true
  );
  assert.strictEqual(
    canTransitionAmendmentStatus(
      AMENDMENT_STATUS.PENDING_APPROVAL,
      AMENDMENT_STATUS.CANCELLED
    ),
    true
  );
  assert.strictEqual(
    canTransitionAmendmentStatus(AMENDMENT_STATUS.DRAFT, AMENDMENT_STATUS.APPROVED),
    false
  );

  assert.match(engineSource, /async function createPlanAmendment\b/);
  assert.match(engineSource, /async function submitPlanAmendment\b/);
  assert.match(engineSource, /async function rejectPlanAmendment\b/);
  assert.match(engineSource, /async function cancelPlanAmendment\b/);
  assert.match(engineSource, /plan_amendment_submitted/);
  assert.match(engineSource, /plan_amendment_rejected/);
  assert.match(engineSource, /plan_amendment_cancelled/);
  assert.match(engineSource, /buildPendingApprovalAmendmentWorkflowFields/);
  assert.match(engineSource, /buildDraftAmendmentWorkflowFields/);

  assert.match(scopeSource, /assertUserCanRequestAmendmentOnDraft/);
  assert.match(scopeSource, /assertUserCanApproveAmendmentOnDraft/);
  assert.match(scopeSource, /process_started_at/);
}

function run() {
  runPayloadTests();
  runSerializeTests();
  runHandlerGateTests();
  runLifecycleContractTests();
  console.log("Plan amendment Step 2 checks passed.");
}

run();
