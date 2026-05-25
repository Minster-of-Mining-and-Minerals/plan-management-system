"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

/** Roles that receive full patient management by default */
const ROLE_NAMES_WITH_PATIENT_ACCESS = [
  "Super Admin",
  "Admin",
  "Receptionist",
  "Doctor",
  "Nurse",
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [patientPerms] = await queryInterface.sequelize.query(
      `SELECT permission_id, resource, action FROM permissions
       WHERE resource = 'patients' AND is_active = true`
    );

    if (!patientPerms.length) return;

    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`
    );

    const targetRoleIds = new Set([SUPER_ADMIN_ROLE_ID]);

    for (const role of roles) {
      if (ROLE_NAMES_WITH_PATIENT_ACCESS.includes(role.name)) {
        targetRoleIds.add(role.role_id);
      }
    }

    for (const roleId of targetRoleIds) {
      for (const perm of patientPerms) {
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
  },

  async down(queryInterface, Sequelize) {
    const [patientPerms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource = 'patients'`
    );
    const ids = patientPerms.map((p) => p.permission_id);
    if (!ids.length) return;

    await queryInterface.bulkDelete("role_permissions", {
      permission_id: { [Sequelize.Op.in]: ids },
    });
  },
};
