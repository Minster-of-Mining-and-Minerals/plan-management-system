"use strict";

const { PLATFORM_LOGO_URL } = require("../config/platformBranding");

module.exports = {
  async up(queryInterface) {
    const logoPattern = `%nova-cure-logo%`;
    await queryInterface.sequelize.query(
      `UPDATE prescription_templates
       SET template_signature_file = NULL, updated_at = NOW()
       WHERE template_signature_file LIKE :pattern
          OR template_signature_file = :logo`,
      { replacements: { pattern: logoPattern, logo: PLATFORM_LOGO_URL } }
    );
    await queryInterface.sequelize.query(
      `UPDATE system_branding
       SET prescription_signature_file = NULL, updated_at = NOW()
       WHERE prescription_signature_file LIKE :pattern
          OR prescription_signature_file = :logo`,
      { replacements: { pattern: logoPattern, logo: PLATFORM_LOGO_URL } }
    );
    await queryInterface.sequelize.query(
      `UPDATE internal_user_profiles
       SET signature_file = NULL, signature_enabled = false, updated_at = NOW()
       WHERE signature_file LIKE :pattern
          OR signature_file = :logo`,
      { replacements: { pattern: logoPattern, logo: PLATFORM_LOGO_URL } }
    );
  },

  async down() {
    // Non-reversible cleanup
  },
};
