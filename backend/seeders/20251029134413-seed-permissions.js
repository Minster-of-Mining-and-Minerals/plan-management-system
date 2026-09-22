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
      { resource: "patients", action: "receive_appointment" },
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

      // Diagnosis form configuration
      { resource: "diagnosis_forms", action: "create" },
      { resource: "diagnosis_forms", action: "read" },
      { resource: "diagnosis_forms", action: "update" },
      { resource: "diagnosis_forms", action: "delete" },

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



      // Workflow
      { resource: "workflow", action: "read" },

      // Clinical Suggestions
      { resource: "clinical_suggestion", action: "manage" },
      { resource: "clinical_suggestion", action: "create" },
      { resource: "clinical_suggestion", action: "update" },

      // Prescriptions
      { resource: "prescription_template", action: "view" },
      { resource: "prescription_template", action: "manage" },
      { resource: "prescription_category", action: "view" },

      // Pharmacy
      { resource: "pharmacy", action: "view" },
      { resource: "pharmacy", action: "manage" },
      { resource: "pharmacy", action: "create" },
      { resource: "pharmacy", action: "user_manage" },

      // Billing & Finance
      { resource: "billing_service", action: "view" },
      { resource: "billing_service", action: "create" },
      { resource: "billing_service", action: "update" },
      { resource: "cashier_queue", action: "view" },
      { resource: "cashier_payment", action: "create" },
      { resource: "cashier_session", action: "open" },
      { resource: "finance_collections", action: "view" },
      { resource: "receipt_template", action: "view" },
      { resource: "receipt_template", action: "create" },
      { resource: "receipt_template", action: "update" },

      // Audit Log
      { resource: "audit_log", action: "view" },
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
