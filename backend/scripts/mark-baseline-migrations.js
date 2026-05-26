#!/usr/bin/env node
"use strict";

/**
 * Marks baseline migrations as executed without running DDL.
 * Use ONLY when the database schema already matches the baseline
 * (e.g. after running the legacy migration chain before the refactor).
 *
 * Usage: node scripts/mark-baseline-migrations.js
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { Sequelize } = require("sequelize");
const config = require("../config/config.js")[process.env.NODE_ENV || "development"];

const BASELINE_MIGRATIONS = [
  "20260101000001-create-permissions-and-rbac.js",
  "20260101000002-create-users.js",
  "20260101000003-create-user-rbac-junctions.js",
  "20260101000004-create-departments-and-user-titles.js",
  "20260101000005-create-user-profiles.js",
  "20260101000006-create-form-field-system.js",
  "20260101000007-create-system-branding-and-audit-logs.js",
  "20260101000008-create-attachments.js",
];

async function main() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    { host: config.host, port: config.port, dialect: config.dialect, logging: false }
  );

  try {
    await sequelize.authenticate();
    const now = new Date();

    for (const name of BASELINE_MIGRATIONS) {
      const [existing] = await sequelize.query(
        `SELECT name FROM "SequelizeMeta" WHERE name = :name LIMIT 1`,
        { replacements: { name } }
      );

      if (existing.length) {
        console.log(`✓ Already marked: ${name}`);
        continue;
      }

      await sequelize.query(
        `INSERT INTO "SequelizeMeta" (name) VALUES (:name)`,
        { replacements: { name } }
      );
      console.log(`+ Marked: ${name}`);
    }

    console.log("\nDone. Run `npx sequelize-cli db:migrate` — it should report no pending migrations.");
  } finally {
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
