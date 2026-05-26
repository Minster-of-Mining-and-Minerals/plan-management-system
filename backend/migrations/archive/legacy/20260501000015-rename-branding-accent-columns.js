"use strict";

const { LEGACY_THEME_KEY_MAP } = require("../config/brandingThemeDefaults");

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameColumn(
      "system_branding",
      "golden_dark_hsl",
      "accent_hsl"
    );
    await queryInterface.renameColumn(
      "system_branding",
      "golden_metallic_hsl",
      "sidebar_hover_hsl"
    );
    await queryInterface.renameColumn(
      "system_branding",
      "golden_dark_hover_hsl",
      "accent_hover_hsl"
    );

    const [rows] = await queryInterface.sequelize.query(
      `SELECT branding_id, theme_json FROM system_branding WHERE theme_json IS NOT NULL;`
    );

    for (const row of rows) {
      const theme =
        typeof row.theme_json === "string"
          ? JSON.parse(row.theme_json)
          : { ...row.theme_json };

      for (const [legacyKey, newKey] of Object.entries(LEGACY_THEME_KEY_MAP)) {
        if (theme[legacyKey] !== undefined) {
          if (theme[newKey] === undefined) {
            theme[newKey] = theme[legacyKey];
          }
          delete theme[legacyKey];
        }
      }

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
    const [rows] = await queryInterface.sequelize.query(
      `SELECT branding_id, theme_json FROM system_branding WHERE theme_json IS NOT NULL;`
    );

    const reverseMap = Object.fromEntries(
      Object.entries(LEGACY_THEME_KEY_MAP).map(([legacy, next]) => [next, legacy])
    );

    for (const row of rows) {
      const theme =
        typeof row.theme_json === "string"
          ? JSON.parse(row.theme_json)
          : { ...row.theme_json };

      for (const [newKey, legacyKey] of Object.entries(reverseMap)) {
        if (theme[newKey] !== undefined) {
          if (theme[legacyKey] === undefined) {
            theme[legacyKey] = theme[newKey];
          }
          delete theme[newKey];
        }
      }

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

    await queryInterface.renameColumn(
      "system_branding",
      "accent_hsl",
      "golden_dark_hsl"
    );
    await queryInterface.renameColumn(
      "system_branding",
      "sidebar_hover_hsl",
      "golden_metallic_hsl"
    );
    await queryInterface.renameColumn(
      "system_branding",
      "accent_hover_hsl",
      "golden_dark_hover_hsl"
    );
  },
};
