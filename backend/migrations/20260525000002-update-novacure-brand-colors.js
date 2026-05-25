"use strict";

const {
  DEFAULT_BRANDING_THEME,
  legacyFieldsFromTheme,
} = require("../config/brandingThemeDefaults");

const DEFAULT_BRANDING_ID = "00000000-0000-4000-8000-000000000005";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const theme_json = DEFAULT_BRANDING_THEME;
    const legacy = legacyFieldsFromTheme(theme_json);

    await queryInterface.bulkUpdate(
      "system_branding",
      {
        primary_hsl: legacy.primary_hsl,
        accent_hsl: legacy.accent_hsl,
        sidebar_hover_hsl: legacy.sidebar_hover_hsl,
        accent_hover_hsl: legacy.accent_hover_hsl,
        theme_json: JSON.stringify(theme_json),
        updated_at: new Date(),
      },
      { branding_id: DEFAULT_BRANDING_ID }
    );
  },

  async down(queryInterface) {
    const previousTheme = {
      background: "0 0% 100%",
      foreground: "0 0% 3.9%",
      primary: "201 85% 18%",
      "section-accent": "45, 80%, 40%",
      "sidebar-hover": "43, 85%, 55%, 10%",
      "section-accent-hover": "45, 80%, 40%, 90%",
    };
    const legacy = legacyFieldsFromTheme(previousTheme);

    await queryInterface.bulkUpdate(
      "system_branding",
      {
        primary_hsl: legacy.primary_hsl,
        accent_hsl: legacy.accent_hsl,
        sidebar_hover_hsl: legacy.sidebar_hover_hsl,
        accent_hover_hsl: legacy.accent_hover_hsl,
        theme_json: JSON.stringify(previousTheme),
        updated_at: new Date(),
      },
      { branding_id: DEFAULT_BRANDING_ID }
    );
  },
};
