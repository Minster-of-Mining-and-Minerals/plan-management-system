"use strict";

const {
  ensurePermission,
  ensureRolePermission,
} = require("../utils/permissionSeedUtils");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const DOCUMENT_PERMISSIONS = [
  { resource: "documents", action: "read" },
  { resource: "documents", action: "create" },
  { resource: "documents", action: "update" },
  { resource: "documents", action: "delete" },
  { resource: "documents", action: "manage" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const perm of DOCUMENT_PERMISSIONS) {
      const permissionId = await ensurePermission(queryInterface, perm, now);
      await ensureRolePermission(queryInterface, SUPER_ADMIN_ROLE_ID, permissionId, now);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions
       WHERE permission_id IN (
         SELECT permission_id FROM permissions WHERE resource = 'documents'
       )`
    );
    await queryInterface.bulkDelete("permissions", { resource: "documents" });
  },
};
