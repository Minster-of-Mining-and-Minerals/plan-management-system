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
      { resource: "permission_groups", action: "add_structure" },
      { resource: "permission_groups", action: "remove_structure" },

      // Role Management
      { resource: "roles", action: "create" },
      { resource: "roles", action: "read" },
      { resource: "roles", action: "update" },
      { resource: "roles", action: "delete" },
      { resource: "roles", action: "assign_permission" },

      // Government Structure Management
      { resource: "government_structures", action: "create" },
      { resource: "government_structures", action: "read" },
      { resource: "government_structures", action: "update" },
      { resource: "government_structures", action: "delete" },

      // Internal Structure Management
      { resource: "internal_structures", action: "create" },
      { resource: "internal_structures", action: "read" },
      { resource: "internal_structures", action: "update" },
      { resource: "internal_structures", action: "delete" },

      // Plan Management
      { resource: "plans", action: "create" },
      { resource: "plans", action: "read" },
      { resource: "plans", action: "update" },
      { resource: "plans", action: "delete" },
      { resource: "plans", action: "approve" },
      { resource: "plans", action: "submit" },

      // Plan Assignments
      { resource: "plan_assignments", action: "create" },
      { resource: "plan_assignments", action: "read" },
      { resource: "plan_assignments", action: "update" },
      { resource: "plan_assignments", action: "delete" },

      // Assignment Actions
      { resource: "plan_assignment_actions", action: "create" },
      { resource: "plan_assignment_actions", action: "read" },
      { resource: "plan_assignment_actions", action: "update" },
      { resource: "plan_assignment_actions", action: "delete" },

      // Action Logs
      { resource: "action_logs", action: "create" },
      { resource: "action_logs", action: "read" },
      { resource: "action_logs", action: "update" },
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
