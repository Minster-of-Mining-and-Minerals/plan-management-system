"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const FOLLOWUP_PERMISSIONS = [
  { resource: "followup", action: "view" },
  { resource: "followup", action: "create" },
  { resource: "followup", action: "update" },
  { resource: "followup", action: "cancel" },
  { resource: "followup", action: "complete" },
  { resource: "followup", action: "schedule" },
  { resource: "followup", action: "reschedule" },
  { resource: "followup", action: "continue" },
  { resource: "followup", action: "outcome:view" },
  { resource: "followup", action: "outcome:create" },
  { resource: "followup", action: "outcome:update" },
];

const ROLE_ASSIGNMENTS = {
  Doctor: [
    "view", "create", "update", "cancel", "complete", "continue",
    "outcome:view", "outcome:create", "outcome:update"
  ],
  Nurse: ["view", "create", "update", "outcome:view"],
  Receptionist: ["view", "update", "schedule", "reschedule", "cancel", "complete", "outcome:view"],
  Admin: [
    "view", "create", "update", "cancel", "complete", "schedule",
    "reschedule", "continue", "outcome:view", "outcome:create", "outcome:update"
  ],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // 1. Seed permissions
    for (const perm of FOLLOWUP_PERMISSIONS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
        { replacements: { resource: perm.resource, action: perm.action } }
      );

      if (!existing.length) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: perm.resource,
            action: perm.action,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    // 2. Assign to roles
    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`
    );

    const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.role_id]));

    const [allPerms] = await queryInterface.sequelize.query(
      `SELECT permission_id, action FROM permissions WHERE resource = 'followup' AND is_active = true`
    );

    const permIdByAction = Object.fromEntries(allPerms.map((p) => [p.action, p.permission_id]));

    // Super Admin gets all followup permissions
    if (roleIdByName["Super Admin"] || SUPER_ADMIN_ROLE_ID) {
      const superAdminId = roleIdByName["Super Admin"] || SUPER_ADMIN_ROLE_ID;
      for (const perm of allPerms) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
          { replacements: { roleId: superAdminId, permId: perm.permission_id } }
        );
        if (!existing.length) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: superAdminId,
              permission_id: perm.permission_id,
              is_active: true,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }
    }

    // Assign specific actions to roles
    for (const [roleName, actions] of Object.entries(ROLE_ASSIGNMENTS)) {
      const roleId = roleIdByName[roleName];
      if (!roleId) continue;

      for (const action of actions) {
        const permId = permIdByAction[action];
        if (!permId) continue;

        const [existing] = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
          { replacements: { roleId, permId } }
        );

        if (!existing.length) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: roleId,
              permission_id: permId,
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
    const [perms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource = 'followup'`
    );

    const ids = perms.map((p) => p.permission_id);
    if (!ids.length) return;

    await queryInterface.bulkDelete("role_permissions", {
      permission_id: { [Sequelize.Op.in]: ids },
    });
    await queryInterface.bulkDelete("permissions", {
      permission_id: { [Sequelize.Op.in]: ids },
    });
  },
};
