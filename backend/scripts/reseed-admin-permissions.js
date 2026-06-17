"use strict";

/**
 * Sync all permissions from seed-permissions.js onto Super Admin and ensure admin user exists.
 * Safe to re-run — idempotent inserts only.
 *
 * Usage: npm run seed:admin
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { Sequelize } = require("sequelize");
const config = require("../config/config.js")[process.env.NODE_ENV || "development"];
const seeder = require("../seeders/20251029134413-seed-permissions.js");

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

const queryInterface = sequelize.getQueryInterface();

(async () => {
  try {
    console.log("Syncing permissions and Super Admin role...");
    await seeder.up(queryInterface);
    console.log("✓ Admin account and Super Admin permissions are up to date.");
    console.log("  Email: admin@gmail.com");
    console.log("  Password: password (unchanged if user already existed)");
    process.exit(0);
  } catch (error) {
    console.error("✗ Failed to sync admin permissions:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
