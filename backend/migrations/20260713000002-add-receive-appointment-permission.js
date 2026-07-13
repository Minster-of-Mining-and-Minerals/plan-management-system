"use strict";

const { v4: uuidv4 } = require("uuid");

/** Roles that can be assigned as the primary clinician on a schedule / appointment. */
const APPOINTMENT_RECEIVER_ROLE_NAMES = [
  "Super Admin",
  "Admin",
  "Doctor",
  "Nurse",
  "Optometrist",
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'patients' AND action = 'receive_appointment' LIMIT 1`
    );

    let permissionId = existing[0]?.permission_id;
    if (!permissionId) {
      permissionId = uuidv4();
      await queryInterface.bulkInsert("permissions", [
        {
          permission_id: permissionId,
          resource: "patients",
          action: "receive_appointment",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`
    );
    const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.role_id]));

    for (const name of APPOINTMENT_RECEIVER_ROLE_NAMES) {
      const roleId = roleIdByName[name];
      if (!roleId) continue;

      const [linked] = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
        { replacements: { roleId, permissionId } }
      );
      if (linked.length) continue;

      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: roleId,
          permission_id: permissionId,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    const [perms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'patients' AND action = 'receive_appointment'`
    );
    const ids = perms.map((p) => p.permission_id);
    if (!ids.length) return;

    await queryInterface.bulkDelete("permission_group_permissions", {
      permission_id: { [Sequelize.Op.in]: ids },
    });
    await queryInterface.bulkDelete("role_permissions", {
      permission_id: { [Sequelize.Op.in]: ids },
    });
    await queryInterface.bulkDelete("permissions", {
      permission_id: { [Sequelize.Op.in]: ids },
    });
  },
};
