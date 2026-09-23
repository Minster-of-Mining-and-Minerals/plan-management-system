"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_plan_versions_year_version_govt
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS plan_versions_year_version_govt_unique
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_versions_master_year_version_govt
      ON plan_versions (year, version_number, government_structure_id)
      WHERE version_kind = 'master'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_plan_versions_master_year_version_govt
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS plan_versions_year_version_govt_unique
      ON plan_versions (year, version_number, government_structure_id)
    `);
  },
};
