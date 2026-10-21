"use strict";

module.exports = {
  async up(queryInterface) {
    // 1. Composite index for filtering active nodes in a plan version
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_nodes_version_active
      ON public.plan_nodes (plan_version_id, is_active);
    `);

    // 2. Composite index for on-demand sibling/child lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_nodes_version_parent_active
      ON public.plan_nodes (plan_version_id, parent_id, is_active);
    `);

    // 3. Composite index for plan versions listing and status lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_versions_kind_status
      ON public.plan_versions (version_kind, status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_plan_nodes_version_active;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_plan_nodes_version_parent_active;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_plan_versions_kind_status;
    `);
  },
};
