"use strict";

const { DEFAULT_BRANDING_THEME } = require("../config/brandingThemeDefaults");
const { DEFAULT_PATIENT_SLIP_CONFIG } = require("../config/defaultPatientSlipConfig");
const {
  PLATFORM_LOGO_URL,
  PLATFORM_NAME,
  PLATFORM_NAME_AM,
  PLATFORM_TAGLINE,
} = require("../config/platformBranding");

const DEFAULT_BRANDING_ID = "00000000-0000-4000-8000-000000000005";

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const theme_json = DEFAULT_BRANDING_THEME;

    const [existing] = await queryInterface.sequelize.query(
      `SELECT branding_id FROM system_branding WHERE branding_id = :id;`,
      { replacements: { id: DEFAULT_BRANDING_ID } }
    );

    const brandingData = {
      branding_id: DEFAULT_BRANDING_ID,
      system_name: PLATFORM_NAME,
      system_name_am: PLATFORM_NAME_AM,
      tagline: PLATFORM_TAGLINE,
      logo_url: PLATFORM_LOGO_URL,
      logo_login_url: PLATFORM_LOGO_URL,
      primary_hsl: theme_json.primary,
      accent_hsl: theme_json["section-accent"],
      sidebar_hover_hsl: theme_json["sidebar-hover"],
      accent_hover_hsl: theme_json["section-accent-hover"],
      theme_json: JSON.stringify(theme_json),
      slip_config: JSON.stringify(DEFAULT_PATIENT_SLIP_CONFIG),
      is_active: true,
      updated_at: now,
    };

    if (existing && existing.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE system_branding SET
          system_name = :system_name,
          system_name_am = :system_name_am,
          tagline = :tagline,
          logo_url = :logo_url,
          logo_login_url = :logo_login_url,
          primary_hsl = :primary_hsl,
          accent_hsl = :accent_hsl,
          sidebar_hover_hsl = :sidebar_hover_hsl,
          accent_hover_hsl = :accent_hover_hsl,
          theme_json = :theme_json::jsonb,
          slip_config = :slip_config::jsonb,
          is_active = :is_active,
          updated_at = NOW()
         WHERE branding_id = :branding_id;`,
        { replacements: brandingData }
      );
    } else {
      await queryInterface.bulkInsert("system_branding", [{ ...brandingData, created_at: now }]);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "system_branding",
      { branding_id: DEFAULT_BRANDING_ID },
      {}
    );
  },
};
