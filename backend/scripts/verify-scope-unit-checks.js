"use strict";

const assert = require("assert");
const { collectAncestorIds } = require("../utils/structureLifecycleUtils");
const {
  isPlanRuleApplicableToSector,
  filterApplicablePlanRules,
} = require("../utils/planRuleApplicabilityUtils");

const structureIndex = [
  { government_structure_id: "mom", parent_id: null },
  { government_structure_id: "midi", parent_id: "mom" },
  { government_structure_id: "gie", parent_id: "mom" },
];

function run() {
  assert.deepStrictEqual(collectAncestorIds("midi", structureIndex), [
    "midi",
    "mom",
  ]);
  assert.deepStrictEqual(collectAncestorIds("mom", structureIndex), ["mom"]);

  const systemGlobal = {
    plan_rule_id: "r1",
    government_structure_id: null,
    inherit_to_descendants: false,
    is_active: true,
  };
  const momInherited = {
    plan_rule_id: "r2",
    government_structure_id: "mom",
    inherit_to_descendants: true,
    is_active: true,
  };
  const momSector = {
    plan_rule_id: "r3",
    government_structure_id: "mom",
    inherit_to_descendants: false,
    is_active: true,
  };
  const midiSector = {
    plan_rule_id: "r4",
    government_structure_id: "midi",
    inherit_to_descendants: false,
    is_active: true,
  };

  assert.strictEqual(
    isPlanRuleApplicableToSector(systemGlobal, "midi", structureIndex),
    true
  );
  assert.strictEqual(
    isPlanRuleApplicableToSector(momInherited, "midi", structureIndex),
    true
  );
  assert.strictEqual(
    isPlanRuleApplicableToSector(momSector, "midi", structureIndex),
    false
  );
  assert.strictEqual(
    isPlanRuleApplicableToSector(midiSector, "midi", structureIndex),
    true
  );
  assert.strictEqual(
    isPlanRuleApplicableToSector(midiSector, "gie", structureIndex),
    false
  );

  const applicable = filterApplicablePlanRules(
    [systemGlobal, momInherited, momSector, midiSector],
    "midi",
    structureIndex
  );
  assert.deepStrictEqual(
    applicable.map((rule) => rule.plan_rule_id),
    ["r1", "r2", "r4"]
  );

  console.log("Scope unit checks passed.");
}

run();
