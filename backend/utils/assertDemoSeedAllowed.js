"use strict";

/**
 * Refuse demo seeds that use known weak passwords in production.
 */
function assertDemoSeedAllowed(seedName = "demo seed") {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Refusing to run ${seedName} while NODE_ENV=production (demo passwords are not allowed).`
    );
  }
}

module.exports = { assertDemoSeedAllowed };
