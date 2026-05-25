"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const permissions = [
      // Dashboard Access
      { resource: "dashboard", action: "view" },

      // User Management
      { resource: "users", action: "create" },
      { resource: "users", action: "read" },
      { resource: "users", action: "update" },
      { resource: "users", action: "delete" },
      { resource: "users", action: "assign_role" },

      // Permission Management
      { resource: "permissions", action: "read" },
      { resource: "permissions", action: "update" },

      // Permission Group Management
      { resource: "permission_groups", action: "create" },
      { resource: "permission_groups", action: "read" },
      { resource: "permission_groups", action: "update" },
      { resource: "permission_groups", action: "delete" },
      { resource: "permission_groups", action: "assign_permission" },
      { resource: "permission_groups", action: "remove_permission" },
      { resource: "permission_groups", action: "add_user" },
      { resource: "permission_groups", action: "remove_user" },

      // Role Management
      { resource: "roles", action: "create" },
      { resource: "roles", action: "read" },
      { resource: "roles", action: "update" },
      { resource: "roles", action: "delete" },
      { resource: "roles", action: "assign_permission" },

      // Branding / System appearance
      { resource: "branding", action: "create" },
      { resource: "branding", action: "read" },
      { resource: "branding", action: "update" },
      { resource: "branding", action: "delete" },









    ];

    for (const perm of permissions) {
      try {
        await queryInterface.bulkInsert(
          "permissions",
          [
            {
              permission_id: uuidv4(),
              resource: perm.resource,
              action: perm.action,
              created_at: now,
              updated_at: now,
            },
          ],
          { ignoreDuplicates: true }
        );
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
          console.log(
            `Permission ${perm.resource}:${perm.action} already exists, skipping...`
          );
          continue;
        }
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("permissions", null, {});
  },
};
