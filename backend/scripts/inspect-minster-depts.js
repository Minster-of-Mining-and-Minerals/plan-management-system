"use strict";
require("dotenv").config();
const { sequelize } = require("../models");

(async () => {
  const parentId = "d7ede175-e762-401d-ace9-221329032a96";
  const depts = await sequelize.query(
    `SELECT ist.internal_structure_id, ist.name, ist.level, ist.parent_id, gs.name AS sector
     FROM internal_structures ist
     JOIN government_structures gs ON gs.government_structure_id = ist.government_structure_id
     WHERE gs.government_structure_id = :id
        OR gs.parent_id = :id
     ORDER BY gs.name, ist.level, ist.name`,
    { replacements: { id: parentId }, type: sequelize.QueryTypes.SELECT }
  );
  for (const d of depts) {
    const users = await sequelize.query(
      `SELECT full_name, email FROM users WHERE internal_structure_id = :deptId`,
      { replacements: { deptId: d.internal_structure_id }, type: sequelize.QueryTypes.SELECT }
    );
    console.log(`L${d.level} [${d.sector}] ${d.name} (${users.map((u) => u.email).join(", ")})`);
  }
  await sequelize.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
