"use strict";

const { DEFAULT_BRANDING_THEME } = require("../config/brandingThemeDefaults");

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("system_branding", "theme_json", {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    const [rows] = await queryInterface.sequelize.query(
      `SELECT branding_id, primary_hsl, golden_dark_hsl, golden_metallic_hsl, golden_dark_hover_hsl FROM system_branding;`
    );

    for (const row of rows) {
      const theme = {
        ...DEFAULT_BRANDING_THEME,
        primary: row.primary_hsl,
        "section-accent": row.golden_dark_hsl ?? row.accent_hsl,
        "sidebar-hover": row.golden_metallic_hsl ?? row.sidebar_hover_hsl,
        "section-accent-hover": row.golden_dark_hover_hsl ?? row.accent_hover_hsl,
      };

      await queryInterface.sequelize.query(
        `UPDATE system_branding SET theme_json = :theme::jsonb WHERE branding_id = :id`,
        {
          replacements: {
            theme: JSON.stringify(theme),
            id: row.branding_id,
          },
        }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("system_branding", "theme_json");
  },
};
