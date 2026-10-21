"use strict";

/**
 * Migration: 20261021000002-dashboard-performance-indexes.js
 *
 * Adds supporting indexes on the `users` table for structure-scoped lookups
 * and approver candidate searches used extensively by plan execution rollups
 * and dashboard metrics.
 */

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_govt_active
      ON public.users (government_structure_id, is_active)
      WHERE is_active = true;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_internal_active
      ON public.users (internal_structure_id, is_active)
      WHERE is_active = true;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS public.idx_users_govt_active;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS public.idx_users_internal_active;
    `);
  },
};
