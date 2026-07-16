"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { AMENDMENT_TYPE } = require("../utils/planAmendmentTypes");
const { AMENDMENT_STATUS } = require("../utils/planAmendmentWorkflowUtils");
const { REALLOCATION_STATUS } = require("../utils/planTargetReallocationWorkflowUtils");
const {
  mapAmendmentStatusToReallocationStatus,
  serializeTargetReallocationRequest,
} = require("../services/planTargetReallocationService");

const root = path.join(__dirname, "..");
const serviceSource = fs.readFileSync(
  path.join(root, "services/planTargetReallocationService.js"),
  "utf8"
);
const migrationSource = fs.readFileSync(
  path.join(
    root,
    "migrations/_legacy/pre_squash_20260716/20260813000003-target-reallocation-amendment-link.js"
  ),
  "utf8"
);
const modelSource = fs.readFileSync(
  path.join(root, "models/plan/TargetReallocationRequest.js"),
  "utf8"
);

function runStatusMappingTests() {
  assert.strictEqual(
    mapAmendmentStatusToReallocationStatus(AMENDMENT_STATUS.PENDING_APPROVAL),
    REALLOCATION_STATUS.PENDING
  );
  assert.strictEqual(
    mapAmendmentStatusToReallocationStatus(AMENDMENT_STATUS.APPLIED),
    REALLOCATION_STATUS.APPLIED
  );
  assert.strictEqual(
    mapAmendmentStatusToReallocationStatus(AMENDMENT_STATUS.REJECTED),
    REALLOCATION_STATUS.REJECTED
  );
  assert.strictEqual(
    mapAmendmentStatusToReallocationStatus(AMENDMENT_STATUS.CANCELLED),
    REALLOCATION_STATUS.CANCELLED
  );
}

function runSerializeLinkTests() {
  const serialized = serializeTargetReallocationRequest({
    target_reallocation_request_id: "req-1",
    plan_amendment_id: "amd-1",
    master_plan_version_id: "m1",
    annual_kpi_plan_node_id: "k1",
    annual_plan_version_id: "a1",
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
  assert.strictEqual(serialized.plan_amendment_id, "amd-1");
}

function runFacadeWiringTests() {
  assert.match(migrationSource, /plan_amendment_id/);
  assert.match(migrationSource, /target_reallocation_requests_amendment_unique/);
  assert.match(modelSource, /plan_amendment_id/);
  assert.match(modelSource, /planAmendment/);

  assert.match(serviceSource, /PlanAmendment\.create/);
  assert.match(serviceSource, /plan_amendment_id: amendmentId/);
  assert.match(serviceSource, /legacy_request_id: requestId/);
  assert.match(serviceSource, /AMENDMENT_TYPE\.TARGET_REALLOCATION/);
  assert.match(serviceSource, /prepareTargetReallocationChange/);
  assert.match(serviceSource, /applyPreparedTargetReallocation/);
  assert.match(serviceSource, /resolveNextAmendmentVersion/);
  assert.match(serviceSource, /recordAmendmentHistoryRows/);
  assert.match(serviceSource, /buildRejectedAmendmentWorkflowFields/);
  assert.match(serviceSource, /buildCancelledAmendmentWorkflowFields/);
  assert.match(serviceSource, /syncTargetReallocationRequestFromAmendment/);
}

function run() {
  runStatusMappingTests();
  runSerializeLinkTests();
  runFacadeWiringTests();
  console.log("Plan amendment Step 5 checks passed.");
}

run();
