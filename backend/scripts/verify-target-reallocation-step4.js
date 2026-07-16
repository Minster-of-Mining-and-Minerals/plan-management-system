"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  normalizeListQuery,
  listTargetReallocationRequests,
  getPeriodTargetReallocationReporting,
} = require("../services/planTargetReallocationService");
const {
  capturePeriodTargetBaselinesForSnapshot,
} = require("../services/planPeriodTargetBaselineService");
const {
  computeReallocationReportingFields,
  resolveOriginalTargetFromBaseline,
} = require("../utils/planTargetReallocationBaselineUtils");
const {
  validateListTargetReallocationsQuery,
  validatePeriodTargetReallocationReportingQuery,
} = require("../validators/plan/planTargetReallocationValidator");

const root = path.join(__dirname, "..");
const planRoutesSource = fs.readFileSync(path.join(root, "routers/plan/planRoutes.js"), "utf8");
const lifecycleSource = fs.readFileSync(
  path.join(root, "services/planVersionLifecycleService.js"),
  "utf8"
);
const controllerSource = fs.readFileSync(
  path.join(root, "controllers/plan/planTargetReallocationController.js"),
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
  assert.match(source, new RegExp(`module\\.exports[\\s\\S]*${name}|${name}[\\s\\S]*module\\.exports`), `${name} must be exported`);
}

function runListQueryTests() {
  const normalized = normalizeListQuery({
    draft_id: "11111111-1111-4111-8111-111111111111",
    kpi_id: "22222222-2222-4222-8222-222222222222",
    period_id: "33333333-3333-4333-8333-333333333333",
    requestor_id: "44444444-4444-4444-8444-444444444444",
    status: "pending",
    requested_from: "2026-01-01",
    page: 2,
    limit: 50,
    sort_by: "amount",
    sort_order: "asc",
  });

  assert.strictEqual(normalized.draftId, "11111111-1111-4111-8111-111111111111");
  assert.strictEqual(normalized.kpiId, "22222222-2222-4222-8222-222222222222");
  assert.strictEqual(normalized.periodId, "33333333-3333-4333-8333-333333333333");
  assert.strictEqual(normalized.requestorId, "44444444-4444-4444-8444-444444444444");
  assert.strictEqual(normalized.status, "pending");
  assert.strictEqual(normalized.page, 2);
  assert.strictEqual(normalized.limit, 50);
  assert.strictEqual(normalized.sortBy, "amount");
  assert.strictEqual(normalized.sortOrder, "ASC");
}

function runReportingTests() {
  const baseline = { original_target: 25 };
  assert.strictEqual(resolveOriginalTargetFromBaseline(baseline, 15), 25);
  assert.strictEqual(resolveOriginalTargetFromBaseline(null, 20), 20);

  const reporting = computeReallocationReportingFields({
    originalTarget: 25,
    currentTarget: 15,
    reallocatedOut: 10,
    reallocatedIn: 0,
  });
  assert.strictEqual(reporting.original_target, 25);
  assert.strictEqual(reporting.current_target, 15);
  assert.strictEqual(reporting.reallocated_out, 10);
  assert.strictEqual(reporting.reallocated_in, 0);
  assert.strictEqual(reporting.net_adjustment, -10);

  const unchanged = computeReallocationReportingFields({
    originalTarget: 25,
    currentTarget: 25,
    reallocatedOut: 0,
    reallocatedIn: 0,
  });
  assert.strictEqual(unchanged.net_adjustment, 0);
}

function runServiceExportTests() {
  assert.strictEqual(typeof listTargetReallocationRequests, "function");
  assert.strictEqual(typeof getPeriodTargetReallocationReporting, "function");
  assert.strictEqual(typeof capturePeriodTargetBaselinesForSnapshot, "function");
  assert.match(
    lifecycleSource,
    /capturePeriodTargetBaselinesForSnapshot/,
    "startPlanProcess must capture period target baselines"
  );
}

function runApiWiringTests() {
  assertExportedFunction(controllerSource, "listTargetReallocationsHandler");
  assertExportedFunction(controllerSource, "getPeriodTargetReallocationReportingHandler");
  assertRouteWired("get", "/target-reallocations", "listTargetReallocationsHandler");
  assertRouteWired(
    "get",
    "/versions/:id/period-target-reallocation-reporting",
    "getPeriodTargetReallocationReportingHandler"
  );
  assert.ok(validateListTargetReallocationsQuery);
  assert.ok(validatePeriodTargetReallocationReportingQuery);
}

function run() {
  runListQueryTests();
  runReportingTests();
  runServiceExportTests();
  runApiWiringTests();
  console.log("Target reallocation Step 4 checks passed.");
}

run();
