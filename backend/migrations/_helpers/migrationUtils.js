"use strict";

/**
 * Shared utilities for idempotent migrations and safe rollbacks.
 */

function timestampColumns(Sequelize) {
  return {
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    },
  };
}

function softDeleteColumn(Sequelize) {
  return {
    deleted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  };
}

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = String(tableName).toLowerCase();
  return tables.some((t) => {
    const name =
      typeof t === "object" && t !== null
        ? t.tableName || t.name || String(t)
        : String(t);
    return (
      name.toLowerCase() === normalized ||
      name.toLowerCase().endsWith(`.${normalized}`)
    );
  });
}

async function columnExists(queryInterface, tableName, columnName) {
  if (!(await tableExists(queryInterface, tableName))) return false;
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

async function indexExists(queryInterface, tableName, indexName) {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((idx) => idx.name === indexName);
}

async function safeAddIndex(queryInterface, table, fields, options = {}) {
  if (!(await tableExists(queryInterface, table))) return;
  if (options.name && (await indexExists(queryInterface, table, options.name))) {
    return;
  }
  try {
    await queryInterface.addIndex(table, fields, options);
  } catch (err) {
    const msg = err?.message || "";
    if (!msg.includes("already exists")) throw err;
  }
}

async function safeRemoveIndex(queryInterface, table, indexName) {
  if (!(await tableExists(queryInterface, table))) return;
  try {
    await queryInterface.removeIndex(table, indexName);
  } catch {
    // index may not exist
  }
}

async function safeAddColumn(queryInterface, tableName, columnName, definition) {
  if (!(await tableExists(queryInterface, tableName))) return;
  if (await columnExists(queryInterface, tableName, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function safeRemoveColumn(queryInterface, tableName, columnName) {
  if (!(await tableExists(queryInterface, tableName))) return;
  if (!(await columnExists(queryInterface, tableName, columnName))) return;
  await queryInterface.removeColumn(tableName, columnName);
}

async function createTableIfNotExists(
  queryInterface,
  tableName,
  attributes,
  options = {}
) {
  if (await tableExists(queryInterface, tableName)) return false;
  await queryInterface.createTable(tableName, attributes, options);
  return true;
}

async function dropTableIfExists(queryInterface, tableName) {
  if (!(await tableExists(queryInterface, tableName))) return;
  await queryInterface.dropTable(tableName).catch(() => {});
}

async function dropTablesInOrder(queryInterface, tableNames = []) {
  for (const tableName of tableNames) {
    await dropTableIfExists(queryInterface, tableName);
  }
}

async function dropEnumIfExists(queryInterface, enumName) {
  await queryInterface.sequelize
    .query(`DROP TYPE IF EXISTS "${enumName}";`)
    .catch(() => {});
}

async function runSql(queryInterface, sql) {
  await queryInterface.sequelize.query(sql);
}

/**
 * Reverse dependency order for rollback (children before parents).
 */
const TABLE_DROP_ORDER = [
  "payment_tenders",
  "cashier_payments",
  "cashier_sessions",
  "receipt_sequences",
  "receipt_templates",
  "billing_collection_requests",
  "appointment_billing_entries",
  "appointment_billing_accounts",
  "billing_services",
  "billing_service_categories",
  "user_suggestion_usage",
  "clinical_suggestions",
  "medical_certificates",
  "medical_certificate_templates",
  "medical_diagrams",
  "medical_diagram_categories",
  "prescription_pharmacy_forward_files",
  "prescription_pharmacy_forward_audits",
  "prescription_pharmacy_forwards",
  "prescription_fulfillments",
  "pharmacy_prescription_versions",
  "pharmacy_prescription_items",
  "pharmacy_prescriptions",
  "pharmacy_user_profiles",
  "pharmacies",
  "prescription_items",
  "prescriptions",
  "prescription_document_templates",
  "prescription_template_items",
  "prescription_templates",
  "prescription_categories",
  "workflow_tasks",
  "medical_history_logs",
  "diagnosis_records",
  "diagnosis_form_configs",
  "diagnosis_templates",
  "staff_appointments",
  "notifications",
  "patient_schedules",
  "schedule_settings",
  "patient_field_values",
  "patient_profiles",
  "internal_user_profiles",
  "attachments",
  "audit_logs",
  "system_branding",
  "form_fields",
  "form_field_groups",
  "user_titles",
  "departments",
  "user_permission_groups",
  "user_roles",
  "permission_group_permissions",
  "role_permissions",
  "permission_groups",
  "roles",
  "permissions",
  "users",
];

module.exports = {
  timestampColumns,
  softDeleteColumn,
  tableExists,
  columnExists,
  indexExists,
  safeAddIndex,
  safeRemoveIndex,
  safeAddColumn,
  safeRemoveColumn,
  createTableIfNotExists,
  dropTableIfExists,
  dropTablesInOrder,
  dropEnumIfExists,
  runSql,
  TABLE_DROP_ORDER,
};
