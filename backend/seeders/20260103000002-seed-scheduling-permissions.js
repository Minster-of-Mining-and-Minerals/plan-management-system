"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const STAFF_RECEIVE_ROLE_NAMES = [
  "Super Admin",
  "Admin",
  "Doctor",
  "Nurse",
  "Receptionist",
];

const SCHEDULE_ADMIN_ROLE_NAMES = [
  "Super Admin",
  "Admin",
  "Receptionist",
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`
    );
    const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.role_id]));

    const ensurePerm = async (resource, action) => {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
        { replacements: { resource, action } }
      );
      if (existing.length) return existing[0].permission_id;
      const id = uuidv4();
      await queryInterface.bulkInsert("permissions", [
        {
          permission_id: id,
          resource,
          action,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
      return id;
    };

    const receiveId = await ensurePerm("patients", "receive_patient");
    const scheduleId = await ensurePerm("patients", "schedule");

    const linkRole = async (roleId, permissionId) => {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
        { replacements: { roleId, permissionId } }
      );
      if (existing.length) return;
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
    };

    const targetReceive = new Set([SUPER_ADMIN_ROLE_ID]);
    for (const name of STAFF_RECEIVE_ROLE_NAMES) {
      if (roleIdByName[name]) targetReceive.add(roleIdByName[name]);
    }

    const targetSchedule = new Set([SUPER_ADMIN_ROLE_ID]);
    for (const name of SCHEDULE_ADMIN_ROLE_NAMES) {
      if (roleIdByName[name]) targetSchedule.add(roleIdByName[name]);
    }

    for (const roleId of targetReceive) {
      await linkRole(roleId, receiveId);
    }
    for (const roleId of targetSchedule) {
      await linkRole(roleId, scheduleId);
    }
  },

  async down(queryInterface, Sequelize) {
    const [perms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'patients' AND action IN ('receive_patient', 'schedule')`
    );
    const ids = perms.map((p) => p.permission_id);
    if (ids.length) {
      await queryInterface.bulkDelete("role_permissions", {
        permission_id: { [Sequelize.Op.in]: ids },
      });
    }
  },
};
