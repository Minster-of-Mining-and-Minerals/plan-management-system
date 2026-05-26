"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

/** Link any permissions not yet assigned to Super Admin (form_fields, form_field_groups, patients, etc.). */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [allPerms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE is_active = true`
    );

    const [linked] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM role_permissions
       WHERE role_id = :roleId AND is_active = true`,
      { replacements: { roleId: SUPER_ADMIN_ROLE_ID } }
    );

    const linkedSet = new Set(linked.map((r) => r.permission_id));

    const toInsert = allPerms
      .filter((p) => !linkedSet.has(p.permission_id))
      .map((p) => ({
        role_permission_id: uuidv4(),
        role_id: SUPER_ADMIN_ROLE_ID,
        permission_id: p.permission_id,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));

    if (toInsert.length) {
      await queryInterface.bulkInsert("role_permissions", toInsert);
    }
  },

  async down() {
    // no-op: do not remove permissions on rollback
  },
};
