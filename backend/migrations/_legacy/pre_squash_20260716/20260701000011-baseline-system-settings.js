"use strict";

const { createTableIfNotExists } = require("./helpers/schemaHelpers");

const DEFAULT_SYSTEM_SETTINGS_ID = "a0000000-0000-4000-8000-000000000001";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "system_settings", {
      system_setting_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      expose_required_permissions: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.sequelize.query(
      `
      INSERT INTO system_settings (system_setting_id, expose_required_permissions, created_at, updated_at)
      SELECT :id, false, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1)
      `,
      { replacements: { id: DEFAULT_SYSTEM_SETTINGS_ID } }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("system_settings");
  },
};
