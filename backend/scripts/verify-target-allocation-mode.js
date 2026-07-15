"use strict";

const {
  TARGET_ALLOCATION_MODE,
  normalizeTargetAllocationMode,
  isLumpTargetAllocation,
} = require("../utils/planTargetAllocationUtils");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  normalizeTargetAllocationMode("LUMP") === TARGET_ALLOCATION_MODE.LUMP,
  "normalize should accept LUMP"
);
assert(
  normalizeTargetAllocationMode("other") === TARGET_ALLOCATION_MODE.DIVISIBLE,
  "unknown mode should fall back to divisible"
);
assert(
  isLumpTargetAllocation({ target_allocation_mode: "lump" }) === true,
  "node lump flag"
);
assert(
  isLumpTargetAllocation({ target_allocation_mode: "divisible" }) === false,
  "node divisible flag"
);
assert(isLumpTargetAllocation("lump") === true, "string lump");
assert(isLumpTargetAllocation(null) === false, "null is not lump");

console.log("Target allocation mode checks passed.");
