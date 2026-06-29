"use strict";

const assert = require("assert");
const {
  validateNotOversightReadOnly,
  isOversightReadOnlyAccessRole,
  OVERSIGHT_READ_ONLY_MESSAGE,
} = require("../utils/planMutationAccessUtils");

async function run() {
  assert.strictEqual(isOversightReadOnlyAccessRole("global"), true);
  assert.strictEqual(isOversightReadOnlyAccessRole("oversight"), true);
  assert.strictEqual(isOversightReadOnlyAccessRole("participant"), false);
  assert.strictEqual(isOversightReadOnlyAccessRole("owner"), false);
  const oversightReq = {
    user: { user_id: "u1", permissions: ["plans:update"] },
  };

  const visibilityService = require("../services/planVisibilityService");
  const original = visibilityService.resolvePlanAccessRolesForMasters;
  let mockedRole = "global";

  visibilityService.resolvePlanAccessRolesForMasters = async () =>
    new Map([["plan-1", mockedRole]]);

  try {
    const blocked = await validateNotOversightReadOnly(oversightReq, "plan-1");
    assert.strictEqual(blocked.valid, false);
    assert.strictEqual(blocked.message, OVERSIGHT_READ_ONLY_MESSAGE);

    mockedRole = "oversight";
    const sectorBlocked = await validateNotOversightReadOnly(oversightReq, "plan-1");
    assert.strictEqual(sectorBlocked.valid, false);

    mockedRole = "participant";
    const allowed = await validateNotOversightReadOnly(oversightReq, "plan-1");
    assert.strictEqual(allowed.valid, true);

    console.log("verify-plan-mutation-access: all assertions passed");
  } finally {
    visibilityService.resolvePlanAccessRolesForMasters = original;
  }
}

run().catch((error) => {
  console.error("verify-plan-mutation-access failed:", error);
  process.exit(1);
});
