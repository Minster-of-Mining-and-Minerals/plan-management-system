"use strict";

const assert = require("assert");
const {
  expandNodeVisibility,
  collectDirectAssignmentSeedIds,
  collectSectorExternalSeedIds,
  resolveTreeAccessMode,
} = require("../services/planTreeVisibilityUtils");

const masterNodes = [
  { plan_node_id: "root", parent_id: null },
  { plan_node_id: "sf", parent_id: "root" },
  { plan_node_id: "kpi-a", parent_id: "sf" },
  { plan_node_id: "kpi-b", parent_id: "sf" },
];

function run() {
  const sectorSeeds = collectSectorExternalSeedIds(
    [{ plan_node_id: "sf", government_structure_id: "sector-a" }],
    { government_structure_id: "sector-a" }
  );
  assert.strictEqual(sectorSeeds.size, 1);
  assert.ok(sectorSeeds.has("sf"));

  const sectorVisible = expandNodeVisibility(masterNodes, sectorSeeds, {
    includeDescendants: true,
  });
  assert.deepStrictEqual([...sectorVisible].sort(), ["kpi-a", "kpi-b", "root", "sf"]);

  const directSeeds = collectDirectAssignmentSeedIds(
    [{ plan_node_id: "kpi-a", user_id: "user-1" }],
    { user_id: "user-1" }
  );
  const directVisible = expandNodeVisibility(masterNodes, directSeeds, {
    includeDescendants: false,
  });
  assert.deepStrictEqual([...directVisible].sort(), ["kpi-a", "root", "sf"]);
  assert.ok(!directVisible.has("kpi-b"));

  assert.strictEqual(
    resolveTreeAccessMode({ isSuperAdmin: true }),
    "full"
  );
  assert.strictEqual(
    resolveTreeAccessMode({ hasFullPlanHierarchy: true }),
    "full"
  );
  assert.strictEqual(
    resolveTreeAccessMode({
      hasSectorPlanHierarchy: true,
      hasSectorExternalAssignment: true,
      sectorScopedNodeCount: 4,
    }),
    "sector"
  );
  assert.strictEqual(
    resolveTreeAccessMode({
      hasSectorPlanHierarchy: true,
      hasSectorExternalAssignment: false,
      directAssignmentNodeCount: 1,
    }),
    "direct"
  );
  assert.strictEqual(
    resolveTreeAccessMode({
      hasSectorPlanHierarchy: true,
      hasSectorExternalAssignment: true,
      sectorScopedNodeCount: 0,
      directAssignmentNodeCount: 2,
    }),
    "direct"
  );
  assert.strictEqual(resolveTreeAccessMode({}), "none");

  console.log("Plan visibility Phase B unit checks passed.");
}

run();
