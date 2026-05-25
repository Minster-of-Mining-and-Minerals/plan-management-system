"use strict";

const { PLATFORM_LOGO_URL } = require("../config/platformBranding");

const DEFAULT_BRANDING_ID = "00000000-0000-4000-8000-000000000005";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkUpdate(
      "system_branding",
      {
        logo_url: PLATFORM_LOGO_URL,
        logo_login_url: PLATFORM_LOGO_URL,
        updated_at: new Date(),
      },
      { branding_id: DEFAULT_BRANDING_ID }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate(
      "system_branding",
      {
        logo_url: "/logo-only.png",
        logo_login_url: "/logo-mom.png",
        updated_at: new Date(),
      },
      { branding_id: DEFAULT_BRANDING_ID }
    );
  },
};
