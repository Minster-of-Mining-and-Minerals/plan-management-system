"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  PLAN_AMENDMENT_EVENTS,
  buildPlanAmendmentLink,
} = require("../services/planAmendment/planAmendmentNotificationService");
const {
  normalizeListAmendmentsQuery,
} = require("../services/planAmendment/planAmendmentEngine");
const { AMENDMENT_TYPE } = require("../utils/planAmendmentTypes");
const { AMENDMENT_STATUS } = require("../utils/planAmendmentWorkflowUtils");

const root = path.join(__dirname, "..");
const routesSource = fs.readFileSync(path.join(root, "routers/plan/planRoutes.js"), "utf8");
const controllerSource = fs.readFileSync(
  path.join(root, "controllers/plan/planAmendmentController.js"),
  "utf8"
);
const engineSource = fs.readFileSync(
  path.join(root, "services/planAmendment/planAmendmentEngine.js"),
  "utf8"
);
const notificationSource = fs.readFileSync(
  path.join(root, "services/planAmendment/planAmendmentNotificationService.js"),
  "utf8"
);

function assertRouteWired(method, pathFragment, handlerName) {
  const pattern = new RegExp(
    `router\\.${method.toLowerCase()}\\(\\s*["'\`]${pathFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`][\\s\\S]*?${handlerName}`
  );
  assert.match(routesSource, pattern, `${method} ${pathFragment} must wire ${handlerName}`);
}

function runNotificationTests() {
  assert.strictEqual(PLAN_AMENDMENT_EVENTS.SUBMITTED, "plan_amendment_submitted");
  assert.strictEqual(PLAN_AMENDMENT_EVENTS.APPROVED, "plan_amendment_approved");
  assert.strictEqual(PLAN_AMENDMENT_EVENTS.REJECTED, "plan_amendment_rejected");
  assert.strictEqual(
    buildPlanAmendmentLink("draft-1", "target_reallocation"),
    "/plans/draft-1?tab=hierarchy&focus=reallocation"
  );
  assert.strictEqual(
    buildPlanAmendmentLink("draft-1", "budget_increase"),
    "/plans/draft-1?tab=hierarchy&focus=amendment"
  );
  assert.match(notificationSource, /emitPlanAmendmentSubmittedEvent/);
  assert.match(engineSource, /emitPlanAmendmentSubmittedEvent/);
  assert.match(engineSource, /emitPlanAmendmentApprovedEvent/);
  assert.match(engineSource, /emitPlanAmendmentRejectedEvent/);
  assert.match(engineSource, /resolveAmendmentApproverUsers/);
}

function runListQueryTests() {
  const normalized = normalizeListAmendmentsQuery({
    draft_id: "11111111-1111-4111-8111-111111111111",
    amendment_type: "TARGET_REALLOCATION",
    status: "pending_approval",
    version: 2,
    page: 1,
    limit: 10,
    sort_by: "version",
    sort_order: "asc",
  });
  assert.strictEqual(normalized.draftId, "11111111-1111-4111-8111-111111111111");
  assert.strictEqual(normalized.amendmentType, AMENDMENT_TYPE.TARGET_REALLOCATION);
  assert.strictEqual(normalized.status, AMENDMENT_STATUS.PENDING_APPROVAL);
  assert.strictEqual(normalized.version, 2);
  assert.strictEqual(normalized.sortOrder, "ASC");
}

function runApiWiringTests() {
  assert.match(controllerSource, /createPlanAmendmentHandler/);
  assert.match(controllerSource, /listPlanAmendmentsHandler/);
  assert.match(controllerSource, /previewPlanAmendmentHandler/);
  assert.match(controllerSource, /listPlanAmendmentTypesHandler/);

  assertRouteWired("post", "/plan-amendments", "createPlanAmendmentHandler");
  assertRouteWired("get", "/plan-amendments", "listPlanAmendmentsHandler");
  assertRouteWired("get", "/plan-amendments/types", "listPlanAmendmentTypesHandler");
  assertRouteWired("get", "/plan-amendments/:id/preview", "previewPlanAmendmentHandler");
  assertRouteWired("post", "/plan-amendments/:id/submit", "submitPlanAmendmentHandler");
  assertRouteWired("post", "/plan-amendments/:id/approve", "approvePlanAmendmentHandler");
  assertRouteWired("post", "/plan-amendments/:id/reject", "rejectPlanAmendmentHandler");
  assertRouteWired("post", "/plan-amendments/:id/cancel", "cancelPlanAmendmentHandler");
}

function run() {
  runNotificationTests();
  runListQueryTests();
  runApiWiringTests();
  console.log("Plan amendment Step 6 checks passed.");
}

run();
