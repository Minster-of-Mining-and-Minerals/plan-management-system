"use strict";

/**
 * Shared utilities for baseline migrations.
 * Not executed by Sequelize CLI (lives outside migration filename pattern scope when required from migrations).
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
  return tables.some(
    (t) =>
      t === tableName ||
      t === `public.${tableName}` ||
      (typeof t === "object" && t.tableName === tableName) ||
      String(t).endsWith(`.${tableName}`)
  );
}

async function safeAddIndex(queryInterface, table, fields, options = {}) {
  try {
    await queryInterface.addIndex(table, fields, options);
  } catch (err) {
    const msg = err?.message || "";
    if (!msg.includes("already exists")) throw err;
  }
}

async function dropTableIfExists(queryInterface, tableName) {
  await queryInterface.dropTable(tableName).catch(() => {});
}

async function dropEnumIfExists(queryInterface, enumName) {
  await queryInterface.sequelize
    .query(`DROP TYPE IF EXISTS "${enumName}";`)
    .catch(() => {});
}

module.exports = {
  timestampColumns,
  softDeleteColumn,
  tableExists,
  safeAddIndex,
  dropTableIfExists,
  dropEnumIfExists,
};
