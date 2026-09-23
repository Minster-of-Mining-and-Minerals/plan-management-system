"use strict";

const {
  ensurePermission,
  ensureRolePermission,
} = require("../utils/permissionSeedUtils");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const SHARE_FORWARD_PERMISSIONS = [
  { resource: "documents", action: "share" },
  { resource: "documents", action: "forward" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const perm of SHARE_FORWARD_PERMISSIONS) {
      const permissionId = await ensurePermission(queryInterface, perm, now);
      await ensureRolePermission(queryInterface, SUPER_ADMIN_ROLE_ID, permissionId, now);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions
       WHERE permission_id IN (
         SELECT permission_id FROM permissions
         WHERE resource = 'documents' AND action IN ('share', 'forward')
       )`
    );
    await queryInterface.bulkDelete("permissions", {
      resource: "documents",
      action: ["share", "forward"],
    });
  },
};
