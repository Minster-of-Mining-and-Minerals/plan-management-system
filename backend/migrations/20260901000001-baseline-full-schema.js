"use strict";

/**
 * Single clean baseline: applies database/schema/baseline_schema.sql
 * (pg_dump --schema-only of the final production schema, cleaned).
 *
 * Fresh install: sequelize-cli db:migrate
 * Rollback: DROP SCHEMA public CASCADE; CREATE SCHEMA public;
 */

const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.join(
  __dirname,
  "..",
  "..",
  "database",
  "schema",
  "baseline_schema.sql"
);

function loadSchemaSql() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(
      `Baseline schema not found at ${SCHEMA_PATH}. Run: node scripts/db-snapshot.js schema && node scripts/clean-baseline-schema.js`
    );
  }
  return fs.readFileSync(SCHEMA_PATH, "utf8");
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const sql = loadSchemaSql();
    // Execute as one script so CREATE TYPE / TABLE / CONSTRAINT order is preserved.
    await queryInterface.sequelize.query(sql);
    // pg_dump may leave search_path empty; restore for SequelizeMeta writes.
    await queryInterface.sequelize.query(`SET search_path TO public`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
  },
};
