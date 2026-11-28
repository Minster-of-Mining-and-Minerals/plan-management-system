"use strict";

const { QueryTypes } = require("sequelize");
const {
  ensurePermission,
  ensureRolePermission,
  normalizePermission,
} = require("../utils/permissionSeedUtils");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const PLAN_MGMT_ROLE_ID = "7f8c952d-405c-48f2-96e9-11bc0f1322e2";

const SHORT_TERM_PERMISSIONS = [
  { resource: "short_term_plan", action: "view" },
  { resource: "short_term_plan", action: "create" },
  { resource: "short_term_plan", action: "edit" },
  { resource: "short_term_plan", action: "delete" },
  { resource: "short_term_plan", action: "assign" },
  { resource: "short_term_plan", action: "report" },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const permissionIds = [];

    for (const rawPerm of SHORT_TERM_PERMISSIONS) {
      const perm = normalizePermission(rawPerm.resource, rawPerm.action);
      const id = await ensurePermission(queryInterface, perm, now);
      permissionIds.push(id);
    }

    // Assign to Super Admin, Plan Management Role, and any administrative roles
    const adminRoles = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles
       WHERE role_id IN (:roleIds)
          OR LOWER(name) LIKE '%admin%'`,
      {
        replacements: { roleIds: [SUPER_ADMIN_ROLE_ID, PLAN_MGMT_ROLE_ID] },
        type: QueryTypes.SELECT,
      }
    );

    for (const role of adminRoles) {
      for (const permissionId of permissionIds) {
        await ensureRolePermission(queryInterface, role.role_id, permissionId, now);
      }
    }

    console.log(
      `Seeded ${permissionIds.length} short_term_plan permissions and assigned to ${adminRoles.length} administrative/planning role(s).`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions WHERE permission_id IN (
         SELECT permission_id FROM permissions WHERE LOWER(resource) = 'short_term_plan'
       )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM permissions WHERE LOWER(resource) = 'short_term_plan'`
    );
  },
};
