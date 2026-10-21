"use strict";

const { sequelize } = require("../models");

async function main() {
  await sequelize.authenticate();
  const [res] = await sequelize.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('plan_nodes', 'internal_assignments', 'users', 'plan_versions')
    ORDER BY tablename, indexname;
  `);
  console.log("Indexes in DB:");
  console.table(res);
  await sequelize.close();
}

main().catch(console.error);
