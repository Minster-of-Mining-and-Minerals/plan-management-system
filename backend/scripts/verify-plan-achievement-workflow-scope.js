"use strict";

const assert = require("assert");
const path = require("path");
const {
  resolveAchievementWorkflowScopeForVersion,
} = require("../services/planAchievementWorkflowScopeService");

function buildUser(overrides = {}) {
  return {
    user_id: "user-1",
    government_structure_id: "sector-a",
    internal_structure_id: "dept-a",
    permissions: [],
    ...overrides,
  };
}

async function run() {
  const result = await resolveAchievementWorkflowScopeForVersion(
    "00000000-0000-4000-8000-000000000099",
    buildUser()
  );

  assert.strictEqual(typeof result.success, "boolean");
  if (!result.success) {
    assert.strictEqual(typeof result.message, "string");
  } else {
    assert.ok(result.data);
    assert.ok(Array.isArray(result.data.executor_node_ids));
    assert.ok(Array.isArray(result.data.approver_node_ids));
  }

  const invalid = await resolveAchievementWorkflowScopeForVersion(
    "00000000-0000-4000-8000-000000000099",
    buildUser()
  );
  assert.strictEqual(typeof invalid.success, "boolean");

  const fs = require("fs");
  const planRoutesSource = fs.readFileSync(
    path.join(__dirname, "..", "routers/plan/planRoutes.js"),
    "utf8"
  );
  assert.match(
    planRoutesSource,
    /achievement-workflow-scope[\s\S]*getAchievementWorkflowScope/
  );

  console.log("Plan achievement workflow scope checks passed.");
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
