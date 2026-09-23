"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_plan_versions_period_subdivision_mode" ADD VALUE IF NOT EXISTS 'monthly';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_planning_configurations_breakdown_mode" ADD VALUE IF NOT EXISTS 'monthly';
    `);
  },

  async down() {
    // PostgreSQL does not support removing enum values safely; no-op.
  },
};
