"use strict";

const { DEFAULT_PATIENT_SLIP_CONFIG } = require("../config/defaultPatientSlipConfig");

const DEFAULT_BRANDING_ID = "00000000-0000-4000-8000-000000000005";

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT branding_id, slip_config FROM system_branding
       WHERE branding_id = :id OR is_active = true
       ORDER BY is_active DESC, updated_at DESC
       LIMIT 1`,
      { replacements: { id: DEFAULT_BRANDING_ID } }
    );

    if (!rows.length) return;

    const row = rows[0];
    if (row.slip_config && Object.keys(row.slip_config).length > 0) {
      return;
    }

    await queryInterface.sequelize.query(
      `UPDATE system_branding
       SET slip_config = :config::jsonb, updated_at = NOW()
       WHERE branding_id = :id`,
      {
        replacements: {
          id: row.branding_id,
          config: JSON.stringify(DEFAULT_PATIENT_SLIP_CONFIG),
        },
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE system_branding SET slip_config = NULL
       WHERE branding_id = :id`,
      { replacements: { id: DEFAULT_BRANDING_ID } }
    );
  },
};
