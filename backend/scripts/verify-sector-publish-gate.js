"use strict";

const assert = require("assert");
const {
  PUBLISH_SECTOR_AGGREGATION_KEY,
  userCanPublishSectorAggregation,
  userCanValidateAchievement,
} = require("../utils/planAchievementPermissionUtils");
const {
  SPECIAL_PERMISSION_KEYS,
  PUBLISH_SECTOR_AGGREGATION_KEY: SPECIAL_PUBLISH_KEY,
} = require("../utils/specialPermissionGroupUtils");

function buildBranchGate(branches) {
  return {
    branches,
    hasSectorPublishGate: branches.some((branch) => branch.has_gate),
  };
}

function run() {
  assert.strictEqual(PUBLISH_SECTOR_AGGREGATION_KEY, "plan:publish_sector_aggregation");
  assert.strictEqual(SPECIAL_PUBLISH_KEY, PUBLISH_SECTOR_AGGREGATION_KEY);
  assert.ok(SPECIAL_PERMISSION_KEYS.has(PUBLISH_SECTOR_AGGREGATION_KEY));

  assert.strictEqual(
    userCanPublishSectorAggregation({
      permissions: ["plan:publish_sector_aggregation"],
    }),
    true
  );
  assert.strictEqual(
    userCanPublishSectorAggregation({
      permissions: ["plan:validate_approval"],
    }),
    false
  );
  assert.strictEqual(
    userCanValidateAchievement({
      permissions: ["plan:validate_approval"],
    }),
    true
  );

  const noPublishers = buildBranchGate([
    {
      external_assignment_id: "ext-a",
      government_structure_id: "sector-a",
      plan_node_id: "node-a",
      has_gate: false,
      publisher_user_ids: [],
    },
  ]);
  assert.strictEqual(noPublishers.hasSectorPublishGate, false);

  const withGate = buildBranchGate([
    {
      external_assignment_id: "ext-a",
      government_structure_id: "sector-a",
      plan_node_id: "node-a",
      has_gate: false,
      publisher_user_ids: [],
    },
    {
      external_assignment_id: "ext-b",
      government_structure_id: "sector-b",
      plan_node_id: "node-b",
      has_gate: true,
      publisher_user_ids: ["director-1"],
    },
  ]);
  assert.strictEqual(withGate.hasSectorPublishGate, true);
  assert.strictEqual(
    withGate.branches.filter((branch) => branch.has_gate).length,
    1
  );

  console.log("Sector publish gate Phase 1 checks passed.");
}

run();
