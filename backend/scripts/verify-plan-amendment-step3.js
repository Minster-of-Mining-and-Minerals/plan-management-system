"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { AMENDMENT_TYPE } = require("../utils/planAmendmentTypes");
const { AMENDMENT_STATUS } = require("../utils/planAmendmentWorkflowUtils");
const { PlanAmendmentHandler } = require("../services/planAmendment/handlers/PlanAmendmentHandler");
const {
  registerAmendmentHandler,
  clearAmendmentHandlers,
  registerDefaultAmendmentHandlers,
  resolveAmendmentHandler,
} = require("../services/planAmendment/planAmendmentRegistry");
const {
  buildHandlerContext,
  resolveHandlerOrError,
  serializePlanAmendment,
} = require("../services/planAmendment/planAmendmentEngine");

const root = path.join(__dirname, "..");
const engineSource = fs.readFileSync(
  path.join(root, "services/planAmendment/planAmendmentEngine.js"),
  "utf8"
);

class FakeTestAmendmentHandler extends PlanAmendmentHandler {
  get type() {
    return AMENDMENT_TYPE.CUSTOM;
  }

  isAvailable() {
    return true;
  }

  validate(ctx) {
    if (ctx.metadata?.value == null) {
      return { valid: false, message: "value required" };
    }
    return { valid: true };
  }

  preview(ctx) {
    return {
      success: true,
      data: {
        field: "value",
        before: 1,
        after: Number(ctx.metadata.value),
      },
    };
  }

  apply(ctx) {
    return {
      success: true,
      history: [
        {
          entity_type: "test_entity",
          entity_id: "00000000-0000-4000-8000-000000000099",
          field_name: "value",
          old_value: "1",
          new_value: String(ctx.metadata.value),
        },
      ],
      data: { applied_value: Number(ctx.metadata.value) },
    };
  }
}

function runFakeHandlerPipelineTests() {
  clearAmendmentHandlers();
  registerDefaultAmendmentHandlers();
  registerAmendmentHandler(new FakeTestAmendmentHandler());

  const handler = resolveAmendmentHandler(AMENDMENT_TYPE.CUSTOM);
  assert.ok(handler);
  assert.strictEqual(handler.isAvailable(), true);

  const gate = resolveHandlerOrError(AMENDMENT_TYPE.CUSTOM);
  assert.strictEqual(gate.success, true);

  const amendment = {
    plan_amendment_id: "amd-1",
    master_plan_version_id: "draft-1",
    amendment_type: AMENDMENT_TYPE.CUSTOM,
    status: AMENDMENT_STATUS.PENDING_APPROVAL,
    metadata: { value: 42 },
    title: "Fake amendment",
  };
  const user = { user_id: "user-1" };
  const ctx = buildHandlerContext(amendment, user);

  const invalid = handler.validate(buildHandlerContext({ ...amendment, metadata: {} }, user));
  assert.strictEqual(invalid.valid, false);

  const valid = handler.validate(ctx);
  assert.strictEqual(valid.valid, true);

  const preview = handler.preview(ctx);
  assert.strictEqual(preview.success, true);
  assert.strictEqual(preview.data.after, 42);

  const apply = handler.apply(ctx);
  assert.strictEqual(apply.success, true);
  assert.strictEqual(apply.history.length, 1);
  assert.strictEqual(apply.history[0].new_value, "42");
  assert.strictEqual(apply.data.applied_value, 42);
}

function runEnginePipelineWiringTests() {
  assert.match(engineSource, /async function previewPlanAmendment\b/);
  assert.match(engineSource, /async function approvePlanAmendment\b/);
  assert.match(engineSource, /async function resolveNextAmendmentVersion\b/);
  assert.match(engineSource, /async function recordAmendmentHistoryRows\b/);
  assert.match(engineSource, /buildApprovedAmendmentWorkflowFields/);
  assert.match(engineSource, /buildAppliedAmendmentWorkflowFields/);
  assert.match(engineSource, /plan_amendment_applied/);
  assert.match(engineSource, /PlanAmendmentHistory\.create/);
  assert.match(engineSource, /handler\.validate/);
  assert.match(engineSource, /handler\.preview/);
  assert.match(engineSource, /handler\.apply/);

  const serialized = serializePlanAmendment({
    plan_amendment_id: "a1",
    master_plan_version_id: "m1",
    title: "t",
    description: null,
    amendment_type: AMENDMENT_TYPE.CUSTOM,
    status: AMENDMENT_STATUS.APPLIED,
    requested_by: "u1",
    requested_at: null,
    reviewed_by: "u2",
    reviewed_at: null,
    review_comment: "ok",
    applied_at: "2026-01-02",
    cancelled_at: null,
    effective_date: null,
    version: 3,
    metadata: {},
    created_at: null,
    updated_at: null,
  });
  assert.strictEqual(serialized.version, 3);
  assert.strictEqual(serialized.status, AMENDMENT_STATUS.APPLIED);
}

function run() {
  runFakeHandlerPipelineTests();
  runEnginePipelineWiringTests();
  console.log("Plan amendment Step 3 checks passed.");
}

run();
