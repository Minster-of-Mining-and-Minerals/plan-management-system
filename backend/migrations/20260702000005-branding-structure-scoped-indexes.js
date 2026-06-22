"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS branding_settings_government_structure_id_unique
      ON branding_settings (government_structure_id)
      WHERE government_structure_id IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS branding_settings_global_row_unique
      ON branding_settings ((1))
      WHERE government_structure_id IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS branding_settings_global_row_unique
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS branding_settings_government_structure_id_unique
    `);
  },
};
