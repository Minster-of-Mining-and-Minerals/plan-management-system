"use strict";

const assert = require("assert");
const { resolveTreeAccessMode } = require("../services/planVisibilityService");

function run() {
  assert.strictEqual(
    resolveTreeAccessMode({ isSuperAdmin: true }),
    "full"
  );
  assert.strictEqual(
    resolveTreeAccessMode({
      hasSectorOversight: true,
      hasSectorExternalAssignment: true,
    }),
    "full"
  );
  assert.strictEqual(
    resolveTreeAccessMode({
      hasSectorOversight: true,
      hasSectorExternalAssignment: false,
    }),
    "none"
  );
  assert.strictEqual(
    resolveTreeAccessMode({
      hasSectorOversight: false,
      assignedNodeCount: 3,
    }),
    "participant"
  );
  assert.strictEqual(resolveTreeAccessMode({}), "none");
  assert.strictEqual(
    resolveTreeAccessMode({
      hasSectorOversight: true,
      hasSectorExternalAssignment: true,
      assignedNodeCount: 0,
    }),
    "full"
  );

  console.log("Plan visibility Phase B unit checks passed.");
}

run();
