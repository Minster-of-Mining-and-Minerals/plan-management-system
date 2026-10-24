"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Fetch all active permissions from permissions table
    const allPermissions = await queryInterface.sequelize.query(
      `SELECT permission_id, resource, action FROM permissions WHERE is_active = true`,
      { type: QueryTypes.SELECT }
    );

    // 2. Fetch existing role_permissions for Super Admin
    const existingRolePerms = await queryInterface.sequelize.query(
      `SELECT role_permission_id, permission_id, is_active FROM role_permissions WHERE role_id = :roleId`,
      {
        replacements: { roleId: SUPER_ADMIN_ROLE_ID },
        type: QueryTypes.SELECT,
      }
    );

    const existingMap = new Map();
    for (const rp of existingRolePerms) {
      existingMap.set(rp.permission_id, rp);
    }

    const missingPermsToInsert = [];
    const inactiveToActivate = [];

    for (const perm of allPermissions) {
      const existing = existingMap.get(perm.permission_id);
      if (!existing) {
        missingPermsToInsert.push({
          role_permission_id: uuidv4(),
          role_id: SUPER_ADMIN_ROLE_ID,
          permission_id: perm.permission_id,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      } else if (!existing.is_active) {
        inactiveToActivate.push(existing.role_permission_id);
      }
    }

    if (missingPermsToInsert.length > 0) {
      await queryInterface.bulkInsert("role_permissions", missingPermsToInsert);
    }

    if (inactiveToActivate.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE role_permissions SET is_active = true, updated_at = :now WHERE role_permission_id IN (:ids)`,
        {
          replacements: { now, ids: inactiveToActivate },
          type: QueryTypes.UPDATE,
        }
      );
    }

    // 3. Ensure expose_required_permissions is true in system_settings
    await queryInterface.sequelize.query(
      `UPDATE system_settings SET expose_required_permissions = true, updated_at = :now`,
      {
        replacements: { now },
        type: QueryTypes.UPDATE,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // Specifically remove plan:validate_approval permission from super admin if reverting
    const planValidateApproval = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE LOWER(resource) = 'plan' AND LOWER(action) = 'validate_approval' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (planValidateApproval.length > 0) {
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId`,
        {
          replacements: {
            roleId: SUPER_ADMIN_ROLE_ID,
            permId: planValidateApproval[0].permission_id,
          },
          type: QueryTypes.DELETE,
        }
      );
    }
  },
};
