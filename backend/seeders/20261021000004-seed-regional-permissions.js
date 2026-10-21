"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const REGIONAL_PERMISSIONS = [
  { resource: "regions", action: "create" },
  { resource: "regions", action: "read" },
  { resource: "regions", action: "update" },
  { resource: "regions", action: "delete" },
  { resource: "regions", action: "manage" },
  { resource: "regional_structures", action: "create" },
  { resource: "regional_structures", action: "read" },
  { resource: "regional_structures", action: "update" },
  { resource: "regional_structures", action: "delete" },
  { resource: "regional_branding", action: "read" },
  { resource: "regional_branding", action: "update" },
];

module.exports = {
  up: async (queryInterface) => {
    for (const perm of REGIONAL_PERMISSIONS) {
      // Find or insert permission
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE LOWER(resource) = :resource AND LOWER(action) = :action LIMIT 1;`,
        {
          replacements: { resource: perm.resource.toLowerCase(), action: perm.action.toLowerCase() },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      let permissionId;
      if (existing) {
        permissionId = existing.permission_id;
      } else {
        permissionId = uuidv4();
        await queryInterface.sequelize.query(
          `INSERT INTO permissions (permission_id, resource, action, created_at, updated_at)
           VALUES (:id, :resource, :action, NOW(), NOW());`,
          {
            replacements: { id: permissionId, resource: perm.resource, action: perm.action },
          }
        );
      }

      // Assign to Super Admin role if not already assigned
      const [assigned] = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1;`,
        {
          replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId: permissionId },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      if (!assigned) {
        await queryInterface.sequelize.query(
          `INSERT INTO role_permissions (role_permission_id, role_id, permission_id, created_at, updated_at)
           VALUES (:id, :roleId, :permId, NOW(), NOW());`,
          {
            replacements: { id: uuidv4(), roleId: SUPER_ADMIN_ROLE_ID, permId: permissionId },
          }
        );
      }
    }
  },

  down: async (queryInterface) => {
    // Keep permissions on down to prevent breaking relations
  },
};
