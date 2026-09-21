"use strict";

/**
 * Refuse demo seeds that use known weak passwords in production.
 */
function assertDemoSeedAllowed(seedName = "demo seed") {
  if (process.env.NODE_ENV === "production") {
    console.log(`Skipping ${seedName} in production environment.`);
    return false;
  }
  return true;
}

module.exports = { assertDemoSeedAllowed };
