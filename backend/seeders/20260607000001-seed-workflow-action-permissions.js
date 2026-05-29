"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const CLINICAL_ROLE_NAMES = [
  "Super Admin",
  "Admin",
  "Doctor",
  "Nurse",
];

const WORKFLOW_ACTIONS = ["read", "submit", "forward", "return", "prescribe", "complete"];

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

    const permIds = {};
    for (const action of WORKFLOW_ACTIONS) {
      permIds[action] = await ensurePerm("workflow", action);
    }

    const targetRoles = new Set([SUPER_ADMIN_ROLE_ID]);
    for (const name of CLINICAL_ROLE_NAMES) {
      if (roleIdByName[name]) targetRoles.add(roleIdByName[name]);
    }

    for (const roleId of targetRoles) {
      for (const action of WORKFLOW_ACTIONS) {
        await linkRole(roleId, permIds[action]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const [perms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'workflow' AND action IN (:actions)`,
      { replacements: { actions: WORKFLOW_ACTIONS } }
    );
    const ids = perms.map((p) => p.permission_id);
    if (ids.length) {
      await queryInterface.bulkDelete("role_permissions", {
        permission_id: { [Sequelize.Op.in]: ids },
      });
      await queryInterface.bulkDelete("permissions", {
        permission_id: { [Sequelize.Op.in]: ids },
      });
    }
  },
};
