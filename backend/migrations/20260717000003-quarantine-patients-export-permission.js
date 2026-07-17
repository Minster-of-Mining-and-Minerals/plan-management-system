"use strict";

/**
 * L4 — Quarantine dead patients:export until an export feature exists.
 * Deactivates the permission and soft-disables role links; removes group links.
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET is_active = false, updated_at = :now
       WHERE resource = 'patients' AND action = 'export' AND is_active = true`,
      { replacements: { now } }
    );

    await queryInterface.sequelize.query(
      `UPDATE role_permissions
       SET is_active = false, updated_at = :now
       WHERE permission_id IN (
         SELECT permission_id FROM permissions
         WHERE resource = 'patients' AND action = 'export'
       )
       AND is_active = true`,
      { replacements: { now } }
    );

    await queryInterface.sequelize.query(
      `DELETE FROM permission_group_permissions
       WHERE permission_id IN (
         SELECT permission_id FROM permissions
         WHERE resource = 'patients' AND action = 'export'
       )`
    );
  },

  async down(queryInterface) {
    const now = new Date();

    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET is_active = true, updated_at = :now
       WHERE resource = 'patients' AND action = 'export'`,
      { replacements: { now } }
    );

    // Role / group links stay inactive/removed on down — re-seed intentionally.
  },
};
