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

      // Patient management
      { resource: "patients", action: "create" },
      { resource: "patients", action: "read" },
      { resource: "patients", action: "update" },
      { resource: "patients", action: "delete" },
      { resource: "patients", action: "export" },
      { resource: "patients", action: "receive_patient" },
      { resource: "patients", action: "schedule" },

      // Form field configuration (patient intake forms)
      { resource: "form_fields", action: "create" },
      { resource: "form_fields", action: "read" },
      { resource: "form_fields", action: "update" },
      { resource: "form_fields", action: "delete" },

      // Branding / System appearance
      { resource: "branding", action: "create" },
      { resource: "branding", action: "read" },
      { resource: "branding", action: "update" },
      { resource: "branding", action: "delete" },

      // Form field groups (patient intake layout)
      { resource: "form_field_groups", action: "create" },
      { resource: "form_field_groups", action: "read" },
      { resource: "form_field_groups", action: "update" },
      { resource: "form_field_groups", action: "delete" },

      // Departments
      { resource: "departments", action: "create" },
      { resource: "departments", action: "read" },
      { resource: "departments", action: "update" },
      { resource: "departments", action: "delete" },
      { resource: "departments", action: "manage" },

      // User titles (internal staff)
      { resource: "user_titles", action: "create" },
      { resource: "user_titles", action: "read" },
      { resource: "user_titles", action: "update" },
      { resource: "user_titles", action: "delete" },
      { resource: "user_titles", action: "manage" },





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
