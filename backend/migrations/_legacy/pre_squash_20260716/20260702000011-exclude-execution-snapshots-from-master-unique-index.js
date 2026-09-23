"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_plan_versions_master_year_version_govt
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_versions_master_year_version_govt
      ON plan_versions (year, version_number, government_structure_id)
      WHERE version_kind = 'master'
        AND review_snapshot_of_version_id IS NULL
        AND execution_snapshot_of_version_id IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_plan_versions_master_year_version_govt
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_versions_master_year_version_govt
      ON plan_versions (year, version_number, government_structure_id)
      WHERE version_kind = 'master'
        AND review_snapshot_of_version_id IS NULL
    `);
  },
};
