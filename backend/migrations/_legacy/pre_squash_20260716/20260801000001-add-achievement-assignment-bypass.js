"use strict";

const { v4: uuidv4 } = require("uuid");
const { addColumnIfNotExists, removeColumnIfExists } = require("./helpers/schemaHelpers");

const BYPASS_PERMISSION = { resource: "plan", action: "bypass_achievement_assignment" };

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfNotExists(
      queryInterface,
      "system_settings",
      "allow_achievement_assignment_bypass",
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      }
    );

    const existing = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = :resource AND action = :action
       LIMIT 1`,
      {
        replacements: BYPASS_PERMISSION,
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert("permissions", [
        {
          permission_id: uuidv4(),
          resource: BYPASS_PERMISSION.resource,
          action: BYPASS_PERMISSION.action,
          permission_tier: "special",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    } else {
      await queryInterface.sequelize.query(
        `UPDATE permissions
         SET permission_tier = 'special', updated_at = NOW()
         WHERE permission_id = :permissionId`,
        { replacements: { permissionId: existing[0].permission_id } }
      );
    }

    const superAdminRole = await queryInterface.sequelize.query(
      `SELECT role_id FROM roles WHERE LOWER(name) = 'super admin' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (superAdminRole.length > 0) {
      const permission = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions
         WHERE resource = :resource AND action = :action
         LIMIT 1`,
        {
          replacements: BYPASS_PERMISSION,
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      if (permission.length > 0) {
        const rolePermission = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions
           WHERE role_id = :roleId AND permission_id = :permissionId
           LIMIT 1`,
          {
            replacements: {
              roleId: superAdminRole[0].role_id,
              permissionId: permission[0].permission_id,
            },
            type: queryInterface.sequelize.QueryTypes.SELECT,
          }
        );

        if (rolePermission.length === 0) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: superAdminRole[0].role_id,
              permission_id: permission[0].permission_id,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ]);
        }
      }
    }
  },

  async down(queryInterface) {
    await removeColumnIfExists(
      queryInterface,
      "system_settings",
      "allow_achievement_assignment_bypass"
    );

    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions
       WHERE permission_id IN (
         SELECT permission_id FROM permissions
         WHERE resource = :resource AND action = :action
       )`,
      { replacements: BYPASS_PERMISSION }
    );

    await queryInterface.bulkDelete("permissions", BYPASS_PERMISSION);
  },
};
