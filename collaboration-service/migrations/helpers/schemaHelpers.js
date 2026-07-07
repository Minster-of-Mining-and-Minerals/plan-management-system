"use strict";

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const names = tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]));
  return names.includes(tableName);
}

async function enumTypeExists(queryInterface, typeName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM pg_type WHERE typname = :typeName LIMIT 1`,
    { replacements: { typeName: typeName.replace(/"/g, "") } }
  );
  return rows.length > 0;
}

async function createTableIfNotExists(queryInterface, tableName, attributes, options = {}) {
  if (await tableExists(queryInterface, tableName)) return false;
  await queryInterface.createTable(tableName, attributes, options);
  return true;
}

async function dropTableIfExists(queryInterface, tableName, options = {}) {
  if (!(await tableExists(queryInterface, tableName))) return false;
  await queryInterface.dropTable(tableName, options);
  return true;
}

async function dropEnumTypeIfExists(queryInterface, typeName) {
  const bare = typeName.replace(/"/g, "");
  if (await enumTypeExists(queryInterface, bare)) {
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${bare}" CASCADE`);
  }
}

async function dropTablesInOrder(queryInterface, tableSpecs) {
  for (const spec of tableSpecs) {
    const table = typeof spec === "string" ? spec : spec.table;
    const options = typeof spec === "object" && spec.cascade ? { cascade: true } : {};
    await dropTableIfExists(queryInterface, table, options);
  }
}

async function dropEnumTypes(queryInterface, typeNames) {
  for (const typeName of typeNames) {
    await dropEnumTypeIfExists(queryInterface, typeName);
  }
}

module.exports = {
  tableExists,
  createTableIfNotExists,
  dropTableIfExists,
  dropTablesInOrder,
  dropEnumTypes,
};
