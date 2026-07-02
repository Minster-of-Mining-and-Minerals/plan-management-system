"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  validateSubmitAchievement,
  validateRejectAchievement,
  validateUpdatePeriodTarget,
} = require("../validators/plan/planValidator");

const root = path.join(__dirname, "..");
const planRoutesSource = fs.readFileSync(path.join(root, "routers/plan/planRoutes.js"), "utf8");
const controllerSource = fs.readFileSync(
  path.join(root, "controllers/plan/planAchievementController.js"),
  "utf8"
);
const workflowSource = fs.readFileSync(
  path.join(root, "services/planAchievementWorkflowService.js"),
  "utf8"
);
const notificationSource = fs.readFileSync(
  path.join(root, "services/planAchievementNotificationService.js"),
  "utf8"
);

function assertRouteWired(method, pathFragment, handlerName) {
  const pattern = new RegExp(
    `router\\.${method.toLowerCase()}\\(\\s*["'\`]${pathFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`][\\s\\S]*?${handlerName}`
  );
  assert.match(
    planRoutesSource,
    pattern,
    `${method} ${pathFragment} must wire ${handlerName}`
  );
}

function assertExportedFunction(source, name) {
  assert.match(
    source,
    new RegExp(`(async\\s+)?function\\s+${name}\\b|${name}\\s*[,}]`),
    `${name} must be defined`
  );
  assert.match(source, new RegExp(`${name}`), `${name} must be exported`);
}

function run() {
  assertExportedFunction(controllerSource, "updatePeriodTarget");
  assertExportedFunction(controllerSource, "submitAchievementHandler");
  assertExportedFunction(controllerSource, "approveAchievementHandler");
  assertExportedFunction(controllerSource, "rejectAchievementHandler");
  assertExportedFunction(controllerSource, "updatePeriodActual");
  assertExportedFunction(controllerSource, "getAchievementWorkflowScope");
  assert.match(controllerSource, /workflowOptions/);

  assertExportedFunction(workflowSource, "setPeriodTargetForExecutor");
  assertExportedFunction(workflowSource, "submitAchievement");
  assertExportedFunction(workflowSource, "approveAchievement");
  assertExportedFunction(workflowSource, "rejectAchievement");

  assert.match(notificationSource, /emitAchievementSubmittedEvent/);
  assert.match(notificationSource, /emitAchievementApprovedEvent/);
  assert.match(notificationSource, /emitAchievementRejectedEvent/);
  assert.match(notificationSource, /focus=achievement/);
  assert.match(workflowSource, /emitAchievementSubmittedEvent/);

  assert.strictEqual(typeof validateSubmitAchievement, "function");
  assert.strictEqual(typeof validateRejectAchievement, "function");
  assert.strictEqual(typeof validateUpdatePeriodTarget, "function");

  assertRouteWired("patch", "/nodes/:id/period-target", "updatePeriodTarget");
  assertRouteWired("post", "/nodes/:id/achievement/submit", "submitAchievementHandler");
  assertRouteWired("post", "/nodes/:id/achievement/approve", "approveAchievementHandler");
  assertRouteWired("post", "/nodes/:id/achievement/reject", "rejectAchievementHandler");
  assertRouteWired("patch", "/nodes/:id/period-actual", "updatePeriodActual");
  assertRouteWired(
    "get",
    "/versions/:id/achievement-workflow-scope",
    "getAchievementWorkflowScope"
  );

  assert.match(planRoutesSource, /checkPermission\("PLAN",\s*"EXECUTE_ACHIEVEMENT"\)/);
  assert.match(planRoutesSource, /checkPermission\("PLAN",\s*"APPROVE_ACHIEVEMENT"\)/);

  console.log("Plan achievement Step 3 API checks passed.");
}

run();
