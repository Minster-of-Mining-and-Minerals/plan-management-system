"use strict";

/**
 * Migration: Add indexes to support performant Dashboard Analytics queries
 */
async function safeAddIndex(queryInterface, tableName, fields, indexName) {
  try {
    await queryInterface.addIndex(tableName, fields, { name: indexName });
  } catch (err) {
    // Index already exists or table missing in test environment
  }
}

async function safeRemoveIndex(queryInterface, tableName, indexName) {
  try {
    await queryInterface.removeIndex(tableName, indexName);
  } catch (err) {
    // Ignore if missing
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await safeAddIndex(queryInterface, "staff_appointments", ["admitted_at", "status"], "idx_staff_appts_admitted_status");
    await safeAddIndex(queryInterface, "staff_appointments", ["assigned_staff_id", "status"], "idx_staff_appts_staff_status");
    await safeAddIndex(queryInterface, "clinical_orders", ["order_type", "status", "created_at"], "idx_clinical_orders_type_status");
    await safeAddIndex(queryInterface, "cashier_payments", ["status", "created_at"], "idx_cashier_payments_status_created");
    await safeAddIndex(queryInterface, "users", ["account_type", "is_active"], "idx_users_account_active");
    await safeAddIndex(queryInterface, "workflow_tasks", ["status", "is_overdue"], "idx_workflow_tasks_status_overdue");
  },

  down: async (queryInterface, Sequelize) => {
    await safeRemoveIndex(queryInterface, "staff_appointments", "idx_staff_appts_admitted_status");
    await safeRemoveIndex(queryInterface, "staff_appointments", "idx_staff_appts_staff_status");
    await safeRemoveIndex(queryInterface, "clinical_orders", "idx_clinical_orders_type_status");
    await safeRemoveIndex(queryInterface, "cashier_payments", "idx_cashier_payments_status_created");
    await safeRemoveIndex(queryInterface, "users", "idx_users_account_active");
    await safeRemoveIndex(queryInterface, "workflow_tasks", "idx_workflow_tasks_status_overdue");
  },
};
