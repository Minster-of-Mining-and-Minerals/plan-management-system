"use strict";

const {
  DEFAULT_BRANDING_THEME,
  legacyFieldsFromTheme,
} = require("../config/brandingThemeDefaults");
const { PLATFORM_TAGLINE } = require("../config/platformBranding");

const DEFAULT_BRANDING_ID = "00000000-0000-4000-8000-000000000005";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const theme_json = DEFAULT_BRANDING_THEME;
    const legacy = legacyFieldsFromTheme(theme_json);

    await queryInterface.bulkUpdate(
      "system_branding",
      {
        tagline: PLATFORM_TAGLINE,
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
      background: "204 45% 98%",
      foreground: "220 49% 8%",
      primary: "216 100% 53%",
      "section-accent": "258, 100%, 69%",
      "sidebar-hover": "172, 100%, 38%, 14%",
      "section-accent-hover": "258, 100%, 69%, 88%",
      "auth-background": "204 45% 98%",
    };
    const legacy = legacyFieldsFromTheme(previousTheme);

    await queryInterface.bulkUpdate(
      "system_branding",
      {
        tagline:
          "Enterprise healthcare ecosystem platform powering hospitals, clinics, laboratories, pharmacies, and intelligent patient care systems.",
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
