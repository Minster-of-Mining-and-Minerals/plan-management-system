"use strict";

/**
 * Single orchestrator migration — builds the full NovaCure schema in one SequelizeMeta entry.
 *
 * ACTIVATION:
 * 1. Move legacy migrations to migrations/archive/pre-squash/ (see scripts/archive-pre-squash-migrations.js)
 * 2. Copy this file to migrations/20260101000000-complete-database-schema.js
 * 3. Fresh DB: npx sequelize-cli db:migrate
 * 4. Existing DB: node scripts/squash-sequelize-meta.js
 */
const chain = require("./_helpers/baseline/chainOrder");
const { dropTablesInOrder, TABLE_DROP_ORDER } = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const step of chain) {
      await step.up(queryInterface, Sequelize);
    }
  },

  async down(queryInterface, Sequelize) {
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      try {
        await chain[i].down(queryInterface, Sequelize);
      } catch (err) {
        console.warn(
          `[baseline rollback] step ${i + 1}/${chain.length}:`,
          err.message
        );
      }
    }
    await dropTablesInOrder(queryInterface, TABLE_DROP_ORDER);
  },
};
