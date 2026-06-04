"use strict";

const { DEFAULT_BRANDING_ID, DEFAULT_BRANDING } = require("../services/brandingService");

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const existing = await queryInterface.sequelize.query(
      `SELECT branding_setting_id FROM branding_settings WHERE branding_setting_id = :id LIMIT 1`,
      {
        replacements: { id: DEFAULT_BRANDING_ID },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existing.length > 0) return;

    await queryInterface.bulkInsert("branding_settings", [
      {
        ...DEFAULT_BRANDING,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("branding_settings", {
      branding_setting_id: DEFAULT_BRANDING_ID,
    });
  },
};
