"use strict";

const { sequelize } = require("../models");

async function inspect() {
  const [res] = await sequelize.query("SELECT version();");
  console.log("PostgreSQL Version:", res[0].version);

  const [dbName] = await sequelize.query("SELECT current_database(), current_user;");
  console.log("Database Info:", dbName[0]);

  const [meta] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name DESC LIMIT 15;');
  console.log("\nRecent migrations recorded in SequelizeMeta:");
  meta.forEach((m) => console.log("  ", m.name));

  const [idx] = await sequelize.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';");
  console.log("\nUsers table indexes in database:");
  idx.forEach((i) => console.log("  ", i.indexname, "=>", i.indexdef));

  const [counts] = await sequelize.query(`
    SELECT
      (SELECT COUNT(*) FROM plan_versions) AS plan_versions,
      (SELECT COUNT(*) FROM plan_nodes) AS plan_nodes,
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM government_structures) AS government_structures,
      (SELECT COUNT(*) FROM internal_structures) AS internal_structures,
      (SELECT COUNT(*) FROM internal_assignments) AS internal_assignments
  `);
  console.log("\nCore table row counts:", counts[0]);

  process.exit(0);
}

inspect().catch((err) => {
  console.error("Inspect error:", err);
  process.exit(1);
});
