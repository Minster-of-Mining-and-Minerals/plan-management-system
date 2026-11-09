"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const INSPECTION_PERMISSIONS = [
  { resource: "inspection_analytics", action: "read", permission_tier: "special" },
  { resource: "inspection_analytics", action: "manage", permission_tier: "special" },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    const createdPermIds = [];

    for (const perm of INSPECTION_PERMISSIONS) {
      const existing = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
        {
          replacements: { resource: perm.resource, action: perm.action },
          type: QueryTypes.SELECT,
        }
      );

      let permId;
      if (!existing || existing.length === 0) {
        permId = uuidv4();
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: permId,
            resource: perm.resource,
            action: perm.action,
            permission_tier: perm.permission_tier,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      } else {
        permId = existing[0].permission_id;
        // Ensure tier is set to special (private federal tier)
        await queryInterface.sequelize.query(
          `UPDATE permissions SET permission_tier = :tier, is_active = true, updated_at = :now WHERE permission_id = :permId`,
          {
            replacements: { tier: perm.permission_tier, now, permId },
            type: QueryTypes.UPDATE,
          }
        );
      }
      createdPermIds.push(permId);

      // Find all federal administrative / private roles
      const federalAdminRoles = await queryInterface.sequelize.query(
        `SELECT role_id FROM roles
         WHERE (role_id = :superAdminRoleId OR LOWER(name) IN ('super admin', 'administrator') OR scope = 'private')
           AND (region_id IS NULL AND company_id IS NULL AND purchasing_center_id IS NULL)`,
        {
          replacements: { superAdminRoleId: SUPER_ADMIN_ROLE_ID },
          type: QueryTypes.SELECT,
        }
      );

      for (const role of federalAdminRoles) {
        const existingRolePerm = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
          {
            replacements: { roleId: role.role_id, permId },
            type: QueryTypes.SELECT,
          }
        );

        if (!existingRolePerm || existingRolePerm.length === 0) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: role.role_id,
              permission_id: permId,
              is_active: true,
              created_at: now,
              updated_at: now,
            },
          ]);
        } else {
          await queryInterface.sequelize.query(
            `UPDATE role_permissions SET is_active = true, updated_at = :now WHERE role_permission_id = :id`,
            {
              replacements: { now, id: existingRolePerm[0].role_permission_id },
              type: QueryTypes.UPDATE,
            }
          );
        }
      }
    }

    // Ensure the seeded admin account (admin@gmail.com / ADMIN_USER_ID) is linked to SUPER_ADMIN_ROLE_ID
    const adminUser = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE user_id = :adminUserId OR LOWER(email) = 'admin@gmail.com' LIMIT 1`,
      {
        replacements: { adminUserId: ADMIN_USER_ID },
        type: QueryTypes.SELECT,
      }
    );

    if (adminUser && adminUser.length > 0) {
      const targetUserId = adminUser[0].user_id;
      const existingUserRole = await queryInterface.sequelize.query(
        `SELECT user_role_id FROM user_roles WHERE user_id = :userId AND role_id = :roleId LIMIT 1`,
        {
          replacements: { userId: targetUserId, roleId: SUPER_ADMIN_ROLE_ID },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingUserRole || existingUserRole.length === 0) {
        await queryInterface.bulkInsert("user_roles", [
          {
            user_role_id: uuidv4(),
            user_id: targetUserId,
            role_id: SUPER_ADMIN_ROLE_ID,
            assigned_at: now,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      } else {
        await queryInterface.sequelize.query(
          `UPDATE user_roles SET is_active = true, updated_at = :now WHERE user_role_id = :id`,
          {
            replacements: { now, id: existingUserRole[0].user_role_id },
            type: QueryTypes.UPDATE,
          }
        );
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    for (const perm of INSPECTION_PERMISSIONS) {
      const existing = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
        {
          replacements: { resource: perm.resource, action: perm.action },
          type: QueryTypes.SELECT,
        }
      );
      if (existing && existing.length > 0) {
        const permId = existing[0].permission_id;
        await queryInterface.bulkDelete("role_permissions", { permission_id: permId });
        await queryInterface.bulkDelete("permissions", { permission_id: permId });
      }
    }
  },
};
