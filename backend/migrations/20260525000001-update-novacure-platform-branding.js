"use strict";

const {
  PLATFORM_NAME,
  PLATFORM_NAME_AM,
  PLATFORM_TAGLINE,
} = require("../config/platformBranding");

const DEFAULT_BRANDING_ID = "00000000-0000-4000-8000-000000000005";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkUpdate(
      "system_branding",
      {
        system_name: PLATFORM_NAME,
        system_name_am: PLATFORM_NAME_AM,
        tagline: PLATFORM_TAGLINE,
        updated_at: new Date(),
      },
      { branding_id: DEFAULT_BRANDING_ID }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate(
      "system_branding",
      {
        system_name: "Postgress Express Node Next full stack template",
        system_name_am:
          "ፖስትግሬስ፣ ኤክስፕሬስ፣ ኖድ እና ኔክስት የተጠቀመ ሙሉ የዌብ ልማት መነሻ አብነት።",
        tagline: "Land Authority Management System",
        updated_at: new Date(),
      },
      { branding_id: DEFAULT_BRANDING_ID }
    );
  },
};
