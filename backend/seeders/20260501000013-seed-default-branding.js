"use strict";

const { DEFAULT_BRANDING_THEME } = require("../config/brandingThemeDefaults");

const DEFAULT_BRANDING_ID = "00000000-0000-4000-8000-000000000005";

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const theme_json = DEFAULT_BRANDING_THEME;

    await queryInterface.bulkInsert("system_branding", [
      {
        branding_id: DEFAULT_BRANDING_ID,
        system_name: "Postgress Express Node Next full stack template",
        system_name_am:
          "ፖስትግሬስ፣ ኤክስፕሬስ፣ ኖድ እና ኔክስት የተጠቀመ ሙሉ የዌብ ልማት መነሻ አብነት።",
        tagline: "Land Authority Management System",
        logo_url: "/logo-only.png",
        logo_login_url: "/logo-mom.png",
        primary_hsl: theme_json.primary,
        accent_hsl: theme_json["section-accent"],
        sidebar_hover_hsl: theme_json["sidebar-hover"],
        accent_hover_hsl: theme_json["section-accent-hover"],
        theme_json: JSON.stringify(theme_json),
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "system_branding",
      { branding_id: DEFAULT_BRANDING_ID },
      {}
    );
  },
};
