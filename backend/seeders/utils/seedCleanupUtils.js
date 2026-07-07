"use strict";

const { ADMIN_USER_ID } = require("../data/momOrgHierarchy.data");

function normalizeTableNames(tables) {
  return tables.map((table) => (typeof table === "string" ? table : Object.values(table)[0]));
}

async function tableExists(queryInterface, tableName, tableNames = null) {
  const names = tableNames ?? normalizeTableNames(await queryInterface.showAllTables());
  return names.includes(tableName);
}

async function deleteFromTableIfExists(queryInterface, tableName, tableNames = null) {
  if (await tableExists(queryInterface, tableName, tableNames)) {
    await queryInterface.sequelize.query(`DELETE FROM "${tableName}"`);
  }
}

/**
 * Remove rows that block deleting non-admin demo users during seed undo/reseed.
 */
async function cleanUserDependentData(queryInterface, adminUserId = ADMIN_USER_ID) {
  const tableNames = normalizeTableNames(await queryInterface.showAllTables());

  await deleteFromTableIfExists(queryInterface, "issue_form_responses", tableNames);
  await deleteFromTableIfExists(queryInterface, "issue_attachments", tableNames);
  await deleteFromTableIfExists(queryInterface, "issue_histories", tableNames);
  await deleteFromTableIfExists(queryInterface, "issues", tableNames);
  await deleteFromTableIfExists(queryInterface, "notes", tableNames);
  await deleteFromTableIfExists(queryInterface, "notifications", tableNames);
  await deleteFromTableIfExists(queryInterface, "system_audit_logs", tableNames);
  await deleteFromTableIfExists(queryInterface, "branding_audit_logs", tableNames);

  if (tableNames.includes("plan_nodes")) {
    await queryInterface.sequelize.query(`
      UPDATE plan_nodes
      SET
        period_actual_submitted_by = NULL,
        period_actual_approved_by = NULL,
        period_actual_validated_by = NULL
      WHERE period_actual_submitted_by IS NOT NULL
         OR period_actual_approved_by IS NOT NULL
         OR period_actual_validated_by IS NOT NULL
    `);
  }
}

async function cleanStructureData(queryInterface, adminUserId = ADMIN_USER_ID) {
  console.log("Cleaning existing structure, department, and demo user data...");

  const tableNames = normalizeTableNames(await queryInterface.showAllTables());
  const hasTable = (name) => tableNames.includes(name);

  await cleanUserDependentData(queryInterface, adminUserId);

  await queryInterface.sequelize.query(`DELETE FROM internal_assignments`);
  await queryInterface.sequelize.query(`DELETE FROM external_assignments`);

  if (hasTable("plan_node_action_logs")) {
    await queryInterface.sequelize.query(`DELETE FROM plan_node_action_logs`);
  }

  if (hasTable("plan_nodes")) {
    await queryInterface.sequelize.query(`DELETE FROM plan_nodes`);
  }

  if (hasTable("plan_versions")) {
    await queryInterface.sequelize.query(
      `UPDATE plan_versions SET based_on_version_id = NULL WHERE based_on_version_id IS NOT NULL`
    );
    await queryInterface.sequelize.query(`DELETE FROM plan_versions`);
  }

  if (hasTable("plan_rule_steps")) {
    await queryInterface.sequelize.query(
      `DELETE FROM plan_rule_steps
       WHERE plan_rule_id IN (
         SELECT plan_rule_id FROM plan_rules WHERE government_structure_id IS NOT NULL
       )`
    );
  }

  if (hasTable("plan_rules")) {
    await queryInterface.sequelize.query(
      `DELETE FROM plan_rules WHERE government_structure_id IS NOT NULL`
    );
  }

  await queryInterface.sequelize.query(`DELETE FROM user_permission_groups`);
  await queryInterface.sequelize.query(
    `DELETE FROM user_roles WHERE user_id != :adminId`,
    { replacements: { adminId: adminUserId } }
  );
  await queryInterface.sequelize.query(
    `DELETE FROM users WHERE user_id != :adminId`,
    { replacements: { adminId: adminUserId } }
  );
  await queryInterface.sequelize.query(`DELETE FROM government_structure_permission_groups`);
  await queryInterface.sequelize.query(`DELETE FROM internal_structures`);
  await queryInterface.sequelize.query(`DELETE FROM government_structures`);

  console.log("Structure and department cleanup complete.");
}

module.exports = {
  cleanUserDependentData,
  cleanStructureData,
};
