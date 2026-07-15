"use strict";

const TARGET_ALLOCATION_MODE = Object.freeze({
  DIVISIBLE: "divisible",
  LUMP: "lump",
});

function normalizeTargetAllocationMode(value) {
  const normalized = String(value || TARGET_ALLOCATION_MODE.DIVISIBLE)
    .trim()
    .toLowerCase();
  return normalized === TARGET_ALLOCATION_MODE.LUMP
    ? TARGET_ALLOCATION_MODE.LUMP
    : TARGET_ALLOCATION_MODE.DIVISIBLE;
}

function isLumpTargetAllocation(nodeOrMode) {
  if (nodeOrMode == null) {
    return false;
  }
  if (typeof nodeOrMode === "string") {
    return normalizeTargetAllocationMode(nodeOrMode) === TARGET_ALLOCATION_MODE.LUMP;
  }
  return (
    normalizeTargetAllocationMode(nodeOrMode.target_allocation_mode) ===
    TARGET_ALLOCATION_MODE.LUMP
  );
}

module.exports = {
  TARGET_ALLOCATION_MODE,
  normalizeTargetAllocationMode,
  isLumpTargetAllocation,
};
