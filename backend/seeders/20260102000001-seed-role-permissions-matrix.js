"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const PATIENT_ACCESS_ROLE_NAMES = [
  "Super Admin",
  "Admin",
  "Receptionist",
  "Doctor",
  "Nurse",
];

const ADMIN_MODULE_ROLE_NAMES = ["Super Admin", "Admin"];

/**
 * Assigns module permissions to roles (idempotent).
 * Replaces permission-assignment migrations that previously ran in db:migrate.
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`
    );

    const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.role_id]));

    const assignForRoles = async (resource, roleNames) => {
      const [perms] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions
         WHERE resource = :resource AND is_active = true`,
        { replacements: { resource } }
      );
      if (!perms.length) return;

      const targetIds = new Set([SUPER_ADMIN_ROLE_ID]);
      for (const name of roleNames) {
        if (roleIdByName[name]) targetIds.add(roleIdByName[name]);
      }

      for (const roleId of targetIds) {
        for (const perm of perms) {
          const [existing] = await queryInterface.sequelize.query(
            `SELECT role_permission_id FROM role_permissions
             WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
            {
              replacements: {
                roleId,
                permissionId: perm.permission_id,
              },
            }
          );
          if (!existing.length) {
            await queryInterface.bulkInsert("role_permissions", [
              {
                role_permission_id: uuidv4(),
                role_id: roleId,
                permission_id: perm.permission_id,
                is_active: true,
                created_at: now,
                updated_at: now,
              },
            ]);
          }
        }
      }
    };

    await assignForRoles("patients", PATIENT_ACCESS_ROLE_NAMES);
    await assignForRoles("departments", ADMIN_MODULE_ROLE_NAMES);
    await assignForRoles("user_titles", ADMIN_MODULE_ROLE_NAMES);
    await assignForRoles("form_field_groups", ADMIN_MODULE_ROLE_NAMES);
  },

  async down(queryInterface, Sequelize) {
    const resources = ["patients", "departments", "user_titles", "form_field_groups"];
    const [perms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource IN (:resources)`,
      { replacements: { resources } }
    );
    const ids = perms.map((p) => p.permission_id);
    if (!ids.length) return;

    await queryInterface.bulkDelete("role_permissions", {
      permission_id: { [Sequelize.Op.in]: ids },
    });
  },
};
